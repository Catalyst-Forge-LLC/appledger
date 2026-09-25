# Implementation handoff

Read README, overall move, standard, ForgeTrail changes, and xFacts integration first. Then inspect the actual checked-out repositories and applicable AGENTS instructions. This pack is a specification, not a replacement for repository-specific build instructions.

## First deliverable

Do not create the GitHub repository, stake npm, deploy AppLedger.dev, or publish a package as part of reading this pack. The user creates `Catalyst-Forge-LLC/appledger` and stakes `appledger` when they choose.

After that repository exists, produce a source inventory tied to actual commits, showing every existing tracking reader/writer, bootstrap path, host hook, label generator, validator, and public renderer. Compare this pack's research baseline with the checkout. Record discrepancies before coding.

Implement AL-01 and AL-02 from the schemas and predicate table in this pack. Do not redesign kind fields or phase ids during that work. Keep the generic envelope separate from ForgeTrail's phase vocabulary. The first ledger in the new repository is hand-written and describes the AppLedger product.

## Implementation order

Follow dependency order in the work-package table. Integrate AppFacts/FeatureFacts early. Do not wait for a universal generator to migrate ForgeTrail tracking. Missing adapter operations must be explicit, with release claims limited accordingly.

When replacing a duplicate writer, update all of its consumers in the same milestone. Search references again to verify no live path still writes the legacy artifact. Preserve unique long-form documentation. Do not mechanically delete files because they contain overlapping keywords.

## Required review artifacts

Each work package supplies changed files, behavior before/after, relevant acceptance IDs, executed checks, unsupported cases, and migration impact. Pilot reports include fresh-session evidence and actual reconciliation effort. Public docs and labels must match the implemented behavior at release.

## Do not assume

Do not assume proposed CLI names exist, packages are published, the npm name `appledger` is registered, child schemas accept new fields, a test association means a test passed, a completed task is deployed, a generated label is approved for publication, or a schema-valid ledger is factually complete. Do not assume FilePress, LocalSlip, or LocalHelm are required to read a ledger.

Do not deploy, publish packages, send messages, or alter access controls merely because this handoff describes those eventual work items. Follow the actual implementation task's authorization. The user publishes npm packages.
