<p align="center">
  <img src="site/static/logo.png" alt="AppLedger" width="180" />
</p>

# AppLedger

Open text record of what an application is for, how it fits together, what it does, and how it changes.

This repository is the specification and the reference checker. It is also a ForgeTrail project, so the project record is the ledger in [`appledger/`](appledger/README.md). The normative format is [`spec/`](spec/README.md). Those are different things.

| | |
| --- | --- |
| Brand | AppLedger |
| Repository | https://github.com/Catalyst-Forge-LLC/appledger |
| npm | [`appledger`](https://www.npmjs.com/package/appledger). `pnpm dlx appledger init`, or `pnpm add -g appledger` |
| Domain | https://appledger.dev |

## Start a ledger

From the app folder:

```bash
pnpm dlx appledger init --name "Workshop notes"
pnpm dlx appledger check
```

`init` creates `appledger/manifest.yaml`, `profiles/forgetrail.yaml`, an application record, and a session record. A second run writes nothing. An existing manifest, profile, or record is left in place. Init does not infer a purpose from the folder name, and it does not write a label.

`check` prints `ok` and the ledger path when it finds no errors. It does not modify files. Errors are schema, predicate, and path problems. Warnings mean a recorded source is missing, its digest no longer matches, a claim's git revision is not HEAD, or a transaction journal is still open. A missing file is not treated as proof that a feature is gone.

The other commands, and what they refuse to do, are on the [conformance page](site/docs/conformance.md) ([appledger.dev/docs/conformance](https://appledger.dev/docs/conformance)).

## Work on this repository

These commands run in a checkout of this repository.

```bash
pnpm install
pnpm verify
pnpm exec appledger check --root examples/minimal/appledger
pnpm exec appledger check
```

The curation skill is [`skills/appledger/SKILL.md`](skills/appledger/SKILL.md). Command status lives in [`spec/10-tooling-and-automation.md`](spec/10-tooling-and-automation.md).

## Site

The public site is [appledger.dev](https://appledger.dev). The docs are [appledger.dev/docs](https://appledger.dev/docs). `site/` holds those pages, including the synthetic `examples/minimal` ledger.

## Licenses

Specification and schemas are CC0. The checker is MIT. See `LICENSE` and `schemas/LICENSE.md`.

## ForgeTrail

`.forgetrail/workflow_tracking.json` is a pointer. Decisions and phase state live in the ledger. Do not add a second decision log there. Phases and migrate steps are on the [ForgeTrail docs page](site/docs/forgetrail.md) ([appledger.dev/docs/forgetrail](https://appledger.dev/docs/forgetrail)).
