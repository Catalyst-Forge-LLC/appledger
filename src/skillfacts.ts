import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { inputSetFingerprint, sha256Hex } from "./digest.js";
import { pinnedErrors, pinnedValidators } from "./pinned.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";
import type { AdapterResult, Operation } from "./adapters.js";

const NETWORK = /https?:\/\/|\bfetch\s*\(|\bcurl\s|\bwget\s/i;

export function runSkillFactsOperation(input: {
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
          "No skill package was declared. This is not a missing label.",
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
  return bindings.map((binding) => inspect(binding, repos.get(binding.repositoryId), input.operation));
}

function inspect(binding: Binding, repo: string | undefined, operation: Operation): AdapterResult {
  if (!repo) {
    return row(operation, binding.subjectId, "failed", null, [`Binding ${binding.id} names unknown repository ${binding.repositoryId}.`]);
  }
  const located = locate(repo, binding.path);
  if (located.status === "escape") return row(operation, binding.subjectId, "failed", null, [`Binding ${binding.id} escapes its repository.`]);
  if (located.status !== "ok") {
    return row(operation, binding.subjectId, "needs_review", null, [
      `Binding ${binding.id} source ${binding.path} is not available. This check did not decide whether the subject exists.`,
    ]);
  }
  const original = readFileSync(located.abs, "utf8");
  const fingerprint = inputSetFingerprint([{ path: binding.path, sha256: sha256Hex(Buffer.from(original, "utf8")) }]);
  const front = splitFrontMatter(original);
  if (!front.ok) {
    return row(operation, binding.subjectId, "failed", fingerprint, [
      `Binding ${binding.id} has no SkillFacts front matter. The file was not rewritten.`,
    ]);
  }
  const parsed = parseYaml(front.yaml);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return row(operation, binding.subjectId, "failed", fingerprint, [
      `Binding ${binding.id} front matter is not a SkillFacts object. The file was not rewritten.`,
    ]);
  }
  const errors = pinnedErrors(pinnedValidators.skillfacts, parsed.value);
  if (errors.length > 0) {
    return row(operation, binding.subjectId, "failed", fingerprint, [
      `Binding ${binding.id} does not match pinned SkillFacts schema 0.1.0. The file was not rewritten.`,
      ...errors.slice(0, 3),
    ]);
  }
  const label = parsed.value as SkillLabel;
  const findings = [
    `Purpose is declared as: ${label.purpose}. This states what the skill teaches. It does not show what the host permits.`,
  ];
  const generator = label.generated?.generator ?? "";
  if (generator === "skillfacts-from-pack") {
    findings.push("Reach values from generator skillfacts-from-pack are keyword guesses. They are not extracted truth.");
  }
  const review = scriptReview(located.abs, repo, label);
  findings.push(...review.findings);
  if (readFileSync(located.abs, "utf8") !== original) {
    return row(operation, binding.subjectId, "failed", fingerprint, ["The SkillFacts file changed during a read-only check."]);
  }
  return row(operation, binding.subjectId, review.disposition, fingerprint, findings);
}

function scriptReview(
  labelPath: string,
  repo: string,
  label: SkillLabel,
): { disposition: AdapterResult["disposition"]; findings: string[] } {
  const scripts = (label.bundled_artifacts ?? []).filter((item) => item.kind === "script");
  if (scripts.length === 0) return { disposition: "unchanged", findings: ["No bundled script is listed."] };
  const findings: string[] = [];
  let review = false;
  const base = dirname(labelPath);
  for (const script of scripts) {
    if (isUnsafeRelative(script.path)) {
      review = true;
      findings.push(`Bundled script path ${script.path} is not inside the repository. The label was not rewritten.`);
      continue;
    }
    const abs = resolve(base, ...script.path.split("/"));
    if (!isInside(repo, abs)) {
      review = true;
      findings.push(`Bundled script ${script.path} escapes the repository. The label was not rewritten.`);
      continue;
    }
    let real = abs;
    try {
      if (!statSync(abs).isFile()) {
        review = true;
        findings.push(`Bundled script ${script.path} is not available. This check did not decide whether the subject exists.`);
        continue;
      }
      real = realpathSync(abs);
    } catch {
      review = true;
      findings.push(`Bundled script ${script.path} is not available. This check did not decide whether the subject exists.`);
      continue;
    }
    if (!isInside(repo, real)) {
      review = true;
      findings.push(`Bundled script ${script.path} escapes the repository. The label was not rewritten.`);
      continue;
    }
    const text = readFileSync(real, "utf8");
    if (!NETWORK.test(text)) {
      findings.push(`Bundled script ${script.path} was read and not executed. No network call was seen in the text.`);
      continue;
    }
    const recorded = label.instructions_reach?.network ?? "undisclosed";
    if (recorded === "none" || recorded === "undisclosed") {
      review = true;
      findings.push(
        `Bundled script ${script.path} contains a network call. Recorded network reach remains ${recorded}. Approved fields were not rewritten. This is a draft reading of the script text, not host permission and not an execution.`,
      );
    } else {
      findings.push(
        `Bundled script ${script.path} contains a network call. Recorded network reach is already ${recorded}. Approved fields were not rewritten.`,
      );
    }
  }
  return { disposition: review ? "needs_review" : "unchanged", findings };
}

type SkillLabel = {
  purpose?: string;
  generated?: { generator?: string };
  instructions_reach?: { network?: string };
  bundled_artifacts?: { path: string; kind: string }[];
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
    adapterId: "appledger.skillfacts",
    adapterVersion: "0.1.0",
    family: "skillfacts",
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
    if (record.family !== "skillfacts") continue;
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
