import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { discoverSubjects, ADAPTERS, type AdapterResult } from "./adapters.js";
import { resolveLedgerRoot } from "./check.js";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { APPLICATION_LABEL_PATHS, SUBJECT_LABEL_PATHS, homeRepository } from "./labels.js";
import { isUnsafeRelative } from "./sources.js";
import { applyTransaction, reconciliationKey, stageTransaction } from "./transaction.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";

export type ReconcileCode = "planned" | "applied" | "unchanged" | "blocked" | "conflict" | "rejected";

export type ReconcileDisposition = {
  family: string;
  subjectId: string;
  disposition: string;
  finding: string;
};

export type ReconcileResult = {
  ok: boolean;
  wrote: string[];
  message: string;
  code: ReconcileCode;
  dispositions: ReconcileDisposition[];
};

export function reconcileLedger(input: { root: string; apply?: boolean; at: string }): ReconcileResult {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(input.at)) {
    return empty("rejected", false, "Reconcile time must be a UTC timestamp. No files were written.");
  }
  const ledgerRoot = resolveLedgerRoot(input.root);
  const home = resolve(ledgerRoot, "..");
  const manifest = readManifest(ledgerRoot);
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  if (!applicationId) {
    return empty("rejected", false, "The manifest has no application_id. No files were written.");
  }

  const rows = discoverSubjects({ root: input.root });
  const dispositions = rows.map(toDisposition);
  const blocking = rows.some((row) => row.disposition === "failed" || row.disposition === "needs_review");
  const fingerprint = inputSetFingerprint(inputEntries(home, ledgerRoot, manifest));
  const policyDigest = sha256Hex(policyBytes(ledgerRoot));
  const key = reconciliationKey({
    inputFingerprint: fingerprint,
    policyDigest,
    adapterVersions: ADAPTERS.map((adapter) => ({ id: adapter.id, version: adapter.version })),
  });
  const limit = "No label was written. Work status was not changed.";

  if (!input.apply) {
    return {
      ok: !blocking,
      wrote: [],
      code: blocking ? "blocked" : "planned",
      dispositions,
      message: blocking
        ? `Plan only. No files were written. A disposition is needs_review or failed, so this run is not overall success. ${limit}`
        : `Plan only. No files were written. ${limit}`,
    };
  }

  const receiptPath = `appledger/records/change/change-${key}.md`;
  const existing = join(ledgerRoot, "records", "change", `change-${key}.md`);
  if (existsSync(existing)) {
    const stored = storedKey(existing);
    if (stored === key) {
      return {
        ok: !blocking,
        wrote: [],
        code: blocking ? "blocked" : "unchanged",
        dispositions,
        message: blocking
          ? `Unchanged. No new receipt was written. A disposition is needs_review or failed, so this run is not overall success. ${limit}`
          : `Unchanged. No new receipt was written. ${limit}`,
      };
    }
    return {
      ok: false,
      wrote: [],
      code: "conflict",
      dispositions,
      message: `The receipt path exists and was left in place. ${limit}`,
    };
  }

  const text = receiptText({
    id: `change-${key}`,
    at: input.at,
    applicationId,
    fingerprint,
    key,
    policyDigest,
    rows,
  });
  const staged = stageTransaction(home, {
    id: `reconcile-${key.slice(0, 12)}`,
    idempotencyKey: key,
    files: [{ path: receiptPath, bytes: Buffer.from(text, "utf8") }],
  });
  if (!staged.ok || staged.status !== "staged") {
    return { ok: false, wrote: [], code: "rejected", dispositions, message: staged.message };
  }
  const applied = applyTransaction(home, staged.id);
  if (!applied.ok) {
    return { ok: false, wrote: [], code: applied.status === "conflict" ? "conflict" : "rejected", dispositions, message: applied.message };
  }
  return {
    ok: !blocking,
    wrote: [receiptPath],
    code: blocking ? "blocked" : "applied",
    dispositions,
    message: blocking
      ? `Recorded dispositions. A disposition is needs_review or failed, so this run is not overall success. ${limit}`
      : `Recorded dispositions. ${limit}`,
  };
}

function readManifest(ledgerRoot: string): Record<string, unknown> {
  const parsed = parseYaml(readFileSync(join(ledgerRoot, "manifest.yaml"), "utf8"));
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    throw new Error("manifest.yaml could not be read");
  }
  return parsed.value as Record<string, unknown>;
}

function empty(code: ReconcileCode, ok: boolean, message: string): ReconcileResult {
  return { ok, wrote: [], message, code, dispositions: [] };
}

