import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { pinnedErrors, pinnedValidators } from "./pinned.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";
import type { AdapterResult, Operation } from "./adapters.js";

export function runModelFactsOperation(input: {
  ledgerRoot: string;
  operation: Operation;
  subjectId?: string;
}): AdapterResult[] {
  const home = resolve(input.ledgerRoot, "..");
  const manifest = readManifest(input.ledgerRoot);
  const applicationId = typeof manifest.application_id === "string" ? manifest.application_id : "";
  const bindings = readBindings(manifest).filter((binding) => !input.subjectId || binding.subjectId === input.subjectId);
  if (bindings.length === 0) {
    if (!input.subjectId || input.subjectId === applicationId) {
      return [
        row(input.operation, input.subjectId || applicationId, "not_applicable", null, [
          "No model was declared. This is not a missing label.",
        ]),
      ];
    }
    return [
      row(input.operation, input.subjectId, "not_applicable", null, [
        `No subject ${input.subjectId} was declared. This is not a missing label.`,
      ]),
    ];
  }
  const repos = loadRepos(home, manifest);
  const groups = new Map<string, Binding[]>();
  for (const binding of bindings) {
    const group = groups.get(binding.subjectId) ?? [];
    group.push(binding);
    groups.set(binding.subjectId, group);
  }
  return [...groups.entries()].map(([subjectId, group]) => inspect(subjectId, group, repos, input.operation));
}

