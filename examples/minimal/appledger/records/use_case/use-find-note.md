---
format_version: 0.1.0
id: use-find-note
kind: use_case
title: Find an existing note
record_status: active
created_at: '2026-09-25T19:00:00Z'
updated_at: '2026-09-25T19:00:00Z'
recorded_by:
  id: synthetic-fixture-author
  type: tool
visibility: internal
relations:
- type: serves
  target: goal-find-notes
- type: uses
  target: concept-workshop
claims: []
data:
  actor: stakeholder-maintainer
  trigger: Maintainer needs a previous note
  intended_outcome: Read the relevant note
  flow:
  - Open collection
  - Locate note
  - Read note
  exceptions:
  - No matching note
---

# Find a note

A proposed use case. No search feature is claimed to exist.
