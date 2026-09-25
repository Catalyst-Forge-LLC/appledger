#!/usr/bin/env node
import { checkLedger } from "./check.js";

const argv = process.argv.slice(2);
const command = argv[0];

if (!command || command === "--help" || command === "-h") {
  usage(command ? 0 : 2);
} else if (command !== "check") {
  console.error(`appledger ${command} is not implemented.`);
  console.error("Implemented: check");
  process.exit(4);
} else {
  let root = process.cwd();
  let format: "text" | "json" = "text";
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") {
      const next = argv[i + 1];
      if (!next) {
        console.error("--root requires a path");
        process.exit(2);
      }
      root = next;
      i += 1;
    } else if (arg === "--format") {
      const next = argv[i + 1];
      if (next !== "text" && next !== "json") {
        console.error("--format must be text or json");
        process.exit(2);
      }
      format = next;
      i += 1;
    } else {
      console.error(`Unknown argument ${arg}`);
      process.exit(2);
    }
  }
  try {
    const result = checkLedger(root);
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

function usage(code: number): never {
  console.log(`appledger check [--root DIR] [--format text|json]

Reads an AppLedger directory and reports schema, reference, and predicate findings.
Does not modify files. Other commands are not implemented yet.`);
  process.exit(code);
}
