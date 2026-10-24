/** Geo, age, and funding-hold stubs. IP vendor checks are not wired. */

export const BLOCKED_STATES = ["WA", "NV", "MI", "ID", "MT", "OK"] as const;
export type BlockedState = (typeof BLOCKED_STATES)[number];

export const MIN_AGE = 18;
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

export function isBlockedState(value: string | null | undefined): boolean {
  const state = normalizeState(value);
  if (!state) return false;
  return (BLOCKED_STATES as readonly string[]).includes(state);
}

export function geoDecision(stateRaw: string): { allowed: boolean; state: string | null; reason?: string } {
  const state = normalizeState(stateRaw);
  if (!state) return { allowed: false, state: null, reason: "Choose a US state." };
  if (isBlockedState(state)) {
    return { allowed: false, state, reason: `${state} is on the blocked-state list.` };
  }
  return { allowed: true, state };
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
export function assertRipAllowed(
  accountState: string,
  requestState?: string | null,
): { allowed: boolean; reason?: string; state: string } {
  const account = geoDecision(accountState);
  if (!account.allowed) {
    return { allowed: false, reason: account.reason, state: account.state ?? accountState };
  }
  if (requestState && requestState.trim() !== "") {
    const request = geoDecision(requestState);
    if (!request.allowed) {
      return { allowed: false, reason: request.reason ?? "Request location is blocked.", state: request.state ?? requestState };
    }
  }
  return { allowed: true, state: account.state ?? accountState };
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
