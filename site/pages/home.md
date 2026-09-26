---
title: The application, written down
description: AppLedger is an open text record of what an application is for, how it fits together, what it does, and how it changes.
order: 0
---

AppLedger keeps purpose, structure, decisions, and evidence in files a person or an agent can read. The record can be incomplete, disputed, or stale. It is a maintained ledger, not a claim of complete memory.

ForgeTrail is one way to maintain that record during development. The xFacts labels stay the owners of their own declarations. AppLedger points at them. It does not replace their schemas.

This site is not deployed to AppLedger.dev. The normative specification is the [`spec/`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/spec/README.md) directory in the repository. The published npm package `appledger@0.0.0` is a name hold, not this checker.

## A small example

The [minimal ledger](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal) is synthetic. One decision in it says:

> Use local files for initial scope.

The rationale is that the synthetic brief calls for a small offline tool. The rejected alternative is a hosted database. The record is labeled as a scenario, not as observed implementation.

## Read next

- [Quickstart](/quickstart) for the smallest folder and an existing tracking file
- [Standard](/standard) for the specification
- [Examples](/examples) for the synthetic ledger and what a change looks like
- [ForgeTrail](/forgetrail) for the phase profile and migration
- [xFacts](/xfacts) for what each adapter does and does not do
- [Reference](/reference) for record kinds
- [Conformance](/conformance) for honest limits
- [Changelog](/changelog) for what this repository implements

<div class="cta-row">
  <a class="cta cta-primary" href="https://github.com/Catalyst-Forge-LLC/appledger">View on GitHub</a>
  <a class="cta cta-secondary" href="https://forgetrail.dev">ForgeTrail</a>
</div>
