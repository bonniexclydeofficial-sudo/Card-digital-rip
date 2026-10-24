/** Geo, age, funding holds, and the compliance gates from LEGAL_POSITIONS. */

/** Always closed. */
export const CORE_BLOCKED_STATES = ["WA", "NV", "MI", "ID", "MT"] as const;

/**
 * Per-state open flags. Default off: the state stays blocked until counsel opens it.
 * OK (SB 1589), NJ, TN, and LA.
 */
export const FLAG_STATES = ["OK", "NJ", "TN", "LA"] as const;
export type FlagState = (typeof FLAG_STATES)[number];

export const DEFAULT_STATE_OPEN: Record<FlagState, boolean> = {
  OK: false,
  NJ: false,
  TN: false,
  LA: false,
};

export const BLOCKED_STATES = [...CORE_BLOCKED_STATES, ...FLAG_STATES] as const;
export type BlockedState = (typeof BLOCKED_STATES)[number];

export const PROMO_EXCLUDED_STATES = ["NY", "FL"] as const;

/** Age of majority where it is higher than 18. */
export const MAJORITY_AGE: Record<string, number> = { AL: 19, NE: 19, MS: 21 };

export const MIN_AGE = 18;
export const BUYBACK_OFFER_MS = 72 * 60 * 60 * 1000;
export const LIMIT_INCREASE_DELAY_MS = 24 * 60 * 60 * 1000;
export const KYC_TOPUP_CENTS = 50_000;
export const KYC_SHIP_FMV_CENTS = 100_000;
export const DEFAULT_SPEND_LIMIT_CENTS = 50_000;
export const RESERVE_RELEASE_MS = 14 * 24 * 60 * 60 * 1000;
export const STRIPE_RESERVE_BPS = 500;
export const HIGH_RISK_RESERVE_BPS = 1000;
export const SHIP_SLA_BUSINESS_DAYS = 2;
export const SIGNATURE_FMV_CENTS = 100_000;
export const SECOND_ADMIN_PACK_CENTS = 50_000;
export const SECOND_ADMIN_PRICE_CENTS = 100_000;
export const PROMO_CREDIT_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const INSOLVENCY_CLAIM_MS = 90 * 24 * 60 * 60 * 1000;
export const JAMS_FEE_COVERED_ABOVE_CENTS = 25_000;
export const FUNDING_HOLD_MS = 72 * 60 * 60 * 1000;
export const FIRST_TIME_HOLD_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_DAILY_TOPUP_CENTS = 50_000;
export const SHIP_FLAT_CENTS = 799;
export const FREE_SHIP_FMV_CENTS = 50_000;

export function normalizeState(value: string | null | undefined): string | null {
  if (!value) return null;
  const state = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) return null;
  return state;
}

export function isFlagState(value: string | null | undefined): value is FlagState {
  const state = normalizeState(value);
  return state != null && (FLAG_STATES as readonly string[]).includes(state);
}

export function isStateOpen(state: string, open: Partial<Record<FlagState, boolean>> = {}): boolean {
  if (!(FLAG_STATES as readonly string[]).includes(state)) return true;
  const flag = state as FlagState;
  return open[flag] ?? DEFAULT_STATE_OPEN[flag];
}

export function isBlockedState(
  value: string | null | undefined,
  open: Partial<Record<FlagState, boolean>> = {},
): boolean {
  const state = normalizeState(value);
  if (!state) return false;
  if ((CORE_BLOCKED_STATES as readonly string[]).includes(state)) return true;
  if (isFlagState(state)) return !isStateOpen(state, open);
  return false;
}

export function geoDecision(
  stateRaw: string,
  open: Partial<Record<FlagState, boolean>> = {},
): { allowed: boolean; state: string | null; reason?: string } {
  const state = normalizeState(stateRaw);
  if (!state) return { allowed: false, state: null, reason: "Choose a US state." };
  if (isBlockedState(state, open)) {
    return { allowed: false, state, reason: `${state} is on the blocked-state list.` };
  }
  return { allowed: true, state };
}

export function promoAllowed(stateRaw: string): { allowed: boolean; reason?: string } {
  const state = normalizeState(stateRaw);
  if (!state) return { allowed: false, reason: "Choose a US state." };
  if (isBlockedState(state)) return { allowed: false, reason: `${state} is restricted.` };
  if ((PROMO_EXCLUDED_STATES as readonly string[]).includes(state)) {
    return { allowed: false, reason: "Promos are void in New York and Florida." };
  }
  return { allowed: true };
}

export function minimumAge(stateRaw: string | null | undefined): number {
  const state = normalizeState(stateRaw);
  const majority = state ? (MAJORITY_AGE[state] ?? MIN_AGE) : MIN_AGE;
  return Math.max(MIN_AGE, majority);
}

export function ageYears(dob: Date, now: Date): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const month = now.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function ageDecision(
  dob: Date,
  now: Date,
  minAge = MIN_AGE,
): { allowed: boolean; age: number; reason?: string } {
  const age = ageYears(dob, now);
  if (age < minAge) {
    return { allowed: false, age, reason: `You must be ${minAge} or older.` };
  }
  return { allowed: true, age };
}

