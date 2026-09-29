---
title: Quickstart
---

Commands on this page are in the [`appledger` npm package](https://www.npmjs.com/package/appledger). Run them with `pnpm dlx appledger <command>`, or install once with `pnpm add -g appledger`.

## Smallest folder

From an empty app folder:

```bash
pnpm dlx appledger init --name "Workshop notes"
pnpm dlx appledger check
pnpm dlx appledger orient
```

`check` prints `ok` and the ledger path when it finds no errors. It does not modify files. `orient` prints the phase, each decision choice, each lesson, and the latest session time. It does not modify files.

A new ledger needs `manifest.yaml`, `profiles/forgetrail.yaml` when ForgeTrail is in use, an application record, and a session record. It does not need an empty copy of every record kind. A second run of `init` writes nothing. An existing manifest, profile, or record is left in place. Init does not infer a purpose from the folder name, and it does not create `workflow_tracking.json`.

To read the synthetic example instead, use a checkout of the [appledger repository](https://github.com/Catalyst-Forge-LLC/appledger). [`examples/minimal`](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal) is a synthetic ledger: a manifest, a ForgeTrail profile, and one record each for the application, a goal, a stakeholder, a use case, a concept, a decision, work, a session, a change, and evidence.

```bash
pnpm install
pnpm exec appledger check --root examples/minimal/appledger
pnpm exec appledger orient --root examples/minimal/appledger
```

```bash
pnpm dlx appledger reconcile
pnpm dlx appledger reconcile --apply
```

The first command writes nothing. `--apply` writes one receipt. A second `--apply` with the same inputs writes nothing. Neither command rewrites a label.

## Existing xFacts labels

If the repository already has `APP_FACTS.md` or a FeatureFacts register at `.featurefacts/features.yaml`, `reconcile` reports it as `needs_review` until it is bound:

```bash
pnpm dlx appledger bind
pnpm dlx appledger bind --apply
pnpm dlx appledger subjects --operation validate
```

`bind` lists the labels that no binding names and writes nothing. `--apply` adds them to `manifest.yaml`. The label files are not changed. `validate` checks each bound label against its pinned schema.

## Existing tracking file

If the project already has a writable `.forgetrail/workflow_tracking.json`:

```bash
pnpm dlx appledger migrate preview
pnpm dlx appledger migrate apply
```

Preview writes nothing. Apply imports the file into `appledger/` and replaces it with a pointer. A second apply is a no-op. Rollback restores only the paths that apply wrote, and it refuses if one of those files was edited later.

Resolved gotchas become lesson records. Unresolved gotchas become open questions. `IDEAS.md` and `BUGS.md` are read at the repository root and under `.forgetrail/`. A line that appears in both is imported once. A starter with an empty project and no decisions is not imported.

Do not keep a second decision log in the JSON file after apply.
