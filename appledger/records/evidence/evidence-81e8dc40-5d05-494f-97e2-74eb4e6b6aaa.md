---
format_version: 0.1.0
id: evidence-81e8dc40-5d05-494f-97e2-74eb4e6b6aaa
kind: evidence
title: ForgeTrail cutover tests passed
record_status: active
created_at: '2026-09-26T21:04:00Z'
updated_at: '2026-09-26T21:04:00Z'
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
  result: In the ForgeTrail repository, node --test scripts/tracking-cutover.test.mjs exited 0 with 4 tests, and mcp-server tsc --noEmit succeeded. The commit is 70642fc. A pointer produced no issues. A legacy tracking document was reported as not the system of record. Lite and full dry-run installs did not copy workflow_tracking.json into the project. Session start on a legacy file did not quote its current phase.
  limitations:
  - The tests ran in the ForgeTrail repository, not in this package's pnpm test suite.
  - Site pages still describe the old file. They were left for publication after pilots.
  - xFacts maintenance inside ForgeTrail phase instructions is not part of this result.
---

# Test run

ForgeTrail commit `70642fc` at 2026-09-26T17:04:05-04:00.
