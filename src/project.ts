import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { sha256Hex } from "./digest.js";
import { resolveLedgerRoot } from "./check.js";
import { schemaErrors } from "./schemas.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";

export type PublicProjection = {
  markdown: string;
  fingerprint: string;
  publicCount: number;
  findings: string[];
};

type RecordFile = {
  id: string;
  kind: string;
  title: string;
  updatedAt: string;
  visibility: string;
  relations: { type: string; target: string }[];
  data: Record<string, unknown>;
  body: string;
};

export function projectLedger(root: string): PublicProjection {
  const ledgerRoot = resolveLedgerRoot(root);
  const records = loadRecords(ledgerRoot);
  const publicIds = new Set(records.filter((record) => record.visibility === "public").map((record) => record.id));
  const lines = [
    "# Public",
    "",
    "Selection: deterministic. No agent assistance. No upload or deploy.",
    "",
    `Public records: ${publicIds.size}`,
  ];
  for (const record of records.filter((item) => item.visibility === "public")) {
    lines.push("", `## ${record.id}`, "", `- Kind: ${record.kind}`, `- Title: ${record.title}`, `- Updated: ${record.updatedAt}`);
    for (const relation of record.relations) {
      if (publicIds.has(relation.target)) lines.push(`- Relation ${relation.type} ${relation.target}`);
      else lines.push("- A private relation was omitted.");
    }
    for (const field of publicDataLines(record)) lines.push(field);
    const body = record.body.trim();
    if (body) lines.push("", body);
  }
  const markdown = finish(lines.join("\n"));
  return {
    markdown,
    fingerprint: sha256Hex(Buffer.from(markdown, "utf8")),
    publicCount: publicIds.size,
    findings: policyFindings(ledgerRoot),
  };
}

export function writePublicProjection(ledgerRoot: string, markdown: string): { path: string; written: boolean } {
  const relativePath = "views/public.md";
  const absolute = resolve(ledgerRoot, relativePath);
  if (!isInside(ledgerRoot, absolute)) throw new Error(`Refusing to write ${relativePath}`);
  const next = finish(markdown);
  if (existsSync(absolute) && readFileSync(absolute, "utf8") === next) return { path: relativePath, written: false };
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, next);
  return { path: relativePath, written: true };
}

function publicDataLines(record: RecordFile): string[] {
  if (record.kind === "evidence") {
    const kind = stringValue(record.data.evidence_kind);
    return kind ? [`- Evidence kind: ${kind}`] : [];
  }
  if (record.kind === "stakeholder") {
    const role = stringValue(record.data.role);
    return role ? [`- Role: ${role}`] : [];
  }
  return [];
}

function policyFindings(ledgerRoot: string): string[] {
  const path = join(ledgerRoot, "policy.yaml");
  const tail = [
    "This projection does not represent a prior review as current independent approval.",
    "No child schema field was added.",
    "No upload or deploy was performed.",
  ];
  if (!existsSync(path)) {
    return ["No policy file is present. Missing policy does not grant publication.", ...tail];
  }
  const parsed = parseYaml(readFileSync(path, "utf8"));
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return ["Policy could not be read. Publication is not authorized.", ...tail];
  }
  const value = parsed.value as Record<string, unknown>;
  if (schemaErrors("policy", value, "policy.yaml").length > 0) {
    return ["Policy does not match the schema. Publication is not authorized.", ...tail];
  }
  const projection = value.public_projection;
  const targets =
    projection && typeof projection === "object" && !Array.isArray(projection) && Array.isArray((projection as { targets?: unknown }).targets)
      ? (projection as { targets: unknown[] }).targets
      : [];
  const notice =
    targets.length === 0
      ? "Policy names no publication target."
      : "Policy records publication targets. Those targets were not contacted.";
  return [notice, ...tail];
}

function loadRecords(ledgerRoot: string): RecordFile[] {
  let manifest: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(readFileSync(join(ledgerRoot, "manifest.yaml"), "utf8"));
    if (parsed.ok && parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)) {
      manifest = parsed.value as Record<string, unknown>;
    }
  } catch {
    return [];
  }
  const records: RecordFile[] = [];
  const roots = Array.isArray(manifest.record_roots) ? manifest.record_roots : [];
  for (const root of roots) {
    if (typeof root !== "string" || isUnsafeRelative(root)) continue;
    const dir = resolve(ledgerRoot, root);
    if (!isInside(ledgerRoot, dir) || !existsSync(dir)) continue;
    walk(dir, (file) => {
      const text = readFileSync(file, "utf8");
      const front = splitFrontMatter(text);
      if (!front.ok) return;
      const parsed = parseYaml(front.yaml);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return;
      const value = parsed.value as Record<string, unknown>;
      const id = stringValue(value.id);
      const kind = stringValue(value.kind);
      if (!id || !kind) return;
      const relations = Array.isArray(value.relations)
        ? value.relations.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const type = stringValue((item as { type?: unknown }).type);
            const target = stringValue((item as { target?: unknown }).target);
            return type && target ? [{ type, target }] : [];
          })
        : [];
      const data =
        value.data && typeof value.data === "object" && !Array.isArray(value.data) ? (value.data as Record<string, unknown>) : {};
      const split = text.indexOf("\n---\n");
      records.push({
        id,
        kind,
        title: stringValue(value.title) || id,
        updatedAt: stringValue(value.updated_at),
        visibility: stringValue(value.visibility),
        relations,
        data,
        body: split === -1 ? "" : text.slice(split + 5),
      });
    });
  }
  records.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return records;
}

function walk(dir: string, visit: (file: string) => void): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, visit);
    else if (entry.endsWith(".md")) visit(path);
  }
}

function finish(text: string): string {
  return `${text.replace(/\r\n/g, "\n").replace(/\s+$/u, "")}\n`;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
