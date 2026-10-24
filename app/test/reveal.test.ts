import { describe, expect, it } from "vitest";
import { advanceReveal, initialReveal, meterFillPercent, meterPositionAt, PHASE_MS, TIER_NAMES } from "../lib/reveal/machine";

describe("reveal meter", () => {
  it("never moves past the drawn tier", () => {
    for (const tier of [0, 1, 2, 3, 4]) {
      const ceiling = tier + 1;
      for (let ms = 0; ms <= 4000; ms += 25) {
        const position = meterPositionAt(ms, PHASE_MS.meter, tier);
        expect(position).toBeLessThanOrEqual(ceiling);
        expect(position).toBeGreaterThanOrEqual(0);
        expect(meterFillPercent(position)).toBeLessThanOrEqual((ceiling / 5) * 100 + 1e-9);
      }
      expect(meterPositionAt(10_000, PHASE_MS.meter, tier)).toBe(ceiling);
      let state = initialReveal({ tier, isGrail: tier === 4, skip: false });
      const seen = [state];
      for (let step = 0; step < 6; step++) {
        state = advanceReveal(state);
        seen.push(state);
        expect(state.meterTier).toBeLessThanOrEqual(state.meterCeiling);
        expect(state.meterCeiling).toBe(ceiling);
      }
      expect(seen.at(-1)?.phase).toBe("decision");
      expect(TIER_NAMES[tier]).toBeDefined();
    }
  });

  it("skip and the grail flag resolve to the drawn tier immediately", () => {
    const skipped = initialReveal({ tier: 1, isGrail: false, skip: true });
    expect(skipped.phase).toBe("decision");
    expect(skipped.meterTier).toBe(2);
    const grail = initialReveal({ tier: 4, isGrail: true, skip: false });
    expect(grail.inputs.isGrail).toBe(true);
    expect(grail.meterCeiling).toBe(5);
  });
});