/** Account state and the per-request geo stub both have to pass. */
export interface LocationSignals {
  accountState: string;
  requestState?: string | null;
  ipState?: string | null;
  billingState?: string | null;
  vpn?: boolean;
  open?: Partial<Record<FlagState, boolean>>;
}

export function assertRipAllowed(
  accountState: string,
  requestState?: string | null,
  open: Partial<Record<FlagState, boolean>> = {},
): { allowed: boolean; reason?: string; state: string } {
  return locationDecision({ accountState, requestState, open });
}

/** IP header, browser geo, billing state, and a VPN hook all have to pass. */
export function locationDecision(input: LocationSignals): { allowed: boolean; reason?: string; state: string } {
  const open = input.open ?? {};
  if (input.vpn) {
    return { allowed: false, reason: "VPN or proxy detected. Location disguise is not allowed.", state: input.accountState };
  }
  const checks = [input.accountState, input.requestState, input.ipState, input.billingState];
  for (const raw of checks) {
    if (raw == null || raw.trim() === "") continue;
    const decision = geoDecision(raw, open);
    if (!decision.allowed) {
      return { allowed: false, reason: decision.reason, state: decision.state ?? raw };
    }
  }
  const account = geoDecision(input.accountState, open);
  return { allowed: account.allowed, reason: account.reason, state: account.state ?? input.accountState };
}

export function defaultVpnDetected(header: string | null | undefined): boolean {
  if (!header) return false;
  const value = header.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function fundingHoldUntil(input: {
  now: Date;
  firstCardTopUp: boolean;
}): Date {
  const ms = input.firstCardTopUp ? FIRST_TIME_HOLD_MS : FUNDING_HOLD_MS;
  return new Date(input.now.getTime() + ms);
}

export function shipHoldForPull(input: {
  usedHeldCardCents: number;
  fundingHoldUntil: Date | null;
  kycPassed: boolean;
}): Date | null {
  if (input.usedHeldCardCents <= 0) return null;
  if (input.kycPassed) return null;
  return input.fundingHoldUntil;
}

export function withinDailyLimit(spentTodayCents: number, amountCents: number, limitCents: number): boolean {
  return spentTodayCents + amountCents <= limitCents;
}

export function kycRequired(input: {
  lifetimeTopupCents: number;
  shipmentFmvCents?: number;
  vipTier?: number;
}): boolean {
  if ((input.vipTier ?? 0) > 0) return true;
  if (input.lifetimeTopupCents >= KYC_TOPUP_CENTS) return true;
  if ((input.shipmentFmvCents ?? 0) > KYC_SHIP_FMV_CENTS) return true;
  return false;
}

/** Decrease applies now. An increase waits 24 hours. */
export function scheduleLimitChange(input: {
  currentCents: number;
  requestedCents: number;
  now: Date;
}): { appliedCents: number; pendingCents: number | null; pendingAt: Date | null } {
  if (input.requestedCents <= input.currentCents) {
    return { appliedCents: input.requestedCents, pendingCents: null, pendingAt: null };
  }
  return {
    appliedCents: input.currentCents,
    pendingCents: input.requestedCents,
    pendingAt: new Date(input.now.getTime() + LIMIT_INCREASE_DELAY_MS),
  };
}

export function effectiveLimit(input: {
  currentCents: number;
  pendingCents: number | null;
  pendingAt: Date | null;
  now: Date;
}): number {
  if (input.pendingCents == null || input.pendingAt == null) return input.currentCents;
  if (input.pendingAt.getTime() > input.now.getTime()) return input.currentCents;
  return input.pendingCents;
}

export function addBusinessDays(start: Date, days: number): Date {
  const cursor = new Date(start.getTime());
  let left = days;
  while (left > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return cursor;
}

export function vipTierFromSpend(netSpendCents90d: number): 0 | 1 | 2 | 3 {
  if (netSpendCents90d >= 5_000_000) return 3;
  if (netSpendCents90d >= 1_000_000) return 2;
  if (netSpendCents90d >= 100_000) return 1;
  return 0;
}

/** +1 pt at tier 1, +2 pts at tier 2 and 3. Base rate stays 90% when VIP is off. */
export function vipBuybackBps(tier: number, enabled: boolean, base = 9000): number {
  if (!enabled || tier <= 0) return base;
  if (tier === 1) return base + 100;
  return base + 200;
}

export function salesTaxCents(kind: "credit_purchase" | "card_spend", amountCents: number, rateBps: number): number {
  if (kind === "credit_purchase") return 0;
  if (rateBps <= 0 || amountCents <= 0) return 0;
  return Number((BigInt(amountCents) * BigInt(rateBps)) / 10_000n);
}

export function reserveCents(amountCents: number, bps: number): number {
  if (amountCents <= 0 || bps <= 0) return 0;
  return Number((BigInt(amountCents) * BigInt(bps)) / 10_000n);
}

export function realityCheckDue(sessionStartedAt: Date, now: Date, minutes = 60): boolean {
  return now.getTime() - sessionStartedAt.getTime() >= minutes * 60 * 1000;
}

/** Each entry has identical weight, whether it was paid or free. */
export function equalEntryWeights<T extends { id: string }>(entries: readonly T[]): { id: string; weight: number }[] {
  return entries.map((entry) => ({ id: entry.id, weight: 1 }));
}
