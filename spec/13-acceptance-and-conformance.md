# Acceptance and conformance matrix

## Format and integrity

| ID | Scenario | Required outcome |
| --- | --- | --- |
| C-01 | Minimal ledger | Parses and orients without cloud/MCP |
| C-02 | Duplicate YAML keys/custom tags/aliases | Rejected with a precise finding |
| C-03 | Unknown format major/minor | Unsupported reported, no rewrite |
| C-04 | Unknown extension | Preserved by writer |
| C-05 | Duplicate record ID | Validation failure |
| C-06 | Rename/move record | ID and references remain stable |
| C-07 | Missing target | Unresolved finding, no fabricated record |
| C-08 | Supersession cycle | Validation failure |
| C-09 | Intentional component dependency cycle | Reported without false corruption claim |
| C-10 | Private/absolute/path-traversal source | Containment and publication rules enforced |
| C-11 | `format_version` `0.1.1` | Accepted by a 0.1 reader; no rewrite |
| C-12 | Repository `root: .` | Means the parent of `appledger/`; absolute paths and `..` rejected |
| C-13 | Predicate not in the table, or stored on the wrong source kind | Validation failure |

## Evidence and lifecycle

| ID | Scenario | Required outcome |
| --- | --- | --- |
| E-01 | Test file exists but has not run | Association only, no passing result |
| E-02 | Model/card declaration | Attributed declaration, no observed guarantee |
| E-03 | Source changed | Dependent claims require freshness review |
| E-04 | Unrelated source changed | No unnecessary record/label churn |
| E-05 | Scan excludes unreadable area | Partial scope, not absence |
| E-06 | Work done locally | No automatic deployed/released status |
| E-07 | Feature retired | Identity and reason remain reachable |
| E-08 | Term renamed | Alias and semantic history preserved |
| E-09 | Imported unknown date | Unknown event date, honest import time |
| E-10 | Conflicting owner/code descriptions | Conflict retained with distinct scopes |

## Automation and recovery

| ID | Scenario | Required outcome |
| --- | --- | --- |
| A-01 | Same inputs/policy/adapters twice | Second run has zero semantic/file diff |
| A-02 | Concurrent agent/user edit | Precondition failure, no overwrite |
| A-03 | Failure midway through multi-file apply | Recoverable transaction, no false success |
| A-04 | Session interrupted | Next session detects unfinished work |
| A-05 | Commit hook finds stale label | Actionable read-only failure, no hidden staging |
| A-06 | Prompt-only host | No claim of guaranteed automatic maintenance |
| A-07 | Applicable adapter missing | Unsupported disposition, no guessed label |
| A-08 | Target server would execute during discovery | No silent execution |
| A-09 | Generated output changes | No recursive discovery loop |
| A-10 | Multiple model/skill/tool subjects | Separate bindings and scoped updates |

## Integration and migration

| ID | Scenario | Required outcome |
| --- | --- | --- |
| I-01 | Lite and full legacy tracking | Both migrate with equivalent meaning |
| I-02 | Custom fields and revisited phase | Preserved and mapped or explicitly unresolved |
| I-03 | Context conflicts with tracking | Reported, no timestamp-based guessing |
| I-04 | Legacy writer after cutover | Detected instead of dual-written |
| I-05 | Fresh ForgeTrail session | Correct phase, decisions, active work, and next steps |
| I-11 | xFacts declined or no subject | `not_applicable` disposition; companion decline still succeeds |
| I-12 | Imported `project.status: wrapped` | Profile `project_status: wrapped` and harvest links preserved |
| I-06 | New feature | Linked goal/use case/work, native candidate/curation, label disposition |
| I-07 | FeatureFacts empty selection | Valid empty label |
| I-08 | Tool gains filesystem writes | ToolFacts and dependent AgentFacts reviewed |
| I-09 | Skill helper keyword guess | Draft attribution retained |
| I-10 | Model variant changes | No inherited incompatible assertions |

## Public projection

| ID | Scenario | Required outcome |
| --- | --- | --- |
| P-01 | Private feature mutation | Public bytes, counts, dates, fingerprints unchanged |
| P-02 | Internal evidence contains path/commit/contact | Omitted from public projection |
| P-03 | Unsupported public approval representation | Pending, no invented child fields |
| P-04 | Public record links to private record | Link excluded or replaced by approved safe summary |
| P-05 | Local reconcile | No automatic deploy/upload |
| P-06 | Changed reviewed source | Prior review not misrepresented as current independent approval |

## Human usefulness checks

Give a fresh agent a repo and a task. It must correctly explain purpose, users, relevant terminology, implementation boundaries, and known gaps using source-linked records. Repeat after a rename and feature retirement. Ask why a decision was made and which evidence supports a capability. It must distinguish historical rationale from current behavior.

## Conformance report

Reports identify implementation version, supported format/profile/adapter versions, fixture results, unsupported areas, and test environment. Passing the generic envelope schema is insufficient for full record or curator conformance. Run native child validators as well as AppLedger checks. Publish limitations with any conformance claim.

Tests should target the failure modes above. Avoid tests that only duplicate code branches without verifying meaningful behavior. Tests in this document are implementation acceptance requirements. They have not been executed against an AppLedger implementation because that implementation does not yet exist.
