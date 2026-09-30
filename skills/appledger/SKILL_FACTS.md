---
skill_facts_version: "0.1.0"
name: AppLedger
developer: Catalyst Forge
version: "0.1.7"
status: active
license: MIT
kind: agents-skill
purpose: "Curate an AppLedger text ledger: check, orient, and hand off records in appledger/ without requiring ForgeTrail phases"
homepage: https://appledger.dev
repository: https://github.com/Catalyst-Forge-LLC/appledger
provenance:
  source: https://github.com/Catalyst-Forge-LLC/appledger/blob/main/skills/appledger/SKILL.md
  publisher: Catalyst Forge
instructions_reach:
  shell: explicit
  network: none
  filesystem: read-write
tools_referenced:
  - appledger check
  - appledger orient
  - appledger render
  - appledger transaction
  - appledger subjects
  - appledger bind
  - appledger init
  - appledger reconcile
  - appledger diff
bundled_artifacts: []
egress:
  telemetry: none
  destinations: []
generated:
  date: 2026-09-29
  generator: hand-authored
credits:
  generated_with: https://skillfacts.dev
  built_by: "Catalyst Forge - https://www.catalystforge.com/"
---

# Skill Facts - AppLedger

| | |
|---|---|
| **Developer** | Catalyst Forge |
| **Version** | 0.1.7 |
| **Status** | active |
| **License** | MIT |
| **Kind** | agents-skill |

*Curation skill for an `appledger/` ledger. It runs the AppLedger CLI and writes records. It does not call a network.*

## Purpose

Curate an AppLedger text ledger: check, orient, and hand off records in appledger/ without requiring ForgeTrail phases

## Provenance

| | |
|---|---|
| Source | https://github.com/Catalyst-Forge-LLC/appledger/blob/main/skills/appledger/SKILL.md |
| Publisher | Catalyst Forge |

## Instructions reach

| | |
|---|---|
| Shell | explicit |
| Network | none |
| Filesystem | read-write |

## Tools referenced

- appledger check
- appledger orient
- appledger render
- appledger transaction
- appledger subjects
- appledger bind
- appledger init
- appledger reconcile
- appledger diff

## Egress

| | |
|---|---|
| Telemetry | none |
| Destinations | none declared |

A validator checks this file's shape. It does not decide that the skill does what it says.
