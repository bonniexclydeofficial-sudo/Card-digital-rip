import { randomUUID } from "node:crypto";
import { fundingHoldUntil, withinDailyLimit } from "@cdr/risk";
import { prisma } from "./client";
import { insertJournal } from "./ledger";

export async function stubTopUp(userId: string, amountCents: number, now = new Date()) {
  if (!Number.isInteger(amountCents) || amountCents < 500 || amountCents > 200_000) {
    return { ok: false as const, code: "AMOUNT" as const, message: "Top-ups are between $5 and $2,000." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { limit: true, wallet: true } });
  if (!user?.wallet) return { ok: false as const, code: "NOT_FOUND" as const, message: "Wallet not found." };
  if (user.status !== "active") {
    return { ok: false as const, code: "USER_BLOCKED" as const, message: "This account cannot add credits." };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const spent = await prisma.payment.aggregate({
    where: { userId, status: "stubbed", createdAt: { gte: start } },
    _sum: { amountCents: true },
  });
  const limit = user.limit?.dailyLimitCents ?? 50_000;
  if (!withinDailyLimit(spent._sum.amountCents ?? 0, amountCents, limit)) {
    return {
      ok: false as const,
      code: "LIMIT" as const,
      message: `Daily top-up limit is $${(limit / 100).toFixed(0)}.`,
    };
  }

  const prior = await prisma.payment.count({ where: { userId, provider: "stub" } });
  const holdUntil = fundingHoldUntil({ now, firstCardTopUp: prior === 0 });
  const ref = `stub_${randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId,
        provider: "stub",
        ref,
        amountCents,
        status: "stubbed",
        threeDs: false,
        risk: "stub-no-charge",
      },
    });
    await insertJournal(tx, {
      userId,
      direction: "credit",
      amountCents,
      fundingSource: "card",
      holdUntil,
      refType: "payment",
      refId: ref,
      idempotencyKey: `topup:${ref}`,
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    await tx.wallet.update({
      where: { userId },
      data: {
        heldCardCents: wallet.heldCardCents + amountCents,
        fundingHoldUntil: holdUntil,
      },
    });
  });

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return {
    ok: true as const,
    provider: "stub" as const,
    charged: false as const,
    ref,
    amountCents,
    holdUntil,
    availableCents: wallet.availableCents,
    heldCardCents: wallet.heldCardCents,
  };
}

export async function walletView(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId, account: `user:${userId}` },
    orderBy: { at: "desc" },
    take: 40,
  });
  return { wallet, entries };
}
