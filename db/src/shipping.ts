import { addBusinessDays, FREE_SHIP_FMV_CENTS, SHIP_FLAT_CENTS, SHIP_SLA_BUSINESS_DAYS, SIGNATURE_FMV_CENTS } from "@cdr/risk";
import { prisma } from "./client";

export interface ShipAddress {
  line?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
}

export async function requestShipment(
  userId: string,
  vaultItemIds: string[],
  now = new Date(),
  address?: ShipAddress,
) {
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
      insured: true,
      insuranceCents: fmv,
      signature: fmv > SIGNATURE_FMV_CENTS,
      slaDueAt: addBusinessDays(now, SHIP_SLA_BUSINESS_DAYS),
      addressLine: address?.line ?? null,
      city: address?.city ?? null,
      region: address?.region ?? null,
      postal: address?.postal ?? null,
      country: address?.country ?? "US",
      carrier: waiting ? null : "shippo_test",
      labelUrl: null,
      trackingNumber: null,
    },
  });
  if (!waiting) {
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        labelUrl: `https://shippo.test/labels/${shipment.id}`,
        trackingNumber: `TEST${shipment.id.slice(-8).toUpperCase()}`,
        trackingUrl: `https://shippo.test/track/${shipment.id}`,
      },
    });
  }
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
  const labeled = waiting ? shipment : await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
  return { ok: true as const, shipment: labeled, waiting };
}
