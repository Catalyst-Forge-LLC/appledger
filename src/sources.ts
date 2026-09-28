import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Finding, Severity } from "./check.js";
import { sha256Hex } from "./digest.js";

type RecordDoc = {
  path: string;
  id: string;
  kind: string;
  value: Record<string, unknown>;
};

type Repo = {
  id: string;
  abs: string;
};

const NOT_ABSENT = "This check did not decide whether the subject exists.";

export function checkSources(
  ledgerRoot: string,
  manifest: Record<string, unknown>,
  records: RecordDoc[],
  findings: Finding[],
): void {
  const repos = loadRepos(ledgerRoot, manifest, findings);
  const bindings = loadBindings(manifest);
  const staleEvidence = new Set<string>();

  for (const binding of bindings) {
    const repo = repos.get(binding.repositoryId);
    if (!repo) {
      findings.push(
        finding(
          "unresolved_ref",
          "error",
          "manifest.yaml",
          `Binding ${binding.id} names unknown repository ${binding.repositoryId}`,
        ),
      );
      continue;
    }
    const located = locate(repo.abs, binding.path);
    if (located.status === "escape") {
      findings.push(finding("path_escape", "error", "manifest.yaml", `Binding ${binding.id} escapes its repository`));
      continue;
    }
    if (located.status === "missing") {
      findings.push(
        finding(
          "missing_source",
          "warning",
          "manifest.yaml",
          `Binding ${binding.id} source ${binding.path} is not available. ${NOT_ABSENT}`,
        ),
      );
      continue;
    }
    if (located.status === "unreadable") {
      findings.push(
        finding(
          "partial_scope",
          "warning",
          "manifest.yaml",
          `Binding ${binding.id} source ${binding.path} could not be read. Records outside that path were left unchanged. ${NOT_ABSENT}`,
        ),
      );
      continue;
    }
    findings.push(
      finding(
        "unsupported",
        "warning",
        "manifest.yaml",
        `Binding ${binding.id} file was read. Check does not interpret ${binding.family}. Native ids were neither confirmed nor denied. ${NOT_ABSENT} Run \`appledger subjects --operation validate --family ${binding.family}\` to check it against the pinned schema.`,
      ),
    );
  }

  for (const record of records) {
    noteExternal(record, bindings, repos, findings);
    if (record.kind !== "evidence") continue;
    const data = dataOf(record.value);
    const source = stringField(data, "source");
    const repositoryId = stringField(data, "repository_id");
    if (!source || !repositoryId) continue;
    const repo = repos.get(repositoryId);
    if (!repo) {
      findings.push(
        finding("unresolved_ref", "error", record.path, `Evidence names unknown repository ${repositoryId}`),
      );
      staleEvidence.add(record.id);
      continue;
    }
    const located = locate(repo.abs, source);
    if (located.status === "escape") {
      findings.push(finding("path_escape", "error", record.path, `Evidence source escapes repository ${repositoryId}`));
      staleEvidence.add(record.id);
      continue;
    }
    if (located.status === "missing") {
      findings.push(
        finding(
          "missing_source",
          "warning",
          record.path,
          `Evidence source ${source} is not available. Claims that cite this evidence need review. ${NOT_ABSENT}`,
        ),
      );
      staleEvidence.add(record.id);
      continue;
    }
    if (located.status === "unreadable") {
      findings.push(
        finding(
          "partial_scope",
          "warning",
          record.path,
          `Evidence source ${source} could not be read. Other records were not marked missing. ${NOT_ABSENT}`,
        ),
      );
      staleEvidence.add(record.id);
      continue;
    }
    const digest = stringField(data, "digest");
    if (!digest) continue;
    const actual = sha256Hex(readFileSync(located.abs));
    if (actual !== digest) {
      findings.push(
        finding(
          "freshness",
          "warning",
          record.path,
          `Recorded digest does not match source ${source}. Claims that cite this evidence need review.`,
        ),
      );
      staleEvidence.add(record.id);
    }
  }

  for (const record of records) {
    const claims = Array.isArray(record.value.claims) ? record.value.claims : [];
    for (const claim of claims) {
      if (!claim || typeof claim !== "object") continue;
      const claimObj = claim as Record<string, unknown>;
      const claimId = stringField(claimObj, "id") ?? "claim";
      const refs = Array.isArray(claimObj.evidence_refs) ? claimObj.evidence_refs : [];
      const citesStale = refs.some((ref) => typeof ref === "string" && staleEvidence.has(ref));
      if (citesStale) {
        findings.push(
          finding(
            "freshness",
            "warning",
            record.path,
            `Claim ${claimId} needs freshness review because cited evidence changed or is unavailable.`,
          ),
        );
      }
      const revision = revisionOf(claimObj);
      if (!revision) continue;
      const head = gitHead(dirnameHome(ledgerRoot));
      if (!head) {
        findings.push(
          finding(
            "unsupported",
            "warning",
            record.path,
            `Claim ${claimId} records revision ${revision}, and the git revision could not be read. ${NOT_ABSENT}`,
          ),
        );
        continue;
      }
      if (head !== revision) {
        findings.push(
          finding(
            "freshness",
            "warning",
            record.path,
            `Claim ${claimId} records revision ${revision}, which is not the current git HEAD ${head}. The claim needs review.`,
          ),
        );
      }
    }
  }
}

