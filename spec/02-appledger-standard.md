# AppLedger standard v0.1

## Format and layout

An AppLedger is a directory named `appledger/` at the application repository root. A tool may accept another explicit root. Discovery MUST NOT scan parent directories indefinitely or adopt a neighboring ledger silently.

| Path | Content |
| --- | --- |
| `manifest.yaml` | Format version, ledger/application identity, repositories, bindings, profiles |
| `README.md` | Short orientation and reading paths, generated from records |
| `records/<kind>/<id>.md` | Canonical Markdown records with YAML front matter |
| `profiles/forgetrail.yaml` | ForgeTrail profile version and project-specific workflow state |
| `policy.yaml` | Explicit curation, publication, and validation policy |
| `views/` | Optional generated progress, context, and history summaries |
| `migrations/` | Migration reports and legacy source mapping |

Rebuildable indexes, transaction staging, locks, and caches live under `.appledger-cache/`, ignored by Git. They MUST NOT be required to understand committed records. Source evidence and xFacts registers can remain outside `appledger/` and are addressed through declared bindings.

Do not create empty category directories merely to imply completeness. A minimal ledger needs a manifest, an application record, and a readable entry point. ForgeTrail additionally needs its workflow profile and a work/session record as work begins.

## Serialization contract

Files MUST be UTF-8. Generated files use LF endings and end with one newline. YAML is restricted to JSON-compatible scalar, array, and object values. Reject duplicate mapping keys, custom tags, aliases, and merge keys. Dates and IDs are strings, quoted in examples. Do not rely on implicit timestamp coercion. Front matter begins at the first line with `---` and ends at the next standalone `---`. The body is CommonMark-compatible Markdown.

Portable writers SHOULD preserve unrelated prose and key ordering. They MUST NOT repeatedly reformat the entire ledger. Machine-required relationships belong in front matter. Prose links improve readability but are not the only representation of relationships.

## Manifest contract

Required: `format: appledger`, `format_version` matching `0.1.x`, `ledger_id`, `application_id`, `repositories`, `record_roots`, and `bindings`. IDs are opaque stable strings. `application_id` resolves to an application record. Each repository has an ID and either a local root or a canonical URL. An absent remote URL is valid.

The home repository is the directory that contains `appledger/`. In `repositories`, `root: .` means that home repository. It does not mean the `appledger/` directory itself. Evidence paths and binding paths are relative to the repository they name, using POSIX separators. `BRIEF.md` next to `appledger/` is `BRIEF.md` when `root` is `.`.

A committed local root MUST be `.` or a relative path with no `..` segment, no leading slash, and no drive letter. Identify any other repository by `url`. Tool configuration may map that URL to a local checkout. Do not commit machine-specific absolute paths or `../` checkout layouts.

Bindings identify specialized sources by `id`, `family`, `subject_id`, `repository_id`, `path`, and `schema_version` when known. Binding path is relative to its repository. A binding may name a register or label. Distinct subjects get distinct bindings, even if they share a repository.

Optional `profiles` declares namespaced profiles and their versions and paths. Generic readers MUST preserve unknown profiles and MAY report them unsupported. They MUST NOT interpret unknown fields as approved or false.

## Versioning

Format, profile, adapter, xFacts schema, and application versions are separate. Record front matter carries the format version. Any incompatible change during the 0.x period increments the minor version and provides an explicit migration. Patch versions preserve compatibility. A 0.1 reader MUST accept `format_version` `0.1.x` and MUST reject any other minor version. Readers fail safely on unsupported versions and remain able to display raw text. The starter JSON Schemas use the same `0.1.x` pattern.

The reference schemas ship with tooling. Validation MUST NOT require fetching schemas from the network. Extension fields belong under `extensions`, keyed by a documented namespace. Arbitrary extensions cannot override core meanings.

## Identity and scope

A ledger identifies an application independently of a repository name, URL, or folder. Records retain their IDs across renames and moves. Tool-generated IDs should use a short kind prefix plus a random UUID component. The concise fixture IDs are synthetic. Do not derive identity solely from a title, path, or line number.

Applications spanning repositories list their scope explicitly. A scan result MUST state which repositories and surfaces it examined. Unavailable repositories are unresolved scope, never evidence of absent functionality.

## Conformance levels

Reader: understands discovery, supported version, envelope, and references.
Writer: additionally preserves identity, sources, history, unknown extensions, and ownership.
Validator: checks schema, relationship semantics, bindings, lifecycle consistency, and declared source integrity.
Curator: follows the evidence and reconciliation protocol.
ForgeTrail implementation: additionally follows the workflow profile and migration requirements.

No conformance level proves all claims true. No conformance claim implies enforcement of application security restrictions.
