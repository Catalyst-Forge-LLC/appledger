# ForgeTrail tracking inventory

Refreshed against ForgeTrail commit `5ddaf9dce2ac34729dd49a7e88937bfe85e03a9b` on 2026-09-26. The cutover that changes this set landed in ForgeTrail commit `70642fc` on 2026-09-26. New installs do not write `workflow_tracking.json`. `getInitialWorkflowTracking` initializes `appledger/` and does not return starter JSON. `validateTracking` and the session hooks treat a legacy file as a conflict. AppLedger still does not modify the ForgeTrail tree from this package.

The earlier inventory was commit `96ae3630abe7e96eed475876ac52e18a9c9a2913`. The code writers below are the same set. The instruction files are now listed with them.

## Change together

These create the tracking file, tell an agent to write it, or reject anything that is not the old document. A cutover that changes only the code leaves the instructions creating the old file.

| Path | Role |
| --- | --- |
| `scripts/install.mjs` | Copies the starter into `.forgetrail/` unless `--skip-tracking` |
| `scripts/forgetrail-cli.mjs` | Exposes `--skip-tracking` |
| `mcp-server/src/index.ts` | `getInitialWorkflowTracking` returns the starter and tells the agent to write `.forgetrail/workflow_tracking.json` |
| `mcp-server/src/planIngest.ts` | Tells the agent to merge `decisions[]` into the tracking file |
| `mcp-server/src/trackingValidate.ts` | Structural validation used by `validateTracking` |
| `content/hooks/validate-tracking-core.mjs` | Same structural rules for host hooks |
| `content/hooks/validate-tracking.mjs` | Runs when `workflow_tracking.json` is edited |
| `content/hooks/session-start.mjs` | Reads tracking to inject context |
| `content/hooks/session-stop.mjs` | Reminds the agent to update tracking |
| `workflow_tracking.json` | Shipped starter for `getInitialWorkflowTracking`. Not ForgeTrail's project history |
| `TRACKING_SCHEMA.md` | Tells agents how to read and update the file |
| `WORKFLOW.md` | Phase procedure that updates the file |
| `content/FORGETRAIL_LITE.md` | Lite shape and the instruction to keep `currentPhase` in the file |
| `INITIAL_PROMPT.md` | New-project kickoff |
| `CONTINUATION_PROMPT.md` | Resume instruction |
| `content/NEW_PROJECT_BOOTSTRAP.md` | Bootstrap instruction |
| `content/KICKOFF_WITHOUT_MCP.md` | Kickoff without MCP |
| `content/POST_BOOTSTRAP_USER_MESSAGE.md` | Post-bootstrap instruction |
| `content/GREENFIELD_INTAKE.md` | Greenfield intake |
| `content/SESSION_RESUME_MCP.md` | Resume instruction |
| `content/skills/forgetrail/SKILL.md` | Skill instruction |
| `content/AGENT_INTEGRATION_cursor.md` | Host integration instruction |
| `content/AGENT_INTEGRATION_claude.md` | Host integration instruction |
| `content/AGENT_INTEGRATION_generic.md` | Host integration instruction |
| `content/AGENT_INTEGRATION_grok.md` | Host integration instruction |
| `TRY_FORGETRAIL.md` | Try-it instruction |

## Readers

| Path | Role |
| --- | --- |
| `scripts/workspace-index.mjs` | Discovers `.forgetrail/workflow_tracking.json` or a root starter |
| `content/scripts/forgetrail-dev-launcher.mjs` | Renders a progress snapshot from either tracking shape |

## Mentions that are not the cutover set

Site pages, the update log, completed specs, and the AppLedger pack copies name the file. They are not the writers above. Public docs that still tell a person to maintain the file have to be updated when the site is published, after pilots, not in this inventory pass.

This repository's own `.forgetrail/workflow_tracking.json` is a pointer. After the cutover, `validateTracking` accepts that pointer and does not treat it as a decision log.
