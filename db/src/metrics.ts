import { prisma } from "./client";

export async function dashboardMetrics(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [users, pullsToday, gmv, disputes, livePacks, heldReserve] = await Promise.all([
    prisma.user.count(),
    prisma.pull.count({ where: { at: { gte: day }, voided: false } }),
    prisma.pull.aggregate({ where: { voided: false }, _sum: { priceCents: true } }),
    prisma.dispute.count(),
    prisma.pack.count({ where: { status: "live" } }),
    prisma.reserveLot.aggregate({ where: { releasedAt: null }, _sum: { amountCents: true } }),
  ]);
  return {
    users,
    pullsToday,
    gmvCents: gmv._sum.priceCents ?? 0,
    disputes,
    livePacks,
    reserveCents: heldReserve._sum.amountCents ?? 0,
  };
}

export async function liveFeed(limit = 12) {
  const pulls = await prisma.pull.findMany({
    where: { voided: false },
    orderBy: { at: "desc" },
    take: limit,
    include: {
      user: { select: { username: true } },
      pack: { select: { name: true } },
      card: { select: { subject: true, fmvCents: true, category: true } },
    },
  });
  return pulls.map((pull) => ({
    id: pull.id,
    username: pull.user.username,
    pack: pull.pack.name,
    tier: pull.tier,
    subject: pull.card.subject,
    fmvCents: pull.card.fmvCents,
    category: pull.card.category,
    at: pull.at.toISOString(),
  }));
}

export async function recentAudits(limit = 40) {
  return prisma.adminAudit.findMany({ orderBy: { at: "desc" }, take: limit });
}
