---
title: "Keep the decisions your next session will need."
description: "When a new agent session loses the reasons behind your code, AppLedger gives it a record to read. Keep purpose, decisions, structure, and evidence in portable files beside the application."
order: 0
---

<section class="value-hero" aria-label="AppLedger overview"><div class="value-intro"><p class="value-kind">Text record and CLI for application context</p><h1>Keep the decisions your next session will need.</h1><p class="value-lede">When a new agent session loses the reasons behind your code, AppLedger gives it a record to read. Keep purpose, decisions, structure, and evidence in portable files beside the application.</p><div class="cta-row"><a class="cta cta-primary" href="/docs/quickstart">Create a first ledger</a><a class="cta cta-secondary" href="#a-small-example">See a small example</a></div><p class="value-limit">The ledger needs curation. Records can be incomplete, disputed, or stale.</p></div><figure class="value-proof"><figcaption>Illustrative example</figcaption><p><strong>Starting point</strong><br>A fresh session asks why the app has no database.</p><div class="value-result"><p><strong>What you get</strong><br>Decision: use local files for the initial scope. Rationale: a small offline tool. Rejected alternative: a hosted database.</p></div><p>The next session can read the reason before reopening the decision.</p><p class="value-note">Synthetic example from the minimal ledger.</p></figure></section>

## One system, three parts

[ForgeTrail](https://forgetrail.dev) guides the work through phases with approval gates, and keeps that record in [AppLedger](https://appledger.dev), in `appledger/`. [xFacts](https://xfacts.dev) labels describe what was built and keep their own schemas. AppLedger and those labels can be used without ForgeTrail.

Phases, decisions, and the session handoff are on [ForgeTrail](/docs/forgetrail).

The normative specification is the [`spec/`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/spec/README.md) directory in the repository. The checker is [`appledger` on npm](https://www.npmjs.com/package/appledger). Start a ledger in an app folder with `pnpm dlx appledger init --name "Your app name"`, then `pnpm dlx appledger check`.

## A small example

The [synthetic minimal ledger](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal) has a decision record with these fields (excerpt, not a complete record):

```yaml
id: decision-local-files
kind: decision
title: Keep notes in local files
data:
  status: accepted
  choice: Use local files for initial scope
  rationale: The synthetic brief calls for a small offline tool
  alternatives:
    - Hosted database
  authority: Synthetic scenario owner
```

In your app folder, `pnpm dlx appledger orient` prints an orientation from the ledger. A later agent can then read the linked decision and say: “Local files were chosen for the small offline scope. Before proposing a database, check whether that scope has changed.” That response is illustrative, not a generated guarantee.

The record preserves the choice and its reason across sessions. It declares the owner's intent; it does not prove how storage was implemented. `init` does not create this decision for you: you or your agent curate it.

## In the docs

- [Quickstart](/docs/quickstart) for the smallest folder
- [Standard](/docs/standard) for the specification
- [Examples](/docs/examples) for the synthetic ledger and what a change looks like
- [ForgeTrail](/docs/forgetrail) for the phase profile
- [xFacts](/docs/xfacts) for what each adapter does and does not do
- [Reference](/docs/reference) for record kinds
- [Conformance](/docs/conformance) for honest limits
