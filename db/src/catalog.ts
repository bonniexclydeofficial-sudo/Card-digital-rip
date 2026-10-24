import { grossMargin, stockWeightedEvCents, BUYBACK_RATE_BPS } from "@cdr/econ";
import { commitHash } from "@cdr/fair";
import { SHIP_FLAT_CENTS } from "@cdr/risk";
import type { Card, Pack, PackSlot, PackTier, ServerSeed } from "@prisma/client";
import { prisma } from "./client";
import { slotsToTiers } from "./packs";

type FullPack = Pack & { tiers: PackTier[]; slots: (PackSlot & { card: Card })[] };

function present(pack: FullPack, seed: ServerSeed | null) {
  const tiers = slotsToTiers(pack.tiers, pack.slots);
  const evCents = stockWeightedEvCents(tiers);
  const rtp = pack.priceCents > 0 ? evCents / pack.priceCents : 0;
  return {
    id: pack.id,
    slug: pack.slug,
    name: pack.name,
    description: pack.description,
    status: pack.status,
    priceCents: pack.priceCents,
    version: pack.version,
    evCents,
    rtp,
    gm: grossMargin(rtp),
    buybackBps: BUYBACK_RATE_BPS,
    seedHash: seed?.hash ?? null,
    seedId: seed?.id ?? null,
    fees: {
      purchaseFeeCents: 0,
      shipFlatCents: SHIP_FLAT_CENTS,
      note: "No purchase fee. Shipping is $7.99 later, not charged when you rip. Credits cannot be withdrawn.",
    },
    tiers: tiers.map((tier) => ({
      tier: tier.tier,
      oddsBps: tier.oddsBps,
      stock: pack.slots.filter((slot) => slot.tier === tier.tier && slot.state === "available").length,
      total: tier.cards.length,
      cards: pack.slots
        .filter((slot) => slot.tier === tier.tier)
        .map((slot) => ({
          id: slot.card.id,
          grader: slot.card.grader,
          certNumber: slot.card.certNumber,
          grade: slot.card.grade.toString(),
          category: slot.card.category,
          subject: slot.card.subject,
          setName: slot.card.setName,
          year: slot.card.year,
          variant: slot.card.variant,
          fmvCents: slot.card.fmvCents,
          priceConfidence: slot.card.priceConfidence,
          fmvAt: slot.card.fmvAt.toISOString(),
          example: slot.card.example,
          slotState: slot.state,
          tier: slot.tier,
        })),
    })),
  };
}

async function activeSeed() {
  return prisma.serverSeed.findFirst({ where: { active: true } });
}

const packInclude = {
  tiers: true,
  slots: { include: { card: true }, orderBy: { slotIndex: "asc" as const } },
};

export async function getCatalog() {
  const [packs, seed] = await Promise.all([
    prisma.pack.findMany({
      where: { featured: true, status: { in: ["live", "paused"] } },
      include: packInclude,
      orderBy: { priceCents: "asc" },
    }),
    activeSeed(),
  ]);
  return packs.map((pack) => present(pack, seed));
}

export async function getPackPage(slug: string) {
  const pack = await prisma.pack.findUnique({ where: { slug }, include: packInclude });
  if (!pack || !pack.featured || (pack.status !== "live" && pack.status !== "paused")) return null;
  return present(pack, await activeSeed());
}

export async function latestPull() {
  const pull = await prisma.pull.findFirst({
    orderBy: { at: "desc" },
    include: { card: true, pack: true },
  });
  if (!pull) return null;
  return {
    id: pull.id,
    tier: pull.tier,
    packName: pull.pack.name,
    subject: pull.card.subject,
    grader: pull.card.grader,
    grade: pull.card.grade.toString(),
    fmvCents: pull.card.fmvCents,
  };
}

export async function getPullForOwner(pullId: string, userId: string) {
  const pull = await prisma.pull.findFirst({
    where: { id: pullId, userId },
    include: { card: true, pack: true, vaultItem: true },
  });
  if (!pull) return null;
  return {
    id: pull.id,
    tier: pull.tier,
    tierIndex: ["common", "rare", "epic", "legendary", "grail"].indexOf(pull.tier),
    isGrail: pull.tier === "grail",
    packName: pull.pack.name,
    packSlug: pull.pack.slug,
    priceCents: pull.priceCents,
    hmac: pull.hmac,
    card: {
      id: pull.card.id,
      grader: pull.card.grader,
      certNumber: pull.card.certNumber,
      grade: pull.card.grade.toString(),
      category: pull.card.category,
      subject: pull.card.subject,
      setName: pull.card.setName,
      year: pull.card.year,
      variant: pull.card.variant,
      fmvCents: pull.card.fmvCents,
      priceConfidence: pull.card.priceConfidence,
      example: pull.card.example,
    },
    vault: pull.vaultItem
      ? {
          id: pull.vaultItem.id,
          status: pull.vaultItem.status,
          shipHoldUntil: pull.vaultItem.shipHoldUntil?.toISOString() ?? null,
          buybackBlocked: pull.vaultItem.buybackBlocked,
        }
      : null,
  };
}

export function publishedCommit(seedHex: string): string {
  return commitHash(seedHex);
}
