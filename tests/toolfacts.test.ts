import { cpSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runOperation } from "../src/adapters.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function label(destinations: string): string {
  return `---
tool_facts_version: "0.1.0"
name: Prompt Server
developer: Catalyst Forge
version: "0.1.0"
status: active
license: Apache-2.0
kind: mcp-server
runtime:
  execution: local-process
  transport: stdio
credentials:
  required: []
egress:
  telemetry: none
  destinations: ${destinations}
tools:
  - name: runAudit
    purpose: Return a structured audit prompt and do not scan the workspace
    side_effects: none
    reach:
      filesystem: none
      network: none
      processes: false
    idempotent: true
generated:
  date: 2026-09-26
  generator: hand-authored
---

# Tool Facts

Approved prompt tool stays in this body.
`;
}

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-toolfacts-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("ToolFacts review", () => {
  it("keeps a prompt tool and undisclosed destinations when the recorded list matches", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "TOOL_FACTS.md"), label('["undisclosed"]'));
    writeFileSync(
      join(root, "tools-list.json"),
      JSON.stringify({
        observed_at: "2026-09-26T15:00:00Z",
        subject: "Prompt Server",
        tools: [{ name: "runAudit", description: "Return a structured audit prompt" }],
      }),
    );
    bind(
      root,
      `- id: tool-prompt
  family: toolfacts
  subject_id: tool-prompt
  repository_id: repo-demo
  path: TOOL_FACTS.md
- id: tool-prompt-list
  family: toolfacts
  subject_id: tool-prompt
  repository_id: repo-demo
  path: tools-list.json`,
    );
    const before = readFileSync(join(root, "TOOL_FACTS.md"));
    const stamp = statSync(join(root, "TOOL_FACTS.md")).mtimeMs;
    const reviewed = runOperation({
      root,
      operation: "propose",
      family: "toolfacts",
      subjectId: "tool-prompt",
      apply: true,
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("unchanged");
    expect(reviewed[0]?.schemaVersion).toBe("0.1.0");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/undisclosed/);
    expect(text).toMatch(/not reclassified as a workspace scanner/);
    expect(text).toMatch(/not a live monitor/);
    expect(text).toMatch(/No MCP server was started/);
    expect(text).toMatch(/does not prove/);
    expect(text).toMatch(/2026-09-26T15:00:00Z/);
    expect(readFileSync(join(root, "TOOL_FACTS.md"))).toEqual(before);
    expect(statSync(join(root, "TOOL_FACTS.md")).mtimeMs).toBe(stamp);
    expect(existsSync(join(root, "agents"))).toBe(false);
  });

  it("marks a new writing tool for review and leaves the sibling label unchanged", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "TOOL_FACTS.md"), label("[]"));
    writeFileSync(join(root, "OTHER_FACTS.md"), label("[]"));
    writeFileSync(
      join(root, "tools-list.json"),
      JSON.stringify({
        observed_at: "2026-09-26T15:00:00Z",
        subject: "Prompt Server",
        tools: [
          { name: "runAudit", description: "Return a structured audit prompt" },
          { name: "write_note", description: "Write a note", annotations: { readOnlyHint: false } },
        ],
      }),
    );
    bind(
      root,
      `- id: tool-prompt
  family: toolfacts
  subject_id: tool-prompt
  repository_id: repo-demo
  path: TOOL_FACTS.md
- id: tool-prompt-list
  family: toolfacts
  subject_id: tool-prompt
  repository_id: repo-demo
  path: tools-list.json
- id: tool-other
  family: toolfacts
  subject_id: tool-other
  repository_id: repo-demo
  path: OTHER_FACTS.md`,
    );
    const before = readFileSync(join(root, "TOOL_FACTS.md"));
    const other = readFileSync(join(root, "OTHER_FACTS.md"));
    const reviewed = runOperation({
      root,
      operation: "checkFreshness",
      family: "toolfacts",
      subjectId: "tool-prompt",
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("needs_review");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/write_note/);
    expect(text).toMatch(/Reach is marked for review/);
    expect(text).toMatch(/Dependent AgentFacts review is requested/);
    expect(text).toMatch(/not proof of side effects/);
    expect(text).toMatch(/not reclassified as a workspace scanner/);
    expect(text).not.toMatch(/absent/i);
    expect(readFileSync(join(root, "TOOL_FACTS.md"))).toEqual(before);
    expect(readFileSync(join(root, "TOOL_FACTS.md"), "utf8")).toContain("side_effects: none");
    expect(readFileSync(join(root, "TOOL_FACTS.md"), "utf8")).toContain("Approved prompt tool stays");
    const sibling = runOperation({ root, operation: "validate", family: "toolfacts", subjectId: "tool-other" });
    expect(sibling[0]?.disposition).toBe("unchanged");
    expect(sibling[0]?.findings.join(" ")).toMatch(/No recorded tools\/list was supplied/);
    expect(readFileSync(join(root, "OTHER_FACTS.md"))).toEqual(other);
    expect(existsSync(join(root, "appledger", "records", "agent_configuration"))).toBe(false);
  });
});
