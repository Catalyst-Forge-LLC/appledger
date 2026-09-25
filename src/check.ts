import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { PREDICATES } from "./predicates.js";
import { schemaErrors } from "./schemas.js";
import { checkSources, isInside, isUnsafeRelative } from "./sources.js";
import { listTransactions } from "./transaction.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";

export type Severity = "error" | "warning";

export type Finding = {
  code: string;
  severity: Severity;
  path: string;
  message: string;
};

export type CheckResult = {
  ok: boolean;
  ledgerRoot: string;
  findings: Finding[];
};

type RecordDoc = {
  path: string;
  id: string;
  kind: string;
  value: Record<string, unknown>;
};

export function resolveLedgerRoot(input: string): string {
  const direct = join(input, "manifest.yaml");
  const nested = join(input, "appledger", "manifest.yaml");
  const hasDirect = existsSync(direct);
  const hasNested = existsSync(nested);
  if (hasDirect && hasNested) {
    throw new Error("Both manifest.yaml and appledger/manifest.yaml exist. Pass one ledger root.");
  }
  if (hasNested) return join(input, "appledger");
  if (hasDirect) return input;
  throw new Error("No AppLedger manifest at this path or in appledger/. Parent directories were not searched.");
}

export function checkLedger(input: string): CheckResult {
  const ledgerRoot = resolveLedgerRoot(input);
  const findings: Finding[] = [];
  const manifestPath = join(ledgerRoot, "manifest.yaml");
  const manifest = readYamlFile(manifestPath, findings);
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return result(ledgerRoot, findings);
  }
  const manifestObj = manifest as Record<string, unknown>;
  findings.push(
    ...schemaErrors("manifest", manifestObj, "manifest.yaml").map((message) =>
      finding("schema", "error", "manifest.yaml", message),
    ),
  );

  const records = loadRecords(ledgerRoot, manifestObj, findings);
  const byId = new Map<string, RecordDoc>();
  for (const record of records) {
    if (byId.has(record.id)) {
      findings.push(finding("duplicate_id", "error", record.path, `Duplicate record id ${record.id}`));
    }
    byId.set(record.id, record);
    findings.push(
      ...schemaErrors("kinds", record.value, record.path).map((message) =>
        finding("schema", "error", record.path, message),
      ),
    );
  }

  const applicationId = stringField(manifestObj, "application_id");
  if (applicationId) {
    const app = byId.get(applicationId);
    if (!app) {
      findings.push(
        finding("unresolved_ref", "error", "manifest.yaml", `application_id ${applicationId} does not resolve`),
      );
    } else if (app.kind !== "application") {
      findings.push(
        finding("unresolved_ref", "error", "manifest.yaml", `application_id ${applicationId} is not an application record`),
      );
    }
  }

  checkRelations(records, byId, manifestObj, findings);
  checkSources(ledgerRoot, manifestObj, records, findings);
  checkSupersedes(records, byId, findings);
  checkDepends(records, byId, findings);
  checkProfile(ledgerRoot, manifestObj, findings);
  checkPolicy(ledgerRoot, findings);
  checkPendingTransactions(ledgerRoot, findings);

  return result(ledgerRoot, findings);
}

function result(ledgerRoot: string, findings: Finding[]): CheckResult {
  return {
    ok: findings.every((item) => item.severity !== "error"),
    ledgerRoot,
    findings,
  };
}

function checkPendingTransactions(ledgerRoot: string, findings: Finding[]): void {
  const home = resolve(ledgerRoot, "..");
  for (const item of listTransactions(home)) {
    if (item.status === "complete" || item.status === "unchanged" || item.status === "rolled_back") continue;
    findings.push(
      finding(
        "incomplete_transaction",
        "warning",
        `.appledger-cache/transactions/${item.id}/journal.json`,
        `${item.message} Recover it before trusting generated views.`,
      ),
    );
  }
}

function finding(code: string, severity: Severity, path: string, message: string): Finding {
  return { code, severity, path, message };
}

function readYamlFile(path: string, findings: Finding[]): unknown | undefined {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    findings.push(finding("io", "error", path, err instanceof Error ? err.message : "Unreadable file"));
    return undefined;
  }
  const parsed = parseYaml(text);
  if (!parsed.ok) {
    for (const message of parsed.errors) findings.push(finding("yaml", "error", path, message));
    return undefined;
  }
  return parsed.value;
}

