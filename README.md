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

`appledger check` reads a ledger and prints findings. It does not modify files. Other commands from the specification are not implemented yet.

## Site

`site/` is a FilePress stub. Preview with `pnpm site:dev`. LocalSlip lease name: `appledger-site` on port 46002. Do not deploy from this tree until the pages match shipped behavior.

## Licenses

Specification and schemas are CC0. The checker is MIT. See `LICENSE` and `schemas/LICENSE.md`.

## ForgeTrail

`.forgetrail/workflow_tracking.json` is a pointer. Decisions and phase state live in the ledger. Do not add a second decision log there.