function toDisposition(row: AdapterResult): ReconcileDisposition {
  return {
    family: row.family,
    subjectId: row.subjectId,
    disposition: row.disposition,
    finding: row.findings[0] ?? "",
  };
}

function inputEntries(
  home: string,
  ledgerRoot: string,
  manifest: Record<string, unknown>,
): { path: string; sha256: string }[] {
  const entries: { path: string; sha256: string }[] = [];
  const seen = new Set<string>();
  const add = (rel: string, abs: string) => {
    const path = rel.replace(/\\/g, "/");
    if (seen.has(path) || !existsSync(abs)) return;
    seen.add(path);
    entries.push({ path, sha256: sha256Hex(readFileSync(abs)) });
  };
  add("appledger/manifest.yaml", join(ledgerRoot, "manifest.yaml"));
  add("appledger/policy.yaml", join(ledgerRoot, "policy.yaml"));
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  if (applicationId && !applicationId.includes("/") && !applicationId.includes("\\")) {
    add(
      `appledger/records/application/${applicationId}.md`,
      join(ledgerRoot, "records", "application", `${applicationId}.md`),
    );
  }
  const repo = homeRepository(home, manifest);
  if (repo) {
    for (const path of [...Object.values(APPLICATION_LABEL_PATHS), "FEATURE_FACTS.md", ...Object.values(SUBJECT_LABEL_PATHS)]) {
      add(path, resolve(repo.abs, ...path.split("/")));
    }
  }
  if (!Array.isArray(manifest.bindings) || !Array.isArray(manifest.repositories)) return entries;
  const repos = new Map<string, string>();
  for (const item of manifest.repositories) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.root !== "string" || isUnsafeRelative(record.root)) continue;
    repos.set(record.id, record.root.replace(/\\/g, "/").replace(/\/$/, ""));
  }
  for (const item of manifest.bindings) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.path !== "string" || typeof record.repository_id !== "string" || isUnsafeRelative(record.path)) continue;
    const root = repos.get(record.repository_id);
    if (root === undefined) continue;
    const rel = root === "." || root === "" ? record.path : `${root}/${record.path}`;
    add(rel, resolve(home, ...rel.split("/")));
  }
  return entries;
}

function policyBytes(ledgerRoot: string): Buffer {
  const path = join(ledgerRoot, "policy.yaml");
  if (!existsSync(path)) return Buffer.from("no-policy");
  return readFileSync(path);
}

function storedKey(path: string): string | undefined {
  const front = splitFrontMatter(readFileSync(path, "utf8"));
  if (!front.ok) return undefined;
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return undefined;
  const extensions = (parsed.value as { extensions?: unknown }).extensions;
  if (!extensions || typeof extensions !== "object" || Array.isArray(extensions)) return undefined;
  const reconciliation = (extensions as { reconciliation?: unknown }).reconciliation;
  if (!reconciliation || typeof reconciliation !== "object" || Array.isArray(reconciliation)) return undefined;
  const key = (reconciliation as { idempotency_key?: unknown }).idempotency_key;
  return typeof key === "string" ? key : undefined;
}

function receiptText(input: {
  id: string;
  at: string;
  applicationId: string;
  fingerprint: string;
  key: string;
  policyDigest: string;
  rows: AdapterResult[];
}): string {
  const outputs = input.rows.map((row) => ({
    family: row.family,
    subject_id: row.subjectId,
    disposition: row.disposition,
  }));
  const document = {
    format_version: "0.1.0",
    id: input.id,
    kind: "change",
    title: "Reconciliation receipt",
    record_status: "active",
    created_at: input.at,
    updated_at: input.at,
    recorded_by: { id: "appledger-reconcile", type: "tool" },
    visibility: "internal",
    relations: [{ type: "affects", target: input.applicationId }],
    claims: [],
    data: {
      change_type: "added",
      affected_ids: [input.applicationId],
      reason: "Recorded a disposition for each subject family. No label was written.",
      evidence_refs: [],
      operation: "reconciliation",
      input_fingerprint: input.fingerprint,
    },
    extensions: {
      reconciliation: {
        idempotency_key: input.key,
        policy_digest: input.policyDigest,
        adapter_versions: ADAPTERS.map((adapter) => ({ id: adapter.id, version: adapter.version })),
        outputs,
      },
    },
  };
  const lines = input.rows.map(
    (row) => `- ${row.family}${row.subjectId ? ` ${row.subjectId}` : ""} — ${row.disposition}. ${row.findings[0] ?? ""}`,
  );
  return `---\n${stringify(document)}---\n\nRecorded dispositions. No label was written. Work status was not changed.\n\n${lines.join("\n")}\n`;
}