function loadRecords(ledgerRoot: string, manifest: Record<string, unknown>, findings: Finding[]): RecordDoc[] {
  const roots = Array.isArray(manifest.record_roots) ? manifest.record_roots : [];
  const records: RecordDoc[] = [];
  for (const root of roots) {
    if (typeof root !== "string") continue;
    if (isUnsafeRelative(root)) {
      findings.push(finding("path_escape", "error", "manifest.yaml", `record root escapes the ledger: ${root}`));
      continue;
    }
    const dir = resolve(ledgerRoot, root);
    if (!isInside(ledgerRoot, dir)) {
      findings.push(finding("path_escape", "error", "manifest.yaml", `record root escapes the ledger: ${root}`));
      continue;
    }
    if (!existsSync(dir)) {
      findings.push(finding("io", "error", root, "Record root does not exist"));
      continue;
    }
    walkMd(dir, (file) => {
      const rel = relative(ledgerRoot, file).split(sep).join("/");
      const text = readFileSync(file, "utf8");
      const front = splitFrontMatter(text);
      if (!front.ok) {
        for (const message of front.errors) findings.push(finding("front_matter", "error", rel, message));
        return;
      }
      const parsed = parseYaml(front.yaml);
      if (!parsed.ok) {
        for (const message of parsed.errors) findings.push(finding("yaml", "error", rel, message));
        return;
      }
      if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
        findings.push(finding("schema", "error", rel, "Record front matter must be a mapping"));
        return;
      }
      const value = parsed.value as Record<string, unknown>;
      const id = typeof value.id === "string" ? value.id : "";
      const kind = typeof value.kind === "string" ? value.kind : "";
      const expected = `${root.replace(/\/$/, "")}/${kind}/${id}.md`;
      if (id && kind && rel !== expected) {
        findings.push(
          finding("record_path", "error", rel, `Record path must be ${expected} for kind ${kind} and id ${id}`),
        );
      }
      records.push({ path: rel, id, kind, value });
    });
  }
  return records;
}

function walkMd(dir: string, visitFile: (file: string) => void): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walkMd(full, visitFile);
    else if (name.endsWith(".md")) visitFile(full);
  }
}

function checkRelations(
  records: RecordDoc[],
  byId: Map<string, RecordDoc>,
  manifest: Record<string, unknown>,
  findings: Finding[],
): void {
  const bindingIds = new Set<string>();
  if (Array.isArray(manifest.bindings)) {
    for (const binding of manifest.bindings) {
      if (binding && typeof binding === "object" && typeof (binding as { id?: unknown }).id === "string") {
        bindingIds.add((binding as { id: string }).id);
      }
    }
  }
  for (const record of records) {
    const relations = Array.isArray(record.value.relations) ? record.value.relations : [];
    const verified = new Set<string>();
    for (const relation of relations) {
      if (!relation || typeof relation !== "object") continue;
      const type = (relation as { type?: unknown }).type;
      const target = (relation as { target?: unknown }).target;
      if (typeof type !== "string" || typeof target !== "string") continue;
      const rule = PREDICATES[type];
      if (!rule) {
        findings.push(finding("predicate", "error", record.path, `Unknown predicate ${type}`));
        continue;
      }
      if (rule.sources !== "any" && !rule.sources.has(record.kind)) {
        findings.push(
          finding("predicate", "error", record.path, `${type} cannot be stored on ${record.kind}`),
        );
      }
      if (rule.sourceExcept?.has(record.kind)) {
        findings.push(
          finding("predicate", "error", record.path, `${type} cannot be stored on ${record.kind}`),
        );
      }
      if (target === record.id) {
        findings.push(finding("predicate", "error", record.path, `${type} must not target its own record`));
        continue;
      }
      if (target.startsWith("binding:")) {
        const bindingId = target.slice("binding:".length).split("#")[0] ?? "";
        if (!bindingIds.has(bindingId)) {
          findings.push(
            finding("unresolved_ref", "error", record.path, `Binding ${bindingId} is not in the manifest`),
          );
        }
        continue;
      }
      const dest = byId.get(target);
      if (!dest) {
        findings.push(finding("unresolved_ref", "error", record.path, `Missing target ${target}`));
        continue;
      }
      if (rule.targets === "same" && dest.kind !== record.kind) {
        findings.push(
          finding("predicate", "error", record.path, `${type} must target the same kind`),
        );
      } else if (rule.targets !== "any" && rule.targets !== "same" && !rule.targets.has(dest.kind)) {
        findings.push(
          finding("predicate", "error", record.path, `${type} cannot target ${dest.kind}`),
        );
      }
      if (type === "verified_by") verified.add(target);
    }
    const claimEvidence = claimEvidenceRefs(record.value);
    if (verified.size > 0 && claimEvidence.size > 0 && !sameSet(verified, claimEvidence)) {
      findings.push(
        finding(
          "evidence_disagreement",
          "error",
          record.path,
          "verified_by relations and claim evidence_refs name different evidence",
        ),
      );
    }
    for (const ref of claimEvidence) {
      const dest = byId.get(ref);
      if (!dest) {
        findings.push(finding("unresolved_ref", "error", record.path, `Missing evidence ${ref}`));
      } else if (dest.kind !== "evidence") {
        findings.push(finding("predicate", "error", record.path, `evidence_refs ${ref} is not evidence`));
      }
    }
  }
}

