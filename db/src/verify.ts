import { verifyPull } from "@cdr/fair";
import { prisma } from "./client";

export async function getVerification(pullId: string) {
  const pull = await prisma.pull.findUnique({
    where: { id: pullId },
    include: { seed: true, pack: { include: { tiers: true } }, card: true },
  });
  if (!pull) return null;
  const slotIds = pull.availableSlotIds as string[];
  const tiers = [...pull.pack.tiers]
    .sort((a, b) => ["common", "rare", "epic", "legendary", "grail"].indexOf(a.tier) - ["common", "rare", "epic", "legendary", "grail"].indexOf(b.tier))
    .map((tier) => ({ tier: tier.tier, oddsBps: tier.oddsBps }));
  const check = verifyPull({
    serverSeedHex: pull.seed.seed,
    clientSeed: pull.clientSeed,
    nonce: pull.nonce,
    packVersion: pull.version,
    tiers,
    slotIds,
    expected: {
      hmac: pull.hmac,
      tier: pull.tier,
      slotIndex: pull.poolIndex,
      slotId: pull.slotId,
      slotListHash: pull.slotListHash,
    },
  });
  const revealed = pull.seed.revealedAt != null;
  return {
    pullId: pull.id,
    revealed,
    serverChecked: check.ok,
    mismatches: check.mismatches,
    commitHash: pull.seed.hash,
    serverSeedHex: revealed ? pull.seed.seed : null,
    clientSeed: pull.clientSeed,
    nonce: pull.nonce,
    packVersion: pull.version,
    packSlug: pull.pack.slug,
    packName: pull.pack.name,
    tier: pull.tier,
    roll: check.recomputed.roll,
    slotIndex: pull.poolIndex,
    slotId: pull.slotId,
    hmac: pull.hmac,
    message: check.recomputed.message,
    slotListHash: pull.slotListHash,
    odds: tiers,
    card: {
      subject: pull.card.subject,
      grader: pull.card.grader,
      grade: pull.card.grade.toString(),
      certNumber: pull.card.certNumber,
      fmvCents: pull.card.fmvCents,
      category: pull.card.category,
    },
  };
}
