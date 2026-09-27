import { spawnSync } from "node:child_process";
import { relative, resolve, sep } from "node:path";
import { resolveLedgerRoot } from "./check.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";

export type DiffKind = "semantic" | "formatting" | "added" | "removed" | "regenerated" | "unparsed";

export type DiffEntry = {
  path: string;
  kind: DiffKind;
  detail: string;
};

export type DiffResult = {
  from: string;
  to: string;
  entries: DiffEntry[];
  note: string;
};

const NOTE =
  "Compared tracked files in the current ledger directory at two explicit revisions. This command does not write files, does not reconstruct earlier ledger state from change records, and does not search a ledger that lived at a different path.";

export function diffLedger(input: { root: string; from: string; to: string }): DiffResult {
  const ledgerRoot = resolveLedgerRoot(input.root);
  const toplevel = gitOrThrow(ledgerRoot, ["rev-parse", "--show-toplevel"]).trim();
  const from = resolveCommit(toplevel, input.from);
  const to = resolveCommit(toplevel, input.to);
  const prefix = ledgerPrefix(toplevel, ledgerRoot);
  const paths = new Set<string>([...listLedger(toplevel, from, prefix), ...listLedger(toplevel, to, prefix)]);
  const entries: DiffEntry[] = [];
  for (const path of [...paths].sort()) {
    const before = readBlob(toplevel, from, path);
    const after = readBlob(toplevel, to, path);
    const entry = classify(path, before, after);
    if (entry) entries.push(entry);
  }
  return { from, to, entries, note: NOTE };
}

export function diffMarkdown(result: DiffResult): string {
  const lines = [
    "# Diff",
    "",
    `From: ${result.from}`,
    `To: ${result.to}`,
    "",
    result.note,
    "",
  ];
  if (result.from === result.to) {
    lines.push("The two revisions are the same commit.");
    lines.push("");
  }
  const groups: DiffKind[] = ["semantic", "added", "removed", "formatting", "regenerated", "unparsed"];
  for (const kind of groups) {
    const rows = result.entries.filter((entry) => entry.kind === kind);
    if (rows.length === 0) continue;
    lines.push(`## ${capitalize(kind)}`, "");
    for (const row of rows) lines.push(`- ${row.path} — ${row.detail}`);
    lines.push("");
  }
  if (result.entries.length === 0) {
    lines.push("No ledger file differs between these revisions.");
    lines.push("");
  }
  return lines.join("\n");
}

function classify(path: string, before: Buffer | undefined, after: Buffer | undefined): DiffEntry | undefined {
  if (before && after && before.equals(after)) return undefined;
  if (isView(path)) {
    if (!before) return { path, kind: "regenerated", detail: "Present at the to revision only. A generated view is not a semantic record change." };
    if (!after) return { path, kind: "regenerated", detail: "Present at the from revision only. A generated view is not a semantic record change." };
    return { path, kind: "regenerated", detail: "Bytes differ. A generated view is not a semantic record change." };
  }
  if (!before) return { path, kind: "added", detail: "Present at the to revision only." };
  if (!after) return { path, kind: "removed", detail: "Present at the from revision only." };
  const left = decode(before);
  const right = decode(after);
  if (!left || !right) {
    return { path, kind: "unparsed", detail: "The bytes are not UTF-8 text, so this change was not classified as semantic or formatting." };
  }
  if (path.endsWith(".md") && path.includes("/records/")) return classifyRecord(path, left, right);
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return classifyYaml(path, left, right);
  if (collapse(left) === collapse(right)) {
    return { path, kind: "formatting", detail: "Text matches after whitespace is ignored." };
  }
  return { path, kind: "semantic", detail: "text" };
}

