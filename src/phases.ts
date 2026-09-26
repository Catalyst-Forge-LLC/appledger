export const PHASE_ROWS = [
  { lite: "1", full: "1-architecture", profile: "plan" },
  { lite: "2", full: "2-scaffolding", profile: "build" },
  { lite: "3", full: "3-stabilization", profile: "stabilize" },
  { lite: "4", full: "4-feature-iteration", profile: "iterate" },
  { lite: "5", full: "5-refactoring", profile: "refine" },
  { lite: "6", full: "6-strategic-review", profile: "align" },
  { lite: "7", full: "7-hardening", profile: "harden" },
] as const;

export type ProfilePhase = (typeof PHASE_ROWS)[number]["profile"];

const BY_KEY = new Map<string, ProfilePhase>();
for (const row of PHASE_ROWS) {
  BY_KEY.set(row.lite, row.profile);
  BY_KEY.set(row.full, row.profile);
  BY_KEY.set(row.profile, row.profile);
}

export function mapPhaseKey(key: string | number): ProfilePhase | undefined {
  return BY_KEY.get(String(key));
}
