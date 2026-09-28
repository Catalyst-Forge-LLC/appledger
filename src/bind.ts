import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { isMap, isSeq, parseDocument, YAMLSeq } from "yaml";
import { resolveLedgerRoot } from "./check.js";
import { sha256Hex } from "./digest.js";
import { APPLICATION_LABEL_PATHS, homeRepository, labelFileExists, type ApplicationFamily } from "./labels.js";
import { applyTransaction, stageTransaction } from "./transaction.js";

export type PlannedBinding = {
  id: string;
  family: ApplicationFamily;
  subject_id: string;
  repository_id: string;
  path: string;
};

export type BindCode = "planned" | "applied" | "unchanged" | "rejected" | "conflict";

export type BindResult = {
  ok: boolean;
  code: BindCode;
  bindings: PlannedBinding[];
  wrote: string[];
  message: string;
};

const LIMIT = "Label files were not read or changed.";

/** Links existing application labels at the home repository root to the application subject. */
export function bindLabels(input: { root: string; apply?: boolean }): BindResult {
  const ledgerRoot = resolveLedgerRoot(input.root);
  const home = resolve(ledgerRoot, "..");
  const manifestPath = join(ledgerRoot, "manifest.yaml");
  const text = readFileSync(manifestPath, "utf8");
  const doc = parseDocument(text);
  if (doc.errors.length > 0 || !isMap(doc.contents)) {
    return fail("rejected", "manifest.yaml could not be parsed. No files were written.");
  }
  const manifest = doc.toJS() as Record<string, unknown>;
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  if (!applicationId) return fail("rejected", "The manifest has no application_id. No files were written.");
  const repo = homeRepository(home, manifest);
  if (!repo) {
    return fail("rejected", 'The manifest has no repository with root ".". No files were written.');
  }

  const existing = Array.isArray(manifest.bindings) ? (manifest.bindings as Record<string, unknown>[]) : [];
  const ids = new Set(existing.map((item) => (item && typeof item.id === "string" ? item.id : "")));
  const planned: PlannedBinding[] = [];
  for (const family of Object.keys(APPLICATION_LABEL_PATHS) as ApplicationFamily[]) {
    const bound = existing.some(
      (item) => item && item.family === family && item.subject_id === applicationId,
    );
    const path = APPLICATION_LABEL_PATHS[family];
    if (bound || !labelFileExists(repo.abs, path)) continue;
    let id = `${family}-application`;
    for (let n = 2; ids.has(id); n += 1) id = `${family}-application-${n}`;
    ids.add(id);
    planned.push({ id, family, subject_id: applicationId, repository_id: repo.id, path });
  }

  if (planned.length === 0) {
    return {
      ok: true,
      code: "unchanged",
      bindings: [],
      wrote: [],
      message: `Nothing to bind. Every application label found is already bound. No files were written. ${LIMIT}`,
    };
  }
  if (!input.apply) {
    return {
      ok: true,
      code: "planned",
      bindings: planned,
      wrote: [],
      message: `Plan only. No files were written. Run with --apply to add these bindings to manifest.yaml. ${LIMIT}`,
    };
  }

  let seq = doc.get("bindings", true);
  if (!isSeq(seq)) {
    seq = new YAMLSeq();
    doc.set("bindings", seq);
  }
  const list = seq as YAMLSeq;
  list.flow = false;
  for (const binding of planned) list.add(doc.createNode({ ...binding }));
  let next = doc.toString({ indentSeq: !/^[^\s#][^\n]*:\r?\n- /m.test(text) });
  if (text.includes("\r\n")) next = next.replace(/\r?\n/g, "\r\n");

  const rel = relative(home, manifestPath).replace(/\\/g, "/");
  const staged = stageTransaction(home, {
    id: `bind-${sha256Hex(Buffer.from(next, "utf8")).slice(0, 12)}`,
    files: [{ path: rel, bytes: Buffer.from(next, "utf8") }],
  });
  if (!staged.ok || staged.status !== "staged") return fail("rejected", staged.message, planned);
  const applied = applyTransaction(home, staged.id);
  if (!applied.ok) return fail(applied.status === "conflict" ? "conflict" : "rejected", applied.message, planned);
  return {
    ok: true,
    code: "applied",
    bindings: planned,
    wrote: [rel],
    message: `Added ${planned.length} binding${planned.length === 1 ? "" : "s"} to manifest.yaml. ${LIMIT} Run \`appledger subjects --operation validate\` to check them.`,
  };
}

function fail(code: BindCode, message: string, bindings: PlannedBinding[] = []): BindResult {
  return { ok: false, code, bindings, wrote: [], message };
}
