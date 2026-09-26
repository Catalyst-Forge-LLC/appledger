import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stringify } from "yaml";
import { checkLedger } from "./check.js";
import { sha256Hex } from "./digest.js";
import { mapPhaseKey, type ProfilePhase } from "./phases.js";
import { applyTransaction, rollbackTransaction, stageTransaction } from "./transaction.js";
import { isInside } from "./sources.js";

const POINTER = {
  record: "appledger/",
  status: "pointer",
  note: "Decisions, sessions, and phase status live in appledger/. Do not write them here. This pointer exists until ForgeTrail stops emitting workflow_tracking.json.",
};

const KNOWN_ROOT = new Set(["project", "currentPhase", "phases", "decisions", "gotchas", "sessions", "schemaVersion", "companionOutcomes"]);
const PLACEHOLDER = "1970-01-01T00:00:00Z";

export type MigrationRole = "lite" | "full" | "starter" | "pointer" | "unrecognized";

export type MigrationPreview = {
  role: MigrationRole;
  sourceDigest: string;
  profilePhase: ProfilePhase | undefined;
  projectStatus: "active" | "wrapped";
  unmapped: string[];
  records: string[];
  message: string;
};

export type MigrationResult = {
  ok: boolean;
  action: "preview" | "apply" | "rollback";
  id: string;
  message: string;
  preview?: MigrationPreview;
};

type Planned = { path: string; text: string };

export function previewMigration(home: string): MigrationPreview {
  const loaded = readTracking(home);
  if (!loaded.ok) {
    return {
      role: "unrecognized",
      sourceDigest: "",
      profilePhase: undefined,
      projectStatus: "active",
      unmapped: [],
      records: [],
      message: loaded.message,
    };
  }
  return buildPlan(home, loaded.value, loaded.digest).preview;
}

export function applyMigration(home: string): MigrationResult {
  const root = resolve(home);
  const loaded = readTracking(root);
  if (!loaded.ok) return { ok: false, action: "apply", id: "", message: loaded.message };
  const plan = buildPlan(root, loaded.value, loaded.digest);
  if (plan.preview.role === "pointer" || plan.preview.role === "starter") {
    return { ok: true, action: "apply", id: "", message: plan.preview.message, preview: plan.preview };
  }
  if (plan.preview.role === "unrecognized") {
    return { ok: false, action: "apply", id: "", message: plan.preview.message, preview: plan.preview };
  }
  const overlay = join(root, ".appledger-cache", "migration-preview");
  rmSync(overlay, { recursive: true, force: true });
  mkdirSync(overlay, { recursive: true });
  for (const file of plan.files) {
    const absolute = resolve(overlay, file.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.text);
  }
  const checked = checkLedger(overlay);
  rmSync(overlay, { recursive: true, force: true });
  const errors = checked.findings.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      action: "apply",
      id: plan.id,
      message: errors.map((item) => `${item.path}: ${item.message}`).join(" "),
      preview: plan.preview,
    };
  }
  const before = new Map<string, string | null>();
  for (const file of plan.files) {
    const absolute = resolve(root, file.path);
    before.set(file.path, existsSync(absolute) ? readFileSync(absolute, "utf8") : null);
  }
  const staged = stageTransaction(root, {
    id: plan.id,
    files: plan.files.map((file) => ({ path: file.path, bytes: Buffer.from(file.text, "utf8") })),
  });
  if (!staged.ok) return { ok: false, action: "apply", id: plan.id, message: staged.message, preview: plan.preview };
  const applied = applyTransaction(root, plan.id);
  if (!applied.ok) return { ok: false, action: "apply", id: plan.id, message: applied.message, preview: plan.preview };
  writeSnapshot(root, plan.id, before, plan.files);
  return { ok: true, action: "apply", id: plan.id, message: "Applied. The tracking file is now a pointer.", preview: plan.preview };
}

