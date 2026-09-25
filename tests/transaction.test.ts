import { mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync, cpSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkLedger } from "../src/check.js";
import {
  applyTransaction,
  reconciliationKey,
  resumeTransaction,
  rollbackTransaction,
  stageTransaction,
} from "../src/transaction.js";

const minimal = fileURLToPath(new URL("../examples/minimal", import.meta.url));

function home(): string {
  return mkdtempSync(join(tmpdir(), "appledger-txn-"));
}

function write(root: string, path: string, text: string): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, text);
}

function read(root: string, path: string): string {
  return readFileSync(join(root, ...path.split("/")), "utf8");
}

function plan(id: string) {
  return {
    id,
    idempotencyKey: "key-1",
    files: [
      { path: "notes/a.txt", bytes: Buffer.from("A") },
      { path: "notes/b.txt", bytes: Buffer.from("B") },
    ],
  };
}

describe("transactions", () => {
  it("does not overwrite a concurrent edit", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    expect(stageTransaction(root, plan("txn-conflict")).status).toBe("staged");
    write(root, "notes/a.txt", "user edit");
    const result = applyTransaction(root, "txn-conflict");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("conflict");
    expect(result.paths).toEqual(["notes/a.txt"]);
    expect(read(root, "notes/a.txt")).toBe("user edit");
    expect(read(root, "notes/b.txt")).toBe("two");
  });

  it("stays incomplete when apply stops midway and can resume", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    stageTransaction(root, plan("txn-stop"));
    const stopped = applyTransaction(root, "txn-stop", { failAfterApplied: 1 });
    expect(stopped.ok).toBe(false);
    expect(stopped.status).toBe("applying");
    expect(read(root, "notes/a.txt")).toBe("A");
    expect(read(root, "notes/b.txt")).toBe("two");
    expect(existsSync(join(root, ".appledger-cache", "transactions", "txn-stop", "journal.json"))).toBe(true);

    const resumed = resumeTransaction(root, "txn-stop");
    expect(resumed.ok).toBe(true);
    expect(resumed.status).toBe("complete");
    expect(read(root, "notes/a.txt")).toBe("A");
    expect(read(root, "notes/b.txt")).toBe("B");
    expect(existsSync(join(root, ".appledger-cache", "transactions", "txn-stop"))).toBe(false);
  });

  it("rolls back only the paths an interrupted apply changed", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    stageTransaction(root, plan("txn-undo"));
    applyTransaction(root, "txn-undo", { failAfterApplied: 1 });
    const undone = rollbackTransaction(root, "txn-undo");
    expect(undone.ok).toBe(true);
    expect(undone.status).toBe("rolled_back");
    expect(read(root, "notes/a.txt")).toBe("one");
    expect(read(root, "notes/b.txt")).toBe("two");
  });

  it("refuses rollback of a path edited after it was applied", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    stageTransaction(root, plan("txn-later"));
    applyTransaction(root, "txn-later", { failAfterApplied: 1 });
    write(root, "notes/a.txt", "later");
    const undone = rollbackTransaction(root, "txn-later");
    expect(undone.ok).toBe(false);
    expect(undone.status).toBe("conflict");
    expect(read(root, "notes/a.txt")).toBe("later");
    expect(read(root, "notes/b.txt")).toBe("two");
  });

  it("writes nothing and does not change timestamps when the plan is already applied", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    stageTransaction(root, plan("txn-once"));
    expect(applyTransaction(root, "txn-once").status).toBe("complete");
    const first = statSync(join(root, "notes", "a.txt")).mtimeMs;
    const second = stageTransaction(root, plan("txn-once"));
    expect(second.status).toBe("unchanged");
    expect(second.ok).toBe(true);
    expect(statSync(join(root, "notes", "a.txt")).mtimeMs).toBe(first);
    expect(read(root, "notes/a.txt")).toBe("A");
  });

  it("does not apply while another live writer holds the lock", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    mkdirSync(join(root, ".appledger-cache"), { recursive: true });
    writeFileSync(
      join(root, ".appledger-cache", "writer.lock"),
      JSON.stringify({ pid: process.pid, transactionId: "other-writer", acquiredAt: "2026-09-25T20:40:00Z" }),
    );
    stageTransaction(root, plan("txn-locked"));
    const result = applyTransaction(root, "txn-locked");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("conflict");
    expect(read(root, "notes/a.txt")).toBe("one");
    expect(read(root, "notes/b.txt")).toBe("two");
  });

  it("takes a lock whose process is gone", () => {
    const root = home();
    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    const dead = deadPid();
    mkdirSync(join(root, ".appledger-cache"), { recursive: true });
    writeFileSync(
      join(root, ".appledger-cache", "writer.lock"),
      JSON.stringify({ pid: dead, transactionId: "gone", acquiredAt: "2026-09-25T20:40:00Z" }),
    );
    stageTransaction(root, plan("txn-stale"));
    const result = applyTransaction(root, "txn-stale");
    expect(result.status).toBe("complete");
    expect(read(root, "notes/a.txt")).toBe("A");
  });

  it("rejects a path that leaves the repository", () => {
    const root = home();
    const result = stageTransaction(root, {
      id: "txn-escape",
      files: [{ path: "../outside.txt", bytes: Buffer.from("no") }],
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
    expect(existsSync(join(root, "..", "outside.txt"))).toBe(false);
  });

  it("does not apply an invalid ledger and check reports an interrupted transaction", () => {
    const root = home();
    cpSync(join(minimal, "appledger"), join(root, "appledger"), { recursive: true });
    const target = "appledger/records/goal/goal-find-notes.md";
    const original = read(root, target);
    const staged = stageTransaction(root, {
      id: "txn-bad",
      files: [{ path: target, bytes: Buffer.from("not a record\n") }],
    });
    expect(staged.status).toBe("staged");
    const rejected = applyTransaction(root, "txn-bad");
    expect(rejected.ok).toBe(false);
    expect(rejected.status).toBe("rejected");
    expect(read(root, target)).toBe(original);

    write(root, "notes/a.txt", "one");
    write(root, "notes/b.txt", "two");
    stageTransaction(root, plan("txn-pending"));
    applyTransaction(root, "txn-pending", { failAfterApplied: 1 });
    const checked = checkLedger(root);
    expect(checked.ok).toBe(true);
    expect(checked.findings.some((item) => item.code === "incomplete_transaction" && item.path.includes("txn-pending"))).toBe(
      true,
    );
  });

  it("derives a stable reconciliation key from the fingerprint, policy, and adapters", () => {
    const first = reconciliationKey({
      inputFingerprint: "aaa",
      policyDigest: "bbb",
      adapterVersions: [
        { id: "featurefacts", version: "0.1.0" },
        { id: "appfacts", version: "0.1.0" },
      ],
    });
    const second = reconciliationKey({
      inputFingerprint: "aaa",
      policyDigest: "bbb",
      adapterVersions: [
        { id: "appfacts", version: "0.1.0" },
        { id: "featurefacts", version: "0.1.0" },
      ],
    });
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});

function deadPid(): number {
  for (let pid = 1_000_000; pid < 1_000_200; pid += 1) {
    try {
      process.kill(pid, 0);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ESRCH") return pid;
    }
  }
  throw new Error("Could not find an unused pid for the stale-lock test.");
}
