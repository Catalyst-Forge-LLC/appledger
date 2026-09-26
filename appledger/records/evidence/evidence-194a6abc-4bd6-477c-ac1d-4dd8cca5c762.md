---
format_version: 0.1.0
id: evidence-194a6abc-4bd6-477c-ac1d-4dd8cca5c762
kind: evidence
title: AgentFacts scope tests passed
record_status: active
created_at: '2026-09-26T16:00:00Z'
updated_at: '2026-09-26T16:00:00Z'
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
  result: pnpm test exited 0 with 44 tests. pnpm build succeeded. appledger check accepted this ledger with no findings. A matching toolset left the configuration unchanged. A switched writing toolset was marked for review and the configuration name stayed in place.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - Host enforcement was recorded as unknown. ModelFacts was not parsed. Toolset URLs were not fetched.
---

# Test run

The review did not rewrite the configuration identity and did not treat the declared reach as host enforcement.
