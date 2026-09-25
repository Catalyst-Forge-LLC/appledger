import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLedger } from "./check.js";
import { orientLedger } from "./views.js";

export type CommandStatus = "implemented" | "not implemented";

export type CatalogEntry = {
  command: string;
  status: CommandStatus;
  behavior: string;
};

export function readCommandCatalog(specMarkdown: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const line of specMarkdown.split(/\r?\n/)) {
    if (!line.startsWith("| `appledger ")) continue;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 3) continue;
    const status = cells[1];
    if (status !== "implemented" && status !== "not implemented") continue;
    entries.push({
      command: cells[0].replace(/`/g, ""),
      status,
      behavior: cells[2],
    });
  }
  return entries;
}

export function commandCatalog(): CatalogEntry[] {
  const specPath = join(dirname(fileURLToPath(import.meta.url)), "..", "spec", "10-tooling-and-automation.md");
  return readCommandCatalog(readFileSync(specPath, "utf8"));
}

/** Entry packet for a fresh session: check, orient, and an explicit list of checks that were not run. */
export function demonstrateFreshSession(root: string, task: string): string {
  const catalog = commandCatalog();
  const check = checkLedger(root);
  const orientation = orientLedger({ root, task, budgetWords: 800 }).trimEnd();
  const ran = catalog.filter((entry) => entry.status === "implemented" && isEntryCommand(entry.command));
  const notRun = catalog.filter((entry) => !ran.includes(entry));
  const findings =
    check.findings.length === 0
      ? "check reported no findings."
      : check.findings.map((item) => `${item.severity} ${item.code} ${item.path}: ${item.message}`).join("\n");
  return [
    "# Fresh session",
    "",
    `Task: ${task}`,
    "",
    "Checks run:",
    ...ran.map((entry) => `- ${entry.command}`),
    "",
    "Checks not run:",
    ...notRun.map((entry) => `- ${entry.command} (${entry.status})`),
    "",
    "## Check",
    "",
    findings,
    "",
    "## Orientation",
    "",
    orientation,
    "",
    "## Limits of this packet",
    "",
    "Checks that were not run are not implied to have passed. A supported declaration is not observed implementation. No xFacts label was generated.",
    "",
  ].join("\n");
}

function isEntryCommand(command: string): boolean {
  return command === "appledger check" || command === "appledger orient";
}
