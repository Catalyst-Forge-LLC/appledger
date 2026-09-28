#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { checkLedger, resolveLedgerRoot } from "./check.js";
import { listTransactions, resumeTransaction, rollbackTransaction } from "./transaction.js";
import { diffLedger, diffMarkdown } from "./diff.js";
import { initLedger } from "./init.js";
import { reconcileLedger } from "./reconcile.js";
import { bindLabels } from "./bind.js";
import { applyMigration, previewMigration, rollbackMigration } from "./migrate.js";
import { projectLedger, writePublicProjection } from "./project.js";
import { orientLedger, renderView, writeView, type ViewName } from "./views.js";
import { discoverSubjects, FAMILIES, runOperation, type Family, type Operation } from "./adapters.js";

const argv = process.argv.slice(2);
const command = argv[0];

if (!command || command === "--help" || command === "-h") {
  usage(command ? 0 : 2);
} else if (command === "--version" || command === "-v") {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
  console.log(pkg.version);
  process.exit(0);
} else if (command === "check") {
  runCheck(argv.slice(1));
} else if (command === "transaction") {
  runTransaction(argv.slice(1));
} else if (command === "orient") {
  runOrient(argv.slice(1));
} else if (command === "render") {
  runRender(argv.slice(1));
} else if (command === "subjects") {
  runSubjects(argv.slice(1));
} else if (command === "migrate") {
  runMigrate(argv.slice(1));
} else if (command === "diff") {
  runDiff(argv.slice(1));
} else if (command === "init") {
  runInit(argv.slice(1));
} else if (command === "reconcile") {
  runReconcile(argv.slice(1));
} else if (command === "bind") {
  runBind(argv.slice(1));
} else {
  console.error(`appledger ${command} is not implemented.`);
  console.error("Implemented: check, orient, render, subjects, transaction, migrate, diff, init, reconcile, bind");
  process.exit(4);
}

