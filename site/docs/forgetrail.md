---
title: ForgeTrail
---

AppLedger is the record ForgeTrail uses. ForgeTrail owns the phases, guidance, and hooks. Phase, decisions, lessons, and the session handoff live in `appledger/`.

ForgeTrail's phase profile is `appledger/profiles/forgetrail.yaml`. Phases are `plan`, `build`, `stabilize`, `iterate`, `refine`, `align`, and `harden`. Lite phases 1–7 and the older full phase ids map onto those names. A Lite status of `pending` becomes `not_started`. A later current phase does not mark earlier phases completed.

Decisions, lessons, questions, and sessions are records. The latest session holds `left_off` and `next_steps`.

`.forgetrail/` holds the protocol, rules, and hooks.

`appledger orient` is the resume brief: phase, decision choices, lessons, and the latest session time. Open questions and unmet criteria stay visible as gaps. A fact that exists only inside an older session body is not copied into the decision list.
