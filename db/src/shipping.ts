import { FREE_SHIP_FMV_CENTS, SHIP_FLAT_CENTS } from "@cdr/risk";
import { prisma } from "./client";

export async function requestShipment(userId: string, vaultItemIds: string[], now = new Date()) {
  if (vaultItemIds.length === 0 || vaultItemIds.length > 5) {
    return { ok: false as const, code: "COUNT" as const, message: "Ship 1 to 5 slabs at a time." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const, message: "Unknown user." };
  const items = await prisma.vaultItem.findMany({
    where: { id: { in: vaultItemIds }, userId, status: "held" },
  });
  if (items.length !== vaultItemIds.length) {
    return { ok: false as const, code: "NOT_HELD" as const, message: "Those slabs are not all in your vault." };
  }
  const waiting = items.some(
    (item) => item.shipHoldUntil != null && item.shipHoldUntil > now && user.kycStatus !== "passed",
  );
  const fmv = items.reduce((sum, item) => sum + item.fmvCentsAtPull, 0);
  const feeCents = fmv > FREE_SHIP_FMV_CENTS ? 0 : SHIP_FLAT_CENTS;
  const shipment = await prisma.shipment.create({
    data: {
      userId,
      status: waiting ? "waiting_hold" : "requested",
      feeCents,
      holdReason: waiting ? "funding_hold" : null,
      cardIds: items.map((item) => item.cardId),
    },
  });
  if (!waiting) {
    await prisma.vaultItem.updateMany({
      where: { id: { in: items.map((item) => item.id) } },
      data: { status: "shipping" },
    });
    await prisma.card.updateMany({
      where: { id: { in: items.map((item) => item.cardId) } },
      data: { status: "shipping" },
    });
  }
  return { ok: true as const, shipment, waiting };
}
