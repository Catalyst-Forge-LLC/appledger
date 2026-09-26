import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { pinnedErrors, pinnedValidators } from "./pinned.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";
import type { AdapterResult, Operation } from "./adapters.js";

const FILESYSTEM: Record<string, number> = { none: 0, read: 1, scoped: 1, "read-write": 2 };
const NETWORK: Record<string, number> = { none: 0, allowlist: 1, unrestricted: 2 };

export function runAgentFactsOperation(input: {
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
          "No agent configuration was declared. This is not a missing label.",
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
    return row(operation, subjectId, "failed", null, ["One AgentFacts label is required for this subject. No label was written."]);
  }
  if (snapshots.length > 1) {
    return row(operation, subjectId, "failed", null, ["More than one recorded toolset list is bound. No label was written."]);
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
      `Binding ${labelBinding.id} has no AgentFacts front matter. The file was not rewritten.`,
    ]);
  }
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} front matter is not an AgentFacts object. The file was not rewritten.`,
    ]);
  }
  const errors = pinnedErrors(pinnedValidators.agentfacts, parsed.value);
  if (errors.length > 0) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} does not match pinned AgentFacts schema 0.1.0. The file was not rewritten.`,
      ...errors.slice(0, 3),
    ]);
  }
  const label = parsed.value as AgentLabel;
  const findings = [
    `Configuration ${label.name} is the labeled identity. It was not rewritten.`,
    "Host enforcement is unknown.",
  ];
  let disposition: AdapterResult["disposition"] = "unchanged";
  let effective = label.tools?.toolsets ?? [];
  const snapshot = snapshots[0];
  if (snapshot) {
    if (snapshot.repositoryId !== labelBinding.repositoryId) {
      return row(operation, subjectId, "failed", inputSetFingerprint(files), [
        "The recorded toolset list is not in the same repository as the label. The label was not rewritten.",
      ]);
    }
    const listed = locate(repo, snapshot.path);
    if (listed.status === "escape") return row(operation, subjectId, "failed", null, [`Binding ${snapshot.id} escapes its repository.`]);
    if (listed.status !== "ok") {
      disposition = "needs_review";
      findings.push(
        `Recorded toolset list ${snapshot.path} is not available. This check did not decide whether the subject exists.`,
      );
    } else {
      const raw = readFileSync(listed.abs, "utf8");
      files.push({ path: snapshot.path, sha256: sha256Hex(Buffer.from(raw, "utf8")) });
      const recorded = readSnapshot(raw);
      if (!recorded.ok) {
        disposition = "failed";
        findings.push(recorded.message);
      } else {
        if (recorded.subject && recorded.subject !== label.name) {
          disposition = "needs_review";
          findings.push(
            `The recorded subject ${recorded.subject} does not match declared configuration ${label.name}. Identity was not rewritten.`,
          );
        }
        if (!sameSet(recorded.toolsets, label.tools?.toolsets ?? [])) {
          disposition = "needs_review";
          findings.push(
            "Recorded toolsets differ from the declared toolsets. Reach claims are marked for review. The label was not rewritten.",
          );
          effective = recorded.toolsets;
        }
        if (recorded.observedAt) findings.push(`The recording time is ${recorded.observedAt}.`);
      }
    }
  }
  if (disposition !== "failed") {
    const scope = compareToolsets(repo, label, effective);
    if (scope.review) disposition = "needs_review";
    findings.push(...scope.findings);
    files.push(...scope.files);
  }
  if (readFileSync(located.abs, "utf8") !== original) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), ["The AgentFacts file changed during a read-only check."]);
  }
  return row(operation, subjectId, disposition, inputSetFingerprint(files), findings);
}

