import { describe, expect, it } from "vitest";
import { PHASE_ROWS, mapPhaseKey } from "../src/phases.js";

describe("phase mapping", () => {
  it("maps every Lite number and full phase id", () => {
    expect(PHASE_ROWS).toHaveLength(7);
    for (const row of PHASE_ROWS) {
      expect(mapPhaseKey(row.lite)).toBe(row.profile);
      expect(mapPhaseKey(Number(row.lite))).toBe(row.profile);
      expect(mapPhaseKey(row.full)).toBe(row.profile);
    }
    expect(mapPhaseKey("8")).toBeUndefined();
    expect(mapPhaseKey("phase-x")).toBeUndefined();
  });
});
