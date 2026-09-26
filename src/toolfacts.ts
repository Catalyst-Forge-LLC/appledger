import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { pinnedErrors, pinnedValidators } from "./pinned.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";
import type { AdapterResult, Operation } from "./adapters.js";

export function runToolFactsOperation(input: {
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
          "No tool server was declared. This is not a missing label.",
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
  const inventories = group.filter((binding) => binding.path.endsWith(".json"));
  if (labels.length !== 1) {
    return row(operation, subjectId, "failed", null, ["One ToolFacts label is required for this subject. No label was written."]);
  }
  if (inventories.length > 1) {
    return row(operation, subjectId, "failed", null, ["More than one recorded tools/list is bound. No label was written."]);
  }
  const labelBinding = labels[0]!;
  const repo = repos.get(labelBinding.repositoryId);
  if (!repo) {
    return row(operation, subjectId, "failed", null, [
      `Binding ${labelBinding.id} names unknown repository ${labelBinding.repositoryId}.`,
    ]);
  }
  const located = locate(repo, labelBinding.path);
  if (located.status === "escape") {
    return row(operation, subjectId, "failed", null, [`Binding ${labelBinding.id} escapes its repository.`]);
  }
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
      `Binding ${labelBinding.id} has no ToolFacts front matter. The file was not rewritten.`,
    ]);
  }
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} front matter is not a ToolFacts object. The file was not rewritten.`,
    ]);
  }
  const errors = pinnedErrors(pinnedValidators.toolfacts, parsed.value);
  if (errors.length > 0) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      `Binding ${labelBinding.id} does not match pinned ToolFacts schema 0.1.0. The file was not rewritten.`,
      ...errors.slice(0, 3),
    ]);
  }
  const label = parsed.value as ToolLabel;
  const findings = [
    `Server ${label.name} version ${label.version} is declared. Tool annotations are declarations, not proof of side effects or enforcement.`,
    destinationFinding(label),
  ];
  let disposition: AdapterResult["disposition"] = "unchanged";
  const inventory = inventories[0];
  if (!inventory) {
    findings.push("No recorded tools/list was supplied. No MCP server was started.");
  } else if (inventory.repositoryId !== labelBinding.repositoryId) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), [
      "The recorded tools/list is not in the same repository as the label. The label was not rewritten.",
    ]);
  } else {
    const listed = locate(repo, inventory.path);
    if (listed.status === "escape") {
      return row(operation, subjectId, "failed", null, [`Binding ${inventory.id} escapes its repository.`]);
    }
    if (listed.status !== "ok") {
      disposition = "needs_review";
      findings.push(
        `Recorded tools/list ${inventory.path} is not available. No MCP server was started. This check did not decide whether the subject exists.`,
      );
    } else {
      const raw = readFileSync(listed.abs, "utf8");
      files.push({ path: inventory.path, sha256: sha256Hex(Buffer.from(raw, "utf8")) });
      const compared = compareList(label, raw);
      disposition = compared.disposition;
      findings.push(...compared.findings);
    }
  }
  if (readFileSync(located.abs, "utf8") !== original) {
    return row(operation, subjectId, "failed", inputSetFingerprint(files), ["The ToolFacts file changed during a read-only check."]);
  }
  return row(operation, subjectId, disposition, inputSetFingerprint(files), findings);
}

function destinationFinding(label: ToolLabel): string {
  const destinations = label.egress?.destinations ?? [];
  if (destinations.includes("undisclosed")) return "Egress destinations remain undisclosed. None were invented.";
  if (destinations.length === 0) return "The label declares no egress destinations. None were added.";
  return `Egress destinations stay as declared: ${destinations.join(", ")}. None were added.`;
}

function compareList(label: ToolLabel, raw: string): { disposition: AdapterResult["disposition"]; findings: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      disposition: "failed",
      findings: ["The recorded tools/list is not JSON. The label was not rewritten. No MCP server was started."],
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { disposition: "failed", findings: ["The recorded tools/list is not an object. The label was not rewritten."] };
  }
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.tools)) {
    return { disposition: "failed", findings: ["The recorded tools/list has no tools array. The label was not rewritten."] };
  }
  const recorded: RecordedTool[] = [];
  for (const item of record.tools) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof (item as { name?: unknown }).name !== "string") {
      return { disposition: "failed", findings: ["A recorded tool has no name. The label was not rewritten."] };
    }
    const tool = item as Record<string, unknown>;
    const annotations =
      tool.annotations && typeof tool.annotations === "object" && !Array.isArray(tool.annotations)
        ? (tool.annotations as { readOnlyHint?: unknown; destructiveHint?: unknown })
        : undefined;
    recorded.push({
      name: tool.name as string,
      description: typeof tool.description === "string" ? tool.description : "",
      readOnlyHint: typeof annotations?.readOnlyHint === "boolean" ? annotations.readOnlyHint : undefined,
      destructiveHint: typeof annotations?.destructiveHint === "boolean" ? annotations.destructiveHint : undefined,
    });
  }
  const findings = [
    "This comparison uses a recorded tools/list. It is not a live monitor. No MCP server was started.",
    "Name comparison does not prove that a same-named tool still matches the labeled implementation.",
  ];
  if (typeof record.observed_at === "string") findings.push(`The recording time is ${record.observed_at}.`);
  if (typeof record.subject === "string" && record.subject !== label.name) {
    findings.push(`The recorded subject ${record.subject} does not match declared server ${label.name}. The label was not rewritten.`);
    return { disposition: "needs_review", findings };
  }
  const labeled = new Map((label.tools ?? []).map((tool) => [tool.name, tool]));
  const seen = new Set(recorded.map((tool) => tool.name));
  let review = false;
  for (const tool of recorded) {
    const declared = labeled.get(tool.name);
    if (!declared) {
      review = true;
      const writes = tool.destructiveHint === true || tool.readOnlyHint === false;
      if (writes) {
        findings.push(
          `Recorded tools/list includes ${tool.name}, which is not on the label. Annotations declare a write. Annotations are not proof of side effects or enforcement. Reach is marked for review. Dependent AgentFacts review is requested. No AgentFacts label was written. The label was not rewritten.`,
        );
      } else {
        findings.push(
          `Recorded tools/list includes ${tool.name}, which is not on the label. Side effects were not classified from a missing or read-only annotation. The label was not rewritten.`,
        );
      }
      continue;
    }
    const text = `${declared.purpose} ${tool.description}`.toLowerCase();
    if (declared.side_effects === "none" && (text.includes("prompt") || text.includes("does not scan"))) {
      findings.push(
        `${tool.name} remains declared with side_effects none. A prompt-returning tool was not reclassified as a workspace scanner.`,
      );
    }
  }
  for (const name of labeled.keys()) {
    if (!seen.has(name)) {
      review = true;
      findings.push(`The label names ${name}, which is not in the recorded tools/list. The label was not rewritten.`);
    }
  }
  return { disposition: review ? "needs_review" : "unchanged", findings };
}

type ToolLabel = {
  name?: string;
  version?: string;
  egress?: { destinations?: string[] };
  tools?: { name: string; purpose?: string; side_effects?: string }[];
};

type RecordedTool = {
  name: string;
  description: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
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
    adapterId: "appledger.toolfacts",
    adapterVersion: "0.1.0",
    family: "toolfacts",
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
    if (record.family !== "toolfacts") continue;
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
