import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ADAPTERS, discoverSubjects, runOperation } from "../src/adapters.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-subjects-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("subject inventory", () => {
  it("records unsupported for the application and not_applicable when no other subject exists", () => {
    const root = copyMinimal();
    const manifest = join(root, "appledger", "manifest.yaml");
    const before = statSync(manifest).mtimeMs;
    const rows = discoverSubjects({ root });
    expect(statSync(manifest).mtimeMs).toBe(before);
    expect(rows.map((row) => `${row.disposition} ${row.family} ${row.subjectId}`)).toEqual([
      "unsupported appfacts app-workshop-demo",
      "unsupported featurefacts app-workshop-demo",
      "not_applicable toolfacts ",
      "not_applicable agentfacts ",
      "not_applicable skillfacts ",
      "not_applicable modelfacts ",
    ]);
    expect(rows.every((row) => row.changedFields.length === 0)).toBe(true);
    expect(rows.some((row) => row.family === "agentfacts" && row.subjectId === "app-workshop-demo")).toBe(false);
    expect(rows.some((row) => row.family === "modelfacts" && row.subjectId === "app-workshop-demo")).toBe(false);
    expect(JSON.stringify(rows)).not.toMatch(/guessed label|selected rows/i);
  });

  it("keeps separate rows for two tools, two skills, and two models", () => {
    const root = copyMinimal();
    bind(
      root,
      `- id: tool-a
  family: toolfacts
  subject_id: tool-alpha
  repository_id: repo-demo
  path: tools/alpha.yaml
- id: tool-b
  family: toolfacts
  subject_id: tool-beta
  repository_id: repo-demo
  path: tools/beta.yaml
- id: skill-a
  family: skillfacts
  subject_id: skill-alpha
  repository_id: repo-demo
  path: skills/alpha/SKILL.md
- id: skill-b
  family: skillfacts
  subject_id: skill-beta
  repository_id: repo-demo
  path: skills/beta/SKILL.md
- id: model-a
  family: modelfacts
  subject_id: model-alpha
  repository_id: repo-demo
  path: models/alpha.yaml
- id: model-b
  family: modelfacts
  subject_id: model-beta
  repository_id: repo-demo
  path: models/beta.yaml
- id: agent-a
  family: agentfacts
  subject_id: agent-alpha
  repository_id: repo-demo
  path: agents/alpha.yaml`,
    );
    const rows = discoverSubjects({ root });
    const ids = (family: string) => rows.filter((row) => row.family === family).map((row) => row.subjectId);
    expect(ids("toolfacts")).toEqual(["tool-alpha", "tool-beta"]);
    expect(ids("skillfacts")).toEqual(["skill-alpha", "skill-beta"]);
    expect(ids("modelfacts")).toEqual(["model-alpha", "model-beta"]);
    expect(ids("agentfacts")).toEqual(["agent-alpha"]);
    expect(rows.some((row) => row.subjectId === "root")).toBe(false);
    expect(rows.filter((row) => row.family === "toolfacts").every((row) => row.disposition === "needs_review")).toBe(true);
    expect(rows.filter((row) => row.family === "toolfacts").every((row) => row.findings.every((item) => !/absent|failed/i.test(item)))).toBe(
      true,
    );
  });

  it("does not parse a present register or write a label when extract is requested", () => {
    const root = copyMinimal();
    mkdirSync(join(root, ".featurefacts"), { recursive: true });
    writeFileSync(join(root, ".featurefacts", "features.yaml"), "id: note-find\n");
    bind(
      root,
      `- id: features-main
  family: featurefacts
  subject_id: app-workshop-demo
  repository_id: repo-demo
  path: .featurefacts/features.yaml`,
    );
    const discovered = discoverSubjects({ root, family: "featurefacts", subjectId: "app-workshop-demo" });
    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.disposition).toBe("unsupported");
    expect(discovered[0]?.inputFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(discovered[0]?.changedFields).toEqual([]);
    expect(discovered[0]?.findings.join(" ")).toContain("neither confirmed nor denied");
    expect(existsSync(join(root, ".featurefacts", "label.md"))).toBe(false);

    const extracted = runOperation({ root, operation: "extract", family: "featurefacts", subjectId: "app-workshop-demo" });
    expect(extracted[0]?.disposition).toBe("failed");
    expect(extracted[0]?.changedFields).toEqual([]);
    expect(extracted[0]?.findings.join(" ")).not.toMatch(/feature failed|absent/i);
    expect(existsSync(join(root, ".featurefacts", "label.md"))).toBe(false);
    expect(discoverSubjects({ root, family: "featurefacts", subjectId: "app-workshop-demo" })).toEqual(discovered);
  });

  it("pins AppFacts and FeatureFacts schemas and leaves the other families unsupported", () => {
    expect(ADAPTERS).toHaveLength(6);
    for (const adapter of ADAPTERS) {
      expect(adapter.network).toBe(false);
      expect(adapter.runtime).toBe(false);
      expect(adapter.ownedFields).toEqual([]);
      expect(adapter.agentAssistedOperations).toEqual([]);
      if (adapter.family === "featurefacts") {
        expect(adapter.schemaVersions).toEqual(["0.2.0"]);
        expect(adapter.deterministicOperations).toContain("validate");
      } else if (adapter.family === "appfacts") {
        expect(adapter.schemaVersions).toEqual(["0.1.0"]);
      } else if (adapter.family === "skillfacts") {
        expect(adapter.schemaVersions).toEqual(["0.1.0"]);
        expect(adapter.deterministicOperations).toContain("validate");
      } else {
        expect(adapter.schemaVersions).toEqual([]);
        expect(adapter.deterministicOperations).toEqual(["discover"]);
      }
    }
    const root = copyMinimal();
    expect(discoverSubjects({ root })).toEqual(discoverSubjects({ root }));
    const extracted = runOperation({ root, operation: "extract", family: "toolfacts" });
    expect(extracted[0]?.disposition).toBe("unsupported");
  });
});
