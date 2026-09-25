# Migration and recovery

## Supported input families

Support numeric Lite tracking and full/MCP tracking. Preserve explicit source versions and paths. Full tracking may contain custom fields. Unknown fields are retained under a migration extension with an explanation until mapped. Do not discard them to pass a new schema.

Migration is a versioned operation with preview, application, verification, and a recorded rollback plan. Current sole-user adoption permits a decisive cutover, but does not justify destroying uncommitted work or source history.

## Procedure

1. Inventory input files, Git status, current revision, child labels, registers, and installed hooks.
2. Produce a mapping report listing every source artifact, ownership destination, conflict, unknown field, and proposed generated view.
3. Preserve a local snapshot of every file the migration will modify and the source digests. Existing unrelated dirty changes remain untouched.
4. Build the ledger in staging. Allocate stable IDs and an old-to-new mapping.
5. Import supported claims with import attribution. Preserve original dates separately. Unknown historical dates do not become today's event date.
6. Compare overlapping tracking and context descriptions. Keep conflict records until authority/evidence resolves them. A newer file timestamp does not automatically win.
7. Validate record references, mappings, workflow transitions, and native labels.
8. Switch consumers, writers, hooks, templates, and continuation guidance to the ledger.
9. Mark old writable tracking deprecated and archive it or replace it with a pointer. Do not leave both active.
10. Resume in a fresh session using only new guidance and linked source documents. Verify continuity against the migration report.

## Phase mapping

| Lite | Full | New profile |
| --- | --- | --- |
| 1 | 1-architecture | plan |
| 2 | 2-scaffolding | build |
| 3 | 3-stabilization | stabilize |
| 4 | 4-feature-iteration | iterate |
| 5 | 5-refactoring | refine |
| 6 | 6-strategic-review | align |
| 7 | 7-hardening | harden |

Boolean exit flags and met/remaining arrays map to criteria without inventing evidence. Imported 'met' can remain a historical assertion with unresolved verification. Existing revisits retain original completion history. Do not rewrite a nonlinear workflow as seven sequential completions. Phase `notes[]` become session or change records linked to the imported phase instance. `project.status: wrapped` becomes `project_status: wrapped`. Companion outcomes found in tracking become `data.companion_outcomes` on the session that owns them, retaining the tool name. `BUGS.md` entries become work records with `data.intake: bug`. `IDEAS.md` entries become work records with `data.intake: idea`.

## Document treatment

Approved genesis/brief documents stay as historical baselines. Canonical living specs remain live sources. Completed delivery specs remain historical delivery records and retain edit protections. Extract decisions with backlinks and preserve prose that is not duplicated elsewhere. Generated context/task views carry an ownership notice and source IDs.

A file named `workflow_tracking.json` in the ForgeTrail source repository may be a shipped starter, not the application's live state. Classify its role before migration. Do not import sample records as actual project history.

## Repository created before ForgeTrail cutover

The AppLedger repository is bootstrapped with ForgeTrail before ForgeTrail's own cutover (FT-04). The current installer still emits `.forgetrail/workflow_tracking.json`. In that repository, until FT-04:

- `appledger/` is the only writable project record.
- If installation creates `workflow_tracking.json`, replace the writable body with a short pointer that names `appledger/` and is not updated with decisions, sessions, or phase status.
- Do not maintain two decision logs.
- Workflow phase state lives in `profiles/forgetrail.yaml`.
- Hand-write ledger records until the curator exists. M1 is a manual ledger.

This bridge is only for the period before ForgeTrail stops writing the legacy file. It is not a permanent dual format. After FT-04, new projects do not create a writable tracking file at all.

## Rollback

Rollback restores only paths changed by migration, using captured digests to refuse overwriting later edits. It reinstates the prior host configuration and pointer behavior. Never reset an entire repository or force-push as a migration rollback. Keep the failed migration report for diagnosis. Interrupted migration resumes or rolls back from its transaction journal before a new migration begins.

## Retirement of compatibility

Read-only translation can bridge a short transition. Set an explicit removal milestone after pilots pass. No ongoing synchronization daemon or permanent dual-write format. Once migrated, a detected legacy writer produces an actionable conflict rather than silently merging its output.
