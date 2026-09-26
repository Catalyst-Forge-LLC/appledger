import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { checkLedger, resolveLedgerRoot } from "./check.js";
import { isInside, isUnsafeRelative } from "./sources.js";
import { parseYaml, splitFrontMatter } from "./yaml.js";

export type ViewName = "orientation" | "progress" | "history";

const STOP = new Set(["the", "and", "for", "with", "this", "that", "from", "into", "after", "before"]);

type Rec = {
  path: string;
  id: string;
  kind: string;
  title: string;
  updatedAt: string;
  status: string;
  recordStatus: string;
  value: Record<string, unknown>;
  search: string;
};

type Phase = {
  id: string;
  phase: string;
  status: string;
  criteria: { id: string; text: string; status: string }[];
};

export function orientLedger(input: { root: string; task?: string; budgetWords?: number }): string {
  return renderView({ ...input, view: "orientation" });
}

export function renderView(input: { root: string; view: ViewName; task?: string; budgetWords?: number }): string {
  const ledgerRoot = resolveLedgerRoot(input.root);
  const loaded = loadLedger(ledgerRoot);
  const budget = input.budgetWords ?? 800;
  if (input.view === "progress") return finish(progressMarkdown(loaded));
  if (input.view === "history") return finish(historyMarkdown(loaded));
  return finish(orientationMarkdown(loaded, input.task, budget));
}

export function writeView(ledgerRoot: string, view: ViewName, markdown: string): { path: string; written: boolean } {
  const relativePath = `views/${view}.md`;
  const absolute = resolve(ledgerRoot, relativePath);
  if (!isInside(ledgerRoot, absolute)) throw new Error(`Refusing to write ${relativePath}`);
  const next = finish(markdown);
  if (existsSync(absolute) && readFileSync(absolute, "utf8") === next) {
    return { path: relativePath, written: false };
  }
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, next);
  return { path: relativePath, written: true };
}

type Loaded = {
  records: Rec[];
  phase: Phase | undefined;
  profilePath: string | undefined;
  gaps: string[];
};

function loadLedger(ledgerRoot: string): Loaded {
  const findings = checkLedger(ledgerRoot).findings;
  const manifest = readMapping(join(ledgerRoot, "manifest.yaml"));
  const records: Rec[] = [];
  const roots = Array.isArray(manifest?.record_roots) ? manifest.record_roots : [];
  for (const root of roots) {
    if (typeof root !== "string" || isUnsafeRelative(root)) continue;
    const dir = resolve(ledgerRoot, root);
    if (!isInside(ledgerRoot, dir) || !existsSync(dir)) continue;
    walk(dir, (file) => {
      const text = readFileSync(file, "utf8");
      const front = splitFrontMatter(text);
      if (!front.ok) return;
      const parsed = parseYaml(front.yaml);
      if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return;
      const value = parsed.value as Record<string, unknown>;
      const id = stringValue(value.id);
      const kind = stringValue(value.kind);
      if (!id || !kind) return;
      const data = mapping(value.data);
      const body = text.slice(text.indexOf("\n---\n") + 5);
      records.push({
        path: relative(ledgerRoot, file).split(sep).join("/"),
        id,
        kind,
        title: stringValue(value.title) || id,
        updatedAt: stringValue(value.updated_at),
        status: stringValue(data.status),
        recordStatus: stringValue(value.record_status),
        value,
        search: [value.title, data.purpose, data.objective, data.definition, data.role, data.choice, data.problem, data.resolution, data.issue, body]
          .filter((item) => typeof item === "string")
          .join("\n")
          .toLowerCase(),
      });
    });
  }
  records.sort((left, right) => left.id.localeCompare(right.id));
  const profilePath = profilePathFrom(manifest);
  const phase = profilePath ? readPhase(ledgerRoot, profilePath) : undefined;
  return { records, phase, profilePath, gaps: collectGaps(records, phase, findings) };
}

function orientationMarkdown(loaded: Loaded, task: string | undefined, budget: number): string {
  const head = [
    disclosure("Orientation"),
    "",
    "## Application",
    "",
    applicationLine(loaded),
    "",
    "## Phase",
    "",
    phaseLine(loaded),
    "",
    "## Decisions",
    "",
    decisionBlock(loaded),
    "",
    "## Lessons",
    "",
    lessonBlock(loaded),
    "",
    "## Session",
    "",
    sessionBlock(loaded),
    "",
    "## Work in progress",
    "",
    workBlock(loaded),
  ].join("\n");
  const gaps = ["## Gaps", "", gapBlock(loaded)].join("\n");
  const tokens = taskTokens(task);
  const related = loaded.records.filter((record) => record.recordStatus !== "retired" && isRelated(record, tokens));
  const lines: string[] = [];
  for (const record of related) {
    const nextLines = [...lines, `- ${link(record)} — ${record.kind}${record.status ? `, ${record.status}` : ""}`];
    const candidate = `${head}\n\n## Related\n\n${nextLines.join("\n")}\n\n${gaps}`;
    if (words(candidate) > budget) break;
    lines.push(nextLines[nextLines.length - 1] ?? "");
  }
  const relatedBlock = lines.length === 0 ? "" : `\n\n## Related\n\n${lines.join("\n")}`;
  let text = `${head}${relatedBlock}\n\n${gaps}`;
  if (words(text) > budget) {
    text = `${text}\n\nThe brief exceeds the word budget so that recorded gaps stay visible.`;
  }
  return text;
}

