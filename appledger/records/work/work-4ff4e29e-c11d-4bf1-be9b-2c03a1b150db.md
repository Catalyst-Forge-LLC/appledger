---
format_version: 0.1.0
id: work-4ff4e29e-c11d-4bf1-be9b-2c03a1b150db
kind: work
title: AppFacts and FeatureFacts refresh
record_status: active
created_at: '2026-09-26T01:40:00Z'
updated_at: '2026-09-26T01:40:00Z'
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
  status: in_progress
  intake: task
  objective: Validate bound AppFacts and FeatureFacts files against pinned child schemas, and update a derived capability title without copying native lifecycle fields.
  acceptance_criteria:
  - id: pinned-refresh
    text: An empty FeatureFacts selection validates with no write. A propose apply sets cached_title and cached_title_basis derived, and a second apply does not change the file.
    status: met
  verification_refs:
  - evidence-caea53ce-e9fe-4aaf-a405-24e3554b9c48
---

# Refresh

The pinned copies are in `schemas/pinned/` and stay MIT. AppFacts text is checked and not rewritten. FeatureFacts recognition, lifecycle, availability, and maturity stay in the register.
