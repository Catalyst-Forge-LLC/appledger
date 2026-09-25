# Privacy, permissions, and public projections

## Committed does not mean public

AppLedger files are committed by default to the application's chosen repository. A public repository is public storage. `visibility: internal` is a curation label, not access control. Never place confidential records in a public repository and expect a renderer to protect them. Public projects may keep a public-safe ledger or use a separate private record repository with explicit bindings.

Record visibility is `internal` or `public`. Public eligibility alone is insufficient to publish arbitrary source content. Export requires an allowlist and applicable approval. Stakeholder records should usually identify roles, not unnecessary personal contact information. Exclude secrets and credentials from records, receipts, and logs.

## Publication pipeline

Select approved public subjects and fields, resolve only permitted dependencies, redact private references, validate native public schema, render the public artifact, and compute the public fingerprint from that projection alone. Then publish only when the existing task or standing policy authorizes publication. Updating a local label is not authorization to upload the entire ledger or deploy a site.

FeatureFacts' stricter public projection rules remain authoritative, including excluding raw evidence, source paths, private commit IDs, private registry fingerprints, contact details, and full-map links. Do not add an AppLedger backlink to a public label if it exposes private context.

Changing a private feature MUST NOT change public counts, public fingerprints, generation timestamps, or rendered bytes unless approved public content changes. The same non-disclosure discipline should apply to new public AppLedger views. Compute derived public metadata only after filtering.

## Review and policy attribution

Policy identifies who authorized which operation, the scope, source, and time. A standing policy can authorize routine local maintenance. It cannot be represented as a human reviewing every later generated claim. Distinguish publisher authorship, agent curation, independent review, and publication permission using actual child schema meanings.

A restrictive child policy wins over a generic adapter default. If a child cannot encode the desired delegated permission, return pending publication and propose a compatible child change. Do not inject invented fields into strict schemas.

## Local execution boundaries

Core scans and validation are offline and do not execute the target application. Live model metadata or MCP interrogation uses explicit authorized adapters. FeatureFacts' current no-symlink default must be preserved even where generic AppLedger source resolution permits contained links. Apply the stricter source contract.

Model-assisted curation may send source content through an agent provider. Do not claim the workflow is local-only simply because the files and scanner are local. Respect the environment and project permissions already in effect without inventing new blanket confirmation requirements.

## Provenance is not certification

Public copy and interfaces distinguish schema validity, source attribution, freshness, review, and observed behavior. A receipt or hash does not certify safety. A ledger marked complete is complete only for its declared scope and checks. Unknown scope remains visible.
