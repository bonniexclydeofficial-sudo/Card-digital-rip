import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buybackCreditCents } from "@cdr/econ";
import { acceptBuyback, buybackNow, openBuyback, prisma, ripPack } from "@cdr/db";
import { makePack, makeUser } from "./helpers";

describe("buyback", () => {
  it("pays floor(FMV × haircut × rate) in credits and enforces expiry and blocks", async () => {
    const userId = await makeUser();
    const pack = await makePack(3, 100);
    const now = new Date("2026-10-24T12:00:00.000Z");
    const rip = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `bb-${randomUUID()}`, now });
    expect(rip.ok).toBe(true);
    if (!rip.ok) return;
    const vault = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: rip.pullId }, include: { card: true } });
    const quote = buybackCreditCents(vault.card.fmvCents, "high");
    expect(quote.creditCents).toBe(Math.floor((vault.card.fmvCents * 9000) / 10_000));

    const opened = await openBuyback(userId, vault.id, now);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const expired = await acceptBuyback(userId, opened.offer.id, new Date(now.getTime() + 11 * 60 * 1000));
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.code).toBe("EXPIRED");
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId } })).availableCents).toBe(1_000_000 - 100);

    await prisma.card.update({ where: { id: vault.cardId }, data: { priceConfidence: "low" } });
    const freshNow = new Date("2026-10-24T12:05:00.000Z");
    const done = await buybackNow(userId, vault.id, freshNow);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    const low = buybackCreditCents(vault.card.fmvCents, "low");
    expect(done.creditCents).toBe(low.creditCents);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.availableCents).toBe(1_000_000 - 100 + low.creditCents);
    expect(wallet.buybackCents).toBe(low.creditCents);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: vault.cardId } })).status).toBe("available");
    expect((await prisma.vaultItem.findUniqueOrThrow({ where: { id: vault.id } })).status).toBe("bought_back");

    const second = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `bb2-${randomUUID()}`, now: freshNow });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const held = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: second.pullId } });
    await prisma.vaultItem.update({ where: { id: held.id }, data: { buybackBlocked: true } });
    const blocked = await buybackNow(userId, held.id, freshNow);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("BLOCKED");
  });
});
