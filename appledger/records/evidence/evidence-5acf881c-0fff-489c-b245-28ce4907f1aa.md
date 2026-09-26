---
format_version: 0.1.0
id: evidence-5acf881c-0fff-489c-b245-28ce4907f1aa
kind: evidence
title: SkillFacts review tests passed
record_status: active
created_at: '2026-09-26T15:05:00Z'
updated_at: '2026-09-26T15:05:00Z'
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
  result: pnpm test exited 0 with 40 tests. pnpm build succeeded. appledger check accepted this ledger with no findings. A keyword-guess label was not rewritten, and propose --apply left both the reviewed label and a sibling label byte-identical.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - Script text was read and not executed. ToolFacts, AgentFacts, and ModelFacts were not parsed.
---

# Test run

The review did not change `instructions_reach.network` from `none` and did not treat the guess as extracted truth.