function compareToolsets(
  repo: string,
  label: AgentLabel,
  toolsets: string[],
): { review: boolean; findings: string[]; files: { path: string; sha256: string }[] } {
  const findings: string[] = [];
  const files: { path: string; sha256: string }[] = [];
  let review = false;
  let counted = 0;
  let parsedAll = toolsets.length > 0;
  for (const toolset of toolsets) {
    if (/^https?:\/\//i.test(toolset)) {
      parsedAll = false;
      findings.push(`Toolset ${toolset} is a URL and was not fetched. Tool reach was not compared.`);
      continue;
    }
    if (isUnsafeRelative(toolset)) {
      review = true;
      parsedAll = false;
      findings.push(`Toolset ${toolset} escapes the repository. The label was not rewritten.`);
      continue;
    }
    const located = locate(repo, toolset);
    if (located.status !== "ok") {
      review = true;
      parsedAll = false;
      findings.push(`Toolset ${toolset} is not available. This check did not decide whether the subject exists.`);
      continue;
    }
    const text = readFileSync(located.abs, "utf8");
    files.push({ path: toolset, sha256: sha256Hex(Buffer.from(text, "utf8")) });
    const tools = readTools(text);
    if (!tools.ok) {
      review = true;
      parsedAll = false;
      findings.push(`Toolset ${toolset} does not match pinned ToolFacts schema 0.1.0. Reach was not copied.`);
      continue;
    }
    counted += tools.tools.length;
    for (const tool of tools.tools) {
      const broader = broaderThan(label, tool);
      if (broader.length > 0) {
        review = true;
        findings.push(
          `Tool ${tool.name} in ${toolset} declares ${broader.join(" and ")}, which is broader than configuration ${label.name}. The configuration does not erase that tool reach. The label was not rewritten.`,
        );
      }
    }
  }
  if (parsedAll && label.tools && counted !== label.tools.count) {
    review = true;
    findings.push(
      `Declared tool count ${label.tools.count} does not match ${counted} tools in the referenced toolsets. The label was not rewritten.`,
    );
  }
  if (toolsets.length === 0) findings.push("No toolset is declared. Tool reach was not compared.");
  return { review, findings, files };
}

function broaderThan(label: AgentLabel, tool: ToolRow): string[] {
  const notes: string[] = [];
  const agentFs = FILESYSTEM[label.reach?.filesystem ?? ""];
  const toolFs = FILESYSTEM[tool.filesystem ?? ""];
  if (agentFs !== undefined && toolFs !== undefined && toolFs > agentFs) {
    notes.push(`filesystem ${tool.filesystem}`);
  }
  const agentNet = NETWORK[label.reach?.network ?? ""];
  const toolNet = NETWORK[tool.network ?? ""];
  if (agentNet !== undefined && toolNet !== undefined && toolNet > agentNet) notes.push(`network ${tool.network}`);
  if (label.tools?.executes_shell === false && tool.processes === true) notes.push("processes");
  return notes;
}

function readTools(text: string): { ok: true; tools: ToolRow[] } | { ok: false } {
  const front = splitFrontMatter(text);
  if (!front.ok) return { ok: false };
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return { ok: false };
  if (pinnedErrors(pinnedValidators.toolfacts, parsed.value).length > 0) return { ok: false };
  const label = parsed.value as { tools?: { name?: string; reach?: { filesystem?: string; network?: string; processes?: boolean } }[] };
  const tools = (label.tools ?? []).map((tool) => ({
    name: tool.name ?? "unnamed",
    filesystem: tool.reach?.filesystem,
    network: tool.reach?.network,
    processes: tool.reach?.processes,
  }));
  return { ok: true, tools };
}

function readSnapshot(raw: string): { ok: true; toolsets: string[]; subject?: string; observedAt?: string } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "The recorded toolset list is not JSON. The label was not rewritten." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "The recorded toolset list is not an object. The label was not rewritten." };
  }
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.toolsets) || record.toolsets.some((item) => typeof item !== "string")) {
    return { ok: false, message: "The recorded toolset list has no toolsets array. The label was not rewritten." };
  }
  return {
    ok: true,
    toolsets: record.toolsets as string[],
    subject: typeof record.subject === "string" ? record.subject : undefined,
    observedAt: typeof record.observed_at === "string" ? record.observed_at : undefined,
  };
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((item, index) => item === b[index]);
}

type AgentLabel = {
  name?: string;
  tools?: { count?: number; executes_shell?: boolean; toolsets?: string[] };
  reach?: { filesystem?: string; network?: string };
};

type ToolRow = { name: string; filesystem?: string; network?: string; processes?: boolean };

type Binding = { id: string; subjectId: string; repositoryId: string; path: string };

function row(
  operation: Operation,
  subjectId: string,
  disposition: AdapterResult["disposition"],
  inputFingerprint: string | null,
  findings: string[],
): AdapterResult {
  return {
    adapterId: "appledger.agentfacts",
    adapterVersion: "0.1.0",
    family: "agentfacts",
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
    if (record.family !== "agentfacts") continue;
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
