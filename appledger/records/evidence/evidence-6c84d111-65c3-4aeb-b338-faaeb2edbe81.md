---
format_version: 0.1.0
id: evidence-6c84d111-65c3-4aeb-b338-faaeb2edbe81
kind: evidence
title: Source and freshness tests passed
record_status: active
created_at: '2026-09-25T20:30:00Z'
updated_at: '2026-09-25T20:30:00Z'
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
  result: pnpm test exited 0 with 16 tests. pnpm build succeeded. appledger check accepted this ledger with no findings.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - FeatureFacts registers are detected and not parsed.
---

# Test run

Rename, missing source, digest mismatch, revision mismatch, and symlink escape are covered. The checker does not write the ledger.
