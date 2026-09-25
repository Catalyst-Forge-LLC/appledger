# Overall move

## Problem

An application accumulates meaning across specifications, chat sessions, tracking JSON, terminology, source code, decisions, and release notes. A new person or agent reconstructs that meaning repeatedly. Separate hand-maintained summaries drift. Progress tracking rarely connects completion to the affected capabilities, goals, and verification.

ForgeTrail already captures much of this information. The proposal promotes that persistent record into AppLedger, extends it, and removes duplicate writers. It also turns xFacts maintenance into a normal part of development rather than a late publishing suggestion.

## Product relationship

| Product | Owns | Does not own |
| --- | --- | --- |
| AppLedger | Portable record format, relationships, evidence references, changes, work, sessions, conformance | A mandatory development methodology or runtime enforcement |
| ForgeTrail | Phase definitions, development guidance, exit rules, agent instructions, host hooks, lesson harvesting | A separate competing copy of project knowledge |
| xFacts children | Their label schemas, specialized registers, validators, and renderers | The whole application's purpose, workflow, or history |
| xFacts hub | Suite discovery, shared integration conventions, Panel contract | Unilateral changes to child schemas |

ForgeTrail adopts AppLedger natively. Other tools can read and maintain AppLedger without installing ForgeTrail. Standalone xFacts use remains supported.

## Required outcomes

- A new session can orient from a short entry point and retrieve task-relevant detail.
- A feature can be traced to needs, use cases, implementation, decisions, and available evidence.
- Completed work records what changed and whether associated declarations were reconciled.
- Current understanding remains readable without replaying all history.
- Significant changes retain meaning across renames, removals, and supersession.
- Applicable labels are initialized and maintained as their subjects emerge.
- Unknown, intended, implemented, observed, and enforced claims remain distinguishable.
- The normal workflow writes each owned fact once.

## Delivery scope

V0.1 targets local Git repositories and text files, with TypeScript/Node reference tooling. A ledger can describe an application spanning repositories, but cross-repository atomic writes and remote federation are deferred. Records may identify external repositories and exact revisions.

Core record types, the ForgeTrail profile, FeatureFacts bindings, and adapters for all six families are specified now. Implement adapters incrementally, explicitly reporting unsupported operations until they exist. No database, cloud account, hosted service, embedding index, or MCP server is required to read the ledger.

## Success measurement

Pilot on one existing application and one small fresh project. Establish baseline orientation effort before migration. Ask fresh agents to answer the same factual questions with and without the ledger. Score correctness, source attribution, acknowledged unknowns, time, and amount of context loaded. Require zero unsupported claims in the scored pilot answers. Track reconciliation effort and stale-record findings per meaningful change. Numerical improvement targets should follow baseline measurement, not be invented as product claims.

## Architecture decision

Store portable application records in `appledger/`, committed by default. Keep installed methodology, host configuration, and hooks in `.forgetrail/`. Use the existing locations of xFacts files and registers. AppLedger binds to them through explicit subjects and sources. Views such as context summaries, progress pages, and labels are derived where appropriate.

## Where the standard lives

Implement AppLedger in `Catalyst-Forge-LLC/appledger`, a sibling of this ForgeTrail repository. ForgeTrail consumes a pinned package. It does not become the long-term home of the format specification.

That sibling is a ForgeTrail project and therefore keeps an AppLedger ledger about itself. Three layers stay distinct:

| Layer | Path | Role |
| --- | --- | --- |
| Normative product | `spec/`, `schemas/` | The format and its checkers |
| Project ledger | `appledger/` | Purpose, decisions, work, and evidence for the AppLedger product |
| Methodology install | `.forgetrail/` | Host hooks and installed guidance; workflow state lives in the ledger profile |

The npm package `appledger` must not depend on the npm package `forgetrail`. Dogfooding is a project using the methodology and the format together, not a package cycle.

The repository site is FilePress under `site/`, published to AppLedger.dev. LocalSlip and LocalHelm are how this workstation runs that site beside other local apps. They are not part of ledger conformance.