function progressMarkdown(loaded: Loaded): string {
  const criteria = loaded.phase?.criteria ?? [];
  const work = loaded.records.filter((record) => record.kind === "work");
  return [
    disclosure("Progress"),
    "",
    "## Phase",
    "",
    phaseLine(loaded),
    ...criteria.map((item) => `- ${item.status} — ${item.text}`),
    "",
    "## Work",
    "",
    work.length === 0 ? "No work records." : work.map((record) => `- ${record.status || "unspecified"} — ${link(record)}`).join("\n"),
    "",
    "## Session",
    "",
    sessionBlock(loaded),
  ].join("\n");
}

function historyMarkdown(loaded: Loaded): string {
  const changes = loaded.records.filter((record) => record.kind === "change");
  const lines = changes.map((record) => {
    const data = mapping(record.value.data);
    const reason = stringValue(data.reason) || record.title;
    const changeType = stringValue(data.change_type) || "unspecified";
    return `- ${link(record)} — ${changeType}. ${reason}`;
  });
  return [
    disclosure("History"),
    "",
    "Change records state semantic intent. Git holds the text history. This view does not reconstruct past ledger state.",
    "",
    lines.length === 0 ? "No change records." : lines.join("\n"),
  ].join("\n");
}

function disclosure(title: string): string {
  return [`# ${title}`, "", "Selection: deterministic. No agent assistance."].join("\n");
}

function applicationLine(loaded: Loaded): string {
  const app = loaded.records.find((record) => record.kind === "application");
  if (!app) return "No application record.";
  const purpose = stringValue(mapping(app.value.data).purpose);
  return `${link(app)}${purpose ? `. ${purpose}` : ""}`;
}

function phaseLine(loaded: Loaded): string {
  if (!loaded.phase || !loaded.profilePath) return "No ForgeTrail profile is recorded.";
  return `${capitalize(loaded.phase.phase)} is ${loaded.phase.status}. Profile: [${loaded.profilePath}](${loaded.profilePath}).`;
}

function sessionBlock(loaded: Loaded): string {
  const sessions = loaded.records.filter((record) => record.kind === "session").sort(byUpdated);
  const current = sessions[sessions.length - 1];
  if (!current) return "No session record.";
  const data = mapping(current.value.data);
  const next = Array.isArray(data.next_steps) ? data.next_steps.filter((item) => typeof item === "string") : [];
  const others = sessions.slice(0, -1).map((record) => record.id);
  return [
    link(current),
    "",
    `Left off: ${stringValue(data.left_off) || "Not recorded."}`,
    "",
    `Recorded: ${current.updatedAt || "Not recorded."}`,
    "",
    next.length === 0 ? "Next: none recorded." : `Next:\n\n${next.map((item) => `- ${item}`).join("\n")}`,
    others.length === 0 ? "" : `\nOther sessions: ${others.join(", ")}.`,
  ]
    .filter((part) => part !== "")
    .join("\n");
}

function decisionBlock(loaded: Loaded): string {
  const decisions = loaded.records.filter((record) => record.kind === "decision" && record.recordStatus !== "retired");
  if (decisions.length === 0) return "No decision records.";
  return decisions
    .map((record) => {
      const choice = stringValue(mapping(record.value.data).choice) || record.title;
      return `- ${link(record)} — ${choice}`;
    })
    .join("\n");
}

function lessonBlock(loaded: Loaded): string {
  const lessons = loaded.records.filter((record) => record.kind === "lesson" && record.recordStatus !== "retired");
  if (lessons.length === 0) return "No lesson records.";
  return lessons
    .map((record) => {
      const data = mapping(record.value.data);
      const problem = stringValue(data.problem) || record.title;
      const resolution = stringValue(data.resolution) || "Not recorded.";
      return `- ${link(record)} — ${problem} Resolution: ${resolution}`;
    })
    .join("\n");
}

function workBlock(loaded: Loaded): string {
  const current = loaded.records.filter(
    (record) => record.kind === "work" && (record.status === "in_progress" || record.status === "blocked" || record.status === "ready"),
  );
  if (current.length === 0) return "No work is in progress, blocked, or ready.";
  return current.map((record) => `- ${record.status} — ${link(record)}`).join("\n");
}

function gapBlock(loaded: Loaded): string {
  if (loaded.gaps.length === 0) {
    return "None recorded. Check warnings, unresolved claims, open questions, and pending acceptance criteria were not found.";
  }
  return loaded.gaps.join("\n");
}

