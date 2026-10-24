import { effectiveLimit, scheduleLimitChange } from "@cdr/risk";
import { writeAudit } from "./audit";
import { prisma } from "./client";

export async function setSpendLimit(userId: string, requestedCents: number, now = new Date()) {
  if (!Number.isInteger(requestedCents) || requestedCents < 0 || requestedCents > 5_000_000) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Spend limit must be between $0 and $50,000." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const, message: "Unknown user." };
  const current = effectiveLimit({
    currentCents: user.spendLimitCents,
    pendingCents: user.pendingSpendLimitCents,
    pendingAt: user.pendingSpendLimitAt,
    now,
  });
  const next = scheduleLimitChange({ currentCents: current, requestedCents, now });
  await prisma.user.update({
    where: { id: userId },
    data: {
      spendLimitCents: next.appliedCents,
      pendingSpendLimitCents: next.pendingCents,
      pendingSpendLimitAt: next.pendingAt,
    },
  });
  return { ok: true as const, ...next };
}

export async function startCoolOff(userId: string, hours: number, now = new Date()) {
  if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 90) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Cool-off is 1 to 2160 hours." };
  }
  const until = new Date(now.getTime() + hours * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { coolOffUntil: until } });
  return { ok: true as const, until };
}

export async function selfExclude(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { status: "self_excluded" } });
  await writeAudit(userId, "play.self_exclude", "user", userId, {});
  return { ok: true as const };
}
