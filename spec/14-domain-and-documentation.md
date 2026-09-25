# AppLedger.dev and documentation

## Positioning

Name: AppLedger. Category: living application model. Core explanation: an open text-based record of what an application is for, how it fits together, what it does, and how it changes. ForgeTrail maintains this record as development progresses. xFacts supplies the focused declarations it references and updates.

Use concrete examples over claims of comprehensive truth or perfect memory. AppLedger is a ledger of maintained understanding and evidence, which can be incomplete, disputed, or stale.

## Site information architecture

Home: the problem, a small readable example, and the relationship to ForgeTrail/xFacts.
Standard: versioned normative specification and schemas.
Quickstart: smallest useful folder and an existing-app initialization path.
Examples: small utility, larger application, changed/retired feature, glossary rename.
ForgeTrail: native integration and migration path.
xFacts: ownership, adapter support, public/private projection rules.
Reference: record types, relationships, evidence, lifecycle, and extensions.
Conformance: supported implementations and honest limits.
Changelog: schema and behavior changes, migration notes.

Publish an `llms.txt` pointer index to canonical versioned docs. Do not put the entire specification into always-on agent context. A downloadable starter includes only files needed for a minimal ledger, not a complete empty enterprise taxonomy.

## Repository site

The AppLedger.dev site is a FilePress site, not a custom documentation generator. Use the ForgeTrail `site/` pattern: Markdown pages, `getfilepress`, Cloudflare Pages, and Wrangler. Information architecture above is the content. The engine is FilePress.

LocalSlip provides the dev-server lease `appledger-site`. LocalHelm shows that repository among the other local apps on this machine. Neither belongs in the public conformance story. The site must not claim that using AppLedger requires FilePress, LocalSlip, or LocalHelm.

## UI or viewer

A static read-only viewer is optional after the format proves useful. Initial views: orientation, goals/use cases, capability links, glossary, decisions, work/progress, and changes. Filters distinguish current vs historical, supported vs unresolved, and internal vs public scope. Viewer search must not require uploading a private ledger.

No hosted editing, accounts, subscription, or database is required for v0.1. Do not build a dashboard before the records and reconciliation workflow earn their maintenance cost.

## Documentation truthfulness

Examples are labeled synthetic unless drawn from a reviewed real project. Commands are labeled proposed until they ship. List available adapter operations explicitly. 'Automatic' must identify the host/tooling that executes it. 'Open standard' means an openly published specification here, not certification by a standards body.

The domain is user-reported as acquired. This pack does not verify DNS, provision hosting, or publish the site.
