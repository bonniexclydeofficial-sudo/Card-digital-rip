import { randomBytes } from "node:crypto";
import { equalEntryWeights, promoAllowed } from "@cdr/risk";
import { prisma } from "./client";
import { grantPromoCredits } from "./credits";

const REFERRAL_CENTS = 500;

export async function ensureReferralCode(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const };
  if (user.referralCode) return { ok: true as const, code: user.referralCode };
  const code = randomBytes(4).toString("hex");
  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return { ok: true as const, code };
}

export async function claimReferral(refereeId: string, code: string, disclosed: boolean, now = new Date()) {
  if (!disclosed) {
    return { ok: false as const, code: "DISCLOSURE" as const, message: "A referral reward requires the FTC disclosure." };
  }
  const referee = await prisma.user.findUnique({ where: { id: refereeId } });
  const referrer = await prisma.user.findUnique({ where: { referralCode: code.trim().toLowerCase() } });
  if (!referee || !referrer) return { ok: false as const, code: "NOT_FOUND" as const, message: "Unknown referral code." };
  if (referrer.id === referee.id) return { ok: false as const, code: "SELF" as const, message: "You cannot refer yourself." };
  const prior = await prisma.referral.findUnique({ where: { refereeId } });
  if (prior) return { ok: false as const, code: "ALREADY" as const, message: "This account already used a referral." };
  for (const state of [referee.state, referrer.state]) {
    const promo = promoAllowed(state);
    if (!promo.allowed) return { ok: false as const, code: "VOID" as const, message: promo.reason ?? "Promo void." };
  }
  await grantPromoCredits(referrer.id, REFERRAL_CENTS, `referral:${referee.id}`, now);
  await grantPromoCredits(referee.id, REFERRAL_CENTS, `referred:${referrer.id}`, now);
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: referee.id,
      code: referrer.referralCode ?? code,
      disclosed: true,
      rewardCents: REFERRAL_CENTS,
    },
  });
  await prisma.user.update({ where: { id: referee.id }, data: { referredById: referrer.id } });
  return { ok: true as const, rewardCents: REFERRAL_CENTS };
}

export async function enterAmoe(input: {
  promoSlug: string;
  email: string;
  state: string;
  source: "free" | "purchase";
  userId?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Enter a valid email." };
  }
  const gate = promoAllowed(input.state);
  if (!gate.allowed) return { ok: false as const, code: "VOID" as const, message: gate.reason ?? "Void." };
  const promo = await prisma.promo.upsert({
    where: { slug: input.promoSlug },
    update: {},
    create: { slug: input.promoSlug, name: input.promoSlug, status: "open" },
  });
  const existing = await prisma.amoeEntry.findUnique({
    where: { promoId_email_source: { promoId: promo.id, email, source: input.source } },
  });
  const entry =
    existing ??
    (await prisma.amoeEntry.create({
      data: {
        promoId: promo.id,
        email,
        state: input.state.trim().toUpperCase(),
        source: input.source,
        userId: input.userId ?? null,
      },
    }));
  const weights = equalEntryWeights([{ id: entry.id }]);
  return { ok: true as const, entryId: entry.id, weight: weights[0]?.weight ?? 1, replay: Boolean(existing) };
}
