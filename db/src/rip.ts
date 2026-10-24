import { randomUUID } from "node:crypto";
import { Prisma, type ServerSeed, type User } from "@prisma/client";
import { isStalePrice } from "@cdr/econ";
import { hashSlotList, openDraw, TIER_ORDER, type TierName } from "@cdr/fair";
import { ageDecision, effectiveLimit, locationDecision, minimumAge, shipHoldForPull } from "@cdr/risk";
import { prisma } from "./client";
import { consumePromoLots, settleExpiredPromos } from "./credits";
import { loadStateOpenFlags } from "./flags";
import { insertJournal, InsufficientCreditsError, lockWallet } from "./ledger";

export type RipCode =
  | "UNAUTHENTICATED"
  | "GEO_BLOCKED"
  | "UNDERAGE"
  | "USER_BLOCKED"
  | "COOL_OFF"
  | "SPEND_LIMIT"
  | "INSUFFICIENT_CREDITS"
  | "PACK_NOT_FOUND"
  | "PACK_PAUSED"
  | "OUT_OF_STOCK"
  | "STALE_PRICE"
  | "IDEMPOTENCY_CONFLICT"
  | "SEED_UNAVAILABLE";

export type RipResult =
  | {
      ok: true;
      replay: boolean;
      pullId: string;
      tier: string;
      tierIndex: number;
      isGrail: boolean;
      cardId: string;
    }
  | { ok: false; code: RipCode; message: string };

const fail = (code: RipCode, message: string): RipResult => ({ ok: false, code, message });

function replayOf(pull: { id: string; tier: string; cardId: string }): RipResult {
  const tierIndex = TIER_ORDER.indexOf(pull.tier as TierName);
  return {
    ok: true,
    replay: true,
    pullId: pull.id,
    tier: pull.tier,
    tierIndex,
    isGrail: pull.tier === "grail",
    cardId: pull.cardId,
  };
}

function retryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if (error instanceof Error && error.name === "RetryableDraw") return true;
  const code = (error as { code?: string }).code;
  if (code === "P2034") return true;
  const message = (error as { message?: string }).message ?? "";
  return message.includes("40001") || message.includes("could not serialize") || message.includes("deadlock detected");
}

function uniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

class RetryableDraw extends Error {
  constructor() {
    super("retry draw");
    this.name = "RetryableDraw";
  }
}

async function executeRip(input: {
  user: User;
  packId: string;
  seed: ServerSeed;
  idempotencyKey: string;
  requestGeoState?: string | null;
  now: Date;
  pullId?: string;
  batchId?: string;
}): Promise<RipResult> {
  const run = () =>
    prisma.$transaction(
      (tx) => ripTransaction(tx, input),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 20_000,
      },
    );

  let last: unknown;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (uniqueViolation(error)) {
        const existing = await prisma.pull.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) {
          if (existing.userId !== input.user.id) return fail("IDEMPOTENCY_CONFLICT", "That idempotency key belongs to another rip.");
          return replayOf(existing);
        }
      }
      if (error instanceof InsufficientCreditsError) {
        return fail("INSUFFICIENT_CREDITS", "Not enough credits for this pack.");
      }
      if (!retryable(error) || attempt === 11) throw error;
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)));
    }
  }
  throw last;
}

