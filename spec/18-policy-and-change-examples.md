# Policy contract and worked change examples

## Policy file

`appledger/policy.yaml` is explicit configuration for the curator. `schemas/policy.schema.json` is the normative file shape. Required fields are `policy_version`, `authorized_by`, `local_maintenance`, `public_projection`, and `gates`. Each authorization names an actor, source, recorded time, and scope. Missing policy does not grant automatic approval. Existing user authorization still governs the actual tool invocation. A minimal ledger may omit the file.

`local_maintenance` defines whether deterministic extraction, internal agent curation, and internal label selection are allowed. An enabled internal operation never implies public permission. `public_projection` identifies approved publication-policy sources and allowed targets, without granting a generic upload/deploy permission. `gates` distinguishes requirements for work completion, session handoff, commit, and release.

Recommended initial gate policy:

| Boundary | Blocking conditions | Permitted incomplete state |
| --- | --- | --- |
| Work completion | Unmet declared acceptance, missing required reconciliation, unresolved relevant contradiction | Explicitly waived noncritical criterion with attributed reason |
| Session handoff | Corrupt/incomplete transaction, absent handoff on a host that enforces it | Accurate unfinished work and pending review |
| Commit | Invalid owned records, broken required references, stale required projections | Unrelated pre-existing gaps identified by scoped policy |
| Release | Missing required label disposition, unsupported mandatory adapter, private-data leakage, stale release-specific declarations | Only documented exceptions actually allowed by release policy |

Waivers record the affected requirement, authority, reason, scope, and expiry or revisit condition. They never transform an unsupported claim into evidence-backed truth. Validators should report both the exception and the underlying finding.

## Example: adding a feature

A work record links to a proposed use case and goal. Code changes produce a FeatureFacts candidate. The curator examines implementation and available evidence, then records attributed recognition if justified. It preserves separate lifecycle and availability values. Existing label selection stays unchanged unless the selection policy permits an update. The ledger links the native capability to the use case, affected components, decision, and work. A reconciliation receipt records register and label outcomes. Release status changes only with release evidence.

## Example: changing a term

The application changes the preferred term from 'collection' to 'workshop' without changing its meaning. Preserve the concept ID, add the old term as an alias, update the preferred title, and create a rename change record. Inspect related use cases and public descriptions. Regenerate only affected views. If the meaning also changes, record the semantic difference and decide whether the old concept must remain separately addressable.

## Example: removing a capability

A decision states why the capability is retired and names any replacement. Work removes the implementation and obtains relevant verification. The native FeatureFacts record retains its ID and retirement state, and approved label selection is reconciled. AppLedger preserves relationships for historical explanation while current orientation identifies the replacement. A source path disappearing does not itself prove intentional retirement.

## Example: a configuration expands reach

An agent configuration gains a tool that can write files. Update the ToolFacts declaration for the actual tool behavior and inspect the bound AgentFacts configuration. If the host enforces a narrower boundary, record supporting configuration/runtime evidence. Otherwise do not preserve a claim of no filesystem reach. Regenerate applicable labels, review affected public statements, and record the change's subject/version scope.
