import { cpSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
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
    expect(wide).toContain("Use local files for initial scope");
    expect(wide).toContain("Recorded: 2026-09-25T19:00:00Z");
    expect(wide).toContain("No lesson records.");
    expect(wide).not.toContain("concept-workshop");
    expect(wide).not.toContain("exceeds the word budget");
  });

  it("counts the work list against the budget and summarizes the rest", () => {
    const root = copyMinimal();
    const workDir = join(root, "appledger", "records", "work");
    const template = readFileSync(join(workDir, "work-note-flow.md"), "utf8");
    for (let n = 1; n <= 40; n += 1) {
      const id = `work-extra-${String(n).padStart(2, "0")}`;
      const text = template
        .replace("id: work-note-flow", `id: ${id}`)
        .replace("title: Implement note reading flow", `title: Extra work ${n}`)
        .replace("status: proposed", "status: in_progress")
        .replace("status: pending", "status: met");
      writeFileSync(join(workDir, `${id}.md`), text);
    }
    const wide = orientLedger({ root, budgetWords: 5000 });
    expect(wide.match(/^- in_progress — /gm)).toHaveLength(40);
    expect(wide).not.toContain("more in progress");

    const tight = orientLedger({ root, budgetWords: 250 });
    const shown = tight.match(/^- in_progress — /gm)?.length ?? 0;
    expect(shown).toBeLessThan(40);
    expect(tight).toContain(`- ${40 - shown} more in progress, blocked, or ready.`);
    expect(tight).toContain("## Work in progress\n\n- ");
    expect(tight).toContain("Owner approves the brief");
    expect(tight.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(250);
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
