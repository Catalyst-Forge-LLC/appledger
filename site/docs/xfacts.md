---
title: xFacts
---

xFacts labels keep their own schemas, validators, and publication rules. AppLedger does not become a dependency of a labeled application. A family with no subject is `not_applicable`, which is a recorded outcome, not a missing label.

`appledger subjects` prints one row per subject. It does not modify files unless `--operation propose --apply` is set, and that apply is limited as below. `render` and `projectPublic` are not subject operations. The public projection is `appledger render --view public`.

| Family | What the checker does | What it does not do |
| --- | --- | --- |
| AppFacts, FeatureFacts | Validate and extract against the pinned schemas. `propose --apply` may set a FeatureFacts `cached_title` with basis `derived`. | It does not copy recognition, lifecycle, or selection into that title. |
| SkillFacts | Validate against the pinned schema. Read a bundled script. A keyword guess stays a draft. | Propose does not rewrite approved fields and does not execute the script. |
| ToolFacts | Validate against the pinned schema. Compare a recorded `tools/list`. | It does not start an MCP server and does not rewrite the label. A matching name does not prove the implementation is unchanged. |
| AgentFacts | Validate against the pinned schema. Compare configuration scope with toolsets. | It does not claim the host enforces that scope. |
| ModelFacts | Validate against the pinned schema. Compare offline metadata for an exact variant. | It does not contact a provider, and it does not copy one variant's context window or benchmarks onto another. |

Discover lists declared subjects and does not write a label. A missing source is reported as unavailable. It is not treated as proof that the subject is gone. Network and runtime are not required for these operations.

Using an agent to build an application does not make that application an agent configuration. Calling a hosted model does not make the application's architecture the model's architecture.

An evidence record may cite a public [Efficacy](https://efficacy.dev) chain by URL and hash. The chain stays in `.efficacy/`. A citation does not make the verdict true, and a missing chain is not a failed check. [ForgeTrail](https://forgetrail.dev) may offer that chain when a tool is handed off. It does not require one.
