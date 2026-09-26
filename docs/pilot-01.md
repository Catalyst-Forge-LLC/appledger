# Pilot findings

Run at 2026-09-26T21:13:18Z by `node scripts/pilot-01.mjs`. The existing-app copy lived in a temp directory and was deleted. FilePress at `Z:/workspace/filepress` was not modified. No improvement target is stated. Subagent duration was not measured.

## Fresh project

The fresh project is this repository.

- `.forgetrail/workflow_tracking.json` is a pointer (`status: pointer`, `record: appledger/`). It has no `decisions` field.
- `appledger check` accepted the ledger.
- `site/` exists. It was not deployed.
- Orientation was 320 words and 4,107 bytes, in 120 ms. It names phase `plan` as `in_progress`, the session left-off text, and the two recorded next steps.
- The same orientation lists fourteen work records as in progress, including packages whose acceptance criteria are already met. A fresh session can see the handoff. It can also mistake finished packages for open work.

## Existing application

FilePress tracking, read only from a copy.

| Source fact | Count or value |
| --- | --- |
| Tracking file | 42,182 bytes |
| `currentPhase` | `4-feature-iteration` |
| Decisions | 19 |
| Sessions | 15 |
| Gotchas | 11 |
| `.forgetrail/IDEAS.md` list items | 8 |
| Root `IDEAS.md` | absent |
| Root `BUGS.md` | absent |

Preview took 134 ms and classified the file as full tracking, profile phase `iterate`. Apply took 651 ms, replaced the copy's tracking file with a pointer, and `appledger check` reported no errors. The profile phase is `iterate`, status `in_progress`, project status `active`. Nineteen decision records were written. Forty-six session records were written: the fifteen `sessions[]` entries plus phase notes. The unmapped field kept on the change record is `phases.4-feature-iteration` (phase fields outside the known set, including `iterations`).

Eleven gotchas were not imported and were not kept under `extensions.migration.unmapped`, because `gotchas` is treated as a known root key. Eight idea lines in `.forgetrail/IDEAS.md` were not imported. The importer reads `IDEAS.md` and `BUGS.md` at the repository root only.

## Same questions, two materials

Two fresh agents each saw one file. Neither was given the expected answers.

| Question | Tracking file, 42,182 bytes | Orientation, 2,354 bytes, 200 words |
| --- | --- | --- |
| Current phase | `4-feature-iteration` | Iterate, `in_progress` |
| Visitor comments | Quoted the recorded non-goal | Not in the view |
| Latest session | 2026-09-14, land-sync summary | Left-off text is present. The date is not |
| Cloudflare Pages project name | `getfilepress`, from a phase note that names the Wrangler project | Not in the view |
| Unsupported claims | None | None |

The orientation is smaller and keeps the phase and the latest left-off sentence. It drops the comments decision, the session date, and the Pages project name. Both agents declined to invent those missing answers. This run does not show that the ledger view is more correct than the tracking file.

## Changes on the copy

| Step | Result |
| --- | --- |
| Add a public work record | Applied |
| Rename a decision title | Applied. The record id stayed the same |
| Retire that work record | Applied. Status `cancelled`, change type `retired` |
| Add a private work record, then edit its contact line | Public markdown and fingerprint stayed the same. The contact line was omitted |
| Interrupt a session write after the first file, then roll it back | Status `applying`, then rollback. The session file was not left behind |
| Refactor a source path | No source locators were imported, so there was nothing to repair |

## Still open

The counts above are the 2026-09-26T21:13:18Z run. After that run, the importer and orientation were changed and covered by `tests/migrate.test.ts` and `tests/views.test.ts`. This report was not re-run against FilePress.

Work records that stay `in_progress` after their criteria are met. Site pages and publication stay closed until the pages match shipped behavior. A comments non-goal or a Pages project name that lived only in a phase note is still a session body, not a decision choice.
