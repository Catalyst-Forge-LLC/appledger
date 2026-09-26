import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas", "pinned");

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = addFormatsImport as unknown as (instance: Ajv2020) => Ajv2020;
addFormats(ajv);

for (const name of ["common.schema.json", "feature-record.schema.json", "registry.schema.json"]) {
  ajv.addSchema(JSON.parse(readFileSync(join(root, "featurefacts", "0.2.0", name), "utf8")));
}

const featurefactsRegistry = ajv.getSchema("https://featurefacts.dev/schema/v0.2.0/registry.schema.json");
const appSchema = JSON.parse(readFileSync(join(root, "appfacts", "0.1.0", "app-facts.schema.json"), "utf8")) as {
  $schema?: string;
};
delete appSchema.$schema;
const appfactsLabel = ajv.compile(appSchema);
const skillSchema = JSON.parse(readFileSync(join(root, "skillfacts", "0.1.0", "skill-facts.schema.json"), "utf8")) as {
  $schema?: string;
};
delete skillSchema.$schema;
const skillfactsLabel = ajv.compile(skillSchema);
const toolSchema = JSON.parse(readFileSync(join(root, "toolfacts", "0.1.0", "tool-facts.schema.json"), "utf8")) as {
  $schema?: string;
};
delete toolSchema.$schema;
const toolfactsLabel = ajv.compile(toolSchema);

if (!featurefactsRegistry) throw new Error("Pinned FeatureFacts registry schema did not load");

export const pinnedValidators = {
  featurefacts: featurefactsRegistry,
  appfacts: appfactsLabel,
  skillfacts: skillfactsLabel,
  toolfacts: toolfactsLabel,
} as const;

export function pinnedErrors(validate: ValidateFunction, value: unknown): string[] {
  if (validate(value)) return [];
  return (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`);
}
