import { describe, expect, it } from "vitest";
import {
  BASE_CASE,
  buybackCreditCents,
  costFactor,
  designEvCents,
  grossMargin,
  LIVE_PACKS,
  playerReturn,
  targetRtp,
} from "../src/index";

describe("SPEC §5.3 formulas", () => {
  it("weights buyback and replacement the way the spec does", () => {
    const drag = costFactor(BASE_CASE);
    expect(drag).toBeCloseTo(0.92 * 0.9 + 0.08 * 0.85, 10);
    expect(drag).toBeCloseTo(0.896, 10);
  });

  it("RTP* matches 0.905 / 0.896 within 0.1 pt", () => {
    const rtp = targetRtp({ m: 0.05 });
    const expected = 0.905 / 0.896;
    expect(rtp).toBeCloseTo(expected, 8);
    expect(Math.abs(rtp * 100 - expected * 100)).toBeLessThanOrEqual(0.1);
    expect(rtp * 100).toBeCloseTo(101, 0);
  });

  it("GM at RTP 101% is 5.0% within 0.1 pt", () => {
    const gm = grossMargin(1.01);
    expect(gm).toBeCloseTo(1 - 1.01 * 0.896 - 0.045, 10);
    expect(Math.abs(gm * 100 - 5)).toBeLessThanOrEqual(0.1);
  });

  it("matches the sensitivity rows in §5.4", () => {
    expect(grossMargin(1.01) * 100).toBeCloseTo(5.0, 1);
    expect(grossMargin(1.01, { b: 0.92 }) * 100).toBeCloseTo(3.1, 1);
    expect(grossMargin(1.01, { beta: 0.8 }) * 100).toBeCloseTo(5.6, 1);
    expect(grossMargin(1.01, { k: 0.95 }) * 100).toBeCloseTo(4.2, 1);
    expect(grossMargin(1.01, { f: 0.065 }) * 100).toBeCloseTo(3.0, 1);
    expect(grossMargin(1.04) * 100).toBeCloseTo(2.3, 1);
  });

  it("player return at the base RTP is about 92%", () => {
    const value = playerReturn(1.01);
    expect(value).toBeCloseTo(1.01 * 0.908, 6);
    expect(Math.abs(value * 100 - 92)).toBeLessThanOrEqual(0.5);
  });
});

describe("example packs", () => {
  it("builds the §5.6 $100 pack at $100.94 EV", () => {
    const pack = LIVE_PACKS.find((item) => item.slug === "pack-100");
    expect(pack).toBeTruthy();
    expect(designEvCents(pack!)).toBe(10094);
    expect(designEvCents(pack!) / pack!.priceCents).toBeCloseTo(1.0094, 6);
  });

  it("keeps $25 and $500 inside the RTP band with GM >= 4%", () => {
    for (const pack of LIVE_PACKS) {
      const rtp = designEvCents(pack) / pack.priceCents;
      expect(rtp).toBeGreaterThanOrEqual(0.98);
      expect(rtp).toBeLessThanOrEqual(1.03);
      expect(grossMargin(rtp)).toBeGreaterThanOrEqual(0.04);
    }
    expect(designEvCents(LIVE_PACKS[0])).toBe(2520);
    expect(designEvCents(LIVE_PACKS[2])).toBe(50480);
  });
});

describe("buyback credit", () => {
  it("floors FMV × haircut × rate once", () => {
    expect(buybackCreditCents(10094, "high").creditCents).toBe(9084);
    expect(buybackCreditCents(10094, "low").creditCents).toBe(8176);
    expect(buybackCreditCents(10094, "low").haircutBps).toBe(9000);
  });
});
