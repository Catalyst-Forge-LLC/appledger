import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { isInside, isUnsafeRelative } from "./sources.js";

/** Application label files that `bind` may link. FeatureFacts binds its register, not the rendered label. */
export const APPLICATION_LABEL_PATHS = {
  appfacts: "APP_FACTS.md",
  featurefacts: ".featurefacts/features.yaml",
} as const;

export type ApplicationFamily = keyof typeof APPLICATION_LABEL_PATHS;

/** Root label files for families whose subject must be declared before a binding can name it. */
export const SUBJECT_LABEL_PATHS = {
  toolfacts: "TOOL_FACTS.md",
  agentfacts: "AGENT_FACTS.md",
  skillfacts: "SKILL_FACTS.md",
  modelfacts: "MODEL_FACTS.md",
} as const;

export type HomeRepository = { id: string; abs: string };

export function homeRepository(home: string, manifest: Record<string, unknown>): HomeRepository | null {
  if (!Array.isArray(manifest.repositories)) return null;
  for (const item of manifest.repositories) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.root !== "string") continue;
    const root = record.root.replace(/\\/g, "/").replace(/\/$/, "");
    if (root !== "." && root !== "") continue;
    return { id: record.id, abs: resolve(home) };
  }
  return null;
}

export function labelFileExists(repoAbs: string, rel: string): boolean {
  if (isUnsafeRelative(rel)) return false;
  const abs = resolve(repoAbs, ...rel.split("/"));
  if (!isInside(repoAbs, abs) || !existsSync(abs)) return false;
  try {
    return statSync(abs).isFile();
  } catch {
    return false;
  }
}

const LABEL_NAMES: Record<ApplicationFamily, string> = { appfacts: "AppFacts label", featurefacts: "FeatureFacts register" };

/** Disposition for an application family that has no binding. A present file needs review; an absent one is not applicable. */
export function unboundApplication(
  family: ApplicationFamily,
  home: string,
  manifest: Record<string, unknown>,
): { disposition: "needs_review" | "not_applicable"; finding: string } {
  const repo = homeRepository(home, manifest);
  const path = APPLICATION_LABEL_PATHS[family];
  if (repo && labelFileExists(repo.abs, path)) {
    return {
      disposition: "needs_review",
      finding: `${path} exists and is not bound. Run \`appledger bind --apply\` to link it. No label was written.`,
    };
  }
  if (family === "featurefacts" && repo && labelFileExists(repo.abs, "FEATURE_FACTS.md")) {
    return {
      disposition: "needs_review",
      finding: `FEATURE_FACTS.md exists, but its register ${path} was not found, so it cannot be bound. No label was written.`,
    };
  }
  return {
    disposition: "not_applicable",
    finding: `No ${LABEL_NAMES[family]} was found at ${path}. Absent is a recorded outcome, not a missing label. No label was written.`,
  };
}
