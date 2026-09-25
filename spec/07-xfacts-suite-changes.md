# xFacts suite integration

## Ownership and compatibility

AppLedger is a companion open standard within the ecosystem, not a seventh nutrition label forced into the six-object model. xFacts children keep their schemas, sources, validators, and publication semantics. Existing labels without AppLedger remain valid.

The first integration uses AppLedger-side bindings and receipts, minimizing native schema changes. No universal provenance object is injected into all labels. If a child needs a new field, propose and version it in that child with compatible fixtures and validator changes.

ForgeTrail companion text that offers xFacts only at public handoff stays an offer. AppLedger maintenance adds a disposition whenever an applicable subject exists. A declined or absent family is `not_applicable`, which is a recorded outcome, not a missing label.

## Hub changes

- Explain the relationship: AppLedger preserves application understanding, ForgeTrail maintains it through work, and xFacts supplies focused declarations.
- Add AppLedger to navigation as a related standard, with a distinct description from label families.
- Document a versioned adapter contract and child ownership matrix.
- Extend existing label discovery/refresh integration rather than building an incompatible second fleet scanner.
- Include FeatureFacts register and label dispositions in suite status views.
- Keep refresh, re-encode, and ship as distinct operations. Development reconciliation never silently deploys a site.
- Reconcile inconsistent provenance descriptions against child schemas before changing public copy.

The inspected hub already has a LocalHelm bridge that discovers labels, refreshes AppFacts, drafts missing SkillFacts, and supports separate re-encode and ship operations. Reuse suitable extraction and discovery logic after checking its actual code and tests. Do not assume it already curates all six families.

## Adapter contract

Every adapter declares: adapter ID/version, family, supported child schema versions, subject types, input types, deterministic operations, agent-assisted operations, runtime/network needs, owned output fields, and excluded paths.

Operations: `discover`, `extract`, `propose`, `validate`, `render`, `checkFreshness`, and `projectPublic`. An unavailable operation returns `unsupported`. All write operations take expected input/output digests and return proposed or applied changes with source references. Structured result includes subject ID, schema version, input scope/fingerprint, changed fields, findings, and final disposition.

Plan mode performs no writes. Apply mode uses the transaction rules. Every operation can be run for a specific subject. A repository may contain several tools, skills, agent configurations, and model variants. A root-level label is never used as a substitute for labeling each relevant distinct subject.

## Subject applicability

Application: AppFacts and FeatureFacts are normally relevant, including an empty honest feature selection.
Tool server: ToolFacts, within currently supported surfaces.
Model: ModelFacts for actual identified variants used or distributed.
Agent configuration: AgentFacts for the actual configuration, toolsets, and host permissions.
Skill package: SkillFacts for each actual package.

Using an agent to build an app does not make that app an agent configuration. Calling a hosted model does not make the app's entire architecture the model's architecture. Record integration relationships accurately and identify who owns the model declaration.

## Maintenance policy

Extraction of supported manifest facts can be automatic. Semantic capability recognition requires attributed evidence-based curation. Existing manually reviewed values MUST survive routine regeneration unless new source evidence justifies a change. A changed input can invalidate a review without deleting its historical attribution.

Keep schema validity, source freshness, evidence support, reviewer attribution, public approval, and runtime enforcement separately visible. A single green 'verified' badge cannot represent all of them.

## Child changes required

Each child should document its adapter inputs, approved update semantics, source ownership, version compatibility, public filtering, and stable subject identity. Where it lacks a safe renderer or generator, implement only the needed functionality and report the rest unsupported. Add integration fixtures without making AppLedger a runtime dependency of labeled applications.

The published spec/schema licensing pattern is CC0 with MIT tooling. Proposed AppLedger follows that pattern. ForgeTrail remains under its existing Apache-2.0 license. Do not relicense imported third-party or ForgeTrail prose as CC0 merely by storing it in AppLedger.
