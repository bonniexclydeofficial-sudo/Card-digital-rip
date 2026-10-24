import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  ageDecision,
  effectiveLimit,
  equalEntryWeights,
  geoDecision,
  kycRequired,
  locationDecision,
  minimumAge,
  promoAllowed,
  realityCheckDue,
  salesTaxCents,
  scheduleLimitChange,
  vipBuybackBps,
  vipTierFromSpend,
  BUYBACK_OFFER_MS,
} from "../src/index";

const now = new Date("2026-10-24T15:00:00.000Z");

describe("compliance positions", () => {
  it("uses the higher of 18 and the state age of majority", () => {
    expect(minimumAge("CA")).toBe(18);
    expect(minimumAge("AL")).toBe(19);
    expect(minimumAge("NE")).toBe(19);
    expect(minimumAge("MS")).toBe(21);
    expect(ageDecision(new Date("2008-10-24T00:00:00.000Z"), now, minimumAge("AL")).allowed).toBe(false);
    expect(ageDecision(new Date("2007-10-24T00:00:00.000Z"), now, minimumAge("AL")).allowed).toBe(true);
    expect(ageDecision(new Date("2006-10-24T00:00:00.000Z"), now, minimumAge("MS")).allowed).toBe(false);
    expect(ageDecision(new Date("2005-10-24T00:00:00.000Z"), now, minimumAge("MS")).allowed).toBe(true);
  });

  it("keeps OK, NJ, TN, and LA closed until their open flags are on", () => {
    for (const state of ["OK", "NJ", "TN", "LA"]) {
      expect(geoDecision(state).allowed).toBe(false);
    }
    expect(geoDecision("OK", { OK: true }).allowed).toBe(true);
    expect(geoDecision("NJ", { NJ: true }).allowed).toBe(true);
    expect(geoDecision("WA", { WA: true } as never).allowed).toBe(false);
    expect(geoDecision("NY").allowed).toBe(true);
  });

  it("rejects a VPN and a blocked billing or IP state", () => {
    expect(locationDecision({ accountState: "CA", vpn: true }).allowed).toBe(false);
    expect(locationDecision({ accountState: "CA", ipState: "LA" }).allowed).toBe(false);
    expect(locationDecision({ accountState: "CA", billingState: "TN" }).allowed).toBe(false);
    expect(locationDecision({ accountState: "CA", ipState: "OR", billingState: "CA" }).allowed).toBe(true);
  });

  it("voids promos in NY and FL and keeps account access there", () => {
    expect(promoAllowed("NY").allowed).toBe(false);
    expect(promoAllowed("FL").allowed).toBe(false);
    expect(promoAllowed("CA").allowed).toBe(true);
    expect(geoDecision("NY").allowed).toBe(true);
  });

  it("delays a limit increase by 24 hours and applies a decrease now", () => {
    const up = scheduleLimitChange({ currentCents: 50_000, requestedCents: 80_000, now });
    expect(up.appliedCents).toBe(50_000);
    expect(up.pendingAt?.getTime()).toBe(now.getTime() + 24 * 60 * 60 * 1000);
    expect(effectiveLimit({ currentCents: 50_000, pendingCents: 80_000, pendingAt: up.pendingAt, now })).toBe(50_000);
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(effectiveLimit({ currentCents: 50_000, pendingCents: 80_000, pendingAt: up.pendingAt, now: later })).toBe(80_000);
    const down = scheduleLimitChange({ currentCents: 50_000, requestedCents: 10_000, now });
    expect(down.appliedCents).toBe(10_000);
    expect(down.pendingCents).toBeNull();
  });

  it("requires KYC at the spec thresholds and prices VIP buyback only when enabled", () => {
    expect(kycRequired({ lifetimeTopupCents: 49_999 })).toBe(false);
    expect(kycRequired({ lifetimeTopupCents: 50_000 })).toBe(true);
    expect(kycRequired({ lifetimeTopupCents: 0, shipmentFmvCents: 100_001 })).toBe(true);
    expect(kycRequired({ lifetimeTopupCents: 0, vipTier: 1 })).toBe(true);
    expect(vipTierFromSpend(100_000)).toBe(1);
    expect(vipTierFromSpend(1_000_000)).toBe(2);
    expect(vipBuybackBps(1, false)).toBe(9000);
    expect(vipBuybackBps(1, true)).toBe(9100);
    expect(vipBuybackBps(3, true)).toBe(9200);
  });

  it("taxes card spend and not the credit purchase", () => {
    expect(salesTaxCents("credit_purchase", 10_000, 725)).toBe(0);
    expect(salesTaxCents("card_spend", 10_000, 725)).toBe(725);
  });

  it("gives free and paid promo entries the same weight", () => {
    const weights = equalEntryWeights([
      { id: "paid", source: "purchase" },
      { id: "free", source: "amoe" },
    ]);
    expect(weights.map((entry) => entry.weight)).toEqual([1, 1]);
  });

  it("counts two business days and a 72-hour buyback window", () => {
    const friday = new Date("2026-10-23T15:00:00.000Z");
    expect(addBusinessDays(friday, 2).toISOString().slice(0, 10)).toBe("2026-10-27");
    expect(BUYBACK_OFFER_MS).toBe(72 * 60 * 60 * 1000);
    expect(realityCheckDue(new Date(now.getTime() - 61 * 60 * 1000), now, 60)).toBe(true);
    expect(realityCheckDue(new Date(now.getTime() - 10 * 60 * 1000), now, 60)).toBe(false);
  });
});
