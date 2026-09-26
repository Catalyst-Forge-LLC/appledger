/**
 * PILOT-01 runner. Copies an existing app's tracking file into a temp directory.
 * Does not write into that application.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parse, stringify } from "yaml";
import { checkLedger } from "../dist/check.js";
import { applyMigration, previewMigration } from "../dist/migrate.js";
import { projectLedger } from "../dist/project.js";
import { applyTransaction, listTransactions, rollbackTransaction, stageTransaction } from "../dist/transaction.js";
import { orientLedger } from "../dist/views.js";

const appledgerRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(appledgerRoot, "..", "filepress");
const trackingSource = join(sourceRoot, ".forgetrail", "workflow_tracking.json");
const ideasSource = join(sourceRoot, ".forgetrail", "IDEAS.md");

function elapsed(start) {
  return Math.round(performance.now() - start);
}

function countFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).length : 0;
}

function countListItems(path) {
  if (!existsSync(path)) return { exists: false, items: 0 };
  const items = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^-\s+/.test(line.trim())).length;
  return { exists: true, items };
}

function recordText(fields, body) {
  return `---\n${stringify(fields).trim()}\n---\n\n${body}\n`;
}

function envelope(id, kind, title, visibility, data) {
  return {
    format_version: "0.1.0",
    id,
    kind,
    title,
    record_status: "active",
    created_at: "2026-09-26T21:10:00Z",
    updated_at: "2026-09-26T21:10:00Z",
    recorded_by: { id: "pilot-01", type: "tool" },
    visibility,
    relations: [],
    claims: [],
    data,
  };
}

const home = mkdtempSync(join(tmpdir(), "appledger-pilot-"));
mkdirSync(join(home, ".forgetrail"), { recursive: true });
cpSync(trackingSource, join(home, ".forgetrail", "workflow_tracking.json"));
const trackingText = readFileSync(trackingSource, "utf8");
const tracking = JSON.parse(trackingText);

const previewStart = performance.now();
const preview = previewMigration(home);
const previewMs = elapsed(previewStart);
const applyStart = performance.now();
const applied = applyMigration(home);
const applyMs = elapsed(applyStart);
const checked = checkLedger(join(home, "appledger"));
const profile = parse(readFileSync(join(home, "appledger", "profiles", "forgetrail.yaml"), "utf8"));
const current = profile.phase_instances.find((item) => item.id === profile.current_phase_instance);

const orientStart = performance.now();
const orientation = orientLedger({ root: home, task: "Where is this project and what is next?" });
const orientMs = elapsed(orientStart);

const featureId = "work-pilot-reading-time";
const featurePath = `appledger/records/work/${featureId}.md`;
const featureBytes = Buffer.from(
  recordText(
    envelope(featureId, "work", "Reading time", "public", {
      status: "proposed",
      intake: "task",
      objective: "Show a reading time on each post.",
      acceptance_criteria: [{ id: "crit-reading-time", text: "A post page shows a reading time.", status: "pending" }],
      verification_refs: [],
    }),
    "Pilot feature addition. No product code was changed.",
  ),
);
const featureStaged = stageTransaction(home, { id: "pilot-feature", files: [{ path: featurePath, bytes: featureBytes }] });
const featureApplied = applyTransaction(home, "pilot-feature");

const decisionDir = join(home, "appledger", "records", "decision");
const renamed = readdirSync(decisionDir)[0];
const renamedPath = `appledger/records/decision/${renamed}`;
const renamedOriginal = readFileSync(join(home, renamedPath), "utf8");
const renamedDoc = parse(renamedOriginal.split("---")[1]);
const originalTitle = renamedDoc.title;
renamedDoc.title = `${originalTitle} (pilot rename)`;
renamedDoc.updated_at = "2026-09-26T21:10:00Z";
const renameBody = renamedOriginal.split("---").slice(2).join("---").trim();
const renameStaged = stageTransaction(home, {
  id: "pilot-rename",
  files: [{ path: renamedPath, bytes: Buffer.from(recordText(renamedDoc, `${renameBody}\n`)) }],
});
const renameApplied = applyTransaction(home, "pilot-rename");

const retiredText = readFileSync(join(home, featurePath), "utf8");
const retiredDoc = parse(retiredText.split("---")[1]);
retiredDoc.data.status = "cancelled";
retiredDoc.updated_at = "2026-09-26T21:10:00Z";
const changeId = "change-pilot-retire-reading-time";
const changePath = `appledger/records/change/${changeId}.md`;
const retireStaged = stageTransaction(home, {
  id: "pilot-retire",
  files: [
    {
      path: featurePath,
      bytes: Buffer.from(recordText(retiredDoc, "Retired during the pilot. The product was not edited.\n")),
    },
    {
      path: changePath,
      bytes: Buffer.from(
        recordText(
          envelope(changeId, "change", "Retire reading time", "public", {
            change_type: "retired",
            affected_ids: [featureId],
            reason: "The pilot retires the proposed reading-time work without shipping it.",
            evidence_refs: [],
            operation: "edit",
          }),
          "Retirement record for the pilot feature.\n",
        ),
      ),
    },
  ],
});
const retireApplied = applyTransaction(home, "pilot-retire");

const privateId = "work-pilot-private-note";
const privatePath = `appledger/records/work/${privateId}.md`;
const privateRecord = envelope(privateId, "work", "Private pilot note", "internal", {
  status: "proposed",
  intake: "task",
  objective: "A private note that must not change the public projection.",
  acceptance_criteria: [{ id: "crit-private", text: "The public view omits this note.", status: "pending" }],
  verification_refs: [],
});
const privateStaged = stageTransaction(home, {
  id: "pilot-private",
  files: [{ path: privatePath, bytes: Buffer.from(recordText(privateRecord, "Secret contact: pilot-only@example.invalid\n")) }],
});
const privateApplied = applyTransaction(home, "pilot-private");
const publicBefore = projectLedger(join(home, "appledger"));
privateRecord.updated_at = "2026-09-26T21:11:00Z";
const privateEditApplied = applyTransaction(
  home,
  stageTransaction(home, {
    id: "pilot-private-edit",
    files: [{ path: privatePath, bytes: Buffer.from(recordText(privateRecord, "Secret contact changed: other-pilot@example.invalid\n")) }],
  }).id,
);
const publicAfter = projectLedger(join(home, "appledger"));

const interruptPath = "appledger/records/session/session-pilot-interrupted.md";
const interruptStaged = stageTransaction(home, {
  id: "pilot-interrupt",
  files: [
    {
      path: interruptPath,
      bytes: Buffer.from(
        recordText(
          envelope("session-pilot-interrupted", "session", "Interrupted pilot session", "public", {
            session_id: "session-pilot-interrupted",
            accomplished: ["Started a write that was interrupted."],
            left_off: "The transaction stopped before completion.",
            next_steps: ["Roll the incomplete transaction back."],
          }),
          "This session should not remain after rollback.\n",
        ),
      ),
    },
  ],
});
const interruptStopped = applyTransaction(home, "pilot-interrupt", { failAfterApplied: 1 });
const pendingDuring = listTransactions(home).filter((item) => item.status !== "complete");
const interruptRolled = rollbackTransaction(home, "pilot-interrupt");

const freshPointer = JSON.parse(readFileSync(join(appledgerRoot, ".forgetrail", "workflow_tracking.json"), "utf8"));
const freshOrientStart = performance.now();
const freshOrientation = orientLedger({ root: appledgerRoot, task: "Where did this project leave off?" });
const freshOrientMs = elapsed(freshOrientStart);
const freshCheck = checkLedger(join(appledgerRoot, "appledger"));

const report = {
  source: {
    name: tracking.project?.name ?? "",
    trackingBytes: Buffer.byteLength(trackingText),
    currentPhase: tracking.currentPhase,
    decisions: Array.isArray(tracking.decisions) ? tracking.decisions.length : 0,
    sessions: Array.isArray(tracking.sessions) ? tracking.sessions.length : 0,
    gotchas: Array.isArray(tracking.gotchas) ? tracking.gotchas.length : 0,
    ideasAtForgetrail: countListItems(ideasSource),
    ideasAtRoot: countListItems(join(sourceRoot, "IDEAS.md")),
    bugsAtRoot: countListItems(join(sourceRoot, "BUGS.md")),
  },
  migration: {
    previewMs,
    previewRole: preview.role,
    previewPhase: preview.profilePhase,
    previewUnmapped: preview.unmapped,
    applyMs,
    applyOk: applied.ok,
    applyMessage: applied.message,
    checkOk: checked.ok,
    checkErrors: checked.findings.filter((item) => item.severity === "error").map((item) => item.message),
    profilePhase: current?.phase,
    profileStatus: current?.status,
    projectStatus: profile.project_status,
    decisionRecords: countFiles(decisionDir),
    sessionRecords: countFiles(join(home, "appledger", "records", "session")),
    lessonRecords: countFiles(join(home, "appledger", "records", "lesson")),
    questionRecords: countFiles(join(home, "appledger", "records", "question")),
    orientMs,
    orientBytes: Buffer.byteLength(orientation),
    orientWords: orientation.split(/\s+/).filter(Boolean).length,
  },
  changes: {
    feature: { staged: featureStaged.status, applied: featureApplied.ok, message: featureApplied.message },
    rename: {
      staged: renameStaged.status,
      applied: renameApplied.ok,
      message: renameApplied.message,
      idUnchanged: existsSync(join(home, renamedPath)),
      from: originalTitle,
    },
    retire: { staged: retireStaged.status, applied: retireApplied.ok, message: retireApplied.message },
    private: {
      staged: privateStaged.status,
      applied: privateApplied.ok,
      edit: privateEditApplied.ok,
      publicBytesUnchanged: publicBefore.fingerprint === publicAfter.fingerprint,
      publicOmitsSecret:
        !publicBefore.markdown.includes("pilot-only@example.invalid") && !publicAfter.markdown.includes("other-pilot@example.invalid"),
    },
    interrupt: {
      staged: interruptStaged.status,
      stopped: interruptStopped.status,
      pending: pendingDuring.map((item) => `${item.status} ${item.id}`),
      rolledBack: interruptRolled.ok,
      fileRemains: existsSync(join(home, interruptPath)),
    },
    refactor: {
      sourceBindingsImported: 0,
      note: "Imported decisions have no source locators, so a file-path refactor has nothing to repair.",
    },
  },
  fresh: {
    pointerStatus: freshPointer.status,
    pointerRecord: freshPointer.record,
    pointerHasDecisions: Object.hasOwn(freshPointer, "decisions"),
    siteExists: existsSync(join(appledgerRoot, "site")),
    checkOk: freshCheck.ok,
    orientMs: freshOrientMs,
    orientBytes: Buffer.byteLength(freshOrientation),
    orientWords: freshOrientation.split(/\s+/).filter(Boolean).length,
  },
};

const outDir = join(appledgerRoot, "docs", "pilot-01");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "existing-orientation.md"), orientation);
writeFileSync(join(outDir, "fresh-orientation.md"), freshOrientation);
writeFileSync(join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
rmSync(home, { recursive: true, force: true });
