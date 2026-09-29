# Cold-eye — README and public docs

**Verdict:** close as a card, close as a system.

Read in newcomer order: the README lockup, the README a package buyer gets, the home page, then the docs in pager order (introduction, quickstart, standard, examples, reference, ForgeTrail, xFacts, conformance). `pnpm pack --dry-run` ships `README.md`, `spec/`, and `schemas/` with the checker. The site is a second surface.

## Ranked changes

1. **F-001** · test 2 — invented
   > pnpm install
   > pnpm verify
   > pnpm exec appledger check --root examples/minimal/appledger
   > pnpm exec appledger check
   Cold reader: treats that block as how to start, clones the repo, and runs the test suite. The command that creates a ledger is a table cell and a sentence further down, and the same checkout block is the first fence in the quickstart.
   Put: Make the first runnable block the user hour: from the app folder, `pnpm dlx appledger init --name`, then `pnpm dlx appledger check`, and what a finished run prints. Keep `pnpm verify` under a heading that says it is for working on this repository.

2. **F-002** · test 3 — drift
   > Each works on its own.
   Cold reader: stops on that sentence and treats ForgeTrail as a product that does not use AppLedger. The next paragraph says the opposite: ForgeTrail's phase, decisions, lessons, and handoff live in `appledger/`, and the old tracking file is only a pointer.
   Put: Say in that first sentence that ForgeTrail's record is AppLedger. Keep the separate claim that AppLedger and the xFacts labels can be used without ForgeTrail.

3. **F-003** · test 8 — maintainer
   > Preview with `pnpm site:dev`. LocalSlip lease name: `appledger-site` on port 46002.
   Cold reader: a package buyer hits a port, a lease name, and `pnpm ship` on the README, and later "The skill does not publish, deploy, or generate xFacts labels."
   Put: Move the lease, the port, the ship command, and the agent's publish ban off the buyer README. Leave a link to the docs.

4. **F-004** · test 1 — pitch
   > `appledger render --view progress` and `--view history` print derived views.
   Cold reader: faces one paragraph that names render, migrate, diff, init, bind, and reconcile, and cannot tell where the job starts or when it is done.
   Put: Give the user hour as steps with a stop (`check` prints `ok`). Point the refusal catalog at the conformance page instead of restating it here.

5. **F-005** · test 7 — copied_law
   > ForgeTrail keeps its project record in AppLedger.
   Cold reader: finds that law again on the introduction and again, longer, on the ForgeTrail docs page. The three copies agree today.
   Put: Let the ForgeTrail page own the relationship. On the home page and the introduction, point at that page.

## What to cut

- The contributor `pnpm verify` block from the first screen of the README.
- "Each works on its own."
- The LocalSlip lease, port, and `pnpm ship` from the buyer README.
- The second and third copies of the ForgeTrail-record paragraph, once one page owns it.

## Protect

- "The record can be incomplete, disputed, or stale."
- The synthetic decision quote, "Use local files for initial scope," and the label that it is a scenario.
- The xFacts table column that says what each family does not do.
- CC0 for the specification and schemas, MIT for the checker.
- "Do not add a second decision log there."
- Init does not infer a purpose from the folder name and does not write a label.
