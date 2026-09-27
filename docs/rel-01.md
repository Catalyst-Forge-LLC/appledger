# Proposal 0.1.0 compatibility and conformance

This report is the REL-01 proposal marker. It is not an npm release. Package `appledger` stays at `0.0.0`, which is a name hold. AppLedger.dev is not deployed. The git tag `proposal-0.1.0` names the commit that contains this file. Pushing that tag, publishing the package, and deploying the site are separate acts and were not done here.

`pnpm test` reported 52 passed on Node `v24.17.0`, pnpm `10.30.1`, vitest `3.2.7`. The run started at 19:19:07 local time (UTC-4) on 2026-09-26. Fifty-two passing tests are not a pass of every row below.

## Compatibility

Format, profile, adapter, child-schema, and package versions are separate.

| Layer | Version this tree accepts | Rule |
| --- | --- | --- |
| Format | `0.1.x` | A 0.1 reader accepts `0.1.1` and rejects `0.2.0`. Tested in `tests/check.test.ts`. |
| Profile | `forgetrail` `0.1.0` | `schemas/profile-forgetrail.schema.json`. Phase ids are `plan`, `build`, `stabilize`, `iterate`, `refine`, `align`, `harden`. |
| Adapter id | `appledger.<family>` `0.1.0` | Declared in `src/adapters.ts`. `render` and `projectPublic` are not subject operations. |
| Package | `0.0.0` | Name hold. Not the version of this source. |
| AppFacts | `0.1.0` pinned at `029b75f0ef27b495108455e2785c61f844900a8e` | Copied under `schemas/pinned/`. Not a runtime dependency. |
| FeatureFacts | `0.2.0` pinned at `85612cd0e8a8a63b00373d8c7f34ada502c591a6` | Same. |
| SkillFacts | `0.1.0` pinned at `1487c5a04f9234f4ab5f4f817ca5b76fdff4ece4` | Same. |
| ToolFacts | `0.1.0` pinned at `23fe664bce0fcc7537dfbbe26913cb75249a01ba` | Same. |
| AgentFacts | `0.1.0` pinned at `d71c9883e3fa2d104c5d7f06d92ee86c56f9089c` | Same. |
| ModelFacts | `0.1.0` pinned at `10cace218a461f0739655d09e26798ef3af14047` | Same. |

ForgeTrail commit `70642fc` stops new installs from copying `workflow_tracking.json`. ForgeTrail commit `a234992` updates the public docs to match. Those commits are in the ForgeTrail repository. This report did not re-run that repository's tests.

There is no compatibility promise for a format minor other than `0.1.x`, for an unpinned child schema, or for a package version other than the name hold. A later stable 1.0 still requires a supported compatibility policy and an independent reader. This report is not that policy.

## Commands

From `spec/10-tooling-and-automation.md`, which `tests/skill.test.ts` checks against the skill file:

| Command | Status |
| --- | --- |
| `check`, `orient`, `render`, `transaction`, `subjects`, `migrate`, `diff`, `init` | implemented in this repository |
| `reconcile` | not implemented |

`diff` was added after the 52-passed run recorded above. A later `pnpm test` reported 54 passed, including `tests/diff.test.ts`. The run started at 20:32:22 local time (UTC-4) on 2026-09-26, on Node v24.17.0, pnpm 10.30.1, and vitest 3.2.7. Fifty-four passing tests are not a pass of every row below.

`init` was added after that 54-passed run. A later `pnpm test` reported 56 passed, including `tests/init.test.ts`. The run started at 20:55:45 local time (UTC-4) on 2026-09-26, on the same Node, pnpm, and vitest versions. Fifty-six passing tests are not a pass of every row below.

## Conformance rows

`tested` means a current test asserts the required outcome. `partial` means a related assertion exists and the row is not fully covered. `not tested` means this suite does not demonstrate the row. Code may still contain a path. An untested path is not a pass.

