import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { applyTransaction, stageTransaction } from "./transaction.js";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { pinnedErrors, pinnedValidators } from "./pinned.js";
import { unboundApplication } from "./labels.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";
import type { AdapterResult, Family, Operation } from "./adapters.js";

const NOT_COPIED = "Recognition, lifecycle, availability, and maturity were not copied.";

export function runPinnedOperation(input: {
  ledgerRoot: string;
  operation: Operation;
  family: "appfacts" | "featurefacts";
  subjectId?: string;
  apply?: boolean;
}): AdapterResult[] {
  const home = resolve(input.ledgerRoot, "..");
  const manifest = readManifest(input.ledgerRoot);
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  const bindings = readBindings(manifest).filter((binding) => binding.family === input.family);
  const wanted = input.subjectId
    ? bindings.filter((binding) => binding.subjectId === input.subjectId)
    : bindings;
  if (wanted.length === 0) {
    if (!input.subjectId || input.subjectId === applicationId) {
      const unbound = unboundApplication(input.family, home, manifest);
      return [
        row(input.family, input.operation, input.subjectId || applicationId, unbound.disposition, null, [unbound.finding]),
      ];
    }
    return [
      row(input.family, input.operation, input.subjectId, "not_applicable", null, [
        `No subject ${input.subjectId} was declared. This is not a missing label.`,
      ]),
    ];
  }

  const groups = new Map<string, Binding[]>();
  for (const binding of wanted) {
    const list = groups.get(binding.subjectId) ?? [];
    list.push(binding);
    groups.set(binding.subjectId, list);
  }
  return [...groups.values()].map((group) =>
    inspectGroup({ ...input, home, manifest, bindings: group }),
  );
}

function inspectGroup(input: {
  ledgerRoot: string;
  home: string;
  operation: Operation;
  family: "appfacts" | "featurefacts";
  apply?: boolean;
  bindings: Binding[];
  manifest: Record<string, unknown>;
}): AdapterResult {
  const subjectId = input.bindings[0]!.subjectId;
  const repos = loadRepos(input.home, input.manifest);
  const files: { binding: Binding; text: string; abs: string }[] = [];
  const findings: string[] = [];
  for (const binding of input.bindings) {
    const repo = repos.get(binding.repositoryId);
    if (!repo) {
      return row(input.family, input.operation, subjectId, "failed", null, [
        `Binding ${binding.id} names unknown repository ${binding.repositoryId}.`,
      ]);
    }
    const located = locate(repo, binding.path);
    if (located.status === "escape") {
      return row(input.family, input.operation, subjectId, "failed", null, [`Binding ${binding.id} escapes its repository.`]);
    }
    if (located.status !== "ok") {
      return row(input.family, input.operation, subjectId, "needs_review", null, [
        `Binding ${binding.id} source ${binding.path} is not available. This check did not decide whether the subject exists.`,
      ]);
    }
    files.push({ binding, text: readFileSync(located.abs, "utf8"), abs: located.abs });
  }

  const fingerprint = inputSetFingerprint(
    files.map((file) => ({ path: file.binding.path, sha256: sha256Hex(Buffer.from(file.text, "utf8")) })),
  );

  if (input.family === "appfacts") return inspectAppFacts(input, subjectId, files, fingerprint, findings);
  return inspectFeatureFacts(input, subjectId, files, fingerprint, findings);
}

function inspectAppFacts(
  input: { operation: Operation; apply?: boolean },
  subjectId: string,
  files: { binding: Binding; text: string }[],
  fingerprint: string,
  findings: string[],
): AdapterResult {
  for (const file of files) {
    const front = splitFrontMatter(file.text);
    if (!front.ok) {
      return row("appfacts", input.operation, subjectId, "failed", fingerprint, [
        `Binding ${file.binding.id} has no AppFacts front matter. Manual fields were not rewritten.`,
      ]);
    }
    const parsed = parseYaml(front.yaml);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
      return row("appfacts", input.operation, subjectId, "failed", fingerprint, [
        `Binding ${file.binding.id} front matter is not an AppFacts object. Manual fields were not rewritten.`,
      ]);
    }
    const errors = pinnedErrors(pinnedValidators.appfacts, parsed.value);
    if (errors.length > 0) {
      return row("appfacts", input.operation, subjectId, "failed", fingerprint, [
        `Binding ${file.binding.id} does not match pinned AppFacts schema 0.1.0. Manual fields were not rewritten.`,
        ...errors.slice(0, 3),
      ]);
    }
    const record = parsed.value as Record<string, unknown>;
    findings.push(`name ${String(record.name)}; type ${String(record.type)}; status ${String(record.status)}.`);
    const reviewed = record.reviewed;
    if (reviewed && typeof reviewed === "object" && (reviewed as { status?: unknown }).status === "stale" && input.operation === "checkFreshness") {
      findings.push("The recorded review status is stale. The review attribution was left in place.");
      return row("appfacts", input.operation, subjectId, "needs_review", fingerprint, findings);
    }
  }
  if (input.operation === "propose") {
    findings.push("AppFacts manual fields are preserved. No file was written.");
  }
  return row("appfacts", input.operation, subjectId, "unchanged", fingerprint, findings);
}