async function ripTransaction(
  tx: Prisma.TransactionClient,
  input: {
    user: User;
    packId: string;
    seed: ServerSeed;
    idempotencyKey: string;
    now: Date;
    pullId?: string;
    batchId?: string;
  },
): Promise<RipResult> {
  await tx.$queryRaw`SELECT id FROM packs WHERE id = ${input.packId} FOR UPDATE`;
  const pack = await tx.pack.findUnique({ where: { id: input.packId }, include: { tiers: true } });
  if (!pack) return fail("PACK_NOT_FOUND", "Pack not found.");
  if (pack.status !== "live") return fail("PACK_PAUSED", "This pack is paused. You were not charged.");

  const existing = await tx.pull.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.userId !== input.user.id || existing.packId !== pack.id) {
      return fail("IDEMPOTENCY_CONFLICT", "That idempotency key was already used.");
    }
    return replayOf(existing);
  }

  await settleExpiredPromos(tx, input.user.id, input.now);
  const wallet = await lockWallet(tx, input.user.id);
  let held = wallet.held_card_cents;
  let buyback = wallet.buyback_cents;
  let promo = wallet.promo_cents;
  const holdExpired = wallet.funding_hold_until != null && wallet.funding_hold_until <= input.now;
  if (holdExpired) {
    held = 0;
    await tx.wallet.update({
      where: { userId: input.user.id },
      data: { heldCardCents: 0, fundingHoldUntil: null },
    });
  }
  if (wallet.available_cents < pack.priceCents) {
    return fail("INSUFFICIENT_CREDITS", "Not enough credits for this pack.");
  }
  const dayStart = new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()));
  const spentToday = await tx.pull.aggregate({
    where: { userId: input.user.id, at: { gte: dayStart }, voided: false },
    _sum: { priceCents: true },
  });
  const spendLimit = effectiveLimit({
    currentCents: input.user.spendLimitCents,
    pendingCents: input.user.pendingSpendLimitCents,
    pendingAt: input.user.pendingSpendLimitAt,
    now: input.now,
  });
  if ((spentToday._sum.priceCents ?? 0) + pack.priceCents > spendLimit) {
    return fail("SPEND_LIMIT", "This rip is above the daily spend limit.");
  }

  const slots = await tx.packSlot.findMany({
    where: { packId: pack.id, version: pack.version, state: "available" },
    include: { card: true },
    orderBy: { slotIndex: "asc" },
  });
  if (slots.some((slot) => isStalePrice(slot.card.fmvCents, slot.card.fmvAt, input.now))) {
    await tx.pack.update({ where: { id: pack.id }, data: { status: "paused" } });
    return fail("STALE_PRICE", "A price in this pack is stale. The pack is paused and you were not charged.");
  }

  const tiers = [...pack.tiers]
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map((tier) => ({ tier: tier.tier, oddsBps: tier.oddsBps }));
  const oddsSum = tiers.reduce((sum, tier) => sum + tier.oddsBps, 0);
  if (oddsSum !== 10_000) {
    await tx.pack.update({ where: { id: pack.id }, data: { status: "paused" } });
    return fail("PACK_PAUSED", "Pack odds are invalid. It was paused and you were not charged.");
  }

  const nonceRow = await tx.$queryRaw<{ next: number }[]>`
    SELECT (COALESCE(MAX(nonce), -1) + 1)::int AS next
    FROM pulls
    WHERE user_id = ${input.user.id} AND seed_id = ${input.seed.id}
  `;
  const nonce = Number(nonceRow[0]?.next ?? 0);
  const opened = openDraw({
    serverSeedHex: input.seed.seed,
    clientSeed: input.user.clientSeed,
    nonce,
    packVersion: pack.version,
    tiers,
  });
  const picked = opened.pickTier();
  const pool = slots.filter((slot) => slot.tier === picked.tier);
  if (pool.length === 0) {
    await tx.pack.update({ where: { id: pack.id }, data: { status: "paused" } });
    return fail("OUT_OF_STOCK", "That tier is empty. The pack is paused and you were not charged.");
  }
  const poolIndex = opened.pickSlot(pool.length);
  const slot = pool[poolIndex];
  const claimed = await tx.packSlot.updateMany({
    where: { id: slot.id, state: "available" },
    data: { state: "pulled" },
  });
  if (claimed.count !== 1) throw new RetryableDraw();

  const usePromo = Math.min(promo, pack.priceCents);
  const useHeld = Math.min(held, pack.priceCents - usePromo);
  const useBuyback = Math.min(buyback, pack.priceCents - usePromo - useHeld);
  const fundingSource = usePromo > 0 ? "promo" : useHeld > 0 ? "card" : useBuyback > 0 ? "credit_buyback" : "seed";
  const shipHoldUntil = shipHoldForPull({
    usedHeldCardCents: useHeld,
    fundingHoldUntil: holdExpired ? null : wallet.funding_hold_until,
    kycPassed: input.user.kycStatus === "passed",
  });

  const pull = await tx.pull.create({
    data: {
      ...(input.pullId ? { id: input.pullId } : {}),
      userId: input.user.id,
      packId: pack.id,
      version: pack.version,
      seedId: input.seed.id,
      clientSeed: input.user.clientSeed,
      nonce,
      tier: picked.tier as TierName,
      poolIndex,
      slotId: slot.id,
      cardId: slot.cardId,
      fundingSource,
      hmac: opened.hmac,
      availableSlotIds: pool.map((item) => item.id),
      slotListHash: hashSlotList(pool.map((item) => item.id)),
      idempotencyKey: input.idempotencyKey,
      priceCents: pack.priceCents,
      batchId: input.batchId ?? null,
    },
  });

  await consumePromoLots(tx, input.user.id, usePromo, input.now);
  await insertJournal(tx, {
    userId: input.user.id,
    direction: "debit",
    amountCents: pack.priceCents,
    fundingSource,
    refType: "pull",
    refId: pull.id,
    idempotencyKey: `pull:${pull.id}`,
  });
  await tx.wallet.update({
    where: { userId: input.user.id },
    data: {
      heldCardCents: held - useHeld,
      buybackCents: buyback - useBuyback,
      promoCents: promo - usePromo,
    },
  });
  await tx.card.update({ where: { id: slot.cardId }, data: { status: "pulled" } });
  await tx.cardEvent.create({
    data: { cardId: slot.cardId, fromStatus: "allocated", toStatus: "pulled", reason: `pull ${pull.id}` },
  });
  await tx.vaultItem.create({
    data: {
      userId: input.user.id,
      cardId: slot.cardId,
      pullId: pull.id,
      status: "held",
      shipHoldUntil,
      fmvCentsAtPull: slot.card.fmvCents,
    },
  });

  const tierIndex = TIER_ORDER.indexOf(picked.tier as TierName);
  return {
    ok: true,
    replay: false,
    pullId: pull.id,
    tier: picked.tier,
    tierIndex,
    isGrail: picked.tier === "grail",
    cardId: slot.cardId,
  };
}

