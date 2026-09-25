import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkLedger } from "../src/check.js";
import { parseYaml } from "../src/yaml.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const minimal = join(repoRoot, "examples/minimal/appledger");
const product = join(repoRoot, "appledger");

describe("appledger check", () => {
  it("accepts the synthetic minimal ledger", () => {
    const result = checkLedger(minimal);
    expect(result.findings.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts the product ledger from the repository root", () => {
    const result = checkLedger(repoRoot);
    expect(result.ledgerRoot).toBe(product);
    expect(result.findings.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate YAML keys and aliases", () => {
    expect(parseYaml("a: 1\na: 2\n").ok).toBe(false);
    expect(parseYaml("a: &anchor 1\nb: *anchor\n").ok).toBe(false);
  });

  it("accepts the policy sample inside a ledger", () => {
    const dir = copyMinimal();
    cpSync(join(repoRoot, "examples/policy.sample.yaml"), join(dir, "policy.yaml"));
    expect(checkLedger(dir).ok).toBe(true);
  });

  it("rejects a record status outside the enum", () => {
    const dir = copyMinimal();
    const file = join(dir, "records/application/app-workshop-demo.md");
    const text = read(file).replace("record_status: active", "record_status: nope");
    writeFileSync(file, text);
    const result = checkLedger(dir);
    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === "schema")).toBe(true);
  });

  it("rejects a predicate stored on the wrong kind", () => {
    const dir = copyMinimal();
    const file = join(dir, "records/application/app-workshop-demo.md");
    const text = read(file).replace("type: supports", "type: serves");
    writeFileSync(file, text);
    const result = checkLedger(dir);
    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === "predicate")).toBe(true);
  });

  it("rejects a parent-relative repository root", () => {
    const dir = copyMinimal();
    const file = join(dir, "manifest.yaml");
    const text = read(file).replace("root: .", "root: ../other");
    writeFileSync(file, text);
    const result = checkLedger(dir);
    expect(result.ok).toBe(false);
    expect(result.findings.some((item) => item.code === "schema" && item.path === "manifest.yaml")).toBe(true);
  });

  it("accepts format_version 0.1.1 and rejects 0.2.0", () => {
    const patch = copyMinimal();
    writeFileSync(
      join(patch, "manifest.yaml"),
      read(join(patch, "manifest.yaml")).replace("format_version: 0.1.0", "format_version: 0.1.1"),
    );
    expect(checkLedger(patch).ok).toBe(true);

    const next = copyMinimal();
    writeFileSync(
      join(next, "manifest.yaml"),
      read(join(next, "manifest.yaml")).replace("format_version: 0.1.0", "format_version: 0.2.0"),
    );
    expect(checkLedger(next).ok).toBe(false);
  });
});

function copyMinimal(): string {
  const dir = mkdtempSync(join(tmpdir(), "appledger-"));
  copyDir(minimal, dir);
  return dir;
}

function copyDir(from: string, to: string): void {
  cpSync(from, to, { recursive: true });
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}