export function rollbackMigration(home: string, id: string): MigrationResult {
  const root = resolve(home);
  const journal = rollbackTransaction(root, id);
  if (journal.ok || journal.status === "rolled_back") {
    return { ok: true, action: "rollback", id, message: journal.message };
  }
  const snapshot = readSnapshot(root, id);
  if (!snapshot) return { ok: false, action: "rollback", id, message: journal.message };
  const drifted: string[] = [];
  for (const file of snapshot.files) {
    const absolute = resolve(root, file.path);
    if (!isInside(root, absolute)) return { ok: false, action: "rollback", id, message: `Refusing ${file.path}.` };
    const current = existsSync(absolute) ? sha256Hex(Buffer.from(readFileSync(absolute))) : null;
    if (current !== file.afterSha256) drifted.push(file.path);
  }
  if (drifted.length > 0) {
    return {
      ok: false,
      action: "rollback",
      id,
      message: `Refusing rollback. Later edits were not overwritten: ${drifted.join(", ")}.`,
    };
  }
  for (const file of snapshot.files) {
    const absolute = resolve(root, file.path);
    if (file.before === null) rmSync(absolute, { force: true });
    else writeFileSync(absolute, file.before);
  }
  rmSync(snapshotDir(root, id), { recursive: true, force: true });
  return { ok: true, action: "rollback", id, message: "Restored the files this migration changed." };
}

function buildPlan(home: string, value: Record<string, unknown>, digest: string): { id: string; preview: MigrationPreview; files: Planned[] } {
  if (isPointer(value)) {
    return {
      id: "",
      files: [],
      preview: {
        role: "pointer",
        sourceDigest: digest,
        profilePhase: undefined,
        projectStatus: "active",
        unmapped: [],
        records: [],
        message: "The tracking file is already a pointer. No records were imported.",
      },
    };
  }
  const lite = value.schemaVersion === "lite-1";
  const full = typeof value.currentPhase === "string" && value.currentPhase.includes("-");
  if (!lite && !full) {
    return {
      id: "",
      files: [],
      preview: {
        role: "unrecognized",
        sourceDigest: digest,
        profilePhase: undefined,
        projectStatus: "active",
        unmapped: Object.keys(value),
        records: [],
        message: "The tracking file is neither Lite nor full ForgeTrail tracking.",
      },
    };
  }
  if (isStarter(value)) {
    return {
      id: "",
      files: [],
      preview: {
        role: "starter",
        sourceDigest: digest,
        profilePhase: mapPhaseKey(String(value.currentPhase ?? "")) ,
        projectStatus: "active",
        unmapped: unmappedKeys(value),
        records: [],
        message: "This file is a shipped starter, not project history. No records were imported.",
      },
    };
  }
  const profilePhase = mapPhaseKey(String(value.currentPhase ?? ""));
  if (!profilePhase) {
    return {
      id: "",
      files: [],
      preview: {
        role: "unrecognized",
        sourceDigest: digest,
        profilePhase: undefined,
        projectStatus: "active",
        unmapped: unmappedKeys(value),
        records: [],
        message: `Current phase ${String(value.currentPhase)} has no profile mapping.`,
      },
    };
  }
  const project = mapping(value.project);
  const projectStatus = project.status === "wrapped" ? "wrapped" : "active";
  const id = `migrate-${digest.slice(0, 12)}`;
  const files = renderLedger(home, value, digest, profilePhase, projectStatus);
  return {
    id,
    files,
    preview: {
      role: lite ? "lite" : "full",
      sourceDigest: digest,
      profilePhase,
      projectStatus,
      unmapped: unmappedKeys(value),
      records: files.filter((file) => file.path.includes("/records/")).map((file) => file.path),
      message: "Preview only. No files were written.",
    },
  };
}

