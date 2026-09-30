# Retired ForgeTrail tracking migration

The assessed Catalyst Forge shelf has completed the AppLedger cutover. The current CLI and library no longer ship legacy tracking migration. `appledger/` is the authoritative record; existing tracking pointers are inert. New projects use `appledger init`.

The migration implementation, its pilot, tests, and original procedure are retained in Git history at AppLedger commit `fb7939c0f4d811930adb9cfd4bfd0c6766638a44`. Recovery for an older project must use a separate checkout of that historical revision and an isolated copy of that project, with a reviewed recovery plan. Do not run old migration against an existing authoritative ledger. See [retirement evidence](../docs/migration-retirement.md).

This retirement covers the shelf, not every folder on the workstation. It does not change the ledger format or remove normal transaction recovery.
