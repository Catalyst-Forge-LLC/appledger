---
format_version: 0.1.0
id: work-fca68daa-2df6-4ff2-9dca-5deace041c6a
kind: work
title: ToolFacts recorded inventory review
record_status: active
created_at: '2026-09-26T15:10:00Z'
updated_at: '2026-09-28T20:21:05Z'
recorded_by:
  id: implementation-agent
  type: agent
visibility: public
relations:
- type: realizes
  target: goal-e3ff9325-aa9d-4b49-95b9-69bcf73746b3
- type: depends_on
  target: work-8cfdb1d0-2d5a-426d-8866-e995d697be1d
claims: []
data:
  status: done
  intake: task
  objective: Validate a bound ToolFacts label against the pinned schema, compare it with a recorded tools/list, and mark a new writing tool for review without starting a server or rewriting the label.
  acceptance_criteria:
  - id: recorded-list
    text: A matching recorded tools/list leaves a prompt-returning tool declared and destinations undisclosed. A new writing tool marks reach for review, requests AgentFacts review, and leaves the label and a sibling label unchanged.
    status: met
  verification_refs:
  - evidence-2bb710aa-55f4-47ef-bcaf-76bf19e4b44e
---

# ToolFacts

The pinned copy is in `schemas/pinned/toolfacts/` and stays MIT. Propose does not overwrite the label. The comparison reads a recorded tools/list and does not start an MCP server.

Closed on 2026-09-28. Every acceptance criterion is met, per `evidence-2bb710aa-55f4-47ef-bcaf-76bf19e4b44e`. The code is in appledger 0.1.2 on npm.
