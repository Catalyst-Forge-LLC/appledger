---
title: Conformance
---

The reference implementation is this repository's TypeScript checker, published as [`appledger` on npm](https://www.npmjs.com/package/appledger). The compatibility table and the row-by-row results are in [`docs/rel-01.md`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/docs/rel-01.md). Rows that the suite does not cover are listed there as not tested. Fifty-two passing tests are not a pass of every conformance row.

Implemented commands, from a checkout:

| Command | Effect |
| --- | --- |
| `check` | Report schema, predicate, and path findings. Warnings do not fail the run. |
| `orient` | Print the resume brief. Decision choices and the latest session time are included. A task filter applies to related records. Gaps stay when the word budget is exceeded. |
| `render` | Print orientation, progress, history, or the public view. `--write` updates a view file only when the bytes differ. |
| `subjects` | One disposition per subject for discover, validate, extract, checkFreshness, or propose. |
| `transaction` | Status, resume, or rollback of an interrupted apply. |
| `migrate` | Preview, apply, or roll back a tracking-file import. |
| `diff` | Explain ledger changes between two explicit revisions. A generated view is not a semantic record change. Nothing is written. |
| `init` | Create a manifest, profile, application record, and session record. An existing ledger file is left in place. |
| `bind` | List an `APP_FACTS.md` or FeatureFacts register at the repository root that no binding names. `--apply` adds the bindings. No label is changed. |
| `reconcile` | Record a disposition for each subject family. `--apply` writes one receipt. A repeat writes nothing. No label is rewritten. |

There is no hosted editor, account, or database. A static viewer is not part of this site. Search does not require uploading a private ledger because this site does not accept ledgers.

These are not claimed:

- Deploying AppLedger.dev or forgetrail.dev from this documentation pass
- An npm release of the checker
- Automatic generation of all six xFacts families
- Host enforcement of agent tool permissions
- That orientation quotes every older session body
- That a met acceptance criterion flips the work record to `done`
- Certification by a standards body
- A pass of every row in the conformance matrix. See the report linked above.

FilePress, LocalSlip, and LocalHelm are how this repository previews its own site. Using AppLedger does not require them.
