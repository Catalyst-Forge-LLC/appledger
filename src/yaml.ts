import { parseDocument, visit } from "yaml";

export type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: string[] };

/** Parse JSON-compatible YAML. Rejects duplicate keys, aliases, merge keys, and custom tags. */
export function parseYaml(text: string): ParseResult {
  const doc = parseDocument(text, {
    schema: "core",
    uniqueKeys: true,
    strict: true,
    merge: false,
  });
  const errors = doc.errors.map((err) => err.message);
  visit(doc, {
    Alias() {
      errors.push("YAML aliases are not allowed");
    },
    Scalar(_key, node) {
      if (typeof node.tag === "string" && node.tag.startsWith("!")) {
        errors.push(`Custom YAML tag ${node.tag} is not allowed`);
      }
    },
  });
  if (errors.length > 0) return { ok: false, errors };
  const value: unknown = doc.toJS({ maxAliasCount: 0 });
  if (!isJsonCompatible(value)) {
    return { ok: false, errors: ["YAML value is not JSON-compatible"] };
  }
  return { ok: true, value };
}

export function splitFrontMatter(
  text: string,
): { ok: true; yaml: string } | { ok: false; errors: string[] } {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) {
    return { ok: false, errors: ["Front matter must begin on the first line"] };
  }
  const lines = normalized.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) {
    return { ok: false, errors: ["Front matter is not closed"] };
  }
  return { ok: true, yaml: lines.slice(1, end).join("\n") };
}

function isJsonCompatible(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonCompatible);
  if (typeof value === "object") {
    if (value instanceof Date) return false;
    return Object.values(value as Record<string, unknown>).every(isJsonCompatible);
  }
  return false;
}
