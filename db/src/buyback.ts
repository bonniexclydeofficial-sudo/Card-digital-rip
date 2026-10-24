import { buybackCreditCents } from "@cdr/econ";
import { prisma } from "./client";
import { insertJournal } from "./ledger";

const OFFER_MS = 10 * 60 * 1000;

export async function quoteVaultItem(vaultItemId: string, userId: string) {
  const item = await prisma.vaultItem.findFirst({
    where: { id: vaultItemId, userId },
    include: { card: true },
  });
  if (!item || item.status !== "held") return null;
  return {
    item,
    ...buybackCreditCents(item.card.fmvCents, item.card.priceConfidence),
  };
}

export async function openBuyback(userId: string, vaultItemId: string, now = new Date()) {
  const item = await prisma.vaultItem.findFirst({
    where: { id: vaultItemId, userId },
    include: { card: true, user: true },
  });
  if (!item || item.status !== "held") return { ok: false as const, code: "NOT_HELD" as const };
  if (item.buybackBlocked || item.user.status === "locked") {
    return { ok: false as const, code: "BLOCKED" as const };
  }
  const quote = buybackCreditCents(item.card.fmvCents, item.card.priceConfidence);
  if (quote.creditCents <= 0) return { ok: false as const, code: "ZERO" as const };
  const offer = await prisma.buyback.create({
    data: {
      userId,
      vaultItemId,
      cardId: item.cardId,
      fmvCents: item.card.fmvCents,
      haircutBps: quote.haircutBps,
      rateBps: quote.rateBps,
      creditCents: quote.creditCents,
      offerExpiresAt: new Date(now.getTime() + OFFER_MS),
      status: "offered",
    },
  });
  return { ok: true as const, offer };
}

export async function acceptBuyback(userId: string, buybackId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM buybacks WHERE id = ${buybackId} FOR UPDATE`;
    const offer = await tx.buyback.findFirst({ where: { id: buybackId, userId } });
    if (!offer) return { ok: false as const, code: "NOT_FOUND" as const };
    if (offer.status !== "offered") return { ok: false as const, code: "NOT_OPEN" as const };
    if (offer.offerExpiresAt.getTime() <= now.getTime()) {
      await tx.buyback.update({ where: { id: offer.id }, data: { status: "expired" } });
      return { ok: false as const, code: "EXPIRED" as const };
    }
    await tx.$queryRaw`SELECT id FROM vault_items WHERE id = ${offer.vaultItemId} FOR UPDATE`;
    const item = await tx.vaultItem.findUnique({ where: { id: offer.vaultItemId }, include: { user: true } });
    if (!item || item.userId !== userId || item.status !== "held") {
      return { ok: false as const, code: "NOT_HELD" as const };
    }
    if (item.buybackBlocked || item.user.status === "locked") {
      await tx.buyback.update({ where: { id: offer.id }, data: { status: "blocked" } });
      return { ok: false as const, code: "BLOCKED" as const };
    }
    await insertJournal(tx, {
      userId,
      direction: "credit",
      amountCents: offer.creditCents,
      fundingSource: "credit_buyback",
      refType: "buyback",
      refId: offer.id,
      idempotencyKey: `buyback:${offer.id}`,
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    await tx.wallet.update({
      where: { userId },
      data: { buybackCents: wallet.buybackCents + offer.creditCents },
    });
    await tx.buyback.update({
      where: { id: offer.id },
      data: { status: "completed", completedAt: now },
    });
    await tx.vaultItem.update({ where: { id: item.id }, data: { status: "bought_back" } });
    await tx.card.update({ where: { id: item.cardId }, data: { status: "available" } });
    await tx.cardEvent.create({
      data: { cardId: item.cardId, fromStatus: "pulled", toStatus: "available", reason: `buyback ${offer.id}` },
    });
    return { ok: true as const, creditCents: offer.creditCents };
  });
}

export async function buybackNow(userId: string, vaultItemId: string, now = new Date()) {
  const opened = await openBuyback(userId, vaultItemId, now);
  if (!opened.ok) return opened;
  return acceptBuyback(userId, opened.offer.id, now);
}
