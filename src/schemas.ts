import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");

function readSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(schemaDir, name), "utf8")) as Record<string, unknown>;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = addFormatsImport as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);

const envelope = readSchema("record-envelope.schema.json");
ajv.addSchema(envelope, "record-envelope.schema.json");

export const validators = {
  manifest: ajv.compile(readSchema("manifest.schema.json")),
  kinds: ajv.compile(readSchema("record-kinds.schema.json")),
  profile: ajv.compile(readSchema("profile-forgetrail.schema.json")),
  policy: ajv.compile(readSchema("policy.schema.json")),
} as const;

export type SchemaName = keyof typeof validators;

export function schemaErrors(schema: SchemaName, value: unknown, path: string): string[] {
  const validate: ValidateFunction = validators[schema];
  if (validate(value)) return [];
  return (validate.errors ?? []).map((err) => formatAjv(path, err));
}

function formatAjv(path: string, err: ErrorObject): string {
  const at = `${path}${err.instancePath || ""}`;
  return `${at}: ${err.message ?? "schema violation"}`;
}