function noteExternal(
  record: RecordDoc,
  bindings: Binding[],
  repos: Map<string, Repo>,
  findings: Finding[],
): void {
  const targets = externalTargets(record.value);
  for (const target of targets) {
    const bindingId = target.slice("binding:".length).split("#")[0] ?? "";
    const binding = bindings.find((item) => item.id === bindingId);
    if (!binding) continue;
    const repo = repos.get(binding.repositoryId);
    if (!repo) continue;
    const located = locate(repo.abs, binding.path);
    if (located.status === "missing" || located.status === "unreadable" || located.status === "escape") {
      findings.push(
        finding(
          "unresolved_ref",
          "warning",
          record.path,
          `External target ${target} is unresolved because its binding source is not available. ${NOT_ABSENT}`,
        ),
      );
    }
  }
}

function externalTargets(value: Record<string, unknown>): string[] {
  const targets: string[] = [];
  if (Array.isArray(value.relations)) {
    for (const relation of value.relations) {
      if (!relation || typeof relation !== "object") continue;
      const target = (relation as { target?: unknown }).target;
      if (typeof target === "string" && target.startsWith("binding:")) targets.push(target);
    }
  }
  const data = dataOf(value);
  const external = stringField(data, "external_ref");
  if (external?.startsWith("binding:")) targets.push(external);
  return targets;
}

type Binding = {
  id: string;
  family: string;
  repositoryId: string;
  path: string;
};

function loadBindings(manifest: Record<string, unknown>): Binding[] {
  if (!Array.isArray(manifest.bindings)) return [];
  const bindings: Binding[] = [];
  for (const binding of manifest.bindings) {
    if (!binding || typeof binding !== "object") continue;
    const obj = binding as Record<string, unknown>;
    const id = stringField(obj, "id");
    const family = stringField(obj, "family");
    const repositoryId = stringField(obj, "repository_id");
    const path = stringField(obj, "path");
    if (id && family && repositoryId && path) bindings.push({ id, family, repositoryId, path });
  }
  return bindings;
}

function loadRepos(ledgerRoot: string, manifest: Record<string, unknown>, findings: Finding[]): Map<string, Repo> {
  const repos = new Map<string, Repo>();
  const home = dirnameHome(ledgerRoot);
  if (!Array.isArray(manifest.repositories)) return repos;
  for (const repository of manifest.repositories) {
    if (!repository || typeof repository !== "object") continue;
    const obj = repository as Record<string, unknown>;
    const id = stringField(obj, "id");
    const root = stringField(obj, "root");
    if (!id || !root) continue;
    if (isUnsafeRelative(root)) {
      findings.push(finding("path_escape", "error", "manifest.yaml", `Repository ${id} root escapes the home repository`));
      continue;
    }
    const abs = resolve(home, root);
    if (!isInside(home, abs)) {
      findings.push(finding("path_escape", "error", "manifest.yaml", `Repository ${id} root escapes the home repository`));
      continue;
    }
    repos.set(id, { id, abs });
  }
  return repos;
}

type Located =
  | { status: "ok"; abs: string }
  | { status: "missing" }
  | { status: "escape" }
  | { status: "unreadable" };

function locate(repoAbs: string, rel: string): Located {
  if (isUnsafeRelative(rel)) return { status: "escape" };
  const abs = resolve(repoAbs, ...rel.split("/"));
  if (!isInside(repoAbs, abs)) return { status: "escape" };
  if (!existsSync(abs)) return { status: "missing" };
  let real: string;
  try {
    real = realpathSync(abs);
  } catch {
    return { status: "unreadable" };
  }
  if (!isInside(repoAbs, real)) return { status: "escape" };
  try {
    const stat = statSync(real);
    if (!stat.isFile()) return { status: "unreadable" };
    return { status: "ok", abs: real };
  } catch {
    return { status: "unreadable" };
  }
}

function gitHead(cwd: string): string | undefined {
  try {
    const output = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return /^[0-9a-f]{40}$/i.test(output) ? output.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

function revisionOf(claim: Record<string, unknown>): string | undefined {
  const scope = claim.scope;
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) return undefined;
  return stringField(scope as Record<string, unknown>, "revision");
}

function dirnameHome(ledgerRoot: string): string {
  return resolve(ledgerRoot, "..");
}

function dataOf(value: Record<string, unknown>): Record<string, unknown> {
  const data = value.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return data as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function finding(code: string, severity: Severity, path: string, message: string): Finding {
  return { code, severity, path, message };
}

export function isUnsafeRelative(path: string): boolean {
  return isAbsolute(path) || path.split("/").includes("..") || /^[A-Za-z]:/.test(path);
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}
