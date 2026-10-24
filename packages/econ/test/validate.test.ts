import { describe, expect, it } from "vitest";
import {
  designEvCents,
  DRAFT_OK,
  DRAFT_THIN_MARGIN,
  LIVE_PACKS,
  tiersToPool,
  validatePack,
  type PoolCard,
  type PoolTier,
} from "../src/index";

const now = new Date("2026-10-24T12:00:00.000Z");

function inventoryOf(tiers: PoolTier[]): number {
  return tiers.reduce((sum, tier) => sum + tier.cards.reduce((s, card) => s + card.fmvCents, 0), 0);
}

function freshCard(id: string, fmvCents: number, extra: Partial<PoolCard> = {}): PoolCard {
  return {
    id,
    fmvCents,
    fmvAt: now.toISOString(),
    imageFrontUrl: `/api/slab/${id}?side=front`,
    imageBackUrl: `/api/slab/${id}?side=back`,
    ...extra,
  };
}

describe("pack validator", () => {
  it("accepts the three live designs and the healthy draft", () => {
    for (const pack of [...LIVE_PACKS, DRAFT_OK]) {
      const tiers = tiersToPool(pack, now);
      const result = validatePack({
        priceCents: pack.priceCents,
        tiers,
        inventoryFmvCents: inventoryOf(tiers),
        now,
      });
      expect(result.ok, result.errors.map((e) => e.message).join("; ")).toBe(true);
      expect(result.evCents).toBe(designEvCents(pack));
    }
  });

  it("blocks the thin-margin draft on MARGIN only", () => {
    const tiers = tiersToPool(DRAFT_THIN_MARGIN, now);
    const result = validatePack({
      priceCents: DRAFT_THIN_MARGIN.priceCents,
      tiers,
      inventoryFmvCents: inventoryOf(tiers),
      now,
    });
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toEqual(["MARGIN"]);
    expect(result.gm).toBeLessThan(0.04);
    expect(result.rtp).toBeGreaterThan(0.98);
    expect(result.rtp).toBeLessThan(1.03);
  });

  it("rejects odds that do not sum to 10000", () => {
    const tiers = tiersToPool(DRAFT_OK, now);
    tiers[0].oddsBps -= 1;
    const result = validatePack({
      priceCents: DRAFT_OK.priceCents,
      tiers,
      inventoryFmvCents: inventoryOf(tiers),
      now,
    });
    expect(result.errors.some((e) => e.code === "ODDS_SUM")).toBe(true);
  });

  it("rejects RTP outside 98–103%", () => {
    const tiers = tiersToPool(DRAFT_OK, now);
    const result = validatePack({
      priceCents: 1000,
      tiers,
      inventoryFmvCents: inventoryOf(tiers),
      now,
    });
    expect(result.errors.some((e) => e.code === "RTP_BAND")).toBe(true);
  });

  it("rejects a card worth more than 10% of EV", () => {
    const tiers: PoolTier[] = [
      {
        tier: "common",
        oddsBps: 10_000,
        cards: [freshCard("a", 100), freshCard("b", 100), freshCard("c", 100_000)],
      },
    ];
    const ev = (100 + 100 + 100_000) / 3;
    const result = validatePack({
      priceCents: Math.round(ev),
      tiers,
      inventoryFmvCents: inventoryOf(tiers),
      now,
    });
    expect(result.errors.some((e) => e.code === "CARD_EV_SHARE")).toBe(true);
  });

  it("rejects a tier with fewer than 3 cards", () => {
    const tiers = tiersToPool(DRAFT_OK, now);
    tiers[4].cards = tiers[4].cards.slice(0, 2);
    const result = validatePack({
      priceCents: DRAFT_OK.priceCents,
      tiers,
      inventoryFmvCents: inventoryOf(tiers) ,
      now,
    });
    expect(result.errors.some((e) => e.code === "TIER_DEPTH")).toBe(true);
  });

  it("rejects stale prices, including the 24h rule above $1,000", () => {
    const week = tiersToPool(DRAFT_OK, now);
    week[0].cards[0].fmvAt = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const staleWeek = validatePack({
      priceCents: DRAFT_OK.priceCents,
      tiers: week,
      inventoryFmvCents: inventoryOf(week),
      now,
    });
    expect(staleWeek.errors.some((e) => e.code === "STALE_PRICE")).toBe(true);

    const rich = tiersToPool(DRAFT_THIN_MARGIN, now);
    rich[0].cards[0].fmvAt = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    const staleDay = validatePack({
      priceCents: DRAFT_THIN_MARGIN.priceCents,
      tiers: rich,
      inventoryFmvCents: inventoryOf(rich),
      now,
    });
    expect(staleDay.errors.some((e) => e.code === "STALE_PRICE")).toBe(true);
  });

  it("rejects liability above in-custody inventory", () => {
    const tiers = tiersToPool(DRAFT_OK, now);
    const result = validatePack({
      priceCents: DRAFT_OK.priceCents,
      tiers,
      inventoryFmvCents: inventoryOf(tiers) - 1,
      now,
    });
    expect(result.errors.some((e) => e.code === "LIABILITY")).toBe(true);
  });

  it("rejects allocated cards without images", () => {
    const tiers = tiersToPool(DRAFT_OK, now);
    tiers[1].cards[0].imageBackUrl = null;
    const result = validatePack({
      priceCents: DRAFT_OK.priceCents,
      tiers,
      inventoryFmvCents: inventoryOf(tiers),
      now,
    });
    expect(result.errors.some((e) => e.code === "MISSING_IMAGE")).toBe(true);
  });
});
