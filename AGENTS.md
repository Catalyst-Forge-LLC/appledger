# AppLedger repository

This repository implements the AppLedger specification. It is not the ForgeTrail methodology repo.

Start with `appledger/README.md` (project record) and `spec/README.md` (format). The curation skill is [`skills/appledger/SKILL.md`](skills/appledger/SKILL.md). It follows `spec/05-curation-protocol.md` and the command status table in `spec/10-tooling-and-automation.md`. A fresh session runs check and orient, and it says which commands were not run.

`.forgetrail/workflow_tracking.json` only points at the ledger. Do not record decisions, sessions, or phase status there.

The npm package `appledger` must not depend on `forgetrail`. Do not publish. The user publishes, and `0.0.0` is already spent on the name hold.

FilePress, LocalSlip, and LocalHelm are how this workstation runs the site. They are not required to read a ledger.
