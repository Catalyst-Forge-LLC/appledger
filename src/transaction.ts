import {
  closeSync,
  cpSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { checkLedger } from "./check.js";
import { sha256Hex } from "./digest.js";
import { isInside, isUnsafeRelative } from "./sources.js";

export type TransactionStatus =
  | "unchanged"
  | "staged"
  | "applying"
  | "complete"
  | "conflict"
  | "rejected"
  | "rolled_back"
  | "unreadable";

export type TransactionResult = {
  ok: boolean;
  status: TransactionStatus;
  id: string;
  paths: string[];
  message: string;
};

export type PlannedFile = {
  path: string;
  bytes: Buffer;
};

export type TransactionPlan = {
  id: string;
  idempotencyKey?: string;
  files: PlannedFile[];
};

type JournalEntry = {
  path: string;
  beforeSha256: string | null;
  afterSha256: string;
  applied: boolean;
};

type Journal = {
  id: string;
  status: "staged" | "applying" | "conflict" | "rejected";
  idempotencyKey?: string;
  entries: JournalEntry[];
  conflictPaths?: string[];
  message?: string;
};

type LockFile = {
  pid: number;
  transactionId: string;
  acquiredAt: string;
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function reconciliationKey(parts: {
  inputFingerprint: string;
  policyDigest: string;
  adapterVersions: { id: string; version: string }[];
}): string {
  const adapters = [...parts.adapterVersions].sort((left, right) => {
    const id = Buffer.compare(Buffer.from(left.id, "utf8"), Buffer.from(right.id, "utf8"));
    if (id !== 0) return id;
    return Buffer.compare(Buffer.from(left.version, "utf8"), Buffer.from(right.version, "utf8"));
  });
  const json = JSON.stringify({
    inputFingerprint: parts.inputFingerprint,
    policyDigest: parts.policyDigest,
    adapterVersions: adapters.map((item) => ({ id: item.id, version: item.version })),
  });
  return sha256Hex(Buffer.from(json, "utf8"));
}

export function stageTransaction(home: string, plan: TransactionPlan): TransactionResult {
  const root = resolve(home);
  const idError = validateId(plan.id);
  if (idError) return done(false, "rejected", plan.id, [], idError);
  if (plan.files.length === 0) return done(false, "rejected", plan.id, [], "A transaction needs at least one file.");

  const pending = listTransactions(root).find((item) => item.status === "applying" && item.id !== plan.id);
  if (pending) {
    return done(false, "applying", plan.id, [pending.id], `Recover transaction ${pending.id} before starting another.`);
  }

  let entries: JournalEntry[];
  try {
    entries = plan.files.map((file) => {
      const absolute = resolveInside(root, file.path);
      return {
        path: file.path,
        beforeSha256: fileSha(absolute),
        afterSha256: sha256Hex(file.bytes),
        applied: false,
      };
    });
  } catch (err) {
    return done(false, "rejected", plan.id, [], err instanceof Error ? err.message : "Unsafe path");
  }

  const existing = readJournal(root, plan.id);
  if (existing && existing.status === "applying") {
    return done(false, "applying", plan.id, [], `Transaction ${plan.id} is already applying. Resume or roll it back.`);
  }

  if (entries.every((entry) => entry.beforeSha256 === entry.afterSha256)) {
    return done(true, "unchanged", plan.id, [], "Planned bytes already match. No files were written.");
  }

  const dir = transactionDir(root, plan.id);
  mkdirSync(join(dir, "payloads"), { recursive: true });
  mkdirSync(join(dir, "before"), { recursive: true });
  plan.files.forEach((file, index) => {
    writeFileSync(join(dir, "payloads", String(index)), file.bytes);
    const absolute = resolveInside(root, file.path);
    if (existsSync(absolute)) writeFileSync(join(dir, "before", String(index)), readFileSync(absolute));
  });
  writeJournal(dir, {
    id: plan.id,
    status: "staged",
    idempotencyKey: plan.idempotencyKey,
    entries,
  });
  return done(true, "staged", plan.id, entries.map((entry) => entry.path), "Staged. Targets were not modified.");
}

export function applyTransaction(
  home: string,
  id: string,
  options?: { failAfterApplied?: number },
): TransactionResult {
  const root = resolve(home);
  const journal = readJournal(root, id);
  if (!journal) return done(false, "rejected", id, [], `No staged transaction ${id}.`);
  if (journal.status === "conflict" || journal.status === "rejected") {
    return done(false, journal.status, id, journal.conflictPaths ?? [], journal.message ?? `Transaction ${id} is ${journal.status}.`);
  }

  const dir = transactionDir(root, id);
  const proposalErrors = validateProposal(root, dir, journal);
  if (proposalErrors.length > 0) {
    journal.status = "rejected";
    journal.message = proposalErrors.join(" ");
    writeJournal(dir, journal);
    return done(false, "rejected", id, journal.entries.map((entry) => entry.path), journal.message);
  }

  const lock = acquireLock(root, id);
  if (!lock.ok) return done(false, "conflict", id, [], lock.message);

  try {
    for (const entry of journal.entries) {
      repairPartial(resolveInside(root, entry.path));
    }
    const conflicts = conflictingPaths(root, journal);
    if (conflicts.length > 0) {
      journal.status = "conflict";
      journal.conflictPaths = conflicts;
      journal.message = `Preconditions failed for ${conflicts.join(", ")}. Those files were not overwritten.`;
      writeJournal(dir, journal);
      return done(false, "conflict", id, conflicts, journal.message);
    }

    journal.status = "applying";
    writeJournal(dir, journal);
    let appliedCount = journal.entries.filter((entry) => entry.applied).length;
    for (const [index, entry] of journal.entries.entries()) {
      if (entry.applied) continue;
      const absolute = resolveInside(root, entry.path);
      if (fileSha(absolute) !== entry.afterSha256) {
        replaceFile(absolute, readFileSync(join(dir, "payloads", String(index))));
      }
      entry.applied = true;
      writeJournal(dir, journal);
      appliedCount += 1;
      if (options?.failAfterApplied !== undefined && appliedCount >= options.failAfterApplied) {
        return done(
          false,
          "applying",
          id,
          journal.entries.filter((item) => item.applied).map((item) => item.path),
          `Stopped after ${appliedCount} file(s). The transaction is incomplete.`,
        );
      }
    }
    rmSync(dir, { recursive: true, force: true });
    return done(true, "complete", id, journal.entries.map((entry) => entry.path), "Applied.");
  } finally {
    if (readJournal(root, id)?.status !== "applying") releaseLock(root, id);
  }
}

export function resumeTransaction(home: string, id: string): TransactionResult {
  return applyTransaction(home, id);
}

export function rollbackTransaction(home: string, id: string): TransactionResult {
  const root = resolve(home);
  const journal = readJournal(root, id);
  if (!journal) return done(false, "rejected", id, [], `No transaction ${id} to roll back.`);
  const lock = acquireLock(root, id);
  if (!lock.ok) return done(false, "conflict", id, [], lock.message);
  const dir = transactionDir(root, id);
  const refused: string[] = [];
  try {
    for (let index = journal.entries.length - 1; index >= 0; index -= 1) {
      const entry = journal.entries[index];
      if (!entry.applied) continue;
      const absolute = resolveInside(root, entry.path);
      repairPartial(absolute);
      const current = fileSha(absolute);
      if (current === entry.beforeSha256) {
        entry.applied = false;
        continue;
      }
      if (current !== entry.afterSha256) {
        refused.push(entry.path);
        continue;
      }
      const beforePath = join(dir, "before", String(index));
      if (entry.beforeSha256 === null) {
        if (existsSync(absolute)) unlinkSync(absolute);
      } else {
        replaceFile(absolute, readFileSync(beforePath));
      }
      entry.applied = false;
    }
    if (refused.length > 0) {
      journal.status = "applying";
      journal.conflictPaths = refused;
      journal.message = `Rollback refused ${refused.join(", ")} because the bytes changed after apply.`;
      writeJournal(dir, journal);
      return done(false, "conflict", id, refused, journal.message);
    }
    const restored = journal.entries.map((entry) => entry.path);
    rmSync(dir, { recursive: true, force: true });
    return done(true, "rolled_back", id, restored, "Rolled back applied paths.");
  } finally {
    if (!existsSync(dir) || readJournal(root, id)?.status !== "applying") releaseLock(root, id);
  }
}

export function listTransactions(home: string): { id: string; status: TransactionStatus; message: string }[] {
  const root = resolve(home);
  const parent = join(root, ".appledger-cache", "transactions");
  if (!existsSync(parent)) return [];
  const found: { id: string; status: TransactionStatus; message: string }[] = [];
  for (const name of readdirSync(parent)) {
    const journalPath = join(parent, name, "journal.json");
    if (!existsSync(journalPath)) continue;
    try {
      const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
      if (!journal || typeof journal.id !== "string" || typeof journal.status !== "string") {
        found.push({ id: name, status: "unreadable", message: `Transaction ${name} has an unreadable journal.` });
        continue;
      }
      found.push({
        id: journal.id,
        status: journal.status,
        message: journal.message ?? `Transaction ${journal.id} is ${journal.status}.`,
      });
    } catch {
      found.push({ id: name, status: "unreadable", message: `Transaction ${name} has an unreadable journal.` });
    }
  }
  return found;
}

function validateProposal(home: string, dir: string, journal: Journal): string[] {
  if (!existsSync(join(home, "appledger", "manifest.yaml"))) return [];
  const proposalHome = mkdtempSync(join(tmpdir(), "appledger-proposal-"));
  try {
    cpSync(join(home, "appledger"), join(proposalHome, "appledger"), { recursive: true });
    for (const [index, entry] of journal.entries.entries()) {
      if (!entry.path.startsWith("appledger/")) continue;
      const target = resolveInside(proposalHome, entry.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(dir, "payloads", String(index))));
    }
    const result = checkLedger(proposalHome);
    return result.findings.filter((item) => item.severity === "error").map((item) => `${item.code} ${item.path}: ${item.message}`);
  } finally {
    rmSync(proposalHome, { recursive: true, force: true });
  }
}

function conflictingPaths(home: string, journal: Journal): string[] {
  const conflicts: string[] = [];
  for (const entry of journal.entries) {
    const current = fileSha(resolveInside(home, entry.path));
    const expected = entry.applied ? entry.afterSha256 : entry.beforeSha256;
    if (current !== expected) conflicts.push(entry.path);
  }
  return conflicts;
}

function replaceFile(target: string, bytes: Buffer): void {
  mkdirSync(dirname(target), { recursive: true });
  const tmp = `${target}.appledger-tmp`;
  const fd = openSync(tmp, "w");
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (existsSync(target)) unlinkSync(target);
  renameSync(tmp, target);
}

function repairPartial(target: string): void {
  const tmp = `${target}.appledger-tmp`;
  if (!existsSync(tmp)) return;
  if (!existsSync(target)) renameSync(tmp, target);
  else unlinkSync(tmp);
}

function acquireLock(home: string, transactionId: string): { ok: true } | { ok: false; message: string } {
  const path = lockPath(home);
  mkdirSync(dirname(path), { recursive: true });
  const next: LockFile = { pid: process.pid, transactionId, acquiredAt: new Date().toISOString() };
  try {
    const fd = openSync(path, "wx");
    try {
      writeFileSync(fd, JSON.stringify(next));
    } finally {
      closeSync(fd);
    }
    return { ok: true };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      return { ok: false, message: err instanceof Error ? err.message : "Could not acquire the writer lock." };
    }
  }
  let current: LockFile;
  try {
    current = JSON.parse(readFileSync(path, "utf8")) as LockFile;
  } catch {
    return { ok: false, message: "Writer lock is unreadable. It was not removed." };
  }
  if (current.transactionId === transactionId && current.pid === process.pid) return { ok: true };
  const alive = pidAlive(current.pid);
  if (alive === true) {
    return { ok: false, message: `Writer lock is held by pid ${current.pid} for ${current.transactionId}.` };
  }
  if (alive === "unknown") {
    return { ok: false, message: `Writer lock for pid ${current.pid} could not be verified. It was not taken.` };
  }
  writeFileSync(path, JSON.stringify(next));
  return { ok: true };
}

