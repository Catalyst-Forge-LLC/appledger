---
app_facts_version: 0.1.0
name: AppLedger
version: 0.1.6
type: spec / tooling
status: active
license: MIT
homepage: https://appledger.dev
repository: https://github.com/Catalyst-Forge-LLC/appledger
stack:
  language: TypeScript
  runtime: Node.js
  tooling: pnpm
key_dependencies:
  - name: ajv
    purpose: Validate ledger records and pinned label schemas
    registry: npm
  - name: yaml
    purpose: Read and write ledger YAML
    registry: npm
build:
  package_manager: pnpm
  test: vitest
  compile: tsc
generated:
  date: 2026-09-29
  generator: hand-authored
credits:
  generated_with: https://appfacts.dev
  built_by: "Catalyst Forge - https://www.catalystforge.com/"
---

# AppLedger

`spec / tooling` · **active** · MIT

Open text record of what an application is for, how it fits together, what it does, and how it changes. The specification and schemas are CC0. This label's license is the checker's MIT license.

[Repository](https://github.com/Catalyst-Forge-LLC/appledger) · [Site](https://appledger.dev)

### Stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Runtime | Node.js |
| Tooling | pnpm |

### Key dependencies

- `ajv` (npm) — validate ledger records and pinned label schemas
- `yaml` (npm) — read and write ledger YAML

### Build

- **Package manager** — pnpm
- **Test** — vitest
- **Compile** — tsc

---
*Hand-authored · [AppFacts](https://appfacts.dev) · [Catalyst Forge](https://www.catalystforge.com/)*