function collectGaps(
  records: Rec[],
  phase: Phase | undefined,
  findings: { severity: string; code: string; path: string; message: string }[],
): string[] {
  const gaps: string[] = [];
  for (const item of [...findings].sort((left, right) => `${left.path}\n${left.code}\n${left.message}`.localeCompare(`${right.path}\n${right.code}\n${right.message}`))) {
    gaps.push(`- Check ${item.severity} ${item.code} at ${item.path}: ${item.message}`);
  }
  for (const criterion of phase?.criteria ?? []) {
    if (criterion.status === "pending") gaps.push(`- Phase criterion pending: ${criterion.text} (\`${criterion.id}\`)`);
  }
  for (const record of records) {
    if (record.kind === "question" && record.status === "open") {
      gaps.push(`- Open question: ${link(record)}`);
    }
    const claims = Array.isArray(record.value.claims) ? record.value.claims : [];
    for (const claim of claims) {
      if (!claim || typeof claim !== "object") continue;
      const status = stringValue((claim as { status?: unknown }).status);
      const id = stringValue((claim as { id?: unknown }).id) || "claim";
      if (status === "unresolved" || status === "disputed" || status === "stale") {
        gaps.push(`- Claim ${id} on ${record.id} is ${status}.`);
      }
    }
    if (record.kind !== "work" || record.status === "cancelled") continue;
    const criteria = mapping(record.value.data).acceptance_criteria;
    if (!Array.isArray(criteria)) continue;
    for (const criterion of criteria) {
      if (!criterion || typeof criterion !== "object") continue;
      const status = stringValue((criterion as { status?: unknown }).status);
      if (status !== "pending") continue;
      const text = stringValue((criterion as { text?: unknown }).text) || "Pending acceptance";
      const id = stringValue((criterion as { id?: unknown }).id);
      gaps.push(`- Work acceptance pending: ${text} (\`${record.id}\`${id ? ` / \`${id}\`` : ""})`);
    }
  }
  return gaps;
}

function isRelated(record: Rec, tokens: string[]): boolean {
  if (
    record.kind === "application" ||
    record.kind === "session" ||
    record.kind === "work" ||
    record.kind === "change" ||
    record.kind === "decision" ||
    record.kind === "lesson" ||
    record.kind === "question"
  ) {
    return false;
  }
  if (tokens.length === 0) return true;
  return tokens.some((token) => record.search.includes(token));
}

function taskTokens(task: string | undefined): string[] {
  if (!task) return [];
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP.has(token));
}

function profilePathFrom(manifest: Record<string, unknown> | undefined): string | undefined {
  const profiles = manifest && Array.isArray(manifest.profiles) ? manifest.profiles : [];
  for (const profile of profiles) {
    if (!profile || typeof profile !== "object") continue;
    const id = stringValue((profile as { id?: unknown }).id);
    const path = stringValue((profile as { path?: unknown }).path);
    if (id === "forgetrail" && path && !isUnsafeRelative(path)) return path;
  }
  return undefined;
}

function readPhase(ledgerRoot: string, profilePath: string): Phase | undefined {
  const absolute = resolve(ledgerRoot, profilePath);
  if (!isInside(ledgerRoot, absolute) || !existsSync(absolute)) return undefined;
  const value = readMapping(absolute);
  if (!value) return undefined;
  const instances = Array.isArray(value.phase_instances) ? value.phase_instances : [];
  const currentId = stringValue(value.current_phase_instance);
  const current = instances.find((item) => item && typeof item === "object" && stringValue((item as { id?: unknown }).id) === currentId);
  if (!current || typeof current !== "object") return undefined;
  const criteria = Array.isArray((current as { criteria?: unknown }).criteria) ? (current as { criteria: unknown[] }).criteria : [];
  return {
    id: currentId,
    phase: stringValue((current as { phase?: unknown }).phase) || "unspecified",
    status: stringValue((current as { status?: unknown }).status) || "unspecified",
    criteria: criteria
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: stringValue((item as { id?: unknown }).id),
        text: stringValue((item as { text?: unknown }).text),
        status: stringValue((item as { status?: unknown }).status),
      })),
  };
}

function readMapping(path: string): Record<string, unknown> | undefined {
  try {
    const parsed = parseYaml(readFileSync(path, "utf8"));
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return undefined;
    return parsed.value as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function link(record: Rec): string {
  return `[${record.title}](${record.path})`;
}

function byUpdated(left: Rec, right: Rec): number {
  const time = left.updatedAt.localeCompare(right.updatedAt);
  if (time !== 0) return time;
  return left.id.localeCompare(right.id);
}

function words(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function finish(text: string): string {
  return `${text.replace(/\r\n/g, "\n").replace(/\s+$/u, "")}\n`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

function mapping(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function walk(dir: string, visit: (file: string) => void): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, visit);
    else if (name.endsWith(".md")) visit(full);
  }
}
