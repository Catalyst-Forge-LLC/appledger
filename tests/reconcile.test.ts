import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLedger } from "../src/check.js";
import { initLedger } from "../src/init.js";
import { reconcileLedger } from "../src/reconcile.js";

const at = "2026-09-26T01:00:00Z";

describe("reconcile", () => {
  it("plans without writing, then records dispositions once", () => {
    const dir = mkdtempSync(join(tmpdir(), "appledger-reconcile-"));
    initLedger({ root: dir, name: "Workshop notes", at: "2026-09-26T00:00:00Z" });

    const plan = reconcileLedger({ root: dir, at });
    expect(plan.ok).toBe(true);
    expect(plan.wrote).toEqual([]);
    expect(plan.message).toContain("Plan only");
    expect(plan.message).toContain("No label was written");
    expect(plan.dispositions.map((row) => `${row.family} ${row.disposition}`)).toEqual([
      "appfacts not_applicable",
      "featurefacts not_applicable",
      "toolfacts not_applicable",
      "agentfacts not_applicable",
      "skillfacts not_applicable",
      "modelfacts not_applicable",
    ]);
    expect(existsSync(join(dir, "appledger", "records", "change"))).toBe(false);

    const applied = reconcileLedger({ root: dir, apply: true, at });
    expect(applied.ok).toBe(true);
    expect(applied.wrote).toHaveLength(1);
    const receipt = readFileSync(join(dir, applied.wrote[0]!), "utf8");
    expect(receipt).toContain("operation: reconciliation");
    expect(receipt).toContain("not_applicable");
    expect(receipt).toContain("No label was written");
    const check = checkLedger(dir);
    expect(check.findings.filter((item) => item.severity === "error")).toEqual([]);

    const again = reconcileLedger({ root: dir, apply: true, at: "2026-09-26T02:00:00Z" });
    expect(again.wrote).toEqual([]);
    expect(again.message).toContain("Unchanged");
    expect(readFileSync(join(dir, applied.wrote[0]!), "utf8")).toBe(receipt);
    expect(readdirSync(join(dir, "appledger", "records", "change"))).toHaveLength(1);
  });

  it("does not create a label when a bound source is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "appledger-reconcile-"));
    initLedger({ root: dir, at: "2026-09-26T00:00:00Z" });
    const manifestPath = join(dir, "appledger", "manifest.yaml");
    const manifest = readFileSync(manifestPath, "utf8").replace(
      "bindings: []",
      `bindings:
  - id: bind-skill
    family: skillfacts
    subject_id: skill-one
    repository_id: repo-home
    path: skills/missing/SKILL.md`,
    );
    writeFileSync(manifestPath, manifest);

    const plan = reconcileLedger({ root: dir, at });
    expect(plan.ok).toBe(false);
    expect(plan.wrote).toEqual([]);
    expect(plan.dispositions.some((row) => row.family === "skillfacts" && row.disposition === "needs_review")).toBe(true);
    expect(existsSync(join(dir, "skills", "missing", "SKILL.md"))).toBe(false);

    const applied = reconcileLedger({ root: dir, apply: true, at });
    expect(applied.ok).toBe(false);
    expect(applied.code).toBe("blocked");
    expect(applied.wrote).toHaveLength(1);
    expect(existsSync(join(dir, "skills", "missing", "SKILL.md"))).toBe(false);
    const check = checkLedger(dir);
    expect(check.findings.filter((item) => item.severity === "error")).toEqual([]);
  });
});
