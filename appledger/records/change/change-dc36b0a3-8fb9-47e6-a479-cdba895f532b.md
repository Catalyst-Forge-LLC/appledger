---
format_version: 0.1.0
id: change-dc36b0a3-8fb9-47e6-a479-cdba895f532b
kind: change
title: Add appledger bind and correct application dispositions
record_status: active
created_at: '2026-09-28T18:23:36Z'
updated_at: '2026-09-28T18:23:36Z'
recorded_by:
  id: implementation-agent
  type: agent
visibility: public
relations:
- type: affects
  target: work-308ba19b-9c14-424f-bc1a-4bb49b2c019b
- type: recorded_in
  target: session-b7e6c468-298a-4146-a4bb-7886f1a74fbc
claims: []
data:
  change_type: added
  affected_ids:
  - work-308ba19b-9c14-424f-bc1a-4bb49b2c019b
  reason: The suite review found that a repository with APP_FACTS.md was reported as unsupported with no register bound, and no command could bind it.
  evidence_refs:
  - evidence-8d097b1a-aee9-48db-9b17-24176b2e6c02
  operation: edit
---

# Change

`appledger bind` plans by default. `--apply` adds bindings to the manifest in one transaction and does not change a label. The package version is 0.1.2 and is not published.
