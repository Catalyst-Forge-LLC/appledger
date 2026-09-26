import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyMigration, previewMigration, rollbackMigration } from "../src/migrate.js";

function home(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-migrate-"));
  mkdirSync(join(root, ".forgetrail"), { recursive: true });
  return root;
}

function writeTracking(root: string, value: unknown): void {
  writeFileSync(join(root, ".forgetrail", "workflow_tracking.json"), JSON.stringify(value, null, 2));
}

const live = {
  project: { name: "Notes", description: "Find notes", status: "wrapped", archetype: "product" },
  currentPhase: "4-feature-iteration",
  customFlag: true,
  phases: {
    "1-architecture": {
      status: "not_started",
      startedAt: null,
      completedAt: null,
      exitCriteriaMet: [],
      exitCriteriaRemaining: ["Brief locked"],
      notes: [],
    },
    "4-feature-iteration": {
      status: "in_progress",
      startedAt: "2020-01-02T03:04:05Z",
      exitCriteriaMet: ["Hero flow"],
      exitCriteriaRemaining: ["Edge cases"],
      notes: [
        {
          timestamp: "2020-01-02T03:04:05Z",
          text: "Stack chosen",
          companionOutcomes: [{ tool: "featurefacts", outcome: "empty selection" }],
        },
      ],
      iterations: [{ name: "search" }],
    },
  },
  decisions: [{ date: "2020-01-03", decision: "Use local files" }],
  sessions: [],
};

function readTree(dir: string): string {
  return readdirSync(dir)
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .join("\n");
}

describe("tracking migration", () => {
  it("previews a live file without writing and does not import a starter", () => {
    const root = home();
    writeTracking(root, live);
    writeFileSync(join(root, "README.md"), "leave me\n");
    const stamp = statSync(join(root, ".forgetrail", "workflow_tracking.json")).mtimeMs;
    const preview = previewMigration(root);
    expect(preview.role).toBe("full");
    expect(preview.profilePhase).toBe("iterate");
    expect(preview.projectStatus).toBe("wrapped");
    expect(preview.unmapped).toEqual(expect.arrayContaining(["customFlag", "phases.4-feature-iteration"]));
    expect(preview.message).toMatch(/No files were written/);
    expect(statSync(join(root, ".forgetrail", "workflow_tracking.json")).mtimeMs).toBe(stamp);
    expect(existsSync(join(root, "appledger"))).toBe(false);
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("leave me\n");

    const starter = home();
    writeTracking(starter, {
      project: { name: "", description: "", status: "active" },
      currentPhase: "1-architecture",
      phases: { "1-architecture": { status: "not_started", exitCriteriaRemaining: ["Brief"], notes: [] } },
      decisions: [],
      sessions: [],
    });
    const starterPreview = previewMigration(starter);
    expect(starterPreview.role).toBe("starter");
    expect(applyMigration(starter).ok).toBe(true);
    expect(existsSync(join(starter, "appledger"))).toBe(false);
  });

  it("applies a mapped ledger, ignores a second apply, and rolls back only its paths", () => {
    const root = home();
    writeTracking(root, live);
    writeFileSync(join(root, "BUGS.md"), "- Login drops\n");
    writeFileSync(join(root, "IDEAS.md"), "- Add export\n");
    writeFileSync(join(root, "README.md"), "leave me\n");
    const original = readFileSync(join(root, ".forgetrail", "workflow_tracking.json"), "utf8");
    const applied = applyMigration(root);
    expect(applied.ok).toBe(true);
    expect(applied.id).toMatch(/^migrate-/);
    const tracking = readFileSync(join(root, ".forgetrail", "workflow_tracking.json"), "utf8");
    expect(tracking).toContain('"status": "pointer"');
    expect(tracking).not.toContain("4-feature-iteration");
    const profile = readFileSync(join(root, "appledger", "profiles", "forgetrail.yaml"), "utf8");
    expect(profile).toContain("phase: plan");
    expect(profile).toContain("status: not_started");
    expect(profile).toContain("phase: iterate");
    expect(profile).toContain("status: in_progress");
    expect(profile).toContain("project_status: wrapped");
    expect(profile).toContain("Hero flow");
    expect(profile).toContain("Verification was not recorded");
    const sessions = readTree(join(root, "appledger", "records", "session"));
    expect(sessions).toContain("2020-01-02T03:04:05Z");
    expect(sessions).toContain("featurefacts");
    expect(sessions).toContain("empty selection");
    expect(sessions).not.toContain("2026-09-26");
    const decision = readTree(join(root, "appledger", "records", "decision"));
    expect(decision).toContain("2020-01-03T00:00:00Z");
    expect(decision).toContain("Use local files");
    const work = readTree(join(root, "appledger", "records", "work"));
    expect(work).toContain("intake: bug");
    expect(work).toContain("Login drops");
    expect(work).toContain("intake: idea");
    expect(work).toContain("Add export");
    const change = readTree(join(root, "appledger", "records", "change"));
    expect(change).toContain("customFlag");
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("leave me\n");
    expect(readFileSync(join(root, "BUGS.md"), "utf8")).toBe("- Login drops\n");

    const again = applyMigration(root);
    expect(again.ok).toBe(true);
    expect(again.preview?.role).toBe("pointer");
    expect(readFileSync(join(root, ".forgetrail", "workflow_tracking.json"), "utf8")).toBe(tracking);

    const rolled = rollbackMigration(root, applied.id);
    expect(rolled.ok).toBe(true);
    expect(readFileSync(join(root, ".forgetrail", "workflow_tracking.json"), "utf8")).toBe(original);
    expect(existsSync(join(root, "appledger", "manifest.yaml"))).toBe(false);
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("leave me\n");
  });

  it("refuses rollback after a later edit", () => {
    const root = home();
    writeTracking(root, {
      schemaVersion: "lite-1",
      project: { name: "Lite notes", description: "A lite app", status: "active" },
      currentPhase: 2,
      phases: {
        "1": { name: "Plan", status: "revisiting", completedAt: "2020-02-02T00:00:00Z", exitCriteria: { brief: true } },
        "2": { name: "Build", status: "in_progress", exitCriteria: { spine: false } },
      },
      decisions: [{ decision: "No date here" }],
    });
    const applied = applyMigration(root);
    expect(applied.ok).toBe(true);
    const profile = readFileSync(join(root, "appledger", "profiles", "forgetrail.yaml"), "utf8");
    expect(profile).toContain("phase: plan");
    expect(profile).toContain("status: revisiting");
    expect(profile).toContain("phase: build");
    expect(profile).toContain("status: in_progress");
    expect(profile).not.toMatch(/phase: plan[\s\S]*status: completed/);
    const decision = readTree(join(root, "appledger", "records", "decision"));
    expect(decision).toContain("placeholder, not the event date");
    writeFileSync(join(root, ".forgetrail", "workflow_tracking.json"), '{"status":"pointer","edited":true}\n');
    const rolled = rollbackMigration(root, applied.id);
    expect(rolled.ok).toBe(false);
    expect(rolled.message).toMatch(/Later edits were not overwritten/);
    expect(readFileSync(join(root, ".forgetrail", "workflow_tracking.json"), "utf8")).toContain('"edited":true');
  });
});
