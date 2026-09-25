import { cpSync, mkdtempSync, readFileSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { orientLedger, renderView, writeView } from "../src/views.js";
import { resolveLedgerRoot } from "../src/check.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-view-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

describe("orientation and views", () => {
  it("keeps gaps and drops unrelated records when the task and budget are tight", () => {
    const root = copyMinimal();
    const tight = orientLedger({ root, task: "maintainer", budgetWords: 40 });
    expect(tight).toContain("Selection: deterministic. No agent assistance.");
    expect(tight).toContain("Owner approves the brief");
    expect(tight).toContain("The brief exceeds the word budget so that recorded gaps stay visible.");
    expect(tight).not.toContain("concept-workshop");

    const wide = orientLedger({ root, task: "maintainer", budgetWords: 800 });
    expect(wide).toContain("records/stakeholder/stakeholder-maintainer.md");
    expect(wide).not.toContain("concept-workshop");
    expect(wide).not.toContain("exceeds the word budget");
  });

  it("renders progress and history twice as the same bytes", () => {
    const root = copyMinimal();
    expect(renderView({ root, view: "progress" })).toBe(renderView({ root, view: "progress" }));
    const history = renderView({ root, view: "history" });
    expect(history).toBe(renderView({ root, view: "history" }));
    expect(history).toContain("does not reconstruct past ledger state");
    expect(history).toContain("records/change/change-local-files.md");
    expect(history).not.toMatch(/generated at/i);
  });

  it("does not rewrite a view file when the rendered bytes are unchanged", () => {
    const root = copyMinimal();
    const ledgerRoot = resolveLedgerRoot(root);
    const markdown = renderView({ root, view: "progress" });
    const first = writeView(ledgerRoot, "progress", markdown);
    expect(first.written).toBe(true);
    const file = join(ledgerRoot, first.path);
    const stamped = new Date("2020-01-01T00:00:00Z");
    utimesSync(file, stamped, stamped);
    const before = statSync(file).mtimeMs;
    const second = writeView(ledgerRoot, "progress", renderView({ root, view: "progress" }));
    expect(second.written).toBe(false);
    expect(statSync(file).mtimeMs).toBe(before);
    expect(readFileSync(file, "utf8")).toBe(markdown);
  });
});
