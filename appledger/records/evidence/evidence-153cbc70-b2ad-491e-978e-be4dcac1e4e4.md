---
format_version: 0.1.0
id: evidence-153cbc70-b2ad-491e-978e-be4dcac1e4e4
kind: evidence
title: Diff suite on 2026-09-26
record_status: active
created_at: '2026-09-27T00:32:36Z'
updated_at: '2026-09-27T00:32:36Z'
recorded_by:
  id: implementation-agent
  type: agent
visibility: public
relations: []
claims: []
data:
  evidence_kind: test_run
  repository_id: repo-appledger
  source: tests/diff.test.ts
  result: pnpm test reported 54 passed. The run started at 20:32:22 local time (UTC-4) on 2026-09-26, on Node v24.17.0, pnpm 10.30.1, and vitest 3.2.7. tests/diff.test.ts separates a title change from a whitespace-only edit and a generated view, ignores a dirty title and a README outside the ledger, reports the same commit, and throws on a missing revision.
  limitations:
  - Fifty-four passing tests are not a pass of every row in spec/13-acceptance-and-conformance.md.
  - init and reconcile are not implemented. No label was written. The package was not published and the sites were not deployed.
---

# Run

The test uses two commits in a temporary repository. It does not compare the AppLedger product history.