function renderLedger(
  home: string,
  value: Record<string, unknown>,
  digest: string,
  current: ProfilePhase,
  projectStatus: "active" | "wrapped",
): Planned[] {
  const project = mapping(value.project);
  const name = stringField(project.name) || "Imported project";
  const appId = stableId("app", name);
  const ledgerId = stableId("ledger", digest);
  const phases = mapping(value.phases);
  const instances = Object.keys(phases)
    .map((key) => phaseInstance(key, mapping(phases[key])))
    .filter((item): item is PhaseInstance => item !== undefined);
  const currentInstance = instances.find((item) => item.phase === current)?.id ?? instances[0]?.id ?? stableId("phase", current);
  const when = firstDate(value) ?? { at: PLACEHOLDER, placeholder: true };
  const files: Planned[] = [];
  files.push({
    path: "appledger/manifest.yaml",
    text: stringify({
      format: "appledger",
      format_version: "0.1.0",
      ledger_id: ledgerId,
      application_id: appId,
      repositories: [{ id: "repo-home", root: "." }],
      record_roots: ["records"],
      bindings: [],
      profiles: [{ id: "forgetrail", version: "0.1.0", path: "profiles/forgetrail.yaml" }],
    }),
  });
  files.push({
    path: "appledger/profiles/forgetrail.yaml",
    text: stringify({
      profile: "forgetrail",
      profile_version: "0.1.0",
      archetype: project.archetype === "internal-tool" || project.archetype === "one-shot" ? project.archetype : "product",
      project_status: projectStatus,
      current_phase_instance: currentInstance,
      phase_instances: instances.map(({ key: _key, ...instance }) => instance),
      transitions: [],
    }),
  });
  files.push({
    path: `appledger/records/application/${appId}.md`,
    text: record(
      {
        id: appId,
        kind: "application",
        title: name,
        at: when.at,
        data: {
          purpose: stringField(project.description) || "Imported from workflow tracking. The file did not state a purpose.",
          boundaries: "Imported from workflow tracking. Boundaries were not examined.",
          audience: ["not stated in the tracking file"],
          survey_scope: "Tracking file only. Application code was not examined.",
        },
      },
      placeholderNote(when.placeholder),
    ),
  });
  for (const [index, decision] of entries(value.decisions).entries()) {
    const text = decisionText(decision);
    const dated = eventDate(decisionDate(decision));
    const id = stableId("decision", `${index}:${text}`);
    files.push({
      path: `appledger/records/decision/${id}.md`,
      text: record(
        {
          id,
          kind: "decision",
          title: text.slice(0, 80),
          at: dated.at,
          data: {
            status: "accepted",
            choice: text,
            rationale: "Imported from workflow tracking. Verification was not recorded.",
            alternatives: [],
            authority: "import",
          },
        },
        placeholderNote(dated.placeholder),
      ),
    });
  }
  for (const [key, phase] of Object.entries(phases)) {
    const notes = Array.isArray(mapping(phase).notes) ? (mapping(phase).notes as unknown[]) : [];
    for (const note of notes) {
      const item = mapping(note);
      const text = stringField(item.text) || stringField(note);
      if (!text) continue;
      const dated = eventDate(item.timestamp);
      const id = stableId("session", `${key}:${dated.at}:${text}`);
      const outcomes = companionOutcomes(item.companionOutcomes);
      files.push({
        path: `appledger/records/session/${id}.md`,
        text: record(
          {
            id,
            kind: "session",
            title: text.slice(0, 80),
            at: dated.at,
            data: {
              session_id: id,
              accomplished: [text],
              left_off: text,
              next_steps: [],
              ...(outcomes.length > 0 ? { companion_outcomes: outcomes } : {}),
            },
          },
          `Linked phase instance: ${stableId("phase", key)}.${placeholderNote(dated.placeholder)}`,
        ),
      });
    }
  }
  for (const session of entries(value.sessions)) {
    const text = stringField(session.summary) || stringField(session.text) || "Imported session";
    const dated = eventDate(session.date ?? session.timestamp);
    const id = stableId("session", `sessions:${dated.at}:${text}`);
    const outcomes = companionOutcomes(session.companionOutcomes);
    files.push({
      path: `appledger/records/session/${id}.md`,
      text: record(
        {
          id,
          kind: "session",
          title: text.slice(0, 80),
          at: dated.at,
          data: {
            session_id: id,
            accomplished: [text],
            left_off: text,
            next_steps: [],
            ...(outcomes.length > 0 ? { companion_outcomes: outcomes } : {}),
          },
        },
        placeholderNote(dated.placeholder),
      ),
    });
  }
  const unmapped = collectUnmapped(value);
  if (Object.keys(unmapped).length > 0) {
    const id = stableId("change", digest);
    files.push({
      path: `appledger/records/change/${id}.md`,
      text: record(
        {
          id,
          kind: "change",
          title: "Unmapped tracking fields",
          at: when.at,
          extensions: { migration: { unmapped } },
          data: {
            change_type: "added",
            affected_ids: [appId],
            reason: "Fields from the tracking file that have no ledger mapping were retained.",
            evidence_refs: [],
            operation: "reconciliation",
          },
        },
        "The unmapped fields are in extensions.migration.unmapped.",
      ),
    });
  }
  for (const item of listItems(home, "BUGS.md")) files.push(workRecord(item, "bug", when.at));
  for (const item of listItems(home, "IDEAS.md")) files.push(workRecord(item, "idea", when.at));
  files.push({
    path: ".forgetrail/workflow_tracking.json",
    text: `${JSON.stringify(POINTER, null, 2)}\n`,
  });
  return files;
}

