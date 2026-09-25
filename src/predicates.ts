export type KindSet = ReadonlySet<string>;

export type PredicateRule = {
  sources: KindSet | "any";
  targets: KindSet | "any" | "same";
  /** Kinds that must not store this predicate. */
  sourceExcept?: KindSet;
};

const kinds = (list: string[]): KindSet => new Set(list);

export const PREDICATES: Record<string, PredicateRule> = {
  serves: { sources: kinds(["use_case"]), targets: kinds(["goal"]) },
  supports: {
    sources: kinds(["application", "capability_ref", "component"]),
    targets: kinds(["goal", "use_case"]),
  },
  realizes: {
    sources: kinds(["work", "component", "capability_ref"]),
    targets: kinds(["use_case", "goal"]),
  },
  uses: {
    sources: kinds(["use_case", "component", "work", "capability_ref"]),
    targets: kinds(["concept", "component", "capability_ref"]),
  },
  defines: { sources: kinds(["concept"]), targets: kinds(["concept"]) },
  implemented_by: { sources: kinds(["capability_ref"]), targets: kinds(["component"]) },
  owned_by: {
    sources: kinds(["goal", "component", "work", "decision", "constraint", "capability_ref"]),
    targets: kinds(["stakeholder"]),
  },
  constrained_by: {
    sources: kinds(["application", "use_case", "component", "work", "capability_ref"]),
    targets: kinds(["constraint"]),
  },
  decided_by: {
    sources: kinds(["application", "component", "work", "constraint", "capability_ref"]),
    targets: kinds(["decision"]),
  },
  verified_by: {
    sources: "any",
    sourceExcept: kinds(["evidence"]),
    targets: kinds(["evidence"]),
  },
  affects: {
    sources: kinds(["work", "decision", "change", "session", "constraint", "question"]),
    targets: "any",
  },
  depends_on: {
    sources: kinds(["component", "work", "capability_ref", "goal", "use_case"]),
    targets: kinds(["component", "capability_ref", "work", "decision", "constraint"]),
  },
  supersedes: { sources: "any", targets: "same" },
  derived_from: { sources: "any", targets: "any" },
  recorded_in: {
    sources: kinds(["work", "decision", "lesson", "change", "evidence", "question"]),
    targets: kinds(["session"]),
  },
};