function runCheck(args: string[]): void {
  const parsed = parseRoot(args, new Set(["--root", "--format"]));
  if (!parsed) return;
  let format: "text" | "json" = "text";
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--format") {
      const next = args[i + 1];
      if (next !== "text" && next !== "json") {
        console.error("--format must be text or json");
        process.exit(2);
      }
      format = next;
    }
  }
  try {
    const result = checkLedger(parsed.root);
    if (format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else if (result.findings.length === 0) {
      console.log(`ok ${result.ledgerRoot}`);
    } else {
      for (const item of result.findings) {
        console.log(`${item.severity} ${item.code} ${item.path}: ${item.message}`);
      }
    }
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runTransaction(args: string[]): void {
  const action = args[0];
  if (action !== "status" && action !== "resume" && action !== "rollback") {
    console.error("Usage: appledger transaction status|resume|rollback [--root DIR] [--id ID]");
    process.exit(2);
  }
  const parsed = parseRoot(args.slice(1), new Set(["--root", "--id"]));
  if (!parsed) return;
  const id = flag(args, "--id");
  try {
    if (action === "status") {
      const pending = listTransactions(parsed.root).filter((item) => item.status !== "complete");
      if (pending.length === 0) {
        console.log("no pending transactions");
        process.exit(0);
      }
      for (const item of pending) console.log(`${item.status} ${item.id}: ${item.message}`);
      process.exit(1);
    }
    if (!id) {
      console.error("--id is required");
      process.exit(2);
    }
    const result = action === "resume" ? resumeTransaction(parsed.root, id) : rollbackTransaction(parsed.root, id);
    console.log(`${result.status} ${result.id}: ${result.message}`);
    if (result.status === "conflict") process.exit(3);
    if (!result.ok) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runReconcile(args: string[]): void {
  let root = process.cwd();
  let apply = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      console.error(`${arg} requires a value`);
      process.exit(2);
    }
    if (arg === "--root") root = next;
    else {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
    i += 1;
  }
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  try {
    const result = reconcileLedger({ root, apply, at });
    console.log(result.message);
    for (const row of result.dispositions) {
      console.log(`${row.disposition} ${row.family}${row.subjectId ? ` ${row.subjectId}` : ""}: ${row.finding}`);
    }
    for (const path of result.wrote) console.log(path);
    if (result.code === "conflict") process.exit(3);
    if (!result.ok) process.exit(1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runBind(args: string[]): void {
  const apply = args.includes("--apply");
  const parsed = parseRoot(
    args.filter((arg) => arg !== "--apply"),
    new Set(["--root"]),
  );
  if (!parsed) return;
  try {
    const result = bindLabels({ root: parsed.root, apply });
    console.log(result.message);
    for (const item of result.bindings) {
      console.log(`${item.family} ${item.subject_id}: ${item.repository_id}/${item.path} as ${item.id}`);
    }
    for (const path of result.wrote) console.log(path);
    if (result.code === "conflict") process.exit(3);
    if (!result.ok) process.exit(1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runInit(args: string[]): void {
  const parsed = parseRoot(args, new Set(["--root", "--name"]));
  if (!parsed) return;
  const name = flag(args, "--name");
  const at = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  try {
    const result = initLedger({ root: parsed.root, name, at });
    console.log(result.message);
    for (const path of result.wrote) console.log(path);
    if (!result.ok) process.exit(1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runDiff(args: string[]): void {
  const parsed = parseRoot(args, new Set(["--root", "--from", "--to", "--format"]));
  if (!parsed) return;
  const from = flag(args, "--from");
  const to = flag(args, "--to");
  if (!from || !to) {
    console.error("Usage: appledger diff --from REV --to REV [--root DIR] [--format text|json]");
    process.exit(2);
  }
  const format = flag(args, "--format") ?? "text";
  if (format !== "text" && format !== "json") {
    console.error("--format must be text or json");
    process.exit(2);
  }
  try {
    const result = diffLedger({ root: parsed.root, from, to });
    console.log(format === "json" ? JSON.stringify(result, null, 2) : diffMarkdown(result));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runMigrate(args: string[]): void {
  const action = args[0];
  if (action !== "preview" && action !== "apply" && action !== "rollback") {
    console.error("Usage: appledger migrate preview|apply|rollback [--root DIR] [--id ID]");
    process.exit(2);
  }
  const parsed = parseRoot(args.slice(1), new Set(["--root", "--id"]));
  if (!parsed) return;
  try {
    if (action === "preview") {
      const preview = previewMigration(parsed.root);
      console.log(`${preview.role}: ${preview.message}`);
      process.exit(preview.role === "unrecognized" ? 1 : 0);
    }
    if (action === "rollback") {
      const id = flag(args, "--id");
      if (!id) {
        console.error("--id is required");
        process.exit(2);
      }
      const result = rollbackMigration(parsed.root, id);
      console.log(result.message);
      process.exit(result.ok ? 0 : 1);
    }
    const result = applyMigration(parsed.root);
    console.log(result.message);
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function parseRoot(args: string[], known: Set<string>): { root: string } | undefined {
  let root = process.cwd();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
    if (!known.has(arg)) {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
    const next = args[i + 1];
    if (!next) {
      console.error(`${arg} requires a value`);
      process.exit(2);
    }
    if (arg === "--root") root = next;
    i += 1;
  }
  return { root };
}

function runOrient(args: string[]): void {
  const parsed = parseViewArgs(args, false);
  if (!parsed) return;
  try {
    console.log(orientLedger({ root: parsed.root, task: parsed.task, budgetWords: parsed.budget }));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function runRender(args: string[]): void {
  const parsed = parseViewArgs(args, true);
  if (!parsed) return;
  if (!parsed.view) {
    console.error("--view must be orientation, progress, history, or public");
    process.exit(2);
  }
  try {
    if (parsed.view === "public") {
      const projected = projectLedger(parsed.root);
      for (const finding of projected.findings) console.error(finding);
      if (!parsed.write) {
        console.log(projected.markdown);
        return;
      }
      const ledgerRoot = resolveLedgerRoot(parsed.root);
      const result = writePublicProjection(ledgerRoot, projected.markdown);
      console.log(result.written ? `wrote ${result.path}` : `unchanged ${result.path}`);
      return;
    }
    const markdown = renderView({
      root: parsed.root,
      view: parsed.view,
      task: parsed.task,
      budgetWords: parsed.budget,
    });
    if (!parsed.write) {
      console.log(markdown);
      return;
    }
    const ledgerRoot = resolveLedgerRoot(parsed.root);
    const result = writeView(ledgerRoot, parsed.view, markdown);
    console.log(result.written ? `wrote ${result.path}` : `unchanged ${result.path}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function parseViewArgs(
  args: string[],
  allowWrite: boolean,
): { root: string; task?: string; budget?: number; view?: ViewName | "public"; write: boolean } | undefined {
  let root = process.cwd();
  let task: string | undefined;
  let budget: number | undefined;
  let view: ViewName | "public" | undefined;
  let write = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--write") {
      if (!allowWrite) {
        console.error("Unknown argument --write");
        process.exit(2);
      }
      write = true;
      continue;
    }
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      console.error(`${arg} requires a value`);
      process.exit(2);
    }
    if (arg === "--root") root = next;
    else if (arg === "--task") task = next;
    else if (arg === "--view") {
      if (next !== "orientation" && next !== "progress" && next !== "history" && next !== "public") {
        console.error("--view must be orientation, progress, history, or public");
        process.exit(2);
      }
      view = next;
    } else if (arg === "--budget") {
      if (!/^[1-9]\d*$/.test(next)) {
        console.error("--budget must be a positive integer");
        process.exit(2);
      }
      budget = Number(next);
    } else {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
    i += 1;
  }
  return { root, task, budget, view, write };
}

function runSubjects(args: string[]): void {
  let root = process.cwd();
  let format: "text" | "json" = "text";
  let family: Family | undefined;
  let subjectId: string | undefined;
  let operation: Operation = "discover";
  let apply = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      console.error(`${arg} requires a value`);
      process.exit(2);
    }
    if (arg === "--root") root = next;
    else if (arg === "--format") {
      if (next !== "text" && next !== "json") {
        console.error("--format must be text or json");
        process.exit(2);
      }
      format = next;
    } else if (arg === "--family") {
      if (!(FAMILIES as readonly string[]).includes(next)) {
        console.error(`--family must be one of ${FAMILIES.join(", ")}`);
        process.exit(2);
      }
      family = next as Family;
    } else if (arg === "--subject") subjectId = next;
    else if (arg === "--operation") {
      if (next !== "discover" && next !== "validate" && next !== "extract" && next !== "checkFreshness" && next !== "propose") {
        console.error("--operation must be discover, validate, extract, checkFreshness, or propose");
        process.exit(2);
      }
      operation = next;
    } else {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
    i += 1;
  }
  if (apply && operation !== "propose") {
    console.error("--apply is only valid with --operation propose");
    process.exit(2);
  }
  try {
    const rows =
      operation === "discover" && !apply
        ? discoverSubjects({ root, family, subjectId })
        : runOperation({ root, operation, family, subjectId, apply });
    if (format === "json") console.log(JSON.stringify(rows, null, 2));
    else {
      for (const row of rows) {
        const subject = row.subjectId ? ` ${row.subjectId}` : "";
        console.log(`${row.disposition} ${row.family}${subject}: ${row.findings[0] ?? ""}`);
      }
    }
    process.exit(rows.some((row) => row.disposition === "failed") ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(5);
  }
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function usage(code: number): never {
  console.log(`appledger --version
appledger check [--root DIR] [--format text|json]
appledger orient [--root DIR] [--task TEXT] [--budget N]
appledger render --view orientation|progress|history|public [--root DIR] [--task TEXT] [--budget N] [--write]
appledger subjects [--root DIR] [--family NAME] [--subject ID] [--operation discover|validate|extract|checkFreshness|propose] [--apply] [--format text|json]
appledger transaction status [--root DIR]
appledger transaction resume --id ID [--root DIR]
appledger transaction rollback --id ID [--root DIR]
appledger migrate preview|apply|rollback [--root DIR] [--id ID]
appledger diff --from REV --to REV [--root DIR] [--format text|json]
appledger init [--root DIR] [--name TEXT]
appledger reconcile [--root DIR] [--apply]
appledger bind [--root DIR] [--apply]

check, orient, render, and subjects do not modify files unless render is given --write.
subjects lists one row per subject. Validate and extract read pinned AppFacts and FeatureFacts schemas and do not write. Propose --apply updates a derived cached title only.
orient selects records deterministically and keeps recorded gaps even when the word budget is small.
render --write updates views/<view>.md only when the bytes differ.
bind lists APP_FACTS.md and .featurefacts/features.yaml at the repository root that are not bound. --apply adds them to manifest.yaml and never changes a label.`);
  process.exit(code);
}
