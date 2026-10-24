import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { draw, type TierOdds } from "../src/index";

interface Vector {
  name: string;
  serverSeedHex: string;
  clientSeed: string;
  nonce: number;
  packVersion: number;
  tiers: TierOdds[];
  slotCount: number;
  expected: {
    hmac: string;
    tier: string;
    roll: number;
    slotIndex: number;
  };
}

const vectors = JSON.parse(
  readFileSync(path.join(__dirname, "../vectors/published.json"), "utf8"),
) as Vector[];

describe("published fairness vectors", () => {
  it("recomputes every committed vector", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(5);
    for (const vector of vectors) {
      const result = draw(vector);
      expect(result.hmac, vector.name).toBe(vector.expected.hmac);
      expect(result.tier, vector.name).toBe(vector.expected.tier);
      expect(result.roll, vector.name).toBe(vector.expected.roll);
      expect(result.slotIndex, vector.name).toBe(vector.expected.slotIndex);
    }
  });
});
