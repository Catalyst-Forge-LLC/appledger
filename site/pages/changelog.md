---
title: Changelog
description: Behavior implemented in the repository. The proposal tag is not an npm release.
order: 8
---

This page records behavior in the source tree. The proposal marker is git tag `proposal-0.1.0` and [`docs/rel-01.md`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/docs/rel-01.md). That tag is not the npm version. The npm package remains the `0.0.0` name hold. This page does not deploy the site.

## Format 0.1.0, repository source

- Record envelope, kinds, ForgeTrail profile, and checker.
- `orient` keeps decision choices, lessons, and the latest session timestamp in the brief. A task filter applies to related records. Gaps stay when the word budget is exceeded.
- `render --view public` omits non-public records. A private edit does not change the public fingerprint. Nothing is uploaded.
- `migrate preview` writes nothing. `migrate apply` imports a Lite or full tracking file, writes lessons for resolved gotchas and open questions for unresolved ones, imports root and `.forgetrail/` idea and bug lists once, and replaces the file with a pointer. Rollback restores only those paths.
- Subject commands for AppFacts, FeatureFacts, SkillFacts, ToolFacts, AgentFacts, and ModelFacts, with the limits on [xFacts](/xfacts).
- `diff` explains two explicit revisions of the current ledger directory. A semantic record change is separate from a formatting-only edit and from a generated view. It does not write files.

ForgeTrail's installer no longer copies `workflow_tracking.json`. That change is in the ForgeTrail repository. The public ForgeTrail site source describes it. The live forgetrail.dev pages are updated only when that site is redeployed, which this changelog does not do.

AppLedger.dev is not deployed.
