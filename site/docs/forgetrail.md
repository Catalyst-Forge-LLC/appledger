---
title: ForgeTrail
---

AppLedger is the record ForgeTrail uses. It replaces the writable `.forgetrail/workflow_tracking.json` that ForgeTrail kept before. ForgeTrail still owns the phases, guidance, and hooks. The facts it used to write into that file are now ledger records.

ForgeTrail's phase profile is `appledger/profiles/forgetrail.yaml`. Phases are `plan`, `build`, `stabilize`, `iterate`, `refine`, `align`, and `harden`. Lite phases 1–7 and the older full phase ids map onto those names. A Lite status of `pending` becomes `not_started`. A later current phase does not mark earlier phases completed.

Decisions, lessons, questions, and sessions are records. The latest session holds `left_off` and `next_steps`.

New ForgeTrail installs do not copy `workflow_tracking.json`. `.forgetrail/` holds the protocol, rules, and hooks. If a writable tracking file is still present, it is a legacy conflict, not the live phase.

```bash
pnpm dlx appledger migrate preview
pnpm dlx appledger migrate apply
```

Preview writes nothing. Apply writes the ledger and replaces the tracking file with a pointer whose `status` is `pointer` and whose `record` contains `appledger`. Rollback restores only that migration.

`appledger orient` is the resume brief: phase, decision choices, lessons, and the latest session time. Open questions and unmet criteria stay visible as gaps. A fact that exists only inside an older session body is not copied into the decision list.
