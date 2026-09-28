import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverSubjects } from "../src/adapters.js";
import { bindLabels } from "../src/bind.js";
import { checkLedger } from "../src/check.js";
import { reconcileLedger } from "../src/reconcile.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));
const at = "2026-09-28T01:00:00Z";

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-bind-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

function withLabels(root: string): void {
  writeFileSync(join(root, "APP_FACTS.md"), "---\nname: Workshop notes\n---\n\nLabel body.\n");
  mkdirSync(join(root, ".featurefacts"), { recursive: true });
  writeFileSync(join(root, ".featurefacts", "features.yaml"), "features: []\n");
}

function states(root: string): string[] {
  return discoverSubjects({ root })
    .filter((row) => row.family === "appfacts" || row.family === "featurefacts")
    .map((row) => `${row.disposition} ${row.family}`);
}

describe("bind", () => {
  it("reports an unbound label as needs_review and names the bind command", () => {
    const root = copyMinimal();
    withLabels(root);
    const rows = discoverSubjects({ root, family: "appfacts" });
    expect(rows[0]?.disposition).toBe("needs_review");
    expect(rows[0]?.findings[0]).toContain("APP_FACTS.md exists and is not bound");
    expect(rows[0]?.findings[0]).toContain("appledger bind --apply");
    expect(reconcileLedger({ root, at }).code).toBe("blocked");
  });

  it("plans without writing, then binds both labels without changing them", () => {
    const root = copyMinimal();
    withLabels(root);
    const manifest = join(root, "appledger", "manifest.yaml");
    const before = readFileSync(manifest, "utf8");
    const labelBytes = readFileSync(join(root, "APP_FACTS.md"));
    const registerBytes = readFileSync(join(root, ".featurefacts", "features.yaml"));

    const plan = bindLabels({ root });
    expect(plan.code).toBe("planned");
    expect(plan.wrote).toEqual([]);
    expect(plan.bindings.map((item) => `${item.id} ${item.path}`)).toEqual([
      "appfacts-application APP_FACTS.md",
      "featurefacts-application .featurefacts/features.yaml",
    ]);
    expect(readFileSync(manifest, "utf8")).toBe(before);

    const applied = bindLabels({ root, apply: true });
    expect(applied.code).toBe("applied");
    expect(applied.wrote).toEqual(["appledger/manifest.yaml"]);
    const after = readFileSync(manifest, "utf8");
    expect(after).toContain("bindings:\n- id: appfacts-application\n  family: appfacts\n  subject_id: app-workshop-demo");
    expect(after.replace(/bindings:[\s\S]*?\nprofiles:/, "bindings: []\nprofiles:")).toBe(before);
    expect(readFileSync(join(root, "APP_FACTS.md"))).toEqual(labelBytes);
    expect(readFileSync(join(root, ".featurefacts", "features.yaml"))).toEqual(registerBytes);
    expect(checkLedger(root).ok).toBe(true);
    expect(states(root)).toEqual(["unchanged appfacts", "unchanged featurefacts"]);

    const again = bindLabels({ root, apply: true });
    expect(again.code).toBe("unchanged");
    expect(readFileSync(manifest, "utf8")).toBe(after);
  });

  it("keeps CRLF manifests CRLF", () => {
    const root = copyMinimal();
    withLabels(root);
    const manifest = join(root, "appledger", "manifest.yaml");
    writeFileSync(manifest, readFileSync(manifest, "utf8").replace(/\n/g, "\r\n"));
    expect(bindLabels({ root, apply: true }).code).toBe("applied");
    const after = readFileSync(manifest, "utf8");
    expect(after).toContain("\r\n");
    expect(after.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("does not bind a rendered FEATURE_FACTS.md without its register", () => {
    const root = copyMinimal();
    writeFileSync(join(root, "FEATURE_FACTS.md"), "# Features\n");
    const rows = discoverSubjects({ root, family: "featurefacts" });
    expect(rows[0]?.disposition).toBe("needs_review");
    expect(rows[0]?.findings[0]).toContain("register .featurefacts/features.yaml was not found");
    expect(bindLabels({ root }).code).toBe("unchanged");
  });
});
