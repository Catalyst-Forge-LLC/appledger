import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkLedger } from "../src/check.js";
import { inputSetFingerprint, sha256Hex } from "../src/digest.js";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const minimal = join(repoRoot, "examples/minimal/appledger");

describe("AL-03 sources and freshness", () => {
  it("keeps the record id stable when the title changes", () => {
    const dir = copyLedger();
    const file = join(dir, "records/application/app-workshop-demo.md");
    writeFileSync(file, read(file).replace("title: Workshop Demo", "title: Workshop Notes"));
    const result = checkLedger(dir);
    expect(result.findings.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.findings.some((item) => item.code === "unresolved_ref")).toBe(false);
  });

  it("keeps references on the id when the file is moved off its canonical path", () => {
    const dir = copyLedger();
    const from = join(dir, "records/application/app-workshop-demo.md");
    const to = join(dir, "records/application/moved-demo.md");
    writeFileSync(to, read(from));
    writeFileSync(from, "");
    const result = checkLedger(dir);
    expect(result.findings.some((item) => item.code === "record_path")).toBe(true);
    expect(result.findings.some((item) => item.message.includes("application_id"))).toBe(false);
  });

  it("reports a missing evidence source without calling a feature absent", () => {
    const { ledger } = scaffold();
    const evidence = join(ledger, "records/evidence/evidence-brief.md");
    writeFileSync(evidence, read(evidence).replace("source: BRIEF.md", "source: missing-brief.md"));
    const result = checkLedger(ledger);
    const missing = result.findings.filter((item) => item.code === "missing_source");
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((item) => !/absent|failed/i.test(item.message))).toBe(true);
    const freshnessPaths = result.findings.filter((item) => item.code === "freshness").map((item) => item.path);
    expect(freshnessPaths).toContain("records/decision/decision-local-files.md");
    expect(freshnessPaths).not.toContain("records/goal/goal-find-notes.md");
  });

  it("flags digest mismatch only for claims that cite the changed source", () => {
    const { home, ledger } = scaffold();
    const source = join(home, "notes.txt");
    writeFileSync(source, "version-one");
    const digest = sha256Hex(readFileSync(source));
    const evidence = join(ledger, "records/evidence/evidence-brief.md");
    writeFileSync(evidence, read(evidence).replace("source: BRIEF.md", `source: notes.txt\n  digest: ${digest}`));
    expect(checkLedger(ledger).findings.some((item) => item.code === "freshness")).toBe(false);

    writeFileSync(source, "version-two");
    writeFileSync(join(home, "unrelated.txt"), "noise");
    const result = checkLedger(ledger);
    const freshness = result.findings.filter((item) => item.code === "freshness");
    expect(freshness.map((item) => item.path).sort()).toEqual([
      "records/decision/decision-local-files.md",
      "records/evidence/evidence-brief.md",
    ]);
  });

  it("reviews a claim whose recorded revision is not HEAD and stays quiet when it matches", () => {
    const { ledger } = scaffold();
    const decision = join(ledger, "records/decision/decision-local-files.md");
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
    writeFileSync(decision, read(decision).replace("repository_id: repo-demo", `repository_id: repo-demo\n    revision: ${"a".repeat(40)}`));
    const mismatched = checkLedger(ledger);
    expect(mismatched.findings.some((item) => item.code === "freshness" && item.message.includes("HEAD"))).toBe(true);

    writeFileSync(decision, read(decision).replace(`revision: ${"a".repeat(40)}`, `revision: ${head}`));
    const matched = checkLedger(ledger);
    expect(matched.findings.some((item) => item.code === "freshness" && item.message.includes("HEAD"))).toBe(false);
  });

  it("leaves a missing binding unresolved and does not parse a present register", () => {
    const { home, ledger } = scaffold();
    const manifest = join(ledger, "manifest.yaml");
    writeFileSync(
      manifest,
      read(manifest).replace(
        "bindings: []",
        `bindings:
- id: features-main
  family: featurefacts
  subject_id: app-workshop-demo
  repository_id: repo-demo
  path: .featurefacts/features.yaml`,
      ),
    );
    const cap = `---
format_version: 0.1.0
id: capability-note-find
kind: capability_ref
title: Find note
record_status: active
created_at: '2026-09-25T19:00:00Z'
updated_at: '2026-09-25T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: internal
relations: []
claims: []
data:
  external_ref: binding:features-main#note-find
---

# Pointer
`;
    mkdirSync(join(ledger, "records/capability_ref"), { recursive: true });
    writeFileSync(join(ledger, "records/capability_ref/capability-note-find.md"), cap);

    const missing = checkLedger(ledger);
    expect(missing.findings.some((item) => item.code === "missing_source")).toBe(true);
    expect(missing.findings.some((item) => item.code === "unresolved_ref" && item.path.includes("capability"))).toBe(true);
    expect(missing.findings.every((item) => !/absent|failed/i.test(item.message))).toBe(true);

    mkdirSync(join(home, ".featurefacts"), { recursive: true });
    writeFileSync(join(home, ".featurefacts/features.yaml"), "id: note-find\n");
    const present = checkLedger(ledger);
    expect(present.findings.some((item) => item.code === "unsupported" && item.message.includes("featurefacts"))).toBe(true);
    expect(present.findings.some((item) => item.code === "unresolved_ref" && item.path.includes("capability"))).toBe(false);
  });

  it("rejects a symlink that leaves the repository", () => {
    const { home, ledger } = scaffold();
    const outside = join(tmpdir(), `appledger-outside-${Date.now()}.txt`);
    writeFileSync(outside, "secret");
    const link = join(home, "linked.txt");
    try {
      symlinkSync(outside, link, "file");
    } catch {
      return;
    }
    const evidence = join(ledger, "records/evidence/evidence-brief.md");
    writeFileSync(evidence, read(evidence).replace("source: BRIEF.md", "source: linked.txt"));
    const result = checkLedger(ledger);
    expect(result.findings.some((item) => item.code === "path_escape")).toBe(true);
  });

  it("hashes an input set in UTF-8 path order", () => {
    const entries = [
      { path: "b.txt", sha256: "bb" },
      { path: "a.txt", sha256: "aa" },
    ];
    const expected = createHash("sha256")
      .update(JSON.stringify([
        { path: "a.txt", sha256: "aa" },
        { path: "b.txt", sha256: "bb" },
      ]), "utf8")
      .digest("hex");
    expect(inputSetFingerprint(entries)).toBe(expected);
    expect(inputSetFingerprint([...entries].reverse())).toBe(expected);
  });
});

function scaffold(): { home: string; ledger: string } {
  const cache = join(repoRoot, ".appledger-cache");
  mkdirSync(cache, { recursive: true });
  const home = mkdtempSync(join(cache, "al03-"));
  const ledger = join(home, "appledger");
  cpSync(minimal, ledger, { recursive: true });
  return { home, ledger };
}

function copyLedger(): string {
  return scaffold().ledger;
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}
