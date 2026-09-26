---
format_version: 0.1.0
id: evidence-2bb710aa-55f4-47ef-bcaf-76bf19e4b44e
kind: evidence
title: ToolFacts review tests passed
record_status: active
created_at: '2026-09-26T15:10:00Z'
updated_at: '2026-09-26T15:10:00Z'
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
  result: pnpm test exited 0 with 42 tests. pnpm build succeeded. appledger check accepted this ledger with no findings. A matching recorded tools/list left the prompt tool and undisclosed destinations in place. A new writing tool was marked for review and both labels stayed byte-identical.
  limitations:
  - Recorded in the same commit as the checks, so this evidence has no commit id.
  - No MCP server was started. AgentFacts and ModelFacts were not parsed.
---

# Test run

The review did not reclassify the prompt tool as a workspace scanner and did not treat annotations as proof of enforcement.
