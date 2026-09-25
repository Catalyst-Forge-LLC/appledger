# Implementation plan and work packages

## Sequence

Build the record contract first, then migrate ForgeTrail and integrate label maintenance. Use pilots before declaring a stable public standard. Complete all six adapter dispositions even when some operations remain explicitly unsupported. Do not advertise automatic six-family generation until implemented and tested.

| ID | Work package | Dependencies | Completion evidence |
| --- | --- | --- | --- |
| AL-01 | Manifest, record envelope, parsing rules, versioning | None | Valid/invalid fixtures and parser checks |
| AL-02 | Implement the kind, profile, and policy schemas and the predicate table from this pack | AL-01 | Fixtures in this pack pass semantic validation |
| AL-03 | IDs, references, source bindings, freshness | AL-02 | Rename, missing source, and revision tests |
| AL-04 | Transactions, idempotency, conflict recovery | AL-03 | Interrupted write and concurrent edit tests |
| AL-05 | Orientation, progress, history views | AL-03 | Bounded context and no-change rendering checks |
| AL-06 | Standalone curation skill and shared instructions | AL-02 | Fresh-session task demonstration |
| FT-01 | Inventory every legacy reader/writer | None | File/symbol inventory and migration map |
| FT-02 | ForgeTrail workflow profile | AL-02, FT-01 | Lite/full phase mapping fixtures |
| FT-03 | Tracking/document migration engine | AL-04, FT-02 | Preview/apply/rollback on representative copies |
| XF-01 | Adapter interface and subject inventory | AL-03 | Multi-subject discovery fixtures |
| XF-02 | AppFacts and FeatureFacts integration | XF-01 | Deterministic refresh and attributed curation |
| FT-04 | Installer, templates, Lite, MCP, hooks cutover | FT-03, XF-02 | New bootstrap and migrated resume |
| XF-03 | SkillFacts safe draft/update integration | XF-01 | Script-change and guess-attribution cases |
| XF-04 | ToolFacts/Panel integration | XF-01 | Recorded tools/list and reach-change cases |
| XF-05 | AgentFacts integration | XF-04 | Toolset/configuration scope checks |
| XF-06 | ModelFacts integration | XF-01 | Exact variant and offline metadata cases |
| PUB-01 | Public projections and policy checks | XF-02 | Private mutation produces identical public output |
| PILOT-01 | Existing app and fresh small project | FT-04, PUB-01 | Orientation, change, and migration findings |
| DOC-01 | Domain site, suite docs, release notes | Pilot findings | Examples match shipped behavior |
| REL-01 | Tagged proposal release and compatibility table | Core and shipped adapters | Conformance results and explicit limitations |

## Milestones

M1: format usable manually, no integration claims. M2: ForgeTrail native tracking on pilots, AppFacts/FeatureFacts maintained. M3: full subject-aware suite integration with supported operations accurately documented. M4: public proposal, examples, migration guide, and adoption feedback. A later stable 1.0 requires a supported compatibility policy and at least demonstrated independent read/write interoperability, not merely a completed website.

## Repository organization

Implementation lives in sibling repository `Catalyst-Forge-LLC/appledger`. The user creates that remote and confirms the GitHub slug and the unscoped npm name `appledger` are free. Do not publish from this ForgeTrail repository.

| Path or package | Role |
| --- | --- |
| `spec/`, `schemas/` | Canonical format once the repository exists. Seed them from this pack. |
| `examples/` | Fixtures, including the synthetic minimal ledger |
| `src/`, `tests/` | TypeScript/Node CLI and libraries. Package name `appledger`, license MIT. Bin `appledger`. |
| `skills/` | Standalone curation skill sharing the same rules |
| `appledger/` | This product's own ledger. Not a copy of `spec/`. |
| `.forgetrail/` | ForgeTrail install. Until FT-04, tracking JSON is only a pointer. See migration. |
| `site/` | Private package `appledger-site`. FilePress (`getfilepress`), same `/site` pattern as forgetrail.dev. Cloudflare Pages project `appledger`, domain AppLedger.dev. |

One public package. Do not split adapters into extra packages until a real build boundary requires it. The site package is private and is not the CLI.

LocalSlip leases the FilePress dev server under the name `appledger-site`. Follow the FilePress recipe: `localslip claim appledger-site --port N && filepress dev`. Do not pass `--port` to FilePress. Do not add the `localslip` package just to read a port. Do not copy ForgeTrail's site port. Choose a free lease when the repository is created.

LocalHelm enrolls the repository because this workstation already runs more than one local app. Follow LocalHelm's current enrollment steps. Do not invent a second port allocator, and do not make LocalHelm or LocalSlip a dependency of the `appledger` library.

## Practical pilot

The fresh-project pilot is the AppLedger repository itself. It must show a small ledger, a ForgeTrail profile, a FilePress site, and a session handoff without a second writable tracking file.

The existing-application pilot is chosen at FT-03 from a real repository that already has features, decisions, and tracking. Do not name it in this pack. Migrate a copy or an isolated branch first. Run a feature addition, rename, retirement, refactor, and session interruption. Include a private feature to test public isolation. Compare actual effort with the baseline. Do not retrofit the entire tool portfolio before these tests pass.

## Release completeness

Update ForgeTrail's own AppFacts, ToolFacts, SkillFacts, and any actual AgentFacts reference affected by new behavior. Include AppLedger's own applicable labels. Record adapter support honestly. Never deploy websites or publish packages solely because this specification contains a release work package, implementation needs its own task authorization.
