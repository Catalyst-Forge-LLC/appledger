import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { resolveLedgerRoot } from "./check.js";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml } from "./yaml.js";

export const FAMILIES = ["appfacts", "featurefacts", "toolfacts", "agentfacts", "skillfacts", "modelfacts"] as const;

export type Family = (typeof FAMILIES)[number];

export const OPERATIONS = [
  "discover",
  "extract",
  "propose",
  "validate",
  "render",
  "checkFreshness",
  "projectPublic",
] as const;

export type Operation = (typeof OPERATIONS)[number];

export const DISPOSITIONS = ["updated", "unchanged", "needs_review", "unsupported", "failed", "not_applicable"] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

export type AdapterDeclaration = {
  id: string;
  version: string;
  family: Family;
  schemaVersions: string[];
  subjectTypes: string[];
  inputTypes: string[];
  deterministicOperations: Operation[];
  agentAssistedOperations: Operation[];
  network: boolean;
  runtime: boolean;
  ownedFields: string[];
  excludedPaths: string[];
};

export type AdapterResult = {
  adapterId: string;
  adapterVersion: string;
  family: Family;
  operation: Operation;
  subjectId: string;
  schemaVersion: string | null;
  disposition: Disposition;
  inputFingerprint: string | null;
  changedFields: string[];
  findings: string[];
};

const EXCLUDED_PREFIXES = [".appledger-cache/", "node_modules/", "site/build/", "site/node_modules/"];

export const ADAPTERS: AdapterDeclaration[] = FAMILIES.map((family) => ({
  id: `appledger.${family}`,
  version: "0.1.0",
  family,
  schemaVersions: [],
  subjectTypes: subjectTypes(family),
  inputTypes: ["binding"],
  deterministicOperations: ["discover"],
  agentAssistedOperations: [],
  network: false,
  runtime: false,
  ownedFields: [],
  excludedPaths: EXCLUDED_PREFIXES,
}));

export function discoverSubjects(input: { root: string; family?: Family; subjectId?: string }): AdapterResult[] {
  return runOperation({ ...input, operation: "discover" });
}

export function runOperation(input: {
  root: string;
  operation: Operation;
  family?: Family;
  subjectId?: string;
}): AdapterResult[] {
  const ledgerRoot = resolveLedgerRoot(input.root);
  if (input.operation !== "discover") {
    const families = input.family ? [input.family] : FAMILIES;
    return families.map((family) =>
      result(adapterFor(family), input.operation, input.subjectId ?? "", "unsupported", null, [
        `${input.operation} is not implemented for ${family}. No label was written.`,
      ]),
    );
  }

  const manifest = readManifest(ledgerRoot);
  const home = resolve(ledgerRoot, "..");
  const repos = loadRepos(home, manifest);
  const groups = new Map<string, Binding[]>();
  for (const binding of readBindings(manifest)) {
    if (input.family && binding.family !== input.family) continue;
    if (input.subjectId && binding.subjectId !== input.subjectId) continue;
    const key = `${binding.family}\0${binding.subjectId}`;
    const list = groups.get(key) ?? [];
    list.push(binding);
    groups.set(key, list);
  }

  const rows: AdapterResult[] = [];
  for (const bindings of groups.values()) {
    rows.push(bindingRow(bindings, repos));
  }
  addApplicationSubjects(rows, manifest, input.family, input.subjectId);
  addAbsentFamilies(rows, input.family, input.subjectId);
  rows.sort((left, right) => {
    const family = FAMILIES.indexOf(left.family) - FAMILIES.indexOf(right.family);
    if (family !== 0) return family;
    return left.subjectId.localeCompare(right.subjectId);
  });
  return rows;
}

function bindingRow(bindings: Binding[], repos: Map<string, string>): AdapterResult {
  const first = bindings[0]!;
  const adapter = adapterFor(first.family);
  const findings: string[] = [];
  const files: { path: string; sha256: string }[] = [];
  let failed = false;
  for (const binding of bindings) {
    if (EXCLUDED_PREFIXES.some((prefix) => binding.path.startsWith(prefix))) {
      findings.push(`Binding ${binding.id} path ${binding.path} is an excluded generated path and was not read.`);
      continue;
    }
    const repo = repos.get(binding.repositoryId);
    if (!repo) {
      failed = true;
      findings.push(`Binding ${binding.id} names unknown repository ${binding.repositoryId}.`);
      continue;
    }
    const located = locate(repo, binding.path);
    if (located.status === "escape") {
      failed = true;
      findings.push(`Binding ${binding.id} escapes its repository.`);
      continue;
    }
    if (located.status === "missing") {
      findings.push(`Binding ${binding.id} source ${binding.path} is not available. This check did not decide whether the subject exists.`);
      continue;
    }
    if (located.status === "unreadable") {
      findings.push(`Binding ${binding.id} source ${binding.path} could not be read as a file.`);
      continue;
    }
    if (located.status !== "ok") continue;
    files.push({ path: binding.path, sha256: sha256Hex(readFileSync(located.abs)) });
    if (binding.schemaVersion) {
      findings.push(`Binding ${binding.id} records schema_version ${binding.schemaVersion}. No child schema is pinned, so it was not validated.`);
    }
  }
  if (!failed && files.length > 0) {
    findings.push(`The ${first.family} parser is not implemented, so native ids were neither confirmed nor denied. No label was written.`);
  }
  let disposition: Disposition = "unsupported";
  if (failed) disposition = "failed";
  else if (files.length === 0) disposition = "needs_review";
  const schemaVersion = bindings.find((binding) => binding.schemaVersion)?.schemaVersion ?? null;
  return result(adapter, "discover", first.subjectId, disposition, files.length > 0 ? inputSetFingerprint(files) : null, findings, schemaVersion);
}