function inspect(subjectId: string, group: Binding[], repos: Map<string, string>, operation: Operation): AdapterResult {
  const labels = group.filter((binding) => !binding.path.endsWith(".json"));
  const snapshots = group.filter((binding) => binding.path.endsWith(".json"));
  if (labels.length !== 1) {
    return row(operation, subjectId, "failed", null, ["One ModelFacts label is required for this subject. No label was written."]);
  }
  if (snapshots.length > 1) {
    return row(operation, subjectId, "failed", null, ["More than one offline metadata file is bound. No label was written."]);
  }
  const labelBinding = labels[0]!;
  const repo = repos.get(labelBinding.repositoryId);
  if (!repo) {
    return row(operation, subjectId, "failed", null, [
      `Binding ${labelBinding.id} names unknown repository ${labelBinding.repositoryId}.`,
    ]);
  }
  const located = locate(repo, labelBinding.path);
  if (located.status === "escape") return row(operation, subjectId, "failed", null, [`Binding ${labelBinding.id} escapes its repository.`]);
  if (located.status !== "ok") {
    return row(operation, subjectId, "needs_review", null, [
      `Binding ${labelBinding.id} source ${labelBinding.path} is not available. This check did not decide whether the subject exists.`,
    ]);
  }
  const original = readFileSync(located.abs, "utf8");
  const files = [{ path: labelBinding.path, sha256: sha256Hex(Buffer.from(original, "utf8")) }];
  const front = splitFrontMatter(original);
  if (!front.ok) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} has no ModelFacts front matter. The file was not rewritten.`,
    ]);
  }
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} front matter is not a ModelFacts object. The file was not rewritten.`,
    ]);
  }
  const errors = pinnedErrors(pinnedValidators.modelfacts, parsed.value);
  if (errors.length > 0) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} does not match pinned ModelFacts schema 0.1.0. The file was not rewritten.`,
      ...errors.slice(0, 3),
    ]);
  }
  const label = parsed.value as ModelLabel;
  const findings = [
    "No provider was contacted.",
    "A model card is not evaluation evidence for the application's deployment. Capability and safety assessments stay attributed to the label.",
  ];
  let disposition: AdapterResult["disposition"] = "unchanged";
  const snapshot = snapshots[0];
  if (!snapshot) {
    findings.push("No offline metadata was supplied. Unknown fields were not inferred.");
  } else if (snapshot.repositoryId !== labelBinding.repositoryId) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      "The offline metadata is not in the same repository as the label. The label was not rewritten.",
    ]);
  } else {
    const listed = locate(repo, snapshot.path);
    if (listed.status === "escape") return row(operation, subjectId, "failed", null, [`Binding ${snapshot.id} escapes its repository.`]);
    if (listed.status !== "ok") {
      disposition = "needs_review";
      findings.push(`Offline metadata ${snapshot.path} is not available. This check did not decide whether the subject exists.`);
    } else {
      const raw = readFileSync(listed.abs, "utf8");
      files.push({ path: snapshot.path, sha256: sha256Hex(Buffer.from(raw, "utf8")) });
      const compared = compareOffline(label, raw);
      disposition = compared.disposition;
      findings.push(...compared.findings);
    }
  }
  if (readFileSync(located.abs, "utf8") !== original) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), ["The ModelFacts file changed during a read-only check."]);
  }
  return row(operation, subjectId, disposition, inputSetFingerprint(files), findings);
}

function compareOffline(label: ModelLabel, raw: string): { disposition: AdapterResult["disposition"]; findings: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { disposition: "failed", findings: ["The offline metadata is not JSON. The label was not rewritten."] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { disposition: "failed", findings: ["The offline metadata is not an object. The label was not rewritten."] };
  }
  const record = parsed as Record<string, unknown>;
  const offline = {
    name: stringField(record.name),
    developer: stringField(record.developer),
    quantization: stringField(record.quantization),
    contextWindow: stringField(record.context_window),
    family: stringField(record.family),
    observedAt: stringField(record.observed_at),
  };
  const findings: string[] = [];
  if (offline.observedAt) findings.push(`The recording time is ${offline.observedAt}.`);
  const exact = Boolean(offline.name && offline.developer && offline.quantization);
  if (!exact) {
    const family = offline.family ? ` Offline metadata names family ${offline.family}.` : "";
    findings.push(
      `Offline metadata does not state an exact name, developer, and quantization.${family} No rating was inferred from a family name. The label was not rewritten.`,
    );
    return { disposition: "needs_review", findings };
  }
  const same =
    offline.name === label.name &&
    offline.developer === label.developer &&
    offline.quantization === label.architecture?.quantization;
  const context = label.architecture?.context_window ?? "";
  const benchmarks = (label.benchmarks ?? []).map((item) => item.name).filter((name): name is string => Boolean(name));
  if (!same) {
    const listed = benchmarks.length > 0 ? benchmarks.join(", ") : "none";
    findings.push(
      `Offline metadata identifies ${offline.name} with quantization ${offline.quantization}. The label identifies ${label.name} with quantization ${label.architecture?.quantization}. Context window ${context} and benchmarks ${listed} were not copied onto the offline variant. The label was not rewritten.`,
    );
    return { disposition: "needs_review", findings };
  }
  findings.push("Identity matches offline metadata for name, developer, and quantization.");
  if (!offline.contextWindow) {
    if (context === "undisclosed") findings.push("Context window remains undisclosed.");
    else {
      findings.push(`Context window ${context} was not in the offline metadata. It was not confirmed and was not inferred. The label was not rewritten.`);
      return { disposition: "needs_review", findings };
    }
  } else if (offline.contextWindow !== context) {
    findings.push(
      `Context window on the label is ${context}. Offline metadata says ${offline.contextWindow}. The values were not merged. The label was not rewritten.`,
    );
    return { disposition: "needs_review", findings };
  }
  if (benchmarks.length > 0) findings.push(`Benchmarks ${benchmarks.join(", ")} stay attributed to ${label.name}.`);
  return { disposition: "unchanged", findings };
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

type ModelLabel = {
  name?: string;
  developer?: string;
  architecture?: { quantization?: string; context_window?: string };
  benchmarks?: { name?: string }[];
};

type Binding = { id: string; subjectId: string; repositoryId: string; path: string };

function row(
  operation: Operation,
  subjectId: string,
  disposition: AdapterResult["disposition"],
  inputFingerprint: string | null,
  findings: string[],
): AdapterResult {
  return {
    adapterId: "appledger.modelfacts",
    adapterVersion: "0.1.0",
    family: "modelfacts",
    operation,
    subjectId,
    schemaVersion: "0.1.0",
    disposition,
    inputFingerprint,
    changedFields: [],
    findings,
  };
}

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
    if (record.family !== "modelfacts") continue;
    if (typeof record.id !== "string" || typeof record.subject_id !== "string") continue;
    if (typeof record.repository_id !== "string" || typeof record.path !== "string") continue;
    bindings.push({
      id: record.id,
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