function inspectFeatureFacts(
  input: { ledgerRoot: string; home: string; operation: Operation; apply?: boolean },
  subjectId: string,
  files: { binding: Binding; text: string }[],
  fingerprint: string,
  findings: string[],
): AdapterResult {
  const features: { id: string; name: string; bindingId: string }[] = [];
  for (const file of files) {
    const parsed = parseYaml(file.text);
    if (!parsed.ok) {
      return row("featurefacts", input.operation, subjectId, "failed", fingerprint, [
        `Binding ${file.binding.id} is not a FeatureFacts registry. Native ids were not confirmed.`,
      ]);
    }
    const errors = pinnedErrors(pinnedValidators.featurefacts, parsed.value);
    if (errors.length > 0) {
      return row("featurefacts", input.operation, subjectId, "failed", fingerprint, [
        `Binding ${file.binding.id} does not match pinned FeatureFacts registry schema 0.2.0. Native ids were not confirmed.`,
        ...errors.slice(0, 3),
      ]);
    }
    const list = (parsed.value as { features?: { id?: string; name?: string }[] }).features ?? [];
    if (list.length === 0) findings.push("The register has an empty selection. That is valid. No label was written.");
    for (const feature of list) {
      if (!feature.id || !feature.name) continue;
      features.push({ id: feature.id, name: feature.name, bindingId: file.binding.id });
      findings.push(`${feature.id}: ${feature.name}. ${NOT_COPIED}`);
    }
  }

  if (input.operation !== "propose") {
    return row("featurefacts", input.operation, subjectId, "unchanged", fingerprint, findings);
  }

  const edits = plannedTitleEdits(input.ledgerRoot, input.home, features);
  if (edits.length === 0) {
    findings.push("Cached titles already match the register. No file was written.");
    return row("featurefacts", input.operation, subjectId, "unchanged", fingerprint, findings);
  }
  const paths = edits.map((edit) => edit.path);
  if (!input.apply) {
    findings.push(`Proposed derived titles for ${paths.join(", ")}. ${NOT_COPIED} No file was written.`);
    return row("featurefacts", input.operation, subjectId, "needs_review", fingerprint, findings, paths);
  }
  const staged = stageTransaction(input.home, { id: "featurefacts-titles", files: edits.map((edit) => ({ path: edit.path, bytes: Buffer.from(edit.text, "utf8") })) });
  if (staged.status === "unchanged") {
    findings.push("Cached titles already match the register. No file was written.");
    return row("featurefacts", input.operation, subjectId, "unchanged", fingerprint, findings);
  }
  if (staged.status !== "staged") {
    return row("featurefacts", input.operation, subjectId, "failed", fingerprint, [staged.message]);
  }
  const applied = applyTransaction(input.home, "featurefacts-titles");
  if (!applied.ok) return row("featurefacts", input.operation, subjectId, "failed", fingerprint, [applied.message]);
  findings.push(`Updated derived titles in ${paths.join(", ")}. Attributed to appledger.featurefacts 0.1.0. ${NOT_COPIED}`);
  return row("featurefacts", input.operation, subjectId, "updated", fingerprint, findings, paths);
}

