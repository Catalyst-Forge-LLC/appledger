---
title: The application record
description: AppLedger is an open text record of what an application is for, how it fits together, what it does, and how it changes.
order: 0
---

AppLedger keeps purpose, structure, decisions, and evidence in files a person or an agent can read. The record can be incomplete, disputed, or stale. It is a maintained ledger, not a claim of complete memory.

<div class="cta-row">
  <a class="cta cta-primary" href="/docs">Read the docs</a>
  <a class="cta cta-secondary" href="https://github.com/Catalyst-Forge-LLC/appledger">View on GitHub</a>
</div>

<p class="kicker">Text files · format 0.1.0 · open specification</p>

## One system, three parts

[ForgeTrail](https://forgetrail.dev) guides the work through phases with approval gates. [AppLedger](https://appledger.dev) keeps the record of that work in `appledger/`. [xFacts](https://xfacts.dev) labels describe what was built. Each works on its own.

ForgeTrail keeps its project record in AppLedger. The phase, decisions, lessons, and session handoff live in `appledger/`. The old `.forgetrail/workflow_tracking.json` is now only a pointer. AppLedger does not require ForgeTrail, and other tools can maintain the same ledger. The xFacts labels keep their own schemas. AppLedger points at them.

The normative specification is the [`spec/`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/spec/README.md) directory in the repository. The checker is [`appledger` on npm](https://www.npmjs.com/package/appledger). Start a ledger in an app folder with `pnpm dlx appledger init --name "Your app name"`, then `pnpm dlx appledger check`.

## A small example

The [minimal ledger](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal) is synthetic. One decision in it says:

> Use local files for initial scope.

The rationale is that the synthetic brief calls for a small offline tool. The rejected alternative is a hosted database. The record is labeled as a scenario, not as observed implementation.

## In the docs

- [Quickstart](/docs/quickstart) for the smallest folder and an existing tracking file
- [Standard](/docs/standard) for the specification
- [Examples](/docs/examples) for the synthetic ledger and what a change looks like
- [ForgeTrail](/docs/forgetrail) for the phase profile and migration
- [xFacts](/docs/xfacts) for what each adapter does and does not do
- [Reference](/docs/reference) for record kinds
- [Conformance](/docs/conformance) for honest limits
