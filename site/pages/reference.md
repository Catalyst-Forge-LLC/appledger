---
title: Reference
description: Record kinds in AppLedger format 0.1.0.
order: 6
---

Each record is Markdown with YAML front matter. The envelope carries `format_version`, `id`, `kind`, `title`, `record_status`, timestamps, `recorded_by`, `visibility`, `relations`, and `claims`. The body is Markdown. Dates are strings. The normative fields are in [`schemas/record-kinds.schema.json`](https://github.com/Catalyst-Forge-LLC/appledger/blob/main/schemas/record-kinds.schema.json).

| Kind | What it holds |
| --- | --- |
| application | Name, purpose, and status of the application |
| goal | Outcome, and whether it is unmeasured |
| stakeholder | Role, interests, and responsibilities |
| use_case | Actor, trigger, intended outcome, and flow |
| concept | Definition, aliases, and scope |
| component | Responsibility, boundaries, source locators, and interfaces |
| decision | Status, choice, rationale, alternatives, and authority |
| constraint | A limit the project accepted |
| question | Issue, status (`open`, `answered`, or `deferred`), and affected ids |
| work | Status, objective, acceptance criteria, and verification refs |
| session | Accomplished work, left off, and next steps |
| lesson | Context, problem, resolution, limits, and generalization status |
| change | Change type, affected ids, reason, and evidence refs |
| evidence | Kind, repository, result, source, and limitations |
| capability_ref | A link to an external capability, including a derived cached title |

Visibility `internal` is omitted from the public view. Relations are typed links between record ids. A claim names a statement, a basis, a status, and evidence refs. An unsupported claim is not the same thing as a missing file.

Work status may stay `in_progress` after an acceptance criterion is `met`. The criterion status is the acceptance fact. The work status is separate.