async function prepare(input: {
  userId: string;
  packSlug: string;
  idempotencyKey: string;
  requestGeoState?: string | null;
  ipState?: string | null;
  billingState?: string | null;
  vpn?: boolean;
  now: Date;
}): Promise<{ user: User; packId: string } | RipResult> {
  if (!/^[A-Za-z0-9:_-]{8,80}$/.test(input.idempotencyKey)) {
    return fail("IDEMPOTENCY_CONFLICT", "Idempotency key must be 8–80 characters.");
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return fail("UNAUTHENTICATED", "Sign in required.");
  if (user.status !== "active") return fail("USER_BLOCKED", "This account cannot rip.");
  if (user.coolOffUntil && user.coolOffUntil > input.now) {
    return fail("COOL_OFF", "This account is in a cool-off period.");
  }
  const age = ageDecision(user.dob, input.now, minimumAge(user.state));
  if (!age.allowed) return fail("UNDERAGE", age.reason ?? "Age requirement not met.");
  const open = await loadStateOpenFlags();
  const geo = locationDecision({
    accountState: user.state,
    requestState: input.requestGeoState,
    ipState: input.ipState,
    billingState: input.billingState ?? user.billingState,
    vpn: input.vpn,
    open,
  });
  await prisma.geoCheck.create({
    data: {
      userId: user.id,
      state: (input.requestGeoState || user.state).trim().toUpperCase(),
      source: input.requestGeoState ? "rip-request" : "rip-account",
      passed: geo.allowed,
      reason: geo.allowed ? null : "geo_blocked",
    },
  });
  if (!geo.allowed) return fail("GEO_BLOCKED", geo.reason ?? "Location blocked.");

  const existing = await prisma.pull.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.userId !== user.id) return fail("IDEMPOTENCY_CONFLICT", "That idempotency key belongs to another rip.");
    const pack = await prisma.pack.findUnique({ where: { slug: input.packSlug } });
    if (pack && existing.packId !== pack.id) {
      return fail("IDEMPOTENCY_CONFLICT", "That idempotency key was used for a different pack.");
    }
    return replayOf(existing);
  }

  const pack = await prisma.pack.findUnique({ where: { slug: input.packSlug } });
  if (!pack) return fail("PACK_NOT_FOUND", "Pack not found.");
  return { user, packId: pack.id };
}

export interface RipInput {
  userId: string;
  packSlug: string;
  idempotencyKey: string;
  requestGeoState?: string | null;
  ipState?: string | null;
  billingState?: string | null;
  vpn?: boolean;
  now?: Date;
  batchId?: string;
}

export async function ripPack(input: RipInput): Promise<RipResult> {
  const now = input.now ?? new Date();
  const ready = await prepare({ ...input, now });
  if ("ok" in ready) return ready;
  const seed = await prisma.serverSeed.findFirst({ where: { active: true } });
  if (!seed || seed.revealedAt) return fail("SEED_UNAVAILABLE", "No active server seed.");
  return executeRip({
    user: ready.user,
    packId: ready.packId,
    seed,
    idempotencyKey: input.idempotencyKey,
    requestGeoState: input.requestGeoState,
    now,
    batchId: input.batchId,
  });
}

export async function ripSequence(input: RipInput & { count: 1 | 3 | 5 }): Promise<{ batchId: string; results: RipResult[] }> {
  const batchId = input.batchId ?? randomUUID();
  const results: RipResult[] = [];
  for (let index = 0; index < input.count; index++) {
    const result = await ripPack({
      ...input,
      batchId,
      idempotencyKey: `${input.idempotencyKey}:${index}`,
    });
    results.push(result);
    if (!result.ok) break;
  }
  return { batchId, results };
}

/** Draws against a specific unrevealed seed. Tests and the seeded example pull use this. */
export async function ripWithSeed(input: {
  userId: string;
  packSlug: string;
  seedId: string;
  idempotencyKey: string;
  pullId?: string;
  requestGeoState?: string | null;
  ipState?: string | null;
  billingState?: string | null;
  vpn?: boolean;
  now?: Date;
  batchId?: string;
}): Promise<RipResult> {
  const now = input.now ?? new Date();
  const ready = await prepare({ ...input, now });
  if ("ok" in ready) return ready;
  const seed = await prisma.serverSeed.findUnique({ where: { id: input.seedId } });
  if (!seed || seed.revealedAt) return fail("SEED_UNAVAILABLE", "That server seed is not open for draws.");
  return executeRip({
    user: ready.user,
    packId: ready.packId,
    seed,
    idempotencyKey: input.idempotencyKey,
    now,
    pullId: input.pullId,
    batchId: input.batchId,
  });
}