function workRecord(text: string, intake: "bug" | "idea", at: string): Planned {
  const id = stableId("work", `${intake}:${text}`);
  return {
    path: `appledger/records/work/${id}.md`,
    text: record(
      {
        id,
        kind: "work",
        title: text.slice(0, 80),
        at,
        data: {
          status: "proposed",
          intake,
          objective: text,
          acceptance_criteria: [{ id: stableId("crit", `${intake}:${text}`), text: "Confirm the imported item.", status: "pending" }],
          verification_refs: [],
        },
      },
      "Imported from a list. Confirmation was not recorded.",
    ),
  };
}

function listItems(home: string, name: string): string[] {
  const path = resolve(home, name);
  if (!isInside(resolve(home), path) || !existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^-\s+(.+)$/.exec(line.trim());
      return match?.[1] ? [match[1].trim()] : [];
    });
}

type PhaseInstance = {
  key: string;
  id: string;
  phase: ProfilePhase;
  status: "not_started" | "in_progress" | "completed" | "revisiting";
  started_at?: string;
  completed_at?: string;
  criteria: { id: string; text: string; status: "pending" | "met"; evidence_refs: string[]; disposition_reason?: string }[];
};

function phaseInstance(key: string, phase: Record<string, unknown>): PhaseInstance | undefined {
  const profile = mapPhaseKey(key);
  if (!profile) return undefined;
  const status = mapStatus(stringField(phase.status));
  const criteria = criteriaFrom(key, phase);
  const started = eventDate(phase.startedAt);
  const completed = eventDate(phase.completedAt);
  return {
    key,
    id: stableId("phase", key),
    phase: profile,
    status,
    ...(typeof phase.startedAt === "string" && phase.startedAt ? { started_at: started.at } : {}),
    ...(typeof phase.completedAt === "string" && phase.completedAt ? { completed_at: completed.at } : {}),
    criteria,
  };
}

function criteriaFrom(key: string, phase: Record<string, unknown>): PhaseInstance["criteria"] {
  const criteria: PhaseInstance["criteria"] = [];
  if (phase.exitCriteria && typeof phase.exitCriteria === "object" && !Array.isArray(phase.exitCriteria)) {
    for (const [name, flag] of Object.entries(phase.exitCriteria as Record<string, unknown>)) {
      criteria.push(criterion(key, name, flag === true));
    }
  }
  for (const text of stringList(phase.exitCriteriaMet)) criteria.push(criterion(key, text, true));
  for (const text of stringList(phase.exitCriteriaRemaining)) criteria.push(criterion(key, text, false));
  return criteria;
}

function criterion(key: string, text: string, met: boolean): PhaseInstance["criteria"][number] {
  return {
    id: stableId("crit", `${key}:${text}`),
    text,
    status: met ? "met" : "pending",
    evidence_refs: [],
    ...(met ? { disposition_reason: "Imported as a historical assertion. Verification was not recorded." } : {}),
  };
}

function mapStatus(status: string): PhaseInstance["status"] {
  if (status === "in_progress" || status === "completed" || status === "revisiting") return status;
  return "not_started";
}

function isStarter(value: Record<string, unknown>): boolean {
  const project = mapping(value.project);
  if (stringField(project.name) || stringField(project.description)) return false;
  if (entries(value.decisions).length > 0 || entries(value.sessions).length > 0) return false;
  const phases = mapping(value.phases);
  return Object.values(phases).every((phase) => {
    const status = stringField(mapping(phase).status);
    return status === "" || status === "not_started" || status === "pending";
  });
}

function isPointer(value: Record<string, unknown>): boolean {
  return value.status === "pointer" || value.record === "appledger/";
}

function unmappedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(collectUnmapped(value));
}

