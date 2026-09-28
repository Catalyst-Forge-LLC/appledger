---
title: Introduction
---

**AppLedger** is an open text record of what an application is for, how it fits together, what it does, and how it changes. The record can be incomplete, disputed, or stale. It is a maintained ledger, not a claim of complete memory.

ForgeTrail is one way to keep that record during development. The xFacts labels stay the owners of their own declarations. AppLedger points at them. It does not replace their schemas.

## Where things live

| What | Where |
| --- | --- |
| Normative specification | [`spec/`](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/spec) in the repository |
| Schemas | [`schemas/`](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/schemas) |
| This site | A reading path. It is not the specification |
| Checker | [`appledger` on npm](https://www.npmjs.com/package/appledger), built from this repository. `pnpm dlx appledger check` |

Schema and behavior notes for the proposal live in [`docs/rel-01.md`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/docs/rel-01.md). That report is not a site changelog.

## What to read next

The smallest folder is the [quickstart](/docs/quickstart). Record kinds are in the [reference](/docs/reference). Honest limits are in [conformance](/docs/conformance).
