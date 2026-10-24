import { describe, expect, it } from "vitest";
import { draw } from "../src/index";

const ODDS = [
  { tier: "common", oddsBps: 7200 },
  { tier: "rare", oddsBps: 2000 },
  { tier: "epic", oddsBps: 650 },
  { tier: "legendary", oddsBps: 140 },
  { tier: "grail", oddsBps: 10 },
];

describe("monte carlo", () => {
  it("lands within ±0.2 percentage points per tier over 1,000,000 rolls", () => {
    const rolls = 1_000_000;
    const counts = new Map<string, number>(ODDS.map((tier) => [tier.tier, 0]));
    for (let nonce = 0; nonce < rolls; nonce++) {
      const result = draw({
        serverSeedHex: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        clientSeed: "mc",
        nonce,
        packVersion: 1,
        tiers: ODDS,
        slotCount: 3,
      });
      counts.set(result.tier, (counts.get(result.tier) ?? 0) + 1);
    }
    for (const tier of ODDS) {
      const pct = ((counts.get(tier.tier) ?? 0) / rolls) * 100;
      const expected = tier.oddsBps / 100;
      expect(Math.abs(pct - expected), `${tier.tier} got ${pct}`).toBeLessThanOrEqual(0.2);
    }
  });
});
