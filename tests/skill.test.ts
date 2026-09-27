import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { commandCatalog, demonstrateFreshSession } from "../src/fresh-session.js";

const skill = readFileSync(fileURLToPath(new URL("../skills/appledger/SKILL.md", import.meta.url)), "utf8");
const stub = readFileSync(fileURLToPath(new URL("../.cursor/skills/appledger/SKILL.md", import.meta.url)), "utf8");
const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

describe("curation skill", () => {
  it("uses the spec command table without a second status list", () => {
    const catalog = commandCatalog();
    expect(catalog.map((entry) => `${entry.status} ${entry.command}`)).toEqual([
      "implemented appledger check",
      "implemented appledger orient",
      "implemented appledger render",
      "implemented appledger transaction",
      "implemented appledger subjects",
      "implemented appledger init",
      "not implemented appledger reconcile",
      "implemented appledger diff",
      "implemented appledger migrate",
    ]);
    const listed = [...skill.matchAll(/^- (implemented|not implemented): `([^`]+)`$/gm)].map((match) => `${match[1]} ${match[2]}`);
    expect(listed).toEqual(catalog.map((entry) => `${entry.status} ${entry.command}`));
    expect(skill).toContain("spec/10-tooling-and-automation.md");
    expect(skill).toContain("A supported declaration is not observed implementation.");
    expect(skill).toContain("workflow_tracking.json");
    expect(skill).toContain("not independent human review");
    expect(stub).toContain("skills/appledger/SKILL.md");
    expect(stub).not.toContain("not implemented:");
  });

  it("demonstrates a fresh session that names the decision and the checks it did not run", () => {
    const first = demonstrateFreshSession(minimal, "notes");
    const second = demonstrateFreshSession(minimal, "notes");
    expect(second).toBe(first);
    expect(first).toContain("Checks run:\n- appledger check\n- appledger orient");
    expect(first).toContain("- appledger reconcile (not implemented)");
    expect(first).toContain("- appledger migrate (implemented)");
    expect(first).toContain("- appledger render (implemented)");
    expect(first).toContain("records/decision/decision-local-files.md");
    expect(first).toContain("A supported declaration is not observed implementation.");
    expect(first).toContain("No xFacts label was generated.");
    expect(first).not.toContain("Checks run:\n- appledger migrate");
  });
});
