# Records and relationships

## Common envelope

Every canonical record requires `format_version`, `id`, `kind`, `title`, `record_status`, `created_at`, `updated_at`, `recorded_by`, `visibility`, `relations`, and `claims`. `record_status` is `active`, `superseded`, or `retired`. It describes the record, not feature release maturity or task completion. Timestamps are RFC 3339 strings. `created_at` is the time the ledger record was created, not a guessed historical event date.

`recorded_by` identifies an accountable actor and actor type (`human`, `agent`, `tool`, or `import`). Agent activity MUST NOT be attributed as human approval. A record's author does not automatically approve all of its claims.

The Markdown body supplies explanation, scenarios, and rationale. Structured claims contain the consequential assertions needed for automated evidence checks. Curators MUST NOT hide a material contradictory claim only in prose.

## Record kinds

| Kind | Required meaning or kind-specific fields |
| --- | --- |
| application | Purpose, boundaries, intended audience, current survey scope |
| goal | Desired outcome, owner (stakeholder id or `unknown`), and `unmeasured`. When `unmeasured` is false, `measurement` is required. When it is true, `measurement` is forbidden |
| stakeholder | Role, interests, responsibilities, optional identity reference |
| use_case | Actor, trigger, intended outcome, main flow, relevant exceptions |
| concept | Definition, scope, aliases, related terms, ambiguity notes |
| component | Responsibility, boundaries, source locators, interfaces |
| decision | Choice, rationale, alternatives, decision status, authority |
| constraint | Restriction, scope, origin, consequence, enforcement evidence if claimed |
| question | Unresolved issue, affected records, resolution status |
| work | Objective, work status, acceptance criteria, affected subjects, verification refs |
| session | Session identity, work refs, accomplishments, left-off state, next steps |
| lesson | Context, observed problem, resolution, limits, generalization status |
| change | Change type, affected IDs, reason, evidence, work/session refs |
| evidence | Evidence type, subject, repository/version scope, result, source/digest |
| capability_ref | A pointer to an externally owned capability, especially FeatureFacts |

The core does not create a second feature register. `capability_ref` owns only its external identity mapping and relationships to ledger records. Its display title may be cached and labeled derived. Lifecycle and capability claims stay with the FeatureFacts source. If FeatureFacts is unavailable, record an unresolved proposed use case or work item, not a fabricated confirmed feature.

Kind-specific structured values live under `data`. `schemas/record-kinds.schema.json` is the normative kind contract for `data`. The envelope schema still accepts a `data` object so a generic reader can preserve unknown future kinds. Writer conformance uses the kind schema. Predicate source and target pairs are normative in the table below and are not fully encoded in JSON Schema, because target kinds require the whole ledger.

## Relationships

Each relation has `type`, `target`, and optional `note`. Internal targets are record IDs. External targets use `binding:<binding-id>#<external-id>`. The manifest owns bindings. Do not resolve arbitrary URI schemes as executable actions.

Core predicates are only the rows below. A relation type outside this table is invalid. Adding a predicate is a minor-version change. Generic relatedness belongs in prose until a row exists.

Store each relation on the source kind in this table. Do not also store an inverse. Reverse links are generated indexes. `supersedes` is stored on the newer record, targets the same kind, and MUST be acyclic. `depends_on` cycles are reported and are not, by themselves, corruption.

Claim `evidence_refs` are the claim-level link to evidence records. `verified_by` is the record-level link. When both are present they MUST name evidence records and MUST NOT disagree about which evidence supports the record.

| Predicate | Source kind | Target kind |
| --- | --- | --- |
| `serves` | `use_case` | `goal` |
| `supports` | `application`, `capability_ref`, `component` | `goal`, `use_case` |
| `realizes` | `work`, `component`, `capability_ref` | `use_case`, `goal` |
| `uses` | `use_case`, `component`, `work`, `capability_ref` | `concept`, `component`, `capability_ref` |
| `defines` | `concept` | `concept` |
| `implemented_by` | `capability_ref` | `component` |
| `owned_by` | `goal`, `component`, `work`, `decision`, `constraint`, `capability_ref` | `stakeholder` |
| `constrained_by` | `application`, `use_case`, `component`, `work`, `capability_ref` | `constraint` |
| `decided_by` | `application`, `component`, `work`, `constraint`, `capability_ref` | `decision` |
| `verified_by` | any kind except `evidence` | `evidence` |
| `affects` | `work`, `decision`, `change`, `session`, `constraint`, `question` | any kind except the source record |
| `depends_on` | `component`, `work`, `capability_ref`, `goal`, `use_case` | `component`, `capability_ref`, `work`, `decision`, `constraint` |
| `supersedes` | any kind | the same kind |
| `derived_from` | any kind | any kind |
| `recorded_in` | `work`, `decision`, `lesson`, `change`, `evidence`, `question` | `session` |

References must resolve, including to retained retirement records, or produce an explicit unresolved finding. An external target `binding:<binding-id>#<external-id>` resolves through the manifest binding. A missing binding or native id is unresolved. It is not a reason to invent a ledger record.

## Separate state dimensions

Work `data.status`: `proposed`, `ready`, `in_progress`, `blocked`, `done`, `cancelled`.
Decision `data.status`: `proposed`, `accepted`, `revisit`, `superseded`, `withdrawn`.
Question `data.status`: `open`, `answered`, `deferred`.
Feature lifecycle, availability, recognition, and maturity retain their native FeatureFacts enums. Adapter code MUST NOT substitute the above generic states.

Work becomes done only when its declared acceptance checks have outcomes, documentation and label reconciliation has completed or an explicit allowed disposition exists, and unresolved blockers are not hidden. Done does not mean deployed. Release/deployment evidence has a separate subject and revision.

## Glossary behavior

Concept IDs survive term changes. Record preferred term and aliases, including deprecated aliases with an explanation. A spelling change is not a new concept. A meaning change requires a change record and may require a new concept ID if old and new meanings coexist. Two different meanings of 'workspace' remain separate scoped concepts. Never silently merge them because their titles match.

## Size and reading

Prefer one record per durable entity or event. Very small goals or terms can still be small files. Generated indexes group them for reading. The orientation view should stay approximately 800 words or less, with explicit links to relevant details. It must identify unresolved high-impact questions and stale source areas rather than concealing them to meet a size target.
