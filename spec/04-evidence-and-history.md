# Evidence, freshness, and history

## Claim contract

A structured claim contains `id` (unique within its record), `statement`, `basis`, `status`, `evidence_refs`, and `scope`. Basis is `declared`, `extracted`, `observed`, or `inferred`. Status is `supported`, `unresolved`, `disputed`, or `stale`.

These dimensions answer different questions. A supported declaration proves someone made that declaration. It does not establish observed implementation. An inference can remain a useful candidate while clearly labeled. Runtime enforcement requires evidence of the enforcing host or runtime, with its scope, rather than a promise in instructions.

Scope identifies relevant repository, revision or input snapshot, environment where relevant, and limitations. Structured scope keys are `repository_id`, `revision`, `environment`, and `limitations`. A claim about production cannot be supported solely by a local implementation snapshot. An intentionally declared goal can reference a dated owner decision rather than code.

Evidence `data.source` is a path relative to the repository named by `data.repository_id`, or a document name inside that repository. With `root: .`, a file beside the `appledger/` directory is named from the home repository root, not from inside `appledger/`.

## Evidence records

Evidence kinds include `owner_statement`, `document`, `source_extract`, `test_run`, `runtime_observation`, `configuration`, and `import_snapshot`. An evidence record states what was examined, how it was obtained, the actor/tool, time, subject, and limitations. Test evidence records command or test identifier, exit/result, revision, relevant environment, and artifact location. Merely finding a test file is document/source evidence, not a passing test run.

Keep large logs out of the ledger when a bounded artifact reference suffices. A missing artifact makes the evidence unavailable and its dependent claims unresolved or stale according to scope. Never reinterpret missing evidence as failure of the feature itself.

## Revision and digest rules

Use full Git commit IDs for committed source, and content digests for relevant dirty-worktree inputs. A reconciliation run records the source revision before ledger changes and explicit input digests. Do not try to insert the final commit's own hash into its own content.

Digest algorithm: SHA-256 over raw file bytes. For an input set, sort normalized repository-relative POSIX paths by UTF-8 byte order and hash UTF-8 JSON encoding of the array of `{path, sha256}` objects with no whitespace, fixed key order, and no ASCII escaping. Record algorithm/profile version. Exclude generated outputs, caches, and the receipt itself to avoid cycles. Missing inputs are recorded as missing entries in the run report and prevent claiming an intact input set.

Resolve symlinks before access, reject escapes outside approved roots, and represent logical repository paths consistently. Do not treat a digest as proof of origin or truth. A matching digest proves matching bytes under that digest contract.

## Freshness

`updated_at` tracks editing. `checked_at` on an evidence or reconciliation record tracks a specific check. They are not interchangeable. Source freshness derives from source identity, expected input digests, revision, and availability. It is distinct from schema validity, claim review, and public approval.

A changed component marks potentially affected claims as needing review. An unchanged source fingerprint is sufficient only for claims whose declared dependency scope it covers. Partial scans MUST leave out-of-scope records unchanged or explicitly unresolved. Unsupported parsers cannot mark a surface absent.

## Current state and history

Current records are maintained in place. Meaningful changes create `change` records with `data.change_type`: `added`, `modified`, `renamed`, `retired`, `restored`, `superseded`, or `corrected`. Include affected IDs, reason, evidence, effective date when known, and links to work/decisions. Effective time and recorded time remain separate. Historical unknown dates remain unknown.

Git records textual history. Change records preserve semantic intent. V0.1 is not an event-sourced database and does not promise to reconstruct state from change records alone. Historical views use Git revisions plus linked records. Corrections to history must be explicit, never silently backdated. Old factual mistakes should not be preserved as current truth merely for append-only purity.

A removed capability keeps its externally owned retirement information and ledger pointer. Do not delete the identity to make dangling links disappear. Public output may omit retired rows under child policy while private history remains intact.

## Reconciliation receipts

Each applied reconciliation creates a change record with `data.operation: reconciliation`, an input fingerprint, tool/profile versions, affected record IDs, output paths/digests, and per-output dispositions. Its idempotency key derives from input fingerprint, policy digest, and adapter versions. An unchanged repeat MUST NOT create a new semantic change or churn timestamps. A separate ephemeral run log may record the repeated invocation.

Receipt outcomes: `updated`, `unchanged`, `needs_review`, `unsupported`, `failed`, or `not_applicable`. Every applicable label gets a disposition. No overall success when a required output failed or needs blocking review.
