import { isStalePrice, validatePack } from "@cdr/econ";
import { dropExceeds, type PriceFeed } from "@cdr/pricing";
import { vipTierFromSpend } from "@cdr/risk";
import { prisma } from "./client";
import { flagEnabled } from "./flags";
import { houseInventoryCents, slotsToTiers } from "./packs";
import { releaseReserves } from "./processor";

export async function runPriceRefresh(feed: PriceFeed, now = new Date(), scope?: { packIds?: string[] }) {
  const cards = await prisma.card.findMany({
    where: { ownerType: "house", status: { in: ["available", "allocated", "intake"] } },
  });
  let updated = 0;
  const touched = new Set<string>();
  for (const card of cards) {
    const quote = await feed.quote({
      id: card.id,
      grader: card.grader,
      certNumber: card.certNumber,
      fmvCents: card.fmvCents,
    });
    const dropped = quote ? dropExceeds(card.fmvCents, quote.fmvCents) : false;
    const stale = isStalePrice(card.fmvCents, card.fmvAt, now);
    if (quote && quote.fmvCents !== card.fmvCents) {
      await prisma.card.update({
        where: { id: card.id },
        data: {
          fmvCents: quote.fmvCents,
          fmvAt: now,
          fmvSource: feed.name,
          priceConfidence: quote.confidence,
        },
      });
      await prisma.priceHistory.create({
        data: { cardId: card.id, fmvCents: quote.fmvCents, source: feed.name },
      });
      updated += 1;
    }
    if (dropped || stale) {
      const slots = await prisma.packSlot.findMany({ where: { cardId: card.id }, select: { packId: true } });
      for (const slot of slots) touched.add(slot.packId);
    }
  }

  const live = await prisma.pack.findMany({
    where: { status: "live", ...(scope?.packIds ? { id: { in: scope.packIds } } : {}) },
    include: { tiers: true, slots: { include: { card: true } } },
  });
  const inventoryFmvCents = await houseInventoryCents();
  const paused: string[] = [];
  for (const pack of live) {
    const validation = validatePack({
      priceCents: pack.priceCents,
      tiers: slotsToTiers(pack.tiers, pack.slots),
      inventoryFmvCents,
      now,
    });
    if (!validation.ok || touched.has(pack.id)) {
      await prisma.pack.update({ where: { id: pack.id }, data: { status: "paused" } });
      paused.push(pack.id);
    }
  }
  return { updated, paused };
}

export async function rollupVip(now = new Date()) {
  if (!(await flagEnabled("vip"))) return { updated: 0 };
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.pull.groupBy({
    by: ["userId"],
    where: { at: { gte: since }, voided: false },
    _sum: { priceCents: true },
  });
  let updated = 0;
  for (const row of grouped) {
    const tier = vipTierFromSpend(row._sum.priceCents ?? 0);
    await prisma.user.update({ where: { id: row.userId }, data: { vipTier: tier } });
    updated += 1;
  }
  return { updated };
}

export async function runNightly(feed: PriceFeed, now = new Date()) {
  const prices = await runPriceRefresh(feed, now);
  const reserves = await releaseReserves(now);
  const vip = await rollupVip(now);
  return { prices, reserves, vip };
}
