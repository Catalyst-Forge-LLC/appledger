# Per-label adapter requirements

## AppFacts

Reuse the repository generator and input fingerprint where supported. Trigger on relevant manifests, lockfiles/configuration, storage/hosting changes, and application version changes. Distinguish selected design from implemented configuration. Preserve sourced manual fields. Validate front matter and regenerate human-readable body consistently, since input freshness alone does not establish body/frontmatter agreement.

Accept: an actual framework change updates supported fields and fingerprint, leaves unrelated claims intact, and records the input scope. Missing evidence remains undisclosed according to the native schema.

## FeatureFacts

Keep `.featurefacts/` as the sole native capability register. AppLedger references IDs through bindings. Scan proposes candidates. Recognition, lifecycle, availability, maturity, evidence associations, label selection, and public permission remain distinct.

The current README documents no approve command. Confirming a capability currently requires supported edits to `features.yaml`, and selection requires config curation attribution. Do not invent an existing automation command. A new structured curate operation may be introduced with validated patch semantics and attributed actor/source/time.

A project policy MAY permit a named agent to confirm evidence-backed capabilities and maintain internal selection. This must identify the agent honestly. Public permission requires the actual permission rules in the child schema, including per-row scope. A policy reference can supply authorization only if the child contract explicitly supports that representation. Otherwise retain the current approval mechanism and report publication as pending.

Up to 12 selected rows remains the current label limit. Preserve selection unless the work affects it or policy authorizes selection changes. Newly discovered candidates cannot silently displace approved rows. Zero rows is valid. A test association does not establish a passed test. Retired features remain addressable but are removed from selection according to the native contract.

Accept: add, rename, retire, restore, and evidence-staleness scenarios retain stable identity and history. A private capability edit leaves public bytes unchanged unless approved public content changes.

## ToolFacts and Panel

The current ToolFacts generator is described as planned. Use templates, structured source extraction where implemented, attributed curation, and the native validator until a real generator exists. Tool annotations are declarations, not proof of side effects or enforcement.

Bind a label to the specific tool server and version. A tool that returns a prompt is not a workspace scanner. If ForgeTrail tools gain read/write reach during this implementation, update their own ToolFacts accurately.

Panel is a separate derived tool-surface view. Use an existing recorded `tools/list` response by default. Running an MCP server can execute code and access systems, so live introspection requires existing task authorization and declared scope. A recorded result has an observation time and subject identity. Do not describe it as a live monitor.

Accept: a new writing tool triggers reach review and dependent AgentFacts review. A prompt-returning tool remains accurately represented. Missing destinations remain undisclosed.

## AgentFacts

Label the specific configuration, not the abstract agent brand or project. Inputs include attached tools, host permissions, approval policy, and relevant configuration. Current documentation says the generator is not implemented. Implement structured drafting only where evidence supports it.

A configuration declaring narrow reach cannot erase broader tool reach without evidence of the restriction. Record unknown host enforcement as unknown. Toolset changes invalidate affected reach claims and request reconciliation. Configuration digest metadata initially lives in AppLedger, unless the child schema introduces it through its own review.

Accept: switching toolsets changes the affected declarations, preserves known identity, and does not falsely claim host enforcement.

## SkillFacts

Current helper drafts missing labels using keyword guesses and does not analyze bundled scripts or overwrite existing labels. Treat its output as a draft. ForgeTrail integration must not promote those guesses to extracted truth.

Inspect skill instructions, bundled scripts, referenced tools, and package metadata within supported scope. Distinguish what a skill teaches, what its scripts can do, what it asks the host to do, and what the host permits. Existing labels need a controlled update path with a source diff, rather than unconditional overwrite.

Accept: adding a network-using bundled script marks related reach claims for review and retains existing approved facts unaffected by that change.

## ModelFacts

Reuse supported metadata extraction with exact model/provider/variant identity, including quantization when relevant. Model card statements and capability/safety assessments remain attributed. Do not invent ratings from a familiar family name. A model card alone is not evaluation evidence for the app's deployment.

Provider metadata retrieval is a declared network operation. Offline inputs must remain supported. Model integration changes affect the application's references and model bindings, not necessarily a model publisher's canonical label.

Accept: model variant changes cannot inherit incompatible context-window or benchmark assertions. Unknown metadata remains undisclosed/unresolved according to the child schema.

## All adapters

Fixtures must distinguish unsupported from absent, source-backed from observed, fresh from approved, and internal from public. Pin actual child schemas before implementation. Preserve standalone child CLI use and avoid adding application runtime dependencies.
