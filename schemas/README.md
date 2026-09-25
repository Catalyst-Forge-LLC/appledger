# Schemas

| File | What it checks |
| --- | --- |
| `manifest.schema.json` | Ledger manifest, including `0.1.x` versions and portable relative roots |
| `record-envelope.schema.json` | Common record envelope and claim scope keys |
| `record-kinds.schema.json` | Envelope plus `data` for every v0.1 kind |
| `profile-forgetrail.schema.json` | ForgeTrail workflow profile |
| `policy.schema.json` | Optional `policy.yaml` |

These schemas ship with tooling. Validation does not fetch them from the network.

## Still outside JSON Schema

A full validator must also check:

- Predicate source and target pairs from the records document
- `current_phase_instance` matches a `phase_instances` id
- Internal ids are unique and relations resolve
- `supersedes` is acyclic
- Binding ids exist before an external target is treated as resolved
- Source paths stay inside the named repository
- Evidence digests, transaction recovery, and public-projection byte stability

Passing the envelope alone is not writer conformance. Passing the kind schema is not curator conformance.