function checkSupersedes(records: RecordDoc[], byId: Map<string, RecordDoc>, findings: Finding[]): void {
  const edges = new Map<string, string[]>();
  for (const record of records) {
    for (const target of relationTargets(record.value, "supersedes")) {
      const list = edges.get(record.id) ?? [];
      list.push(target);
      edges.set(record.id, list);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (byId.has(next) && walk(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of edges.keys()) {
    if (walk(id)) {
      findings.push(finding("supersedes_cycle", "error", byId.get(id)?.path ?? id, "supersedes cycle"));
      break;
    }
  }
}

function checkDepends(records: RecordDoc[], byId: Map<string, RecordDoc>, findings: Finding[]): void {
  const edges = new Map<string, string[]>();
  for (const record of records) {
    for (const target of relationTargets(record.value, "depends_on")) {
      if (!byId.has(target)) continue;
      const list = edges.get(record.id) ?? [];
      list.push(target);
      edges.set(record.id, list);
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of edges.get(id) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  for (const id of edges.keys()) {
    if (walk(id)) {
      findings.push(
        finding(
          "dependency_cycle",
          "warning",
          byId.get(id)?.path ?? id,
          "depends_on cycle reported. This is not treated as corruption.",
        ),
      );
      break;
    }
  }
}

function checkProfile(ledgerRoot: string, manifest: Record<string, unknown>, findings: Finding[]): void {
  if (!Array.isArray(manifest.profiles)) return;
  for (const profile of manifest.profiles) {
    if (!profile || typeof profile !== "object") continue;
    const id = stringField(profile as Record<string, unknown>, "id");
    const path = stringField(profile as Record<string, unknown>, "path");
    if (!path) continue;
    const rel = path.split(sep).join("/");
    if (id === "forgetrail") {
      if (isUnsafeRelative(rel)) {
        findings.push(finding("path_escape", "error", "manifest.yaml", `Profile path escapes the ledger: ${rel}`));
        continue;
      }
      const full = resolve(ledgerRoot, rel);
      if (!isInside(ledgerRoot, full)) {
        findings.push(finding("path_escape", "error", "manifest.yaml", `Profile path escapes the ledger: ${rel}`));
        continue;
      }
      const value = readYamlFile(full, findings);
      if (!value) continue;
      findings.push(
        ...schemaErrors("profile", value, rel).map((message) => finding("schema", "error", rel, message)),
      );
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const current = stringField(value as Record<string, unknown>, "current_phase_instance");
        const instances = (value as { phase_instances?: unknown }).phase_instances;
        const ids = new Set<string>();
        if (Array.isArray(instances)) {
          for (const instance of instances) {
            if (instance && typeof instance === "object" && typeof (instance as { id?: unknown }).id === "string") {
              ids.add((instance as { id: string }).id);
            }
          }
        }
        if (current && !ids.has(current)) {
          findings.push(
            finding(
              "phase_instance",
              "error",
              rel,
              `current_phase_instance ${current} does not match a phase instance`,
            ),
          );
        }
      }
    }
  }
}

function checkPolicy(ledgerRoot: string, findings: Finding[]): void {
  const path = join(ledgerRoot, "policy.yaml");
  if (!existsSync(path)) return;
  const value = readYamlFile(path, findings);
  if (!value) return;
  findings.push(
    ...schemaErrors("policy", value, "policy.yaml").map((message) => finding("schema", "error", "policy.yaml", message)),
  );
}

function claimEvidenceRefs(value: Record<string, unknown>): Set<string> {
  const refs = new Set<string>();
  if (!Array.isArray(value.claims)) return refs;
  for (const claim of value.claims) {
    if (!claim || typeof claim !== "object" || !Array.isArray((claim as { evidence_refs?: unknown }).evidence_refs)) {
      continue;
    }
    for (const ref of (claim as { evidence_refs: unknown[] }).evidence_refs) {
      if (typeof ref === "string") refs.add(ref);
    }
  }
  return refs;
}

function relationTargets(value: Record<string, unknown>, type: string): string[] {
  if (!Array.isArray(value.relations)) return [];
  const targets: string[] = [];
  for (const relation of value.relations) {
    if (!relation || typeof relation !== "object") continue;
    if ((relation as { type?: unknown }).type === type && typeof (relation as { target?: unknown }).target === "string") {
      targets.push((relation as { target: string }).target);
    }
  }
  return targets;
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) if (!right.has(item)) return false;
  return true;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}
