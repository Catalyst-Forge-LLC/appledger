---
format_version: 0.1.0
id: decision-local-files
kind: decision
title: Keep notes in local files
record_status: active
created_at: '2026-09-25T19:00:00Z'
updated_at: '2026-09-25T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: internal
relations:
- type: verified_by
  target: evidence-brief
claims:
- id: storage-intent
  statement: The scenario owner selected local files for initial scope.
  basis: declared
  status: supported
  evidence_refs:
  - evidence-brief
  scope:
    repository_id: repo-demo
    limitations:
    - Synthetic brief, not observed implementation
data:
  status: accepted
  choice: Use local files for initial scope
  rationale: The synthetic brief calls for a small offline tool
  alternatives:
  - Hosted database
  authority: Synthetic scenario owner
---

# Storage decision

This is a decision within the scenario, not evidence of implementation.
