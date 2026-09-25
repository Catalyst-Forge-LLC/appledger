# Pack validation

Checked on 2026-09-25 after the implementation-readiness pass.

- All five JSON Schemas pass Draft 2020-12 schema checks.
- The synthetic manifest validates. `root: .` is accepted. A `../` root is rejected.
- The ForgeTrail profile validates, and `current_phase_instance` matches a phase instance id.
- The policy sample validates.
- All ten minimal-ledger records and the standalone capability pointer validate against the kind schema, including `format_version` `0.1.1` as a compatible patch.
- A `record_status` outside the enum is rejected.
- Internal relations in the minimal ledger resolve, ids are unique, and each predicate is allowed for its source and target kinds.
- Relative Markdown links in the pack resolve.
- This directory is the pack. `MANIFEST.sha256` covers the files below the manifest itself. No zip is part of this folder.

Scope: these checks cover the specification package, the starter schemas, and the illustrative records. They do not execute the acceptance suite against an AppLedger implementation, validate live ForgeTrail or xFacts repositories, or resolve the illustrative FeatureFacts binding to a native register. No application implementation was created.
