---
format_version: 0.1.0
id: change-8ac4a2db-8d34-4422-b8ea-9edc5bb73910
kind: change
title: Add transaction resume and rollback
record_status: active
created_at: '2026-09-25T20:45:00Z'
updated_at: '2026-09-25T20:45:00Z'
recorded_by:
  id: implementation-agent
  type: agent
visibility: public
relations:
- type: affects
  target: work-110dc629-54b0-40ce-9b6a-03397f7f02ee
- type: recorded_in
  target: session-b7e6c468-298a-4146-a4bb-7886f1a74fbc
claims: []
data:
  change_type: added
  affected_ids:
  - work-110dc629-54b0-40ce-9b6a-03397f7f02ee
  reason: Interrupted applies can be resumed or rolled back, and a concurrent edit is left in place.
  evidence_refs:
  - evidence-0233ffe9-589c-4910-8a63-51c85106a377
  operation: edit
---

# Change

The journal lives under `.appledger-cache/` and is not part of the committed ledger.
