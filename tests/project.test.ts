import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { projectLedger, writePublicProjection } from "../src/project.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

const publicConcept = `---
format_version: 0.1.0
id: concept-public
kind: concept
title: Public term
record_status: active
created_at: '2026-09-26T19:00:00Z'
updated_at: '2026-09-26T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: public
relations:
- type: derived_from
  target: evidence-private
claims: []
data:
  definition: A term safe to show
  aliases: []
---

# Concept

The public term.
`;

function privateEvidence(secret: string): string {
  return `---
format_version: 0.1.0
id: evidence-private
kind: evidence
title: Private note ${secret}
record_status: active
created_at: '2026-09-26T19:00:00Z'
updated_at: '2026-09-26T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: internal
relations: []
claims: []
data:
  evidence_kind: document
  repository_id: repo-demo
  result: reviewed
  source: secrets/key.txt
  limitations:
  - commit abcdef1234567890
  - owner@example.com
---

# Evidence

Contact owner@example.com about secrets/key.txt.
`;
}

function copyMinimal(): string {
  const root = mkdtempSync(join(tmpdir(), "appledger-project-"));
  cpSync(minimal, root, { recursive: true });
  return root;
}

describe("public projection", () => {
  it("keeps public bytes identical when a private record changes", () => {
    const root = copyMinimal();
    mkdirSync(join(root, "appledger", "records", "concept"), { recursive: true });
    writeFileSync(join(root, "appledger", "records", "concept", "concept-public.md"), publicConcept);
    writeFileSync(join(root, "appledger", "records", "evidence", "evidence-private.md"), privateEvidence("one"));
    const first = projectLedger(root);
    expect(first.publicCount).toBe(1);
    expect(first.markdown).toContain("concept-public");
    expect(first.markdown).toContain("Public term");
    expect(first.markdown).toContain("A private relation was omitted.");
    expect(first.markdown).not.toContain("evidence-private");
    expect(first.markdown).not.toContain("secrets/key.txt");
    expect(first.markdown).not.toContain("owner@example.com");
    expect(first.markdown).not.toContain("abcdef1234567890");
    expect(first.markdown).not.toMatch(/Generated/);
    expect(first.findings.join(" ")).toMatch(/does not grant publication/);
    expect(first.findings.join(" ")).toMatch(/No upload or deploy was performed/);
    expect(first.findings.join(" ")).toMatch(/not represent a prior review/);
    writeFileSync(join(root, "appledger", "records", "evidence", "evidence-private.md"), privateEvidence("two"));
    const internal = join(root, "appledger", "records", "evidence", "evidence-brief.md");
    writeFileSync(internal, readFileSync(internal, "utf8").replace("visibility: internal", "visibility: internal\n"));
    const second = projectLedger(root);
    expect(second.markdown).toBe(first.markdown);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.publicCount).toBe(first.publicCount);
    const ledgerRoot = join(root, "appledger");
    expect(writePublicProjection(ledgerRoot, first.markdown)).toEqual({ path: "views/public.md", written: true });
    expect(writePublicProjection(ledgerRoot, first.markdown)).toEqual({ path: "views/public.md", written: false });
    expect(readFileSync(join(ledgerRoot, "README.md"), "utf8")).not.toContain("## concept-public");
    writeFileSync(
      join(root, "appledger", "records", "concept", "concept-public.md"),
      publicConcept.replace("title: Public term", "title: Public workshop"),
    );
    const third = projectLedger(root);
    expect(third.markdown).not.toBe(first.markdown);
    expect(third.markdown).toContain("Public workshop");
    expect(third.fingerprint).not.toBe(first.fingerprint);
  });
});
