# ForgeTrail tracking inventory

Inspected ForgeTrail commit `96ae3630abe7e96eed475876ac52e18a9c9a2913` on 2026-09-25, before the format checker in this repository was written. This is a source list, not a migration.

## Writable tracking creators

| Path | Role |
| --- | --- |
| `scripts/install.mjs` | Copies the starter `workflow_tracking.json` into `.forgetrail/` unless `--skip-tracking` |
| `scripts/forgetrail-cli.mjs` | Exposes `--skip-tracking` |
| `mcp-server/src/index.ts` | `getInitialWorkflowTracking` returns the starter and tells the agent to write `.forgetrail/workflow_tracking.json` |
| `mcp-server/src/planIngest.ts` | Tells the agent to merge `decisions[]` into the tracking file |

## Readers and validators

| Path | Role |
| --- | --- |
| `mcp-server/src/trackingValidate.ts` | Structural validation used by `validateTracking` |
| `content/hooks/validate-tracking-core.mjs` | Same structural rules for host hooks |
| `content/hooks/validate-tracking.mjs` | Runs when `workflow_tracking.json` is edited |
| `content/hooks/session-start.mjs` | Reads tracking to inject context |
| `content/hooks/session-stop.mjs` | Reminds the agent to update tracking |
| `scripts/workspace-index.mjs` | Discovers `.forgetrail/workflow_tracking.json` or a root starter |
| `content/scripts/forgetrail-dev-launcher.mjs` | Renders a progress snapshot from tracking |

The ForgeTrail repository root `workflow_tracking.json` is the shipped starter for `getInitialWorkflowTracking`, not ForgeTrail's own project history.

## Not yet inventoried as code

Prompt and methodology markdown (`WORKFLOW.md`, `TRACKING_SCHEMA.md`, `content/FORGETRAIL_LITE.md`, continuation prompts, companion mapping) still tell agents to write the tracking file. A later FT-04 pass has to change those writers together. This repository's own `.forgetrail/workflow_tracking.json` is already a pointer, which current ForgeTrail validators will not accept as a tracking document. That is intentional until the cutover.