function classifyRecord(path: string, left: string, right: string): DiffEntry {
  const parsedLeft = recordParts(left);
  const parsedRight = recordParts(right);
  if (!parsedLeft || !parsedRight) {
    return { path, kind: "unparsed", detail: "Front matter could not be parsed, so this change was not classified as semantic or formatting." };
  }
  const keys = changedKeys(parsedLeft.data, parsedRight.data);
  const bodyChanged = collapse(parsedLeft.body) !== collapse(parsedRight.body);
  if (keys.length === 0 && !bodyChanged) {
    return { path, kind: "formatting", detail: "Parsed record matches. Only bytes or whitespace differ." };
  }
  const parts = [...keys];
  if (bodyChanged) parts.push("body");
  return { path, kind: "semantic", detail: parts.join(", ") };
}

function classifyYaml(path: string, left: string, right: string): DiffEntry {
  const parsedLeft = parseYaml(left);
  const parsedRight = parseYaml(right);
  if (!parsedLeft.ok || !parsedRight.ok) {
    return { path, kind: "unparsed", detail: "YAML could not be parsed, so this change was not classified as semantic or formatting." };
  }
  const keys = changedKeys(parsedLeft.value, parsedRight.value);
  if (keys.length === 0) return { path, kind: "formatting", detail: "Parsed YAML matches. Only bytes or whitespace differ." };
  return { path, kind: "semantic", detail: keys.join(", ") };
}

function recordParts(text: string): { data: unknown; body: string } | undefined {
  const split = splitFrontMatter(text);
  if (!split.ok) return undefined;
  const parsed = parseYaml(split.yaml);
  if (!parsed.ok) return undefined;
  const marker = text.indexOf("\n---", 3);
  const body = marker === -1 ? "" : text.slice(marker + 4);
  return { data: parsed.value, body };
}

function changedKeys(left: unknown, right: unknown): string[] {
  if (!isMapping(left) || !isMapping(right)) {
    return stable(left) === stable(right) ? [] : ["value"];
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].filter((key) => stable(left[key]) !== stable(right[key])).sort();
}

function isView(path: string): boolean {
  return path === "views" || path.startsWith("views/") || path.includes("/views/");
}

function listLedger(toplevel: string, revision: string, prefix: string): string[] {
  const args = ["ls-tree", "-r", "-z", "--name-only", revision];
  if (prefix) args.push("--", prefix);
  const output = gitOrThrow(toplevel, args);
  return output
    .split("\0")
    .filter((path) => inLedger(path, prefix));
}

function readBlob(toplevel: string, revision: string, path: string): Buffer | undefined {
  const result = spawnSync("git", ["cat-file", "blob", `${revision}:${path}`], { cwd: toplevel });
  if (result.status !== 0) return undefined;
  return result.stdout ?? Buffer.alloc(0);
}

function resolveCommit(toplevel: string, revision: string): string {
  if (revision.startsWith("-")) throw new Error(`Revision ${revision} is not a commit.`);
  const output = gitOrThrow(toplevel, ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`]).trim();
  if (!/^[0-9a-f]{40}$/i.test(output)) throw new Error(`Revision ${revision} did not resolve to a commit.`);
  return output.toLowerCase();
}

function gitOrThrow(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    const detail = (result.stderr || result.error?.message || "git failed").trim();
    throw new Error(detail);
  }
  return result.stdout ?? "";
}

function ledgerPrefix(toplevel: string, ledgerRoot: string): string {
  const rel = relative(resolve(toplevel), resolve(ledgerRoot));
  if (rel.startsWith("..")) throw new Error("The ledger is outside the git repository.");
  return rel.split(sep).join("/");
}

function inLedger(path: string, prefix: string): boolean {
  if (prefix) return path === prefix || path.startsWith(`${prefix}/`);
  return (
    path === "manifest.yaml" ||
    path === "policy.yaml" ||
    path === "README.md" ||
    path.startsWith("profiles/") ||
    path.startsWith("records/") ||
    path.startsWith("views/")
  );
}

function decode(bytes: Buffer): string | undefined {
  if (bytes.includes(0)) return undefined;
  return bytes.toString("utf8");
}

function collapse(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stable(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isMapping(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key]);
    return out;
  }
  return value;
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
