---
title: Examples
description: The synthetic minimal ledger, and what a recorded change looks like.
order: 3
---

Examples here are synthetic unless a page says they came from a reviewed project.

## Small utility

[`examples/minimal`](https://github.com/Catalyst-Forge-LLC/appledger/tree/main/examples/minimal) is a fictional note workshop. The decision record `decision-local-files` chooses local files and rejects a hosted database. Its claim says the basis is declared and the brief is synthetic, not observed implementation.

`appledger orient` on that ledger includes the choice "Use local files for initial scope" and the session time `2026-09-25T19:00:00Z`, even when the task text does not mention local files.

## A larger application

This repository's own ledger is `appledger/` at the repo root. It is a product record, not a copy of `spec/`. It is not a tutorial fixture.

## Change and retirement

A change record names `change_type` (`added`, `modified`, `renamed`, `retired`, `restored`, `superseded`, or `corrected`), the affected ids, a reason, and evidence refs. Retiring work sets the work status to `cancelled` and records a change of type `retired`. The record id stays the same when a title is renamed.

## Public and private

`appledger render --view public` omits records whose visibility is not `public`. Editing a private or internal record does not change the public bytes or fingerprint. The command does not upload.

## Glossary rename

A concept record holds `definition`, `aliases`, and `scope`. Renaming the title does not change the record id. There is no separate glossary file in the minimal example.