function releaseLock(home: string, transactionId: string): void {
  const path = lockPath(home);
  if (!existsSync(path)) return;
  try {
    const current = JSON.parse(readFileSync(path, "utf8")) as LockFile;
    if (current.transactionId === transactionId) unlinkSync(path);
  } catch {
    // Leave an unreadable lock in place.
  }
}

function pidAlive(pid: number): boolean | "unknown" {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return false;
    if (code === "EPERM") return true;
    return "unknown";
  }
}

function fileSha(path: string): string | null {
  if (!existsSync(path)) return null;
  const info = statSync(path);
  if (!info.isFile()) return null;
  return sha256Hex(readFileSync(path));
}

function resolveInside(home: string, relPosix: string): string {
  if (!relPosix || isUnsafeRelative(relPosix) || relPosix.includes("\\") || relPosix.startsWith(".appledger-cache/")) {
    throw new Error(`Unsafe path ${relPosix}`);
  }
  const absolute = resolve(home, ...relPosix.split("/"));
  if (!isInside(home, absolute)) throw new Error(`Path escapes the repository: ${relPosix}`);
  return absolute;
}

function validateId(id: string): string | undefined {
  if (!ID_PATTERN.test(id)) return `Transaction id ${id} must be a single path segment.`;
  return undefined;
}

function transactionDir(home: string, id: string): string {
  return join(home, ".appledger-cache", "transactions", id);
}

function lockPath(home: string): string {
  return join(home, ".appledger-cache", "writer.lock");
}

function readJournal(home: string, id: string): Journal | undefined {
  const path = join(transactionDir(home, id), "journal.json");
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as Journal;
}

function writeJournal(dir: string, journal: Journal): void {
  const path = join(dir, "journal.json");
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, "w");
  try {
    writeFileSync(fd, JSON.stringify(journal));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (existsSync(path)) unlinkSync(path);
  renameSync(tmp, path);
}

function done(ok: boolean, status: TransactionStatus, id: string, paths: string[], message: string): TransactionResult {
  return { ok, status, id, paths, message };
}
