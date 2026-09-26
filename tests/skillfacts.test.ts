import { cpSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runOperation } from "../src/adapters.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

const label = `---
skill_facts_version: "0.1.0"
name: Docs Writer
developer: Catalyst Forge
version: "0.1.0"
status: active
license: Apache-2.0
kind: cursor-skill
purpose: Teach an agent to draft documentation
provenance:
  source: https://github.com/Catalyst-Forge-LLC/skill-facts
  publisher: Catalyst Forge
instructions_reach:
  shell: none
  network: none
  filesystem: read
tools_referenced: []
bundled_artifacts: []
egress:
  telemetry: none
  destinations: []
generated:
  date: 2026-08-07
  generator: hand-authored
---

# Skill Facts

Approved purpose stays in this body.
`;

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-skillfacts-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("SkillFacts review", () => {
  it("keeps a keyword guess as a draft and does not rewrite the label", () => {
    const root = copyMinimal();
    const guessed = label.replace("generator: hand-authored", "generator: skillfacts-from-pack");
    writeFileSync(join(root, "SKILL_FACTS.md"), guessed);
    bind(
      root,
      `- id: skill-docs
  family: skillfacts
  subject_id: skill-docs
  repository_id: repo-demo
  path: SKILL_FACTS.md`,
    );
    const before = readFileSync(join(root, "SKILL_FACTS.md"));
    const validated = runOperation({ root, operation: "validate", family: "skillfacts", subjectId: "skill-docs" });
    expect(validated[0]?.disposition).toBe("unchanged");
    expect(validated[0]?.schemaVersion).toBe("0.1.0");
    expect(validated[0]?.findings.join(" ")).toMatch(/keyword guess/);
    expect(validated[0]?.findings.join(" ")).toMatch(/not extracted/);
    expect(validated[0]?.findings.join(" ")).toMatch(/host permits/);
    expect(readFileSync(join(root, "SKILL_FACTS.md"))).toEqual(before);
  });

  it("marks a network script for review and leaves approved facts unchanged", () => {
    const root = copyMinimal();
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(join(root, "scripts", "fetch.mjs"), "export const url = 'https://example.com';\nfetch(url);\n");
    const withScript = label.replace(
      "bundled_artifacts: []",
      "bundled_artifacts:\n  - path: scripts/fetch.mjs\n    kind: script",
    );
    writeFileSync(join(root, "SKILL_FACTS.md"), withScript);
    writeFileSync(join(root, "OTHER_FACTS.md"), label);
    bind(
      root,
      `- id: skill-docs
  family: skillfacts
  subject_id: skill-docs
  repository_id: repo-demo
  path: SKILL_FACTS.md
- id: skill-other
  family: skillfacts
  subject_id: skill-other
  repository_id: repo-demo
  path: OTHER_FACTS.md`,
    );
    const before = readFileSync(join(root, "SKILL_FACTS.md"));
    const other = readFileSync(join(root, "OTHER_FACTS.md"));
    const stamp = statSync(join(root, "SKILL_FACTS.md")).mtimeMs;
    const reviewed = runOperation({
      root,
      operation: "propose",
      family: "skillfacts",
      subjectId: "skill-docs",
      apply: true,
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("needs_review");
    expect(reviewed[0]?.changedFields).toEqual([]);
    expect(reviewed[0]?.findings.join(" ")).toMatch(/network call/);
    expect(reviewed[0]?.findings.join(" ")).toMatch(/remains none/);
    expect(reviewed[0]?.findings.join(" ")).toMatch(/not an execution/);
    expect(readFileSync(join(root, "SKILL_FACTS.md"))).toEqual(before);
    expect(readFileSync(join(root, "SKILL_FACTS.md"), "utf8")).toContain("network: none");
    expect(readFileSync(join(root, "SKILL_FACTS.md"), "utf8")).toContain("Approved purpose stays");
    expect(statSync(join(root, "SKILL_FACTS.md")).mtimeMs).toBe(stamp);
    const sibling = runOperation({ root, operation: "validate", family: "skillfacts", subjectId: "skill-other" });
    expect(sibling[0]?.disposition).toBe("unchanged");
    expect(readFileSync(join(root, "OTHER_FACTS.md"))).toEqual(other);
  });
});
