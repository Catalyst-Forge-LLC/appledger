---
name: appledger
description: Curate an AppLedger text ledger. Use when creating, checking, orienting, or handing off records in an appledger/ directory, or when the user mentions AppLedger. Follow the command status table in spec/10. Do not require ForgeTrail phases.
---

# AppLedger curation

Use this skill to create, check, explain, and hand off an application ledger. The protocol is `spec/05-curation-protocol.md`. The command list is the status column in `spec/10-tooling-and-automation.md`. If this skill and that table disagree, the table wins.

This skill does not use ForgeTrail phase names. A ForgeTrail profile may still be present and is read as data.

## On entry

1. Find `appledger/manifest.yaml` or an explicit root. Do not search parent directories for a different ledger.
2. When the `appledger` CLI is available, run `appledger check` and `appledger orient --task` for the task at hand.
3. Read the latest session, in-progress work, and the gaps in that brief.
4. If a transaction journal is open, stop and ask to resume or roll it back. Do not start another write over it.
5. Say which checks from the status table were not run. Unavailable commands are not implied to have passed.

When the CLI is unavailable, maintain records by hand and name every check that was not run. Do not invent a result for it.

## Commands

- implemented: `appledger check`
- implemented: `appledger orient`
- implemented: `appledger render`
- implemented: `appledger transaction`
- implemented: `appledger subjects`
- not implemented: `appledger init`
- not implemented: `appledger reconcile`
- not implemented: `appledger diff`
- not implemented: `appledger migrate`

`orient` in this repository is deterministic. Do not describe it as agent assistance. `render --write` must not replace a hand-written `README.md`. `subjects` inventories bindings and the application. `subjects --operation validate` checks pinned AppFacts 0.1.0, FeatureFacts 0.2.0, SkillFacts 0.1.0, and ToolFacts 0.1.0 schemas. `propose --apply` may update FeatureFacts `cached_title` only, with basis `derived`. It does not copy recognition, lifecycle, availability, or maturity. SkillFacts propose does not rewrite a label. A keyword guess stays a draft. A bundled script is read, not executed. ToolFacts propose compares a recorded tools/list and does not rewrite the label or start an MCP server. A prompt-returning tool is not reclassified as a scanner. It does not guess a label or run a target server.

## Records

A supported declaration is not observed implementation. A test file is not a passing run. Local work is not a release. A missing source is not proof that a feature is absent or that it failed.

Do not infer a business goal, stakeholder approval, or a success metric from code alone. Mark inference as inference. Leave initial incompleteness in place.

Update only records affected by the task. Keep scratch reasoning out of the ledger unless it becomes a decision, question, or lesson. Do not mark work done because `check` exited 0.

Do not write decisions, sessions, or phase status into `.forgetrail/workflow_tracking.json`. That file is a pointer when this repository is also a ForgeTrail project.

xFacts labels are not generated here. Do not guess a label. Agent self-review is not independent human review.

Do not publish the npm package or deploy the site from this skill.

## Handoff

Record what was completed, what is still in progress, the relevant ids, unresolved blockers, and concrete next steps. An interrupted session should leave a recoverable transaction or an accurate unfinished handoff, not a claim that the ledger is complete.
