# AppLedger + ForgeTrail + xFacts specification

Version: 0.1.0 proposal, 2026-09-25. Owner: Catalyst Forge. Domain: AppLedger.dev. Canonical copy in the `appledger` repository. This specification defines the proposed implementation. The format checker in this repository is the first code. ForgeTrail has not migrated yet, and AppLedger.dev is not deployed.

## The move

AppLedger becomes the open, durable application record used natively by ForgeTrail. ForgeTrail replaces overlapping project tracking with AppLedger and maintains applicable xFacts records and labels throughout development. xFacts schemas retain ownership of their specialized declarations. The application owns its record independently of the agent, editor, and development method.

## Reading order

1. [Overall move](01-overall-move.md)
2. [AppLedger standard](02-appledger-standard.md)
3. [Records and relationships](03-records-and-relationships.md)
4. [Evidence and history](04-evidence-and-history.md)
5. [Curation protocol](05-curation-protocol.md)
6. [ForgeTrail changes](06-forgetrail-changes.md)
7. [xFacts suite changes](07-xfacts-suite-changes.md)
8. [Per-label integration](08-label-adapters.md)
9. [Migration](09-migration.md)
10. [Tooling and host automation](10-tooling-and-automation.md)
11. [Privacy and publication](11-privacy-and-publication.md)
12. [Implementation plan](12-implementation-plan.md)
13. [Acceptance and conformance](13-acceptance-and-conformance.md)
14. [Domain and documentation](14-domain-and-documentation.md)
15. [Decisions and boundaries](15-decisions-and-boundaries.md)
16. [Research baseline](16-research-baseline.md)
17. [Agent implementation handoff](17-agent-handoff.md)
18. [Policy and worked changes](18-policy-and-change-examples.md)

`schemas/` contains JSON Schemas for the manifest, record envelope, per-kind `data`, the ForgeTrail profile, and curation policy. `examples/` contains synthetic records and a policy sample. The envelope does not encode predicate pairs or whole-ledger integrity. `schemas/README.md` lists the checks a full validator still performs. `VALIDATION.md` records checks performed on this pack. `MANIFEST.sha256` inventories packaged files.

## Names and repository

| Thing | Locked value |
| --- | --- |
| Brand | AppLedger |
| Domain | AppLedger.dev |
| GitHub repository | `Catalyst-Forge-LLC/appledger` |
| npm package | unscoped `appledger` |
| CLI | `appledger` |
| Ledger directory | `appledger/` |
| Site package | private `appledger-site` |

Do not use the dashed slug `app-ledger`. In this organization, dashes mark two-word xFacts repositories such as `feature-facts`. AppLedger is one coined name, same pattern as ForgeTrail and `forgetrail`. The domain, ledger directory, and CLI already have no dash.

GitHub repository `Catalyst-Forge-LLC/appledger` exists. npm `appledger` is staked at `0.0.0` as a name hold. Do not publish a real release from that version. The user publishes.

This repository is the canonical format specification (`spec/`, `schemas/`). ForgeTrail keeps the adoption work and should treat this tree as the format source.

The `appledger` package must not depend on the `forgetrail` package. ForgeTrail may depend on a pinned `appledger` release. The AppLedger repository is a ForgeTrail project, so it keeps its own `appledger/` ledger about the AppLedger product. That ledger references `spec/` and `schemas/`. It does not replace them. A ForgeTrail methodology install is not an npm dependency.

The public site is a FilePress site in `site/`, on the same pattern as forgetrail.dev. LocalSlip leases the site port. LocalHelm enrolls the repository. Neither tool is a format requirement or a library dependency of `appledger`.

## Status and precedence

MUST, MUST NOT, SHOULD, and MAY express requirements for the proposed implementation. They do not claim external standardization or current product support. AppLedger is initially an openly published specification with a reference implementation. Public adoption is unproven. The format contract, predicate table, kind schemas, profile schema, and policy schema in this pack are normative for implementation. Semantic checks listed in `schemas/README.md` still sit outside those JSON Schemas.

Existing child xFacts schemas govern existing labels. This proposal cannot silently change their fields. Within this pack, the standard, record contract, evidence contract, and publication contract are normative. Examples illustrate them. A conflict blocks implementation of that specific detail until corrected in a recorded decision.

The requested deliverable is a specification pack. No repositories, packages, websites, or production data were modified or deployed.
