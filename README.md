# AppLedger

Open text record of what an application is for, how it fits together, what it does, and how it changes.

This repository is the specification and the reference checker. It is also a ForgeTrail project, so the project record is the ledger in [`appledger/`](appledger/README.md). The normative format is [`spec/`](spec/README.md). Those are different things.

| | |
| --- | --- |
| Brand | AppLedger |
| Repository | https://github.com/Catalyst-Forge-LLC/appledger |
| npm | `appledger` (the published `0.0.0` is a name hold, not this source) |
| Domain | https://appledger.dev (not deployed) |

## Check a ledger

```bash
pnpm install
pnpm verify
pnpm exec appledger check --root examples/minimal/appledger
pnpm exec appledger check
```

`appledger check` reads a ledger and prints findings. It does not modify files. Errors are schema, predicate, and path problems. Warnings mean a recorded source is missing, its digest no longer matches, a claim's git revision is not HEAD, or a transaction journal is still open. A missing file is not treated as proof that a feature is gone.

`appledger orient` prints a short brief. Selection is deterministic and says so. The brief includes the phase, each decision choice, each lesson, and the latest session time. A task limits only the related records. Recorded gaps stay in the brief when the word budget is too small for them. It does not modify files.

`appledger render --view progress` and `--view history` print derived views. `--view public` prints only public records. An internal record, including its path or contact text, is omitted, and editing it does not change the public bytes. `--write` stores `views/<view>.md` and leaves the file untouched when the bytes are unchanged. These views do not replace `README.md`. The public view does not upload or deploy. `appledger migrate preview` reads a Lite or full `.forgetrail/workflow_tracking.json` and writes nothing. `migrate apply` imports it into `appledger/` and replaces that file with a pointer. `migrate rollback` restores only those paths and leaves a later edit in place. A shipped starter is not imported as project history. This command does not change the ForgeTrail installer, templates, or hooks. `appledger diff --from REV --to REV` explains changes in the current ledger directory between those commits. A formatting-only edit and a generated view are not reported as semantic record changes. The command does not write files.

`appledger transaction resume` and `appledger transaction rollback` finish or undo an interrupted apply. They replace only journaled paths, and they leave a file alone when its bytes changed after the apply started. A second apply of bytes that are already on disk writes nothing.

The curation skill is [`skills/appledger/SKILL.md`](skills/appledger/SKILL.md). Command status lives in [`spec/10-tooling-and-automation.md`](spec/10-tooling-and-automation.md). `appledger subjects` lists each subject and a disposition. `--operation validate` checks a bound AppFacts, FeatureFacts, SkillFacts, ToolFacts, or AgentFacts file against its pinned schema. `--operation propose --apply` may set FeatureFacts `cached_title` with basis `derived` and does not copy recognition, lifecycle, or selection. SkillFacts propose does not rewrite the label. A keyword guess stays a draft, and a bundled script is read rather than executed. ToolFacts propose compares a recorded tools/list, does not start an MCP server, and does not rewrite the label. AgentFacts propose checks configuration scope against toolsets and does not claim host enforcement. ModelFacts propose reads offline metadata, does not contact a provider, and does not copy one variant's context window or benchmarks onto another. It does not write any other label. The skill does not publish, deploy, or generate xFacts labels.

## Site

`site/` is a FilePress site that is not deployed. The pages describe the format, the commands in this repository, and the synthetic `examples/minimal` ledger. Preview with `pnpm site:dev`. LocalSlip lease name: `appledger-site` on port 46002. Do not deploy from this tree.

## Licenses

Specification and schemas are CC0. The checker is MIT. See `LICENSE` and `schemas/LICENSE.md`.

## ForgeTrail

`.forgetrail/workflow_tracking.json` is a pointer. Decisions and phase state live in the ledger. Do not add a second decision log there.
