import { cpSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runOperation } from "../src/adapters.js";
import { parseYaml } from "../src/yaml.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));
const sampleFeature = fileURLToPath(new URL("./fixtures/resume-importer.yaml", import.meta.url));

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-refresh-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function bind(root: string, yaml: string): void {
  const manifest = join(root, "appledger", "manifest.yaml");
  writeFileSync(manifest, readFileSync(manifest, "utf8").replace("bindings: []", `bindings:\n${yaml}`));
}

describe("AppFacts and FeatureFacts refresh", () => {
  it("accepts an empty FeatureFacts selection and does not write", () => {
    const root = copyMinimal();
    mkdirSync(join(root, ".featurefacts"), { recursive: true });
    const registry = join(root, ".featurefacts", "features.yaml");
    writeFileSync(
      registry,
      `schemaVersion: 0.2.0
scan_id: empty-scan-1
product:
  name: Empty Demo
  type: synthetic fixture
  status: unknown
features: []
redirects: []
`,
    );
    bind(
      root,
      `- id: features-main
  family: featurefacts
  subject_id: app-workshop-demo
  repository_id: repo-demo
  path: .featurefacts/features.yaml`,
    );
    const before = statSync(registry).mtimeMs;
    const validated = runOperation({ root, operation: "validate", family: "featurefacts", subjectId: "app-workshop-demo" });
    expect(validated[0]?.disposition).toBe("unchanged");
    expect(validated[0]?.schemaVersion).toBe("0.2.0");
    expect(validated[0]?.findings.join(" ")).toContain("empty selection");
    expect(statSync(registry).mtimeMs).toBe(before);
    expect(runOperation({ root, operation: "validate", family: "featurefacts", subjectId: "app-workshop-demo" })).toEqual(validated);
  });

  it("copies only the feature name into a derived title", () => {
    const root = copyMinimal();
    const parsed = parseYaml(readFileSync(sampleFeature, "utf8"));
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") throw new Error("fixture");
    const feature = parsed.value as { id: string; name: string; recognition: string; lifecycle: string };
    mkdirSync(join(root, ".featurefacts"), { recursive: true });
    const registry = {
      schemaVersion: "0.2.0",
      scan_id: "demo-scan-1",
      product: { name: "Demo", type: "synthetic fixture", status: "unknown" },
      features: [feature],
      redirects: [],
    };
    writeFileSync(join(root, ".featurefacts", "features.yaml"), JSON.stringify(registry));
    bind(
      root,
      `- id: features-main
  family: featurefacts
  subject_id: app-workshop-demo
  repository_id: repo-demo
  path: .featurefacts/features.yaml`,
    );
    const capability = join(root, "appledger", "records", "capability_ref", "capability-resume.md");
    mkdirSync(join(capability, ".."), { recursive: true });
    const original = `---
format_version: 0.1.0
id: capability-resume
kind: capability_ref
title: Resume import
record_status: active
created_at: '2026-09-25T19:00:00Z'
updated_at: '2026-09-25T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: internal
relations: []
claims: []
data:
  external_ref: binding:features-main#${feature.id}
---

# Pointer
`;
    writeFileSync(capability, original);
    const proposed = runOperation({
      root,
      operation: "propose",
      family: "featurefacts",
      subjectId: "app-workshop-demo",
    });
    expect(proposed[0]?.disposition).toBe("needs_review");
    expect(readFileSync(capability, "utf8")).toBe(original);
    const applied = runOperation({
      root,
      operation: "propose",
      family: "featurefacts",
      subjectId: "app-workshop-demo",
      apply: true,
    });
    expect(applied[0]?.disposition).toBe("updated");
    const written = readFileSync(capability, "utf8");
    expect(written).toContain(`cached_title: ${feature.name}`);
    expect(written).toContain("cached_title_basis: derived");
    expect(written).not.toContain(feature.recognition);
    expect(written).not.toContain(feature.lifecycle);
    expect(written).toContain("type: tool");
    const stamped = statSync(capability).mtimeMs;
    const again = runOperation({
      root,
      operation: "propose",
      family: "featurefacts",
      subjectId: "app-workshop-demo",
      apply: true,
    });
    expect(again[0]?.disposition).toBe("unchanged");
    expect(statSync(capability).mtimeMs).toBe(stamped);
    const third = runOperation({
      root,
      operation: "propose",
      family: "featurefacts",
      subjectId: "app-workshop-demo",
      apply: true,
    });
    expect(third[0]?.disposition).toBe("unchanged");
    expect(statSync(capability).mtimeMs).toBe(stamped);
  });

  it("validates AppFacts front matter and does not rewrite it", () => {
    const root = copyMinimal();
    const label = join(root, "APP_FACTS.md");
    const text = `---
app_facts_version: "0.1.0"
name: Workshop Demo
type: CLI tool
status: active
license: MIT
stack:
  language: TypeScript
key_dependencies:
  - name: yaml
    purpose: Read YAML
    registry: npm
build:
  package_manager: pnpm
generated:
  date: 2026-09-25
  generator: hand-authored
---

# App Facts
`;
    writeFileSync(label, text);
    bind(
      root,
      `- id: app-main
  family: appfacts
  subject_id: app-workshop-demo
  repository_id: repo-demo
  path: APP_FACTS.md`,
    );
    const validated = runOperation({ root, operation: "validate", family: "appfacts", subjectId: "app-workshop-demo" });
    expect(validated[0]?.disposition).toBe("unchanged");
    expect(validated[0]?.schemaVersion).toBe("0.1.0");
    expect(validated[0]?.findings.join(" ")).toContain("Workshop Demo");
    expect(readFileSync(label, "utf8")).toBe(text);
    writeFileSync(label, text.replace("registry: npm", "registry: npm\n    unexpected_field: true"));
    expect(runOperation({ root, operation: "validate", family: "appfacts", subjectId: "app-workshop-demo" })[0]?.disposition).toBe("failed");
    writeFileSync(label, text);
    expect(runOperation({ root, operation: "propose", family: "appfacts", subjectId: "app-workshop-demo", apply: true })[0]?.disposition).toBe(
      "unchanged",
    );
    expect(readFileSync(label, "utf8")).toBe(text);
  });
});