| ID | Result | Where |
| --- | --- | --- |
| C-01 | tested | `tests/check.test.ts` accepts `examples/minimal`. `tests/views.test.ts` orients it. |
| C-02 | partial | Duplicate keys and aliases are rejected. Custom tags and merge keys are rejected in `src/yaml.ts` and are not asserted by a test. |
| C-03 | partial | `format_version` `0.2.0` is rejected. A different major is not a separate case. The test does not assert that the file bytes were left unchanged. |
| C-04 | not tested | Unknown `extensions` preservation has no test. |
| C-05 | not tested | Duplicate ids are an error in `src/check.ts` and have no test. |
| C-06 | tested | `tests/freshness.test.ts` keeps the id when the title changes and keeps references when the file moves. |
| C-07 | tested | A missing evidence source is not called absence. A missing binding stays unresolved. |
| C-08 | not tested | Supersession cycles have no test. |
| C-09 | not tested | Component dependency cycles have no test. |
| C-10 | partial | A symlink that leaves the repository and a transaction path that leaves it are rejected. Private path, contact, and commit text are omitted from the public view. |
| C-11 | tested | `format_version` `0.1.1` is accepted. |
| C-12 | tested | A parent-relative repository root is rejected. |
| C-13 | partial | A predicate on the wrong kind fails. A predicate absent from the table is not a separate case. |
| E-01 | not tested | An existing test file is not shown as association-only. |
| E-02 | tested | `tests/modelfacts.test.ts` does not infer a rating when offline metadata names only a family. |
| E-03 | tested | A changed source flags claims that cite it. |
| E-04 | tested | The same test stays quiet for claims that do not cite that source. |
| E-05 | not tested | An excluded unreadable scan area has no test. |
| E-06 | not tested | Local work is not shown refusing an automatic released status. |
| E-07 | not tested | Retirement is not asserted in this suite. The earlier pilot script retired one record on a temp copy. That run was not repeated. |
| E-08 | not tested | A glossary rename that keeps an alias has no test. |
| E-09 | tested | An undated imported decision says the timestamp is a placeholder, not the event date. |
| E-10 | not tested | Conflicting owner and code descriptions have no test. |
| A-01 | partial | A second progress render and a second history render match. An already-applied transaction writes nothing. A full label reconcile run twice is not tested. `reconcile` is not implemented. |
| A-02 | tested | A concurrent edit is not overwritten. |
| A-03 | tested | An apply that stops midway stays incomplete and can resume. |
| A-04 | tested | `check` reports an interrupted transaction. |
| A-05 | not tested | No commit hook in this repository fails a stale label without staging. |
| A-06 | partial | The fresh-session demonstration names `check` and `orient` as the checks it ran, and names commands it did not run. |
| A-07 | tested | A missing register is `unsupported`. `render` on subjects is `unsupported`. No label is written. |
| A-08 | tested | ToolFacts reviews a recorded `tools/list`. The fixture has no live server. |
| A-09 | not tested | Generated output is not shown avoiding a discovery loop. |
| A-10 | tested | Two tools, two skills, and two models stay separate rows. |
| I-01 | tested | A full tracking file and a Lite file both migrate. |
| I-02 | tested | `customFlag` stays unmapped. A revisiting phase stays revisiting. An earlier phase is not marked completed because a later phase is current. |
| I-03 | not tested | A context file that conflicts with tracking has no test. |
| I-04 | partial | ForgeTrail `scripts/tracking-cutover.test.mjs` treats a writable tracking file as a conflict. This `pnpm test` did not run that file. |
| I-05 | partial | The fresh-session demonstration names the local-files decision and the checks it did not run. It does not assert the phase line and the next step together. |
| I-06 | not tested | A new feature linked to a goal, use case, work item, and label disposition has no test. |
| I-07 | tested | An empty FeatureFacts selection validates and is not written. |
| I-08 | partial | A new writing tool is marked for review, and a switched toolset is marked for review, in separate tests. One filesystem-write change does not review both labels together. |
| I-09 | tested | A SkillFacts keyword guess stays a draft and the label is not rewritten. |
| I-10 | tested | A different model variant does not inherit context window or benchmarks. |
| I-11 | tested | A family with no subject is `not_applicable`. |
| I-12 | tested | Imported `project.status: wrapped` becomes `project_status: wrapped`. |
| P-01 | tested | Editing a private record leaves the public bytes and fingerprint unchanged. |
| P-02 | tested | The public view omits a private path, contact, and commit text. |
| P-03 | partial | The projection says a missing policy does not grant publication. An unsupported child approval field is not a separate case. |
| P-04 | tested | A public record's relation to a private record is replaced by "A private relation was omitted." |
| P-05 | partial | The projection says no upload or deploy was performed. The test asserts that sentence. It does not capture network traffic. |
| P-06 | partial | A claim whose recorded revision is not HEAD is reviewed. The projection says it does not represent a prior review as current approval. |

The human usefulness checks in `spec/13-acceptance-and-conformance.md` were not repeated for this report. `docs/pilot-01.md` records one earlier comparison. That comparison found gaps that later tests cover for decision text and session time. It is not a fresh pass of the human checklist.

## Explicit limitations

- `reconcile` is not implemented. `init` creates a manifest, profile, application record, and session record, and it does not overwrite an existing ledger. `diff` explains two explicit revisions and does not write files.
- `propose --apply` may set a FeatureFacts derived title only. It does not rewrite SkillFacts, ToolFacts, AgentFacts, or ModelFacts labels.
- ToolFacts does not start a server. AgentFacts does not claim host enforcement. ModelFacts does not contact a provider.
- Orientation includes decision choices, lessons, and the latest session time. A fact that lives only in an older session body is not copied into the decision list.
- Work status can stay `in_progress` after an acceptance criterion is `met`.
- ForgeTrail Lite v2.2.0 and WORKFLOW tell an agent to write `appledger/`. The remaining `workflow_tracking.json` sentences say not to create that file, except the legacy `lite-1` example kept for migrate. This report's earlier suite run was not repeated for that text change.
- The sites and the npm package were not published.