function collectUnmapped(value: Record<string, unknown>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!KNOWN_ROOT.has(key)) extra[key] = item;
  }
  const phases = mapping(value.phases);
  for (const [key, phase] of Object.entries(phases)) {
    const unknown: Record<string, unknown> = {};
    for (const [field, item] of Object.entries(mapping(phase))) {
      if (!["status", "startedAt", "completedAt", "exitCriteriaMet", "exitCriteriaRemaining", "exitCriteria", "notes", "name"].includes(field)) {
        unknown[field] = item;
      }
    }
    if (Object.keys(unknown).length > 0) extra[`phases.${key}`] = unknown;
  }
  return extra;
}

function record(
  input: {
    id: string;
    kind: string;
    title: string;
    at: string;
    data: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  },
  body: string,
): string {
  const document = {
    format_version: "0.1.0",
    id: input.id,
    kind: input.kind,
    title: input.title,
    record_status: "active",
    created_at: input.at,
    updated_at: input.at,
    recorded_by: { id: "migration-import", type: "import" },
    visibility: "internal",
    relations: [],
    claims: [],
    ...(input.extensions ? { extensions: input.extensions } : {}),
    data: input.data,
  };
  return `---\n${stringify(document)}---\n\n${body.trim()}\n`;
}

function companionOutcomes(value: unknown): { tool: string; outcome: string }[] {
  if (!Array.isArray(value)) return [];
  const outcomes: { tool: string; outcome: string }[] = [];
  for (const item of value) {
    const record = mapping(item);
    const tool = stringField(record.tool);
    const outcome = stringField(record.outcome);
    if (tool && outcome) outcomes.push({ tool, outcome });
  }
  return outcomes;
}

function firstDate(value: Record<string, unknown>): { at: string; placeholder: boolean } | undefined {
  for (const session of entries(value.sessions)) {
    const dated = eventDate(session.date ?? session.timestamp);
    if (!dated.placeholder) return dated;
  }
  return undefined;
}

function eventDate(value: unknown): { at: string; placeholder: boolean } {
  if (typeof value !== "string" || !value.trim()) return { at: PLACEHOLDER, placeholder: true };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { at: `${value}T00:00:00Z`, placeholder: false };
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { at: value, placeholder: false };
  return { at: PLACEHOLDER, placeholder: true };
}

function placeholderNote(placeholder: boolean): string {
  return placeholder ? " The source did not record a date. 1970-01-01T00:00:00Z is a placeholder, not the event date." : "";
}

function decisionText(value: Record<string, unknown>): string {
  return stringField(value.decision) || stringField(value.text) || stringField(value.summary) || "Imported decision";
}

function decisionDate(value: Record<string, unknown>): unknown {
  return value.date ?? value.timestamp ?? value.created;
}

function entries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => mapping(item));
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function readTracking(home: string): { ok: true; value: Record<string, unknown>; digest: string } | { ok: false; message: string } {
  const absolute = resolve(home, ".forgetrail", "workflow_tracking.json");
  if (!isInside(resolve(home), absolute)) return { ok: false, message: "The tracking path escapes the directory." };
  if (!existsSync(absolute)) return { ok: false, message: "No .forgetrail/workflow_tracking.json was found." };
  const raw = readFileSync(absolute);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return { ok: false, message: "The tracking file is not JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "The tracking file is not an object." };
  }
  return { ok: true, value: parsed as Record<string, unknown>, digest: sha256Hex(raw) };
}

function writeSnapshot(home: string, id: string, before: Map<string, string | null>, files: Planned[]): void {
  const dir = snapshotDir(home, id);
  mkdirSync(dir, { recursive: true });
  const snapshot = {
    id,
    files: files.map((file) => ({
      path: file.path,
      before: before.get(file.path) ?? null,
      afterSha256: sha256Hex(Buffer.from(file.text, "utf8")),
    })),
  };
  writeFileSync(join(dir, "snapshot.json"), JSON.stringify(snapshot));
}

function readSnapshot(home: string, id: string): { files: { path: string; before: string | null; afterSha256: string }[] } | undefined {
  const path = join(snapshotDir(home, id), "snapshot.json");
  if (!existsSync(path)) return undefined;
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { files?: { path: string; before: string | null; afterSha256: string }[] };
  if (!Array.isArray(parsed.files)) return undefined;
  return { files: parsed.files };
}

function snapshotDir(home: string, id: string): string {
  return join(home, ".appledger-cache", "migrations", id);
}

function stableId(prefix: string, key: string): string {
  return `${prefix}-${sha256Hex(Buffer.from(key, "utf8")).slice(0, 12)}`;
}

function mapping(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
