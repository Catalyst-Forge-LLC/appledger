import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diffLedger, diffMarkdown } from "../src/diff.js";

const record = (title: string, body: string) => `---
format_version: 0.1.0
id: decision-one
kind: decision
title: ${title}
---
${body}
`;

describe("diff", () => {
  it("separates a semantic record change from formatting and a generated view", () => {
    const dir = repo();
    const decision = join(dir, "appledger", "records", "decision", "decision-one.md");
    const view = join(dir, "appledger", "views", "public.md");
    const outside = join(dir, "README.md");
    writeFileSync(join(dir, "appledger", "manifest.yaml"), "format_version: 0.1.0\n");
    writeFileSync(decision, record("Local files", "\nUse local files.\n"));
    writeFileSync(view, "public\n");
    writeFileSync(outside, "outside\n");
    commit(dir, "base");
    const from = head(dir);

    writeFileSync(decision, record("Remote files", "\nUse local files.\n"));
    writeFileSync(view, "public changed\n");
    writeFileSync(outside, "outside changed\n");
    commit(dir, "semantic");
    const semantic = head(dir);

    writeFileSync(decision, record("Remote files", "\nUse local files.   \n"));
    commit(dir, "formatting");
    const formatted = head(dir);

    writeFileSync(decision, record("Dirty title", "\nUse local files.\n"));
    const names = readdirSync(dir);

    const changed = diffLedger({ root: dir, from, to: semantic });
    expect(changed.entries.map((entry) => `${entry.kind} ${entry.path} ${entry.detail}`)).toEqual([
      "semantic appledger/records/decision/decision-one.md title",
      "regenerated appledger/views/public.md Bytes differ. A generated view is not a semantic record change.",
    ]);
    expect(diffMarkdown(changed)).toContain("does not write files");
    expect(diffMarkdown(changed)).not.toContain("README.md");
    expect(diffMarkdown(changed)).not.toContain("Dirty title");

    const spaced = diffLedger({ root: dir, from: semantic, to: formatted });
    expect(spaced.entries).toEqual([
      {
        path: "appledger/records/decision/decision-one.md",
        kind: "formatting",
        detail: "Parsed record matches. Only bytes or whitespace differ.",
      },
    ]);
    expect(readdirSync(dir)).toEqual(names);
  });

  it("reports the same commit and refuses a missing revision", () => {
    const dir = repo();
    writeFileSync(join(dir, "appledger", "manifest.yaml"), "format_version: 0.1.0\n");
    commit(dir, "only");
    const revision = head(dir);
    const same = diffLedger({ root: dir, from: revision, to: revision });
    expect(same.entries).toEqual([]);
    expect(diffMarkdown(same)).toContain("The two revisions are the same commit.");
    expect(() => diffLedger({ root: dir, from: revision, to: "not-a-commit" })).toThrow();
  });
});

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), "appledger-diff-"));
  mkdirSync(join(dir, "appledger", "records", "decision"), { recursive: true });
  mkdirSync(join(dir, "appledger", "views"), { recursive: true });
  git(dir, ["init"]);
  git(dir, ["config", "core.autocrlf", "false"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "AppLedger Test"]);
  return dir;
}

function commit(dir: string, message: string): void {
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", message]);
}

function head(dir: string): string {
  return git(dir, ["rev-parse", "HEAD"]).trim();
}

function git(dir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8" });
}
