import { cpSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runOperation } from "../src/adapters.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function modelLabel(name: string, quantization: string, context: string, benchmark: boolean): string {
  const benchmarks = benchmark
    ? `benchmarks:
  - name: MMLU
    score: 70
    notes: Publisher card for ${name}
`
    : "";
  return `---
model_facts_version: "0.1.0"
name: ${name}
developer: Example Lab
status: active
license: Apache-2.0
architecture:
  type: dense transformer
  parameters: 7B
  context_window: ${context}
  quantization: ${quantization}
training:
  knowledge_cutoff: undisclosed
  methodology: undisclosed
capabilities:
  natural_language: full
  reasoning_math: unresolved
  coding: unresolved
  vision_input: disabled
  audio_input: disabled
safety:
  refusal_sensitivity: unresolved
  instruction_following: unresolved
  filter_type: raw
${benchmarks}generated:
  date: 2026-09-26
  generator: hand-authored
---

# Model Facts

Approved variant stays in this body.
`;
}

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-modelfacts-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("ModelFacts identity", () => {
  it("matches offline metadata and does not contact a provider", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "MODEL_FACTS.md"), modelLabel("Example-7B", "bf16", "undisclosed", false));
    writeFileSync(
      join(root, "metadata.json"),
      JSON.stringify({
        observed_at: "2026-09-26T16:30:00Z",
        source: "offline",
        name: "Example-7B",
        developer: "Example Lab",
        quantization: "bf16",
      }),
    );
    bind(
      root,
      `- id: model-example
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: MODEL_FACTS.md
- id: model-example-meta
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: metadata.json`,
    );
    const before = readFileSync(join(root, "MODEL_FACTS.md"));
    const stamp = statSync(join(root, "MODEL_FACTS.md")).mtimeMs;
    const reviewed = runOperation({
      root,
      operation: "propose",
      family: "modelfacts",
      subjectId: "model-example",
      apply: true,
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("unchanged");
    expect(reviewed[0]?.schemaVersion).toBe("0.1.0");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/Identity matches/);
    expect(text).toMatch(/Context window remains undisclosed/);
    expect(text).toMatch(/No provider was contacted/);
    expect(text).toMatch(/not evaluation evidence/);
    expect(readFileSync(join(root, "MODEL_FACTS.md"))).toEqual(before);
    expect(statSync(join(root, "MODEL_FACTS.md")).mtimeMs).toBe(stamp);
  });

  it("does not copy context window or benchmarks onto a different variant", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "MODEL_FACTS.md"), modelLabel("Example-7B", "bf16", "128k", true));
    writeFileSync(join(root, "OTHER_FACTS.md"), modelLabel("Example-7B", "bf16", "undisclosed", false));
    writeFileSync(
      join(root, "metadata.json"),
      JSON.stringify({
        observed_at: "2026-09-26T16:30:00Z",
        name: "Example-7B-Q4",
        developer: "Example Lab",
        quantization: "GGUF Q4_K_M",
        context_window: "8k",
        family: "Llama",
      }),
    );
    bind(
      root,
      `- id: model-example
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: MODEL_FACTS.md
- id: model-example-meta
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: metadata.json
- id: model-other
  family: modelfacts
  subject_id: model-other
  repository_id: repo-demo
  path: OTHER_FACTS.md`,
    );
    const before = readFileSync(join(root, "MODEL_FACTS.md"));
    const other = readFileSync(join(root, "OTHER_FACTS.md"));
    const reviewed = runOperation({
      root,
      operation: "checkFreshness",
      family: "modelfacts",
      subjectId: "model-example",
    });
    expect(reviewed).toHaveLength(1);
    expect(reviewed[0]?.disposition).toBe("needs_review");
    expect(reviewed[0]?.changedFields).toEqual([]);
    const text = reviewed[0]?.findings.join(" ");
    expect(text).toMatch(/Example-7B-Q4/);
    expect(text).toMatch(/GGUF Q4_K_M/);
    expect(text).toMatch(/128k/);
    expect(text).toMatch(/MMLU/);
    expect(text).toMatch(/were not copied/);
    expect(text).toMatch(/No provider was contacted/);
    expect(text).not.toMatch(/absent/i);
    expect(readFileSync(join(root, "MODEL_FACTS.md"))).toEqual(before);
    expect(readFileSync(join(root, "MODEL_FACTS.md"), "utf8")).toContain("name: Example-7B");
    expect(readFileSync(join(root, "MODEL_FACTS.md"), "utf8")).toContain("context_window: 128k");
    expect(readFileSync(join(root, "MODEL_FACTS.md"), "utf8")).toContain("name: MMLU");
    expect(readFileSync(join(root, "MODEL_FACTS.md"), "utf8")).toContain("Approved variant stays");
    const familyOnly = runOperation({ root, operation: "validate", family: "modelfacts", subjectId: "model-other" });
    expect(familyOnly[0]?.disposition).toBe("unchanged");
    expect(familyOnly[0]?.findings.join(" ")).toMatch(/No offline metadata was supplied/);
    expect(readFileSync(join(root, "OTHER_FACTS.md"))).toEqual(other);
  });

  it("does not infer a rating when offline metadata names only a family", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "MODEL_FACTS.md"), modelLabel("Example-7B", "bf16", "undisclosed", false));
    writeFileSync(join(root, "metadata.json"), JSON.stringify({ family: "Llama" }));
    bind(
      root,
      `- id: model-example
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: MODEL_FACTS.md
- id: model-example-meta
  family: modelfacts
  subject_id: model-example
  repository_id: repo-demo
  path: metadata.json`,
    );
    const before = readFileSync(join(root, "MODEL_FACTS.md"));
    const reviewed = runOperation({ root, operation: "extract", family: "modelfacts", subjectId: "model-example" });
    expect(reviewed[0]?.disposition).toBe("needs_review");
    expect(reviewed[0]?.findings.join(" ")).toMatch(/family Llama/);
    expect(reviewed[0]?.findings.join(" ")).toMatch(/No rating was inferred/);
    expect(readFileSync(join(root, "MODEL_FACTS.md"))).toEqual(before);
    expect(readFileSync(join(root, "MODEL_FACTS.md"), "utf8")).toContain("reasoning_math: unresolved");
  });
});
