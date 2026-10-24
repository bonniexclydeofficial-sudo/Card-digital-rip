import { describe, expect, it } from "vitest";
import {
  BLOCKED_STATES,
  ageDecision,
  assertRipAllowed,
  fundingHoldUntil,
  geoDecision,
  shipHoldForPull,
  withinDailyLimit,
  FIRST_TIME_HOLD_MS,
  FUNDING_HOLD_MS,
} from "../src/index";

const now = new Date("2026-10-24T15:00:00.000Z");

describe("age gate", () => {
  it("blocks the day before an 18th birthday and allows the birthday", () => {
    const turnsToday = ageDecision(new Date("2008-10-24T00:00:00.000Z"), now);
    const turnsTomorrow = ageDecision(new Date("2008-10-25T00:00:00.000Z"), now);
    const already = ageDecision(new Date("2008-10-23T00:00:00.000Z"), now);
    expect(turnsToday.allowed).toBe(true);
    expect(turnsToday.age).toBe(18);
    expect(turnsTomorrow.allowed).toBe(false);
    expect(turnsTomorrow.age).toBe(17);
    expect(already.allowed).toBe(true);
  });
});

describe("geo gate", () => {
  it("blocks the spec state list and allows the rest", () => {
    for (const state of BLOCKED_STATES) {
      expect(geoDecision(state).allowed).toBe(false);
      expect(geoDecision(state.toLowerCase()).allowed).toBe(false);
    }
    expect(geoDecision("CA").allowed).toBe(true);
    expect(geoDecision(" ny ").allowed).toBe(true);
    expect(geoDecision("California").allowed).toBe(false);
  });

  it("re-checks a request location even when the account state is clear", () => {
    expect(assertRipAllowed("CA", null).allowed).toBe(true);
    expect(assertRipAllowed("CA", "WA").allowed).toBe(false);
    expect(assertRipAllowed("OK", "CA").allowed).toBe(false);
    expect(assertRipAllowed("CA", "").allowed).toBe(true);
  });
});

describe("funding hold clock", () => {
  it("uses 7 days for a first card top-up and 72 hours after that", () => {
    const first = fundingHoldUntil({ now, firstCardTopUp: true });
    const later = fundingHoldUntil({ now, firstCardTopUp: false });
    expect(first.getTime() - now.getTime()).toBe(FIRST_TIME_HOLD_MS);
    expect(later.getTime() - now.getTime()).toBe(FUNDING_HOLD_MS);
  });

  it("holds shipping only when held card funds were used and KYC has not passed", () => {
    const until = new Date("2026-10-27T00:00:00.000Z");
    expect(shipHoldForPull({ usedHeldCardCents: 100, fundingHoldUntil: until, kycPassed: false })).toEqual(until);
    expect(shipHoldForPull({ usedHeldCardCents: 0, fundingHoldUntil: until, kycPassed: false })).toBeNull();
    expect(shipHoldForPull({ usedHeldCardCents: 100, fundingHoldUntil: until, kycPassed: true })).toBeNull();
  });

  it("enforces the daily top-up limit", () => {
    expect(withinDailyLimit(40_000, 10_000, 50_000)).toBe(true);
    expect(withinDailyLimit(40_000, 10_001, 50_000)).toBe(false);
  });
});
