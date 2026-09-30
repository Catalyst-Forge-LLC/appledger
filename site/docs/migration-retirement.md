---
title: Legacy tracking migration retirement
description: Current ledgers use AppLedger; older tracking recovery is retained in Git history.
---

# Legacy tracking migration retirement

The Catalyst Forge shelf has completed its AppLedger cutover. Current AppLedger no longer ships the legacy `migrate` command, its library exports, or the migration pilot. New projects use `appledger init`. Existing tracking pointers are inert; phase, decisions, and sessions live in `appledger/`. Normal transaction recovery remains supported, and the ledger format is unchanged.

This retirement covers the assessed shelf, not every folder on a workstation. Preserve any legacy project you encounter rather than overwriting its history or treating it as current state.

## Historical recovery

The migration source, tests, and pilot remain in the [AppLedger repository](https://github.com/Catalyst-Forge-LLC/appledger/tree/fb7939c0f4d811930adb9cfd4bfd0c6766638a44). Recovery for an older project requires a separate checkout of that historical revision and an isolated project copy, with a reviewed recovery plan and retained originals. Do not run the historical migration against an existing authoritative ledger: it can replace the manifest and phase profile without resolving a conflict.

Inspect the preview, validate the resulting ledger and applicable native labels, and verify the retained decisions and next steps in a fresh session before selecting resulting state as authoritative. Historical recovery is not a current compatibility guarantee.