function plannedTitleEdits(
  ledgerRoot: string,
  home: string,
  features: { id: string; name: string; bindingId: string }[],
): { path: string; text: string }[] {
  const byRef = new Map(features.map((feature) => [`binding:${feature.bindingId}#${feature.id}`, feature.name]));
  const edits: { path: string; text: string }[] = [];
  const records = join(ledgerRoot, "records");
  if (!statExists(records)) return edits;
  walk(records, (file) => {
    const text = readFileSync(file, "utf8");
    const front = splitFrontMatter(text);
    if (!front.ok) return;
    const parsed = parseYaml(front.yaml);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return;
    const value = parsed.value as Record<string, unknown>;
    if (value.kind !== "capability_ref") return;
    const data = value.data;
    if (!data || typeof data !== "object") return;
    const external = (data as { external_ref?: unknown }).external_ref;
    if (typeof external !== "string" || !byRef.has(external)) return;
    const name = byRef.get(external)!;
    const next = withCachedTitle(text, name);
    if (next === text.replace(/\r\n/g, "\n")) return;
    edits.push({ path: relative(home, file).split(sep).join("/"), text: next });
  });
  return edits;
}

export function withCachedTitle(markdown: string, title: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const titleLine = `  cached_title: ${quoteYaml(title)}`;
  const basisLine = "  cached_title_basis: derived";
  let text = normalized;
  if (/^  cached_title:/m.test(text)) text = text.replace(/^  cached_title:.*$/m, titleLine);
  else if (/^  external_ref:/m.test(text)) text = text.replace(/^  external_ref:.*$/m, (line) => `${line}\n${titleLine}`);
  else return normalized;
  if (/^  cached_title_basis:/m.test(text)) text = text.replace(/^  cached_title_basis:.*$/m, basisLine);
  else text = text.replace(titleLine, `${titleLine}\n${basisLine}`);
  return text.endsWith("\n") ? text : `${text}\n`;
}

function quoteYaml(value: string): string {
  return /^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(value) ? value : JSON.stringify(value);
}

function row(
  family: "appfacts" | "featurefacts",
  operation: Operation,
  subjectId: string,
  disposition: AdapterResult["disposition"],
  inputFingerprint: string | null,
  findings: string[],
  changedFields: string[] = [],
): AdapterResult {
  const adapter = { id: `appledger.${family}`, version: "0.1.0", family };
  return {
    adapterId: adapter.id,
    adapterVersion: adapter.version,
    family,
    operation,
    subjectId,
    schemaVersion: family === "featurefacts" ? "0.2.0" : "0.1.0",
    disposition,
    inputFingerprint,
    changedFields,
    findings,
  };
}

type Binding = { id: string; family: Family; subjectId: string; repositoryId: string; path: string };

function readManifest(ledgerRoot: string): Record<string, unknown> {
  const parsed = parseYaml(readFileSync(join(ledgerRoot, "manifest.yaml"), "utf8"));
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    throw new Error("manifest.yaml could not be read");
  }
  return parsed.value as Record<string, unknown>;
}

function readBindings(manifest: Record<string, unknown>): Binding[] {
  if (!Array.isArray(manifest.bindings)) return [];
  const bindings: Binding[] = [];
  for (const item of manifest.bindings) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (record.family !== "appfacts" && record.family !== "featurefacts") continue;
    if (typeof record.id !== "string" || typeof record.subject_id !== "string") continue;
    if (typeof record.repository_id !== "string" || typeof record.path !== "string") continue;
    bindings.push({
      id: record.id,
      family: record.family,
      subjectId: record.subject_id,
      repositoryId: record.repository_id,
      path: record.path,
    });
  }
  return bindings;
}

function loadRepos(home: string, manifest: Record<string, unknown>): Map<string, string> {
  const repos = new Map<string, string>();
  if (!Array.isArray(manifest.repositories)) return repos;
  for (const item of manifest.repositories) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.root !== "string" || isUnsafeRelative(record.root)) continue;
    const abs = resolve(home, record.root);
    if (isInside(home, abs)) repos.set(record.id, abs);
  }
  return repos;
}

function locate(repoAbs: string, rel: string): { status: "ok"; abs: string } | { status: "missing" | "escape" } {
  if (isUnsafeRelative(rel)) return { status: "escape" };
  const abs = resolve(repoAbs, ...rel.split("/"));
  if (!isInside(repoAbs, abs)) return { status: "escape" };
  try {
    if (!statSync(abs).isFile()) return { status: "missing" };
  } catch {
    return { status: "missing" };
  }
  return { status: "ok", abs };
}

function statExists(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function walk(dir: string, visit: (file: string) => void): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, visit);
    else if (name.endsWith(".md")) visit(full);
  }
}
