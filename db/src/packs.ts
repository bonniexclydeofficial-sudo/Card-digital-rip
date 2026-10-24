import { randomUUID } from "node:crypto";
import { stockWeightedEvCents, validatePack, type PoolTier, type TierName, TIER_ORDER } from "@cdr/econ";
import type { Card, Pack, PackSlot, PackTier } from "@prisma/client";
import { prisma } from "./client";
import { writeAudit } from "./audit";

type SlotWithCard = PackSlot & { card: Card };

export async function houseInventoryCents(tx: Pick<typeof prisma, "card"> = prisma): Promise<number> {
  const total = await tx.card.aggregate({
    where: { ownerType: "house", status: { in: ["intake", "available", "allocated"] } },
    _sum: { fmvCents: true },
  });
  return total._sum.fmvCents ?? 0;
}

export function slotsToTiers(tiers: PackTier[], slots: SlotWithCard[]): PoolTier[] {
  return [...tiers]
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map((tier) => ({
      tier: tier.tier,
      oddsBps: tier.oddsBps,
      cards: slots
        .filter((slot) => slot.tier === tier.tier)
        .map((slot) => ({
          id: slot.card.id,
          fmvCents: slot.card.fmvCents,
          fmvAt: slot.card.fmvAt,
          imageFrontUrl: slot.card.imageFrontUrl,
          imageBackUrl: slot.card.imageBackUrl,
        })),
    }));
}

export async function loadPack(packId: string) {
  return prisma.pack.findUnique({
    where: { id: packId },
    include: { tiers: true, slots: { include: { card: true }, orderBy: { slotIndex: "asc" } } },
  });
}

export async function evaluatePack(pack: Pack & { tiers: PackTier[]; slots: SlotWithCard[] }, now = new Date()) {
  const tiers = slotsToTiers(pack.tiers, pack.slots);
  const inventoryFmvCents = await houseInventoryCents();
  const validation = validatePack({
    priceCents: pack.priceCents,
    tiers,
    inventoryFmvCents,
    now,
  });
  return {
    validation,
    evCents: stockWeightedEvCents(tiers),
    stock: Object.fromEntries(
      TIER_ORDER.map((tier) => [
        tier,
        pack.slots.filter((slot) => slot.tier === tier && slot.state === "available").length,
      ]),
    ),
  };
}

export async function publishPack(actorId: string, packId: string, now = new Date()) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.role !== "admin") return { ok: false as const, code: "FORBIDDEN" as const };
  const pack = await loadPack(packId);
  if (!pack) return { ok: false as const, code: "NOT_FOUND" as const };
  if (pack.status === "live") return { ok: true as const, already: true as const };
  const tiers = slotsToTiers(pack.tiers, pack.slots);
  const validation = validatePack({
    priceCents: pack.priceCents,
    tiers,
    inventoryFmvCents: await houseInventoryCents(),
    now,
  });
  if (!validation.ok) {
    await writeAudit(actorId, "pack.publish_blocked", "pack", pack.id, {
      errors: validation.errors,
      gm: validation.gm,
      rtp: validation.rtp,
    });
    return { ok: false as const, code: "BLOCKED" as const, validation };
  }
  await prisma.pack.update({ where: { id: pack.id }, data: { status: "live" } });
  await writeAudit(actorId, "pack.publish", "pack", pack.id, { gm: validation.gm, rtp: validation.rtp });
  return { ok: true as const, validation };
}

export interface BuilderTierInput {
  tier: TierName;
  oddsBps: number;
  cardIds: string[];
}

export async function createPackFromBuilder(
  actorId: string,
  input: {
    name: string;
    slug: string;
    priceCents: number;
    description?: string;
    publish: boolean;
    tiers: BuilderTierInput[];
  },
  now = new Date(),
) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.role !== "admin") return { ok: false as const, code: "FORBIDDEN" as const };
  if (!/^[a-z0-9-]{3,40}$/.test(input.slug)) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Slug must be 3–40 lowercase letters, numbers, or hyphens." };
  }
  if (!input.name.trim() || !Number.isInteger(input.priceCents) || input.priceCents <= 0) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Name and price are required." };
  }
  const cardIds = input.tiers.flatMap((tier) => tier.cardIds);
  if (new Set(cardIds).size !== cardIds.length) {
    return { ok: false as const, code: "VALIDATION" as const, message: "A card can only sit in one slot." };
  }
  const cards = await prisma.card.findMany({ where: { id: { in: cardIds } } });
  const byId = new Map(cards.map((card) => [card.id, card]));
  if (cards.length !== cardIds.length || cards.some((card) => card.status !== "available" || card.ownerType !== "house")) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Every card must be available house inventory." };
  }
  const pool: PoolTier[] = input.tiers.map((tier) => ({
    tier: tier.tier,
    oddsBps: tier.oddsBps,
    cards: tier.cardIds.map((id) => {
      const card = byId.get(id)!;
      return {
        id: card.id,
        fmvCents: card.fmvCents,
        fmvAt: card.fmvAt,
        imageFrontUrl: card.imageFrontUrl,
        imageBackUrl: card.imageBackUrl,
      };
    }),
  }));
  const validation = validatePack({
    priceCents: input.priceCents,
    tiers: pool,
    inventoryFmvCents: await houseInventoryCents(),
    now,
  });
  if (input.publish && !validation.ok) {
    await writeAudit(actorId, "pack.publish_blocked", "pack", input.slug, { errors: validation.errors, gm: validation.gm });
    return { ok: false as const, code: "BLOCKED" as const, validation };
  }

  const packId = `pack_${randomUUID()}`;
  const liability = cards.reduce((sum, card) => sum + card.fmvCents, 0);
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.card.findMany({ where: { id: { in: cardIds } } });
    if (fresh.some((card) => card.status !== "available")) throw new Error("card no longer available");
    await tx.pack.create({
      data: {
        id: packId,
        slug: input.slug,
        name: input.name.trim(),
        priceCents: input.priceCents,
        status: input.publish ? "live" : "draft",
        version: 1,
        liabilityCapCents: liability,
        description: input.description?.trim() || "Built in the admin pack builder.",
        featured: false,
      },
    });
    await tx.packTier.createMany({
      data: input.tiers.map((tier) => ({ packId, version: 1, tier: tier.tier, oddsBps: tier.oddsBps })),
    });
    const explicit = [];
    let index = 0;
    for (const tier of input.tiers) {
      for (const cardId of tier.cardIds) {
        explicit.push({
          id: `slot_${packId}_${index}`,
          packId,
          version: 1,
          tier: tier.tier,
          slotIndex: index,
          cardId,
          state: "available" as const,
        });
        index += 1;
      }
    }
    await tx.packSlot.createMany({ data: explicit });
    await tx.card.updateMany({ where: { id: { in: cardIds } }, data: { status: "allocated" } });
    await writeAudit(
      actorId,
      input.publish ? "pack.publish" : "pack.draft",
      "pack",
      packId,
      { slug: input.slug, gm: validation.gm, rtp: validation.rtp },
      tx,
    );
  });

  return { ok: true as const, packId, validation };
}
