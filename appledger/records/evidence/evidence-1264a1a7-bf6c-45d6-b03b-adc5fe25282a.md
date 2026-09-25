---
format_version: 0.1.0
id: evidence-1264a1a7-bf6c-45d6-b03b-adc5fe25282a
kind: evidence
title: Fresh-session skill demonstration passed
record_status: active
created_at: '2026-09-25T22:30:00Z'
updated_at: '2026-09-25T22:30:00Z'
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
  result: pnpm test exited 0 with 31 tests. pnpm build succeeded. appledger check accepted this ledger with no findings. The fresh-session packet for the notes fixture lists check and orient as run, lists reconcile and migrate as not run, and links the local-files decision.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - The demonstration is a deterministic packet. It is not a second agent session and it did not generate labels.
---

# Test run

The skill list matches the status column in spec/10. A supported declaration is still not observed implementation.
