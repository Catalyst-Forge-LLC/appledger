# Reference tooling and host automation

## Implementation shape

Use TypeScript/Node for portable CLI and shared libraries. Schema and text readers have no model dependency. Agent-assisted semantic curation runs in the invoking agent environment. Store no API keys in the ledger. A standalone skill can explain and manually maintain the format when executable tools are unavailable, but must state which checks were not run.

Proposed modules: format reader/writer, record/reference validator, dependency index, transaction manager, migration engine, ForgeTrail profile, xFacts adapter interface, individual adapters, and view renderers. Keep one shared source of curation rules for the standalone skill and ForgeTrail integration.

## Proposed CLI

These names are design targets, not commands currently available:

| Command | Behavior |
| --- | --- |
| `appledger init --root PATH` | Create minimal files without overwriting existing records |
| `appledger orient --task TEXT` | Produce bounded source-linked orientation |
| `appledger check --format json` | Read-only validation with stable finding codes |
| `appledger reconcile --plan` | Calculate changes and review requirements |
| `appledger reconcile --apply` | Apply changes allowed by policy and current authority |
| `appledger diff --from REV --to REV` | Explain ledger changes at explicit revisions |
| `appledger migrate --from forgetrail --plan` | Produce migration report |
| `appledger migrate --from forgetrail --apply` | Apply reviewed/supported migration mapping |
| `appledger render --view progress` | Regenerate a declared derived view |

`orient` can use deterministic selection or agent assistance. It MUST disclose which. All commands support explicit root and bounded scope. Read-only commands do not start target servers or access the network implicitly.

Proposed exit codes: 0 successful, 1 validation/gate failure, 2 usage/configuration, 3 concurrent modification, 4 required unsupported operation, 5 I/O/tool failure. Findings additionally carry code, severity, path/record, reason, and suggested action. Never wrap native child exit codes without preserving their original details in the result.

## Multi-file transaction

Resolve inputs and expected digests. Stage edits under `.appledger-cache/transactions/<id>`. Validate the complete proposed state, including external register and label changes. Acquire an application-scoped writer lock and recheck preconditions. Journal intended replacements, make atomic per-file replacements, and mark completion. Cross-file atomicity is not provided by a filesystem rename alone. Readers/hooks detect incomplete transactions and request recovery before trusting generated views.

If a concurrent edit is detected, stop and return a scoped conflict. Do not overwrite user edits or automatically choose one agent's account. A stale lock needs verified process/lease recovery. Completed transactions clear temporary state. Failures preserve sufficient journal information to resume or roll back only changed paths.

## Hooks

Session start: check supported format and pending transactions, inject bounded current work/phase context.
After edit: validate touched record envelopes and references, mark relevant derived outputs stale without expensive full scans.
Before commit: read-only consistency and applicable label checks. Never silently modify staged contents at commit time. Provide an explicit reconcile command when writes are needed.
Session stop: persist handoff through the agent, check recorded outcomes, warn or block according to host/project policy with bounded retry behavior.
Before release: strict subject-scoped freshness, publication filtering, and schema checks against the actual release inputs.

Prompt-only hosts cannot guarantee automatic execution. Document the guarantee separately for each supported host. Hooks enforce checks they actually implement, not semantic truth. Missing hooks must be visible in setup diagnostics.

## Reconciliation triggers

Maintain a dependency index from records and adapter-declared input patterns. Code and configuration changes trigger relevant adapters. Schema/profile/policy changes can require broader revalidation. Ignore generated outputs as discovery inputs to avoid loops. Repeat runs on unchanged inputs produce no diff. Batch related changes at logical work boundaries rather than generating new records after every keystroke.

## Compatibility

Keep runtime dependencies out of the target application. The `appledger` package must not depend on `forgetrail`. Dev tooling can be pinned externally or in devDependencies by project choice. Support offline schema validation. Optional MCP tools expose the same core operations, with accurate read/write/network declarations. Do not introduce an AppLedger MCP server before the CLI/shared library contract is useful.
