# Decisions, defaults, and remaining choices

## Adopted direction from the discussion

- AppLedger is the name and AppLedger.dev is acquired.
- Durable text files, version control, and agent curation are core requirements.
- Cover purpose, goals, uses, features, concepts, glossary, structures, stakeholders, and evolution.
- ForgeTrail adopts AppLedger natively and removes duplicate functionality.
- xFacts creation and updates become part of ForgeTrail's development lifecycle.
- Initial adoption is the owner's own projects, allowing a focused migration.

## Proposed implementation defaults

These choices are locked for the first milestone:
- Sibling repository `Catalyst-Forge-LLC/appledger` and unscoped npm package `appledger`. The user confirms availability, creates the remote, and publishes. Agents do not publish.
- Visible `appledger/` directory, Markdown/YAML records, schema-backed envelope and kind schemas.
- The AppLedger repository uses ForgeTrail and keeps its own ledger. `appledger` does not depend on `forgetrail`.
- FilePress site package `appledger-site` on AppLedger.dev. LocalSlip lease `appledger-site`. LocalHelm enrollment for this workstation. Neither is a ledger conformance requirement.
- Existing xFacts files/registers remain at their current paths.
- Workflow-specific state lives in a namespaced ForgeTrail profile. `current_phase_instance` points at a phase instance.
- Current records plus semantic change records and Git history, without event sourcing.
- Stable record IDs, explicit evidence scope, and one owner for each fact.
- AppLedger specification/schema CC0, new reference tooling MIT, existing licenses preserved.
- TypeScript/Node reference tools and an optional standalone agent skill.
- Fresh pilot: the AppLedger repository. Existing-app pilot: chosen at FT-03, not in this pack.

## Choices to resolve during implementation

Adapter package placement should follow code inspection. A public-review delegation extension for FeatureFacts may require a native child change, and must not be assumed already supported. The LocalSlip port number is chosen when the repository is created, from a free lease.

Choose whether generated context/progress views are committed per project. Default: commit the short orientation, generate larger views on demand. This choice does not change canonical record ownership.

## Out of scope for v0.1

Central cloud service, vector database, mandatory graph database, automatic third-party publication, cross-repository distributed transactions, universal language parsers, automatic proof of product correctness, and perpetual compatibility with every historical ForgeTrail shape.

## Risks and design responses

Documentation bloat: progressive creation and short orientation.
False confidence: explicit scope, evidence, and unknown states.
Agent drift: validators, attributed curation, supported-host hooks, and receipts.
Merge conflicts: small record files, stable IDs, digest preconditions.
Private disclosure: public allowlists and byte-invariance tests.
Duplicate ownership: bindings and generated views.
Maintenance overhead: targeted reconciliation and pilot measurement.
Standard overreach: small core plus profiles and child schemas.

The implementation should test these risks with real work before expanding the taxonomy or adding infrastructure.
