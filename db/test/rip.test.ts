import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { commitHash, randomServerSeedHex } from "@cdr/fair";
import { getVerification, prisma, ripPack, ripWithSeed, userBalanceFromLedger } from "@cdr/db";
import { makePack, makeUser } from "./helpers";

describe("rip", () => {
  it("is idempotent for the same key, including a concurrent pair", async () => {
    const userId = await makeUser();
    const pack = await makePack(4, 500);
    const key = `idem-${randomUUID()}`;
    const [first, second] = await Promise.all([
      ripPack({ userId, packSlug: pack.slug, idempotencyKey: key }),
      ripPack({ userId, packSlug: pack.slug, idempotencyKey: key }),
    ]);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.pullId).toBe(second.pullId);
    expect(await prisma.pull.count({ where: { idempotencyKey: key } })).toBe(1);
    const again = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: key });
    expect(again.ok && again.replay).toBe(true);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const ledger = await userBalanceFromLedger(prisma, userId);
    expect(wallet.availableCents).toBe(1_000_000 - 500);
    expect(ledger).toBe(wallet.availableCents);
  });

  it("re-checks geo and does not charge a blocked request", async () => {
    const userId = await makeUser();
    const pack = await makePack(2, 500);
    const result = await ripPack({
      userId,
      packSlug: pack.slug,
      idempotencyKey: `geo-${randomUUID()}`,
      requestGeoState: "WA",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("GEO_BLOCKED");
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.availableCents).toBe(1_000_000);
    expect(await prisma.pull.count({ where: { userId, packId: pack.id } })).toBe(0);
    const check = await prisma.geoCheck.findFirst({ where: { userId, source: "rip-request" }, orderBy: { at: "desc" } });
    expect(check?.passed).toBe(false);
    expect(check?.state).toBe("WA");
  });

  it("lets exactly 10 of 100 concurrent rips take a 10-slot pack", async () => {
    const userId = await makeUser(1_000_000);
    const pack = await makePack(10, 100);
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        ripPack({ userId, packSlug: pack.slug, idempotencyKey: `race-${index}-${randomUUID()}` }),
      ),
    );
    const wins = results.filter((result) => result.ok);
    expect(wins).toHaveLength(10);
    const cardIds = new Set(wins.map((result) => (result.ok ? result.cardId : "")));
    expect(cardIds.size).toBe(10);
    expect(await prisma.pull.count({ where: { packId: pack.id } })).toBe(10);
    expect(await prisma.packSlot.count({ where: { packId: pack.id, state: "pulled" } })).toBe(10);
    expect(await prisma.packSlot.count({ where: { packId: pack.id, state: "available" } })).toBe(0);
    const debits = await prisma.ledgerEntry.count({
      where: { userId, direction: "debit", account: `user:${userId}`, refType: "pull" },
    });
    expect(debits).toBe(10);
    const paused = await prisma.pack.findUniqueOrThrow({ where: { id: pack.id } });
    expect(paused.status).toBe("paused");
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.availableCents).toBe(1_000_000 - 1_000);
    expect(await userBalanceFromLedger(prisma, userId)).toBe(wallet.availableCents);
  });

  it("recomputes 100 pulls after the server seed is revealed", async () => {
    const userId = await makeUser(100_000);
    const pack = await makePack(100, 50);
    const seedHex = randomServerSeedHex();
    const seed = await prisma.serverSeed.create({
      data: { seed: seedHex, hash: commitHash(seedHex), active: false },
    });
    const pullIds: string[] = [];
    for (let index = 0; index < 100; index++) {
      const result = await ripWithSeed({
        userId,
        packSlug: pack.slug,
        seedId: seed.id,
        idempotencyKey: `verify-${index}-${randomUUID()}`,
      });
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (result.ok) pullIds.push(result.pullId);
    }
    await prisma.serverSeed.update({ where: { id: seed.id }, data: { revealedAt: new Date() } });
    for (const pullId of pullIds) {
      const proof = await getVerification(pullId);
      expect(proof?.revealed).toBe(true);
      expect(proof?.serverChecked).toBe(true);
      expect(proof?.mismatches).toEqual([]);
      expect(proof?.serverSeedHex).toBe(seedHex);
    }
  });
});
