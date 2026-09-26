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

`appledger orient` prints a short brief. Selection is deterministic and says so. A task limits the related records. Recorded gaps stay in the brief when the word budget is too small for them. It does not modify files.

`appledger render --view progress` and `--view history` print derived views. `--write` stores `views/<view>.md` and leaves the file untouched when the bytes are unchanged. These views do not replace `README.md`.

`appledger transaction resume` and `appledger transaction rollback` finish or undo an interrupted apply. They replace only journaled paths, and they leave a file alone when its bytes changed after the apply started. A second apply of bytes that are already on disk writes nothing.

The curation skill is [`skills/appledger/SKILL.md`](skills/appledger/SKILL.md). Command status lives in [`spec/10-tooling-and-automation.md`](spec/10-tooling-and-automation.md). `appledger subjects` lists each subject and a disposition. `--operation validate` checks a bound AppFacts or FeatureFacts file against the pinned schema. `--operation propose --apply` may set `cached_title` with basis `derived` and does not copy recognition, lifecycle, or selection. It does not write any other label. The skill does not publish, deploy, or generate xFacts labels.

## Site

`site/` is a FilePress stub. Preview with `pnpm site:dev`. LocalSlip lease name: `appledger-site` on port 46002. Do not deploy from this tree until the pages match shipped behavior.

## Licenses

Specification and schemas are CC0. The checker is MIT. See `LICENSE` and `schemas/LICENSE.md`.

## ForgeTrail

`.forgetrail/workflow_tracking.json` is a pointer. Decisions and phase state live in the ledger. Do not add a second decision log there.
