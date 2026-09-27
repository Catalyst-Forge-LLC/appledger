import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLedger } from "../src/check.js";
import { initLedger } from "../src/init.js";

const at = "2026-09-26T00:00:00Z";

describe("init", () => {
  it("creates a minimal ledger and does not overwrite it", () => {
    const dir = mkdtempSync(join(tmpdir(), "appledger-init-"));
    const created = initLedger({ root: dir, name: "Workshop notes", at });
    expect(created.ok).toBe(true);
    expect(created.wrote).toHaveLength(4);
    expect(created.message).toContain("no label was written");
    const check = checkLedger(dir);
    expect(check.findings.filter((item) => item.severity === "error")).toEqual([]);
    const app = readFileSync(join(dir, created.wrote.find((path) => path.includes("/application/"))!), "utf8");
    expect(app).toContain("title: Workshop notes");
    expect(app).toContain("Not supplied. Init did not infer a purpose.");
    expect(app).not.toContain("goal");
    const profile = readFileSync(join(dir, "appledger", "profiles", "forgetrail.yaml"), "utf8");
    expect(profile).toContain("phase: plan");
    expect(profile).toContain("status: pending");
    expect(readdirSync(dir).join("\n")).not.toContain("workflow_tracking.json");

    const before = readFileSync(join(dir, "appledger", "manifest.yaml"));
    const again = initLedger({ root: dir, name: "Other name", at });
    expect(again.wrote).toEqual([]);
    expect(again.message).toContain("left in place");
    expect(readFileSync(join(dir, "appledger", "manifest.yaml"))).toEqual(before);
    expect(readFileSync(join(dir, created.wrote.find((path) => path.includes("/application/"))!), "utf8")).toContain(
      "title: Workshop notes",
    );
  });

  it("leaves an existing record in place when there is no manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "appledger-init-"));
    const record = join(dir, "appledger", "records", "application");
    mkdirSync(record, { recursive: true });
    const file = join(record, "app-existing.md");
    writeFileSync(file, "keep\n");
    const result = initLedger({ root: dir, at });
    expect(result.wrote).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe("keep\n");
    expect(readdirSync(join(dir, "appledger"))).toEqual(["records"]);
  });
});