function addApplicationSubjects(
  rows: AdapterResult[],
  manifest: Record<string, unknown>,
  family: Family | undefined,
  subjectId: string | undefined,
): void {
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  if (!applicationId) return;
  if (subjectId && subjectId !== applicationId) return;
  for (const applicable of ["appfacts", "featurefacts"] as const) {
    if (family && family !== applicable) continue;
    if (rows.some((row) => row.family === applicable && row.subjectId === applicationId)) continue;
    rows.push(
      result(adapterFor(applicable), "discover", applicationId, "unsupported", null, [
        "The application is a subject and no register is bound. No label was written.",
      ]),
    );
  }
}

function addAbsentFamilies(rows: AdapterResult[], family: Family | undefined, subjectId: string | undefined): void {
  if (subjectId) {
    if (rows.length > 0) return;
    const chosen = family ?? "appfacts";
    rows.push(
      result(adapterFor(chosen), "discover", subjectId, "not_applicable", null, [
        `No subject ${subjectId} was declared. This is not a missing label.`,
      ]),
    );
    return;
  }
  for (const item of FAMILIES) {
    if (family && family !== item) continue;
    if (rows.some((row) => row.family === item)) continue;
    rows.push(
      result(adapterFor(item), "discover", "", "not_applicable", null, [
        "No subject of this family was declared. This is not a missing label.",
      ]),
    );
  }
}

function result(
  adapter: AdapterDeclaration,
  operation: Operation,
  subjectId: string,
  disposition: Disposition,
  inputFingerprint: string | null,
  findings: string[],
  schemaVersion: string | null = null,
): AdapterResult {
  return {
    adapterId: adapter.id,
    adapterVersion: adapter.version,
    family: adapter.family,
    operation,
    subjectId,
    schemaVersion,
    disposition,
    inputFingerprint,
    changedFields: [],
    findings,
  };
}

type Binding = {
  id: string;
  family: Family;
  subjectId: string;
  repositoryId: string;
  path: string;
  schemaVersion: string | null;
};

function readBindings(manifest: Record<string, unknown>): Binding[] {
  if (!Array.isArray(manifest.bindings)) return [];
  const bindings: Binding[] = [];
  for (const item of manifest.bindings) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const family = record.family;
    if (!isFamily(family) || typeof record.id !== "string" || typeof record.subject_id !== "string") continue;
    if (typeof record.repository_id !== "string" || typeof record.path !== "string") continue;
    bindings.push({
      id: record.id,
      family,
      subjectId: record.subject_id,
      repositoryId: record.repository_id,
      path: record.path,
      schemaVersion: typeof record.schema_version === "string" ? record.schema_version : null,
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
    if (typeof record.id !== "string" || typeof record.root !== "string") continue;
    if (isUnsafeRelative(record.root)) continue;
    const abs = resolve(home, record.root);
    if (!isInside(home, abs)) continue;
    repos.set(record.id, abs);
  }
  return repos;
}

function locate(repoAbs: string, rel: string): { status: "ok"; abs: string } | { status: "missing" | "escape" | "unreadable" } {
  if (isUnsafeRelative(rel)) return { status: "escape" };
  const abs = resolve(repoAbs, ...rel.split("/"));
  if (!isInside(repoAbs, abs)) return { status: "escape" };
  if (!existsSync(abs)) return { status: "missing" };
  let real: string;
  try {
    real = realpathSync(abs);
  } catch {
    return { status: "unreadable" };
  }
  if (!isInside(repoAbs, real)) return { status: "escape" };
  try {
    if (!statSync(real).isFile()) return { status: "unreadable" };
    return { status: "ok", abs: real };
  } catch {
    return { status: "unreadable" };
  }
}

function readManifest(ledgerRoot: string): Record<string, unknown> {
  const parsed = parseYaml(readFileSync(resolve(ledgerRoot, "manifest.yaml"), "utf8"));
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    throw new Error("manifest.yaml could not be read");
  }
  return parsed.value as Record<string, unknown>;
}

function adapterFor(family: Family): AdapterDeclaration {
  const found = ADAPTERS.find((adapter) => adapter.family === family);
  if (!found) throw new Error(`No adapter for ${family}`);
  return found;
}

function subjectTypes(family: Family): string[] {
  if (family === "appfacts" || family === "featurefacts") return ["application"];
  if (family === "toolfacts") return ["tool_server"];
  if (family === "agentfacts") return ["agent_configuration"];
  if (family === "skillfacts") return ["skill_package"];
  return ["model_variant"];
}

function isFamily(value: unknown): value is Family {
  return typeof value === "string" && (FAMILIES as readonly string[]).includes(value);
}
