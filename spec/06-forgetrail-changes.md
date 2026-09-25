# ForgeTrail implementation changes

## Native adoption

AppLedger replaces durable project tracking in new ForgeTrail projects and migrated projects. `.forgetrail/` remains the installation and host-integration workspace. Do not dual-write a legacy tracking file indefinitely. Lite, CLI, and MCP share a record contract and implementation wherever executable tooling is available.

## Existing to proposed ownership

| Existing artifact or field | Proposed treatment |
| --- | --- |
| `workflow_tracking.json.project` | Application record and manifest identity |
| `currentPhase`, `phases` | `profiles/forgetrail.yaml`, with transition history in change records |
| `decisions[]` | Decision records, linked once from summaries |
| `gotchas[]` | Lesson or question records according to resolution |
| `sessions[]` | Session records |
| Feature `iterations` | Work records linked to capability IDs |
| `agentContext` | Explicit session/host metadata, no secrets |
| `subagentRuns` | Work/evidence records preserving attribution |
| `CONTEXT_PROMPT.md` | Generated orientation or small pointer to ledger entry point |
| `TODO.md` | Work records, optional `data.intake: task`, and an optional generated backlog view |
| `.forgetrail/IDEAS.md` | Work records with `data.intake: idea` |
| `BUGS.md` | Work records with `data.intake: bug` |
| `phases.*.notes[]` | Session or change records linked to the phase instance |
| `project.status` of `wrapped` | Profile `project_status: wrapped`, plus the existing lesson harvest |
| Companion outcomes written into tracking | Session `data.companion_outcomes` for the tool that ran |
| `docs/FORGETRAIL_PROGRESS.md` | Generated workflow progress view |
| `docs/GENESIS.md` | Preserve original statement of intent and reference it |
| `docs/PHASE_1_BRIEF.md` | Preserve approved baseline, extract linked current records |
| `specs/partial`, `completed`, `canonical` | Preserve source documents and existing status history, bind records |
| `TECHNICAL_REFERENCE.md`, `TEST_PLAN.md`, design docs | Keep unique long-form content, remove duplicate owned summaries |

Do not turn every paragraph into a record. Long-form design and reference documents are useful sources. Assign ownership at the fact/section level where a whole document cannot be derived.

## Workflow profile

Profile version `forgetrail/0.1.0` is `schemas/profile-forgetrail.schema.json`. It stores `project_status` (`active` or `wrapped`), project archetype, phase instances, criteria, transitions, and referenced approvals. `current_phase_instance` is the id of one entry in `phase_instances`. The phase id (`plan`, and the rest) lives on that instance. Canonical phase IDs are the display names already listed in `TRACKING_SCHEMA.md`: `plan`, `build`, `stabilize`, `iterate`, `refine`, `align`, `harden`. Migration maps both numeric Lite and string full IDs onto those names. Stored files that still say `1-architecture` or `4` are legacy ids, not a second living vocabulary.

Each phase instance has a stable ID, status (`not_started`, `in_progress`, `completed`, `revisiting`), start/completion times when known, and criterion entries. Each criterion has ID, text, status (`pending`, `met`, `not_applicable`), evidence refs, and optional disposition reason. Preserve original completed instances when revisiting. `current_phase_instance` is a convenience pointer, not a replacement for phase history.

Archetypes: `product`, `internal-tool`, `one-shot`. Prune inapplicable criteria at initialization, recording why. Keep the schema able to represent imported historical not-applicable criteria without inventing completion. Phase transitions retain ForgeTrail's existing approval meaning. An agent cannot infer approval from silence or a schema-valid record.

## Phase integration

| Phase | Required integration |
| --- | --- |
| Plan | Goals, stakeholders, use cases, concepts, constraints, accepted decisions, subject inventory |
| Build | Component/source bindings, actual stack declarations, initial applicable labels |
| Stabilize | Verification results, resolved gotchas, drift reconciliation |
| Iterate | Work/capability connections, FeatureFacts candidates and reviewed changes |
| Refine | Component moves, source locator repair, impact on existing claims |
| Align | Goal and audience changes, glossary reconciliation, publication selection review |
| Harden | Evidence freshness, applicable label validation, release-specific projection checks |

Label maintenance runs throughout these phases. Reconciliation must be proportional to the change.

xFacts stays optional as an installed product. Decline remains a successful companion outcome. What changes is the record of that outcome. When a real subject exists, work completion includes a disposition for each applicable family: updated, unchanged, needs review, unsupported, failed, or not applicable. A family with no subject is `not_applicable`. `getCompanionSuggestions` still offers xFacts at public handoff. That offer is not the only moment labels are maintained, and it is not a requirement to install a label the project declined.

Companion suggestions other than xFacts stay optional offers. Persist a run that matters on the session as `data.companion_outcomes`. Do not invent product goals from the fact that LocalSlip, LocalHelm, or FilePress was used.

## Repository edit surface

Inspect and update `TRACKING_SCHEMA.md`, `WORKFLOW.md`, `content/FORGETRAIL_LITE.md`, `content/COMPANION_TOOLS.md`, tracking starters, bootstrap templates, continuation prompts, agent instruction snippets, CLI installer behavior, MCP initialization/resume/validation tools, `getCompanionSuggestions`, hook scripts, examples, and site documentation. Search actual code for references to `workflow_tracking.json`, `CONTEXT_PROMPT.md`, `TODO.md`, `BUGS.md`, phase identifiers, and legacy fields before finalizing scope.

The named `getInitialWorkflowTracking` surface needs a ledger initialization replacement or explicit deprecation wrapper. Wrappers may translate reads during migration, but MUST NOT establish a second writable source. `validateTracking` and all related label declarations must reflect the real new behavior and filesystem scope.

## Lessons propagation

AppLedger owns application-specific lessons. ForgeTrail harvests generalizable patterns through its existing propagation workflow. A harvest references source lesson IDs and records its disposition without copying private details into public methodology. Mark a lesson as harvested only when the destination exists. Generalization is a separate judgment from observing a problem once.

## Completion

A ForgeTrail work item is complete when its implementation criteria, evidence recording, ledger reconciliation, and applicable label disposition are satisfied. A session may stop with incomplete work if the handoff accurately says so. Release gates must distinguish missing documentation, unsupported adapters, and disputed claims. Do not convert every uncertainty into an endless session-stop block.
