# Legacy tracking migration retirement

The assessed Catalyst Forge shelf has completed the AppLedger cutover. Current AppLedger no longer ships the legacy `migrate` command, migration library exports, or the migration pilot. Normal transaction status, resume, and rollback remain supported. The ledger format is unchanged.

The 2026-09-30 read-only inventory found that every legacy tracking file on the shelf was an inert pointer to an existing `appledger/manifest.yaml`. ForgeTrail's root tracking file was an empty-name shipped starter, not project history. Current ForgeTrail installs already omit writable tracking; hooks and MCP guidance read `appledger/`.

Four writable legacy examples were found outside the assessed shelf: `test-project`, `sandbox/x-tools`, `auto-magic-money-maker`, and `groundwork`. They were preserved. This inventory establishes completion for the shelf, not the whole workspace.

## Historical recovery

The migration source, tests, and pilot remain in Git history at AppLedger commit `fb7939c0f4d811930adb9cfd4bfd0c6766638a44`. An older project requiring recovery should use a separate checkout of that revision and an isolated copy of the project, with a reviewed plan and retained originals. Do not run that historical migration against an existing authoritative ledger: its implementation can replace the manifest and profile without resolving conflicting authority.

Inspect the preview, validate the resulting ledger and relevant native labels, and verify decisions and next steps in a fresh session before choosing any resulting state as authoritative. Historical recovery is a scoped operation, not a current compatibility guarantee. No legacy synchronization or dual writer is retained.

Historical ledger evidence still names `tests/migrate.test.ts`. Current `appledger check` consequently reports a missing-source warning for that evidence; the historical result is preserved rather than relabeled as a current test run. The retired source can be inspected at the revision above.
