import { PROMO_CREDIT_TTL_MS } from "@cdr/risk";
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { insertJournal } from "./ledger";

/** Paid credits (card, buyback, seed) are not passed here and never expire. */
export async function grantPromoCredits(
  userId: string,
  amountCents: number,
  source: string,
  now = new Date(),
  ttlMs = PROMO_CREDIT_TTL_MS,
) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false as const, code: "AMOUNT" as const };
  }
  const expiresAt = new Date(now.getTime() + ttlMs);
  const lot = await prisma.$transaction(async (tx) => {
    const created = await tx.promoCredit.create({
      data: { userId, remainingCents: amountCents, expiresAt, source },
    });
    await insertJournal(tx, {
      userId,
      direction: "credit",
      amountCents,
      fundingSource: "promo",
      refType: "promo",
      refId: created.id,
      idempotencyKey: `promo:${created.id}`,
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    await tx.wallet.update({
      where: { userId },
      data: { promoCents: wallet.promoCents + amountCents },
    });
    return created;
  });
  return { ok: true as const, lotId: lot.id, expiresAt };
}

/** Burns expired promo lots. Purchased credits are left untouched. */
export async function settleExpiredPromos(tx: Prisma.TransactionClient, userId: string, now: Date): Promise<number> {
  const lots = await tx.promoCredit.findMany({
    where: { userId, expiresAt: { lte: now }, remainingCents: { gt: 0 } },
  });
  if (lots.length === 0) return 0;
  const listed = lots.reduce((sum, lot) => sum + lot.remainingCents, 0);
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const burn = Math.min(listed, wallet.promoCents, wallet.availableCents);
  for (const lot of lots) {
    await tx.promoCredit.update({ where: { id: lot.id }, data: { remainingCents: 0 } });
  }
  if (burn <= 0) return 0;
  await insertJournal(tx, {
    userId,
    direction: "debit",
    amountCents: burn,
    fundingSource: "promo",
    refType: "promo_expiry",
    refId: lots[0]!.id,
    idempotencyKey: `promo-expire:${lots.map((lot) => lot.id).join(",")}`,
  });
  await tx.wallet.update({
    where: { userId },
    data: { promoCents: Math.max(0, wallet.promoCents - burn) },
  });
  return burn;
}

/** Spend promotional lots first, soonest expiry first. */
export async function consumePromoLots(tx: Prisma.TransactionClient, userId: string, amountCents: number, now: Date) {
  if (amountCents <= 0) return;
  const lots = await tx.promoCredit.findMany({
    where: { userId, remainingCents: { gt: 0 }, expiresAt: { gt: now } },
    orderBy: { expiresAt: "asc" },
  });
  let left = amountCents;
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(lot.remainingCents, left);
    await tx.promoCredit.update({ where: { id: lot.id }, data: { remainingCents: lot.remainingCents - take } });
    left -= take;
  }
}
