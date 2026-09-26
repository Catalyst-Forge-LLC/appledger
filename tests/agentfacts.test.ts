import { cpSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runOperation } from "../src/adapters.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function toolLabel(name: string, filesystem: "read" | "read-write", sideEffects: "read" | "write"): string {
  return `---
tool_facts_version: "0.1.0"
name: ${name} Server
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
  destinations: []
tools:
  - name: ${name}
    purpose: ${name === "write_note" ? "Write a note" : "Read a note"}
    side_effects: ${sideEffects}
    reach:
      filesystem: ${filesystem}
      network: none
      processes: false
    idempotent: true
generated:
  date: 2026-09-26
  generator: hand-authored
---

# Tool Facts
`;
}

function agentLabel(toolset: string): string {
  return `---
agent_facts_version: "0.1.0"
name: Reference Agent
developer: Catalyst Forge
kind: cli-agent
status: active
license: Apache-2.0
model:
  binding: host-provided
  models: []
tools:
  count: 1
  executes_shell: false
  browses_web: false
  toolsets:
    - ${toolset}
reach:
  filesystem: read
  network: none
autonomy:
  level: reactive
  self_looping: false
memory:
  persistence: none
  location: undisclosed
egress:
  telemetry: none
  data_shared: undisclosed
generated:
  date: 2026-09-26
  generator: hand-authored
---

# Agent Facts

Approved identity stays in this body.
`;
}

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-agentfacts-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("AgentFacts scope", () => {
  it("accepts a matching toolset and does not claim host enforcement", () => {
    const root = copyMinimal();
    mkdirSync(join(root, "tools", "reader"), { recursive: true });
    writeFileSync(join(root, "tools", "reader", "TOOL_FACTS.md"), toolLabel("read_note", "read", "read"));
    writeFileSync(join(root, "AGENT_FACTS.md"), agentLabel("tools/reader/TOOL_FACTS.md"));
    writeFileSync(
      join(root, "toolsets.json"),
      JSON.stringify({
        observed_at: "2026-09-26T16:00:00Z",
        subject: "Reference Agent",
        toolsets: ["tools/reader/TOOL_FACTS.md"],
      }),
    );
    bind(
      root,
      `- id: agent-ref
  family: agentfacts
  subject_id: agent-ref
  repository_id: repo-demo
  path: AGENT_FACTS.md
- id: agent-ref-tools
  family: agentfacts
  subject_id: agent-ref
  repository_id: repo-demo
  path: toolsets.json`,
    );
    const before = readFileSync(join(root, "AGENT_FACTS.md"));
    const stamp = statSync(join(root, "AGENT_FACTS.md")).mtimeMs;
    const reviewed = runOperation({
      root,
      operation: "propose",
      family: "agentfacts",
      subjectId: "agent-ref",
      apply: true,
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("unchanged");
    expect(reviewed[0]?.schemaVersion).toBe("0.1.0");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/Reference Agent/);
    expect(text).toMatch(/Host enforcement is unknown/);
    expect(text).not.toMatch(/host enforces/i);
    expect(readFileSync(join(root, "AGENT_FACTS.md"))).toEqual(before);
    expect(statSync(join(root, "AGENT_FACTS.md")).mtimeMs).toBe(stamp);
  });

  it("marks a switched writing toolset for review and keeps the configuration identity", () => {
    const root = copyMinimal();
    mkdirSync(join(root, "tools", "reader"), { recursive: true });
    mkdirSync(join(root, "tools", "writer"), { recursive: true });
    writeFileSync(join(root, "tools", "reader", "TOOL_FACTS.md"), toolLabel("read_note", "read", "read"));
    writeFileSync(join(root, "tools", "writer", "TOOL_FACTS.md"), toolLabel("write_note", "read-write", "write"));
    writeFileSync(join(root, "AGENT_FACTS.md"), agentLabel("tools/reader/TOOL_FACTS.md"));
    writeFileSync(join(root, "OTHER_FACTS.md"), agentLabel("tools/reader/TOOL_FACTS.md"));
    writeFileSync(
      join(root, "toolsets.json"),
      JSON.stringify({
        observed_at: "2026-09-26T16:00:00Z",
        subject: "Reference Agent",
        toolsets: ["tools/writer/TOOL_FACTS.md"],
      }),
    );
    bind(
      root,
      `- id: agent-ref
  family: agentfacts
  subject_id: agent-ref
  repository_id: repo-demo
  path: AGENT_FACTS.md
- id: agent-ref-tools
  family: agentfacts
  subject_id: agent-ref
  repository_id: repo-demo
  path: toolsets.json
- id: agent-other
  family: agentfacts
  subject_id: agent-other
  repository_id: repo-demo
  path: OTHER_FACTS.md`,
    );
    const before = readFileSync(join(root, "AGENT_FACTS.md"));
    const other = readFileSync(join(root, "OTHER_FACTS.md"));
    const writer = readFileSync(join(root, "tools", "writer", "TOOL_FACTS.md"));
    const reviewed = runOperation({
      root,
      operation: "checkFreshness",
      family: "agentfacts",
      subjectId: "agent-ref",
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("needs_review");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/Recorded toolsets differ/);
    expect(text).toMatch(/filesystem read-write/);
    expect(text).toMatch(/does not erase/);
    expect(text).toMatch(/Reference Agent/);
    expect(text).toMatch(/Host enforcement is unknown/);
    expect(text).not.toMatch(/host enforces/i);
    expect(text).not.toMatch(/absent/i);
    expect(readFileSync(join(root, "AGENT_FACTS.md"))).toEqual(before);
    expect(readFileSync(join(root, "AGENT_FACTS.md"), "utf8")).toContain("name: Reference Agent");
    expect(readFileSync(join(root, "AGENT_FACTS.md"), "utf8")).toContain("filesystem: read");
    expect(readFileSync(join(root, "AGENT_FACTS.md"), "utf8")).toContain("Approved identity stays");
    expect(readFileSync(join(root, "tools", "writer", "TOOL_FACTS.md"))).toEqual(writer);
    const sibling = runOperation({ root, operation: "validate", family: "agentfacts", subjectId: "agent-other" });
    expect(sibling[0]?.disposition).toBe("unchanged");
    expect(readFileSync(join(root, "OTHER_FACTS.md"))).toEqual(other);
  });
});
