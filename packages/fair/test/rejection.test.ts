import { describe, expect, it } from "vitest";
import { firstAccepted, rejectionLimit, rejectionSample } from "../src/index";

describe("rejection sampling", () => {
  it("drops the incomplete uint32 bucket above the limit", () => {
    const limit = rejectionLimit(10_000);
    expect(limit).toBe(4_294_960_000);
    expect(limit % 10_000).toBe(0);
    expect(rejectionSample(0, 10_000)).toBe(0);
    expect(rejectionSample(9_999, 10_000)).toBe(9_999);
    expect(rejectionSample(10_000, 10_000)).toBe(0);
    expect(rejectionSample(limit - 1, 10_000)).toBe((limit - 1) % 10_000);
    expect(rejectionSample(limit, 10_000)).toBeNull();
    expect(rejectionSample(0xffff_ffff, 10_000)).toBeNull();
  });

  it("reads the next word after a rejection", () => {
    const limit = rejectionLimit(10_000);
    const sampled = firstAccepted([limit, 0xffff_ffff, 42], 10_000);
    expect(sampled).toEqual({ value: 42, wordsUsed: 3 });
  });

  it("rejects a modulus that does not divide evenly without bias", () => {
    const modulus = 10;
    const limit = rejectionLimit(modulus);
    expect(rejectionSample(limit, modulus)).toBeNull();
    expect(rejectionSample(limit - 1, modulus)).toBe((limit - 1) % modulus);
  });
});
