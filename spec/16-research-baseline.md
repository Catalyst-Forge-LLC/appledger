# Research baseline and source boundaries

Inspected on 2026-09-25. Sources were retrieved from public websites and repository main-branch files. They are mutable references, not commit-pinned baselines. SHA-256 values below identify the retrieved byte snapshots. Before implementation, pin the actual working repository commits and inspect schemas and executable code. This pack is not a full code audit.

## Findings that affect this proposal

ForgeTrail has overlapping tracking/context/task documents, two phase/tracking shapes, progressive documentation rules, hooks, and lesson propagation. The workflow source includes xFacts as an optional companion triggered at public handoff. Native ledger adoption and continuous label maintenance are proposed changes.

FeatureFacts has an existing register and a curated label with zero to 12 selected rows. Its current README describes explicit recognition/selection attribution, public row permission, and no approve command. Reuse the register rather than replacing it with an AppLedger feature database.

The xFacts hub already includes Panel and LocalHelm integration. Its provenance document reports implemented optional AppFacts version and shared review fields in five children, while also retaining older statements that no such version/review representation exists. The website wording also differs. Treat this as documentation inconsistency to reconcile against actual child schemas. Do not present the earlier website's proposal wording as authoritative implementation status.

AppFacts and ModelFacts document generators. ToolFacts and AgentFacts describe their generators as planned/unimplemented. SkillFacts has a limited missing-label helper whose reach values are guesses and whose scope excludes bundled script analysis. This variation is why the proposal uses explicit adapter capabilities and unsupported dispositions.

## Sources

- [ForgeTrail tracking schema](https://github.com/Catalyst-Forge-LLC/forgetrail/blob/main/TRACKING_SCHEMA.md)
  - Retrieved snapshot SHA-256: `087db06a802b936d15545bfdf802d08992caba55f8c564c7d145826e3ec56294`
- [ForgeTrail workflow](https://github.com/Catalyst-Forge-LLC/forgetrail/blob/main/WORKFLOW.md)
  - Retrieved snapshot SHA-256: `b67f7ba82c3f219ab83c28669312843b24bd2cad7ee1a7d714accae9e546f9a0`
- [ForgeTrail Lite](https://github.com/Catalyst-Forge-LLC/forgetrail/blob/main/content/FORGETRAIL_LITE.md)
  - Retrieved snapshot SHA-256: `090680e18948c845c71c40049463dc04eb325a150bbb8458efab80264f6765e0`
- [xFacts hub README](https://github.com/Catalyst-Forge-LLC/x-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `b5929165d8611ba9df680748a8a0458dda44418492afb031a414a6affa3b893a`
- [xFacts provenance guidance](https://github.com/Catalyst-Forge-LLC/x-facts/blob/main/specs/PROVENANCE.md)
  - Retrieved snapshot SHA-256: `91d91f63735e7caec843f19bbab680ffc239744a260a4b63271b578c6d861b43`
- [FeatureFacts README](https://github.com/Catalyst-Forge-LLC/feature-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `858ded87bf707b8c43378292a4c6a52f27561960cca40a3be0c884744f248b51`
- [FeatureFacts publication safety](https://github.com/Catalyst-Forge-LLC/feature-facts/blob/main/docs/PUBLICATION_AND_SAFETY.md)
  - Retrieved snapshot SHA-256: `bcc1adc58a6790033f60c9e0123a80ed4eb17cf30745e8a3e7bc47f1b43abd64`
- [app-facts README](https://github.com/Catalyst-Forge-LLC/app-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `5b0a57cfb206a4c82b731a96644e9865eabe68082ce2286ff310f1544019a179`
- [model-facts README](https://github.com/Catalyst-Forge-LLC/model-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `e4a67ff14376a9f98e2448c1df78f1cace013cdfe053a378731aff97e869665b`
- [tool-facts README](https://github.com/Catalyst-Forge-LLC/tool-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `aace5274534fd614dd438e2e09deb914510828e360f809820b55b39fb09e7524`
- [agent-facts README](https://github.com/Catalyst-Forge-LLC/agent-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `9c0a3b687ab3a737b77106fe28c54af57d18c57f82b83a197d901504a1b21d58`
- [skill-facts README](https://github.com/Catalyst-Forge-LLC/skill-facts/blob/main/README.md)
  - Retrieved snapshot SHA-256: `7fb37524ba92c777bf2a164576384f32a67f63f2a409b8b9facd5d2d4b58c25d`

## Related prior art

Cline Memory Bank: https://docs.cline.bot/best-practices/memory-bank
OpenSpec concepts: https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md
Broader memory-bank implementation: https://github.com/dapi/memory-bank
SpecStory: https://docs.specstory.com/

These precedents were examined in the preceding discussion. They support the existence of durable Markdown context, living specs, and preserved agent history. This pack makes no uniqueness or market-exclusivity claim. Its specific proposal is the integration of AppLedger, native ForgeTrail tracking, and xFacts evidence-aware maintenance.
