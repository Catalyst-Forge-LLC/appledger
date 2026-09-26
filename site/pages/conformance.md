---
title: Conformance
description: What this repository implements, and the limits that stay explicit.
order: 7
---

The reference implementation is this repository's TypeScript checker. It is not published as a usable npm release. `appledger@0.0.0` is a name hold.

Implemented commands, from a checkout:

| Command | Effect |
| --- | --- |
| `check` | Report schema, predicate, and path findings. Warnings do not fail the run. |
| `orient` | Print the resume brief. Decision choices and the latest session time are included. |
| `render` | Print orientation, progress, history, or the public view. `--write` updates a view file only when the bytes differ. |
| `subjects` | One disposition per subject for discover, validate, extract, checkFreshness, or propose. |
| `transaction` | Status, resume, or rollback of an interrupted apply. |
| `migrate` | Preview, apply, or roll back a tracking-file import. |

There is no hosted editor, account, or database. A static viewer is not part of this site. Search does not require uploading a private ledger because this site does not accept ledgers.

These are not claimed:

- Deploying AppLedger.dev or forgetrail.dev from this documentation pass
- An npm release of the checker
- Automatic generation of all six xFacts families
- Host enforcement of agent tool permissions
- That orientation quotes every older session body
- That a met acceptance criterion flips the work record to `done`
- Certification by a standards body

FilePress, LocalSlip, and LocalHelm are how this repository previews its own site. Using AppLedger does not require them.
