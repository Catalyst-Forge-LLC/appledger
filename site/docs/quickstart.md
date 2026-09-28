---
title: Quickstart
---

Commands on this page are in the [`appledger` npm package](https://www.npmjs.com/package/appledger). Run them with `pnpm dlx appledger <command>`, or install once with `pnpm add -g appledger`. The examples below use a checkout of the [appledger repository](https://github.com/Catalyst-Forge-LLC/appledger) so that `examples/minimal` is on disk.

## Smallest folder

Copy [`examples/minimal`](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal). It is a synthetic ledger: a manifest, a ForgeTrail profile, and one record each for the application, a goal, a stakeholder, a use case, a concept, a decision, work, a session, a change, and evidence.

From a checkout:

```bash
pnpm install
pnpm exec appledger check --root examples/minimal/appledger
pnpm exec appledger orient --root examples/minimal/appledger
```

`check` reads the ledger and does not modify files. `orient` prints the phase, each decision choice, each lesson, and the latest session time. It does not modify files.

A new ledger needs `manifest.yaml`, `profiles/forgetrail.yaml` when ForgeTrail is in use, an application record, and a session record. It does not need an empty copy of every record kind.

An empty directory can be initialized without copying the synthetic example:

```bash
pnpm dlx appledger init --name "Workshop notes"
pnpm dlx appledger check
```

A second run writes nothing. An existing manifest, profile, or record is left in place. Init does not infer a purpose from the folder name, and it does not create `workflow_tracking.json`.

```bash
pnpm exec appledger reconcile
pnpm exec appledger reconcile --apply
```

The first command writes nothing. `--apply` writes one receipt. A second `--apply` with the same inputs writes nothing. Neither command rewrites a label.

## Existing xFacts labels

If the repository already has `APP_FACTS.md` or a FeatureFacts register at `.featurefacts/features.yaml`, `reconcile` reports it as `needs_review` until it is bound:

```bash
pnpm dlx appledger bind
pnpm dlx appledger bind --apply
pnpm dlx appledger subjects --operation validate
```

`bind` lists the labels that no binding names and writes nothing. `--apply` adds them to `manifest.yaml`. The label files are not changed. `validate` checks each bound label against the pinned AppFacts or FeatureFacts schema.

## Existing tracking file

If the project already has a writable `.forgetrail/workflow_tracking.json`:

```bash
pnpm exec appledger migrate preview
pnpm exec appledger migrate apply
```

Preview writes nothing. Apply imports the file into `appledger/` and replaces it with a pointer. A second apply is a no-op. Rollback restores only the paths that apply wrote, and it refuses if one of those files was edited later.

Resolved gotchas become lesson records. Unresolved gotchas become open questions. `IDEAS.md` and `BUGS.md` are read at the repository root and under `.forgetrail/`. A line that appears in both is imported once. A starter with an empty project and no decisions is not imported.

Do not keep a second decision log in the JSON file after apply.
