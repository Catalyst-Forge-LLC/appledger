---
format_version: 0.1.0
id: evidence-bca65b3f-1429-4c86-8fef-aa6dfd094a5a
kind: evidence
title: Migration preview, apply, and rollback tests passed
record_status: active
created_at: '2026-09-26T19:23:00Z'
updated_at: '2026-09-26T19:23:00Z'
recorded_by:
  id: implementation-agent
  type: agent
visibility: public
relations: []
claims: []
data:
  evidence_kind: test_run
  repository_id: repo-appledger
  source: package.json
  result: pnpm test exited 0 with 52 tests. pnpm build succeeded. appledger check accepted this ledger, including these records, with no findings. Preview left the tracking file and README untouched. Apply of a representative full file wrote the ledger and a pointer. A second apply did not change those bytes. Rollback restored the tracking file. A later edit of the pointer made rollback refuse and left the edit in place. A starter apply created no appledger directory.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - The ForgeTrail repository was not modified. Installer, templates, MCP, and hooks still emit the old tracking file.
---

# Test run

The representative copies lived in a temporary directory. The product ledger pointer was not imported as project history.
