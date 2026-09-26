---
format_version: 0.1.0
id: evidence-caea53ce-e9fe-4aaf-a405-24e3554b9c48
kind: evidence
title: Pinned refresh tests passed
record_status: active
created_at: '2026-09-26T01:40:00Z'
updated_at: '2026-09-26T01:40:00Z'
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
  result: pnpm test exited 0 with 38 tests. pnpm build succeeded. appledger check accepted this ledger with no findings. An empty FeatureFacts selection validated without a write, and a second propose apply left the capability file unchanged.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - AppFacts was validated and not regenerated. The other four families were not parsed.
---

# Test run

The derived title update did not copy recognition or lifecycle into the capability record.
