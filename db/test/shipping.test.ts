import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { prisma, requestShipment, ripPack, stubTopUp } from "@cdr/db";
import { makePack, makeUser } from "./helpers";

describe("funding hold on shipping", () => {
  it("stores a waiting hold when the rip used fresh card credits", async () => {
    const userId = await makeUser(0);
    const topped = await stubTopUp(userId, 5_000, new Date("2026-10-24T12:00:00.000Z"));
    expect(topped.ok).toBe(true);
    if (!topped.ok) return;
    expect(topped.charged).toBe(false);
    expect(topped.provider).toBe("stub");
    const pack = await makePack(1, 1_000);
    const rip = await ripPack({
      userId,
      packSlug: pack.slug,
      idempotencyKey: `ship-${randomUUID()}`,
      now: new Date("2026-10-24T12:05:00.000Z"),
    });
    expect(rip.ok).toBe(true);
    if (!rip.ok) return;
    const vault = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: rip.pullId } });
    expect(vault.shipHoldUntil).not.toBeNull();
    const shipment = await requestShipment(userId, [vault.id], new Date("2026-10-24T13:00:00.000Z"));
    expect(shipment.ok).toBe(true);
    if (!shipment.ok) return;
    expect(shipment.shipment.status).toBe("waiting_hold");
    expect(shipment.shipment.holdReason).toBe("funding_hold");
    expect((await prisma.card.findUniqueOrThrow({ where: { id: vault.cardId } })).status).toBe("pulled");

    await prisma.user.update({ where: { id: userId }, data: { kycStatus: "passed" } });
    const cleared = await requestShipment(userId, [vault.id], new Date("2026-10-24T13:10:00.000Z"));
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.shipment.status).toBe("requested");
  });

  it("lets a seed-funded rip ship without a hold", async () => {
    const userId = await makeUser(5_000);
    const pack = await makePack(1, 500);
    const rip = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `ship-seed-${randomUUID()}` });
    expect(rip.ok).toBe(true);
    if (!rip.ok) return;
    const vault = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: rip.pullId } });
    expect(vault.shipHoldUntil).toBeNull();
    const shipment = await requestShipment(userId, [vault.id]);
    expect(shipment.ok).toBe(true);
    if (!shipment.ok) return;
    expect(shipment.shipment.status).toBe("requested");
    expect(shipment.shipment.feeCents).toBe(799);
  });
});
