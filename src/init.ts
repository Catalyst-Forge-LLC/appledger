import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { stringify } from "yaml";
import { applyTransaction, stageTransaction } from "./transaction.js";

export type InitResult = {
  ok: boolean;
  wrote: string[];
  message: string;
};

export function initLedger(input: { root: string; name?: string; at: string }): InitResult {
  const home = resolve(input.root);
  const name = input.name?.trim();
  if (input.name !== undefined && !name) {
    return { ok: false, wrote: [], message: "Name is empty. No files were written." };
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(input.at)) {
    return { ok: false, wrote: [], message: "Init time must be a UTC timestamp. No files were written." };
  }
  const existing = existingLedgerPaths(home);
  if (existing.length > 0) {
    return {
      ok: true,
      wrote: [],
      message: `Existing ledger files were left in place: ${existing.join(", ")}. No files were written.`,
    };
  }

  const appId = `app-${randomUUID()}`;
  const sessionId = `session-${randomUUID()}`;
  const phaseId = `phase-${randomUUID()}`;
  const title = name || "Unnamed application";
  const files = [
    { path: "appledger/manifest.yaml", text: manifestText(appId) },
    { path: "appledger/profiles/forgetrail.yaml", text: profileText(phaseId, input.at) },
    { path: `appledger/records/application/${appId}.md`, text: applicationText(appId, title, input.at, Boolean(name)) },
    { path: `appledger/records/session/${sessionId}.md`, text: sessionText(sessionId, appId, input.at, Boolean(name)) },
  ];
  const id = `init-${randomUUID()}`;
  const staged = stageTransaction(home, {
    id,
    files: files.map((file) => ({ path: file.path, bytes: Buffer.from(file.text, "utf8") })),
  });
  if (!staged.ok || staged.status !== "staged") {
    return { ok: false, wrote: [], message: staged.message };
  }
  const applied = applyTransaction(home, id);
  if (!applied.ok) return { ok: false, wrote: applied.paths, message: applied.message };
  return {
    ok: true,
    wrote: files.map((file) => file.path),
    message: "Created the ledger. Purpose was not supplied, and no label was written.",
  };
}

function existingLedgerPaths(home: string): string[] {
  const found: string[] = [];
  const manifest = join(home, "appledger", "manifest.yaml");
  const profile = join(home, "appledger", "profiles", "forgetrail.yaml");
  if (existsSync(manifest)) found.push("appledger/manifest.yaml");
  if (existsSync(profile)) found.push("appledger/profiles/forgetrail.yaml");
  const records = join(home, "appledger", "records");
  if (existsSync(records)) found.push(...markdownPaths(home, records));
  return found;
}

function markdownPaths(home: string, dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...markdownPaths(home, full));
    else if (name.endsWith(".md")) found.push(relative(home, full).split(sep).join("/"));
  }
  return found;
}

function manifestText(appId: string): string {
  return stringify({
    format: "appledger",
    format_version: "0.1.0",
    ledger_id: `ledger-${randomUUID()}`,
    application_id: appId,
    repositories: [{ id: "repo-home", root: "." }],
    record_roots: ["records"],
    bindings: [],
    profiles: [{ id: "forgetrail", version: "0.1.0", path: "profiles/forgetrail.yaml" }],
  });
}

function profileText(phaseId: string, at: string): string {
  return stringify({
    profile: "forgetrail",
    profile_version: "0.1.0",
    archetype: "product",
    project_status: "active",
    current_phase_instance: phaseId,
    phase_instances: [
      {
        id: phaseId,
        phase: "plan",
        status: "in_progress",
        started_at: at,
        criteria: [
          {
            id: `crit-${randomUUID()}`,
            text: "Record what this application is for",
            status: "pending",
            evidence_refs: [],
          },
        ],
      },
    ],
    transitions: [],
  });
}

function applicationText(id: string, title: string, at: string, named: boolean): string {
  return record(
    id,
    "application",
    title,
    at,
    {
      purpose: "Not supplied. Init did not infer a purpose.",
      boundaries: "Not supplied.",
      audience: ["not supplied"],
      survey_scope: "Init created the ledger files only. Application code was not examined.",
    },
    [],
    named
      ? "The title was supplied to init. The purpose was not supplied, and the folder name was not used as the application name."
      : "No title was supplied. The folder name was not used as the application name, and the purpose was not supplied.",
  );
}

function sessionText(id: string, appId: string, at: string, named: boolean): string {
  return record(
    id,
    "session",
    "Ledger initialized",
    at,
    {
      session_id: id,
      accomplished: ["Created the ledger files."],
      left_off: named
        ? "The title was supplied. A purpose was not supplied."
        : "No title or purpose was supplied.",
      next_steps: ["Record the application purpose before treating this as a product decision."],
    },
    [{ type: "affects", target: appId }],
    "Init did not create a goal, a decision, or a label. Archetype product is the default, not a confirmed classification.",
  );
}

function record(
  id: string,
  kind: string,
  title: string,
  at: string,
  data: Record<string, unknown>,
  relations: { type: string; target: string }[],
  body: string,
): string {
  const document = {
    format_version: "0.1.0",
    id,
    kind,
    title,
    record_status: "active",
    created_at: at,
    updated_at: at,
    recorded_by: { id: "appledger-init", type: "tool" },
    visibility: "internal",
    relations,
    claims: [],
    data,
  };
  return `---\n${stringify(document)}---\n\n${body}\n`;
}
