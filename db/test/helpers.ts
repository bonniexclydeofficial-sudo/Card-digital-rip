import { randomUUID } from "node:crypto";
import { hashPassword, prisma } from "@cdr/db";

export async function makeUser(balance = 1_000_000, state = "CA") {
  const id = `user_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await prisma.user.create({
    data: {
      id,
      email: `${id}@example.com`,
      username: id,
      passwordHash: hashPassword("password-test"),
      dob: new Date("1995-06-01T00:00:00.000Z"),
      state,
      clientSeed: "client-seed-test",
      wallet: { create: { availableCents: 0 } },
      limit: { create: { dailyLimitCents: 500_000 } },
    },
  });
  if (balance > 0) {
    await prisma.ledgerEntry.createMany({
      data: [
        {
          journalId: `open-${id}`,
          account: `user:${id}`,
          userId: id,
          direction: "credit",
          amountCents: balance,
          fundingSource: "seed",
          refType: "test",
          refId: id,
          idempotencyKey: `test-open:${id}`,
        },
        {
          journalId: `open-${id}`,
          account: "house:offset",
          userId: id,
          direction: "debit",
          amountCents: balance,
          fundingSource: "seed",
          refType: "test",
          refId: id,
          idempotencyKey: `test-open:${id}:offset`,
        },
      ],
    });
    await prisma.wallet.update({ where: { userId: id }, data: { availableCents: balance } });
  }
  return id;
}

export async function makePack(slotCount: number, priceCents = 100) {
  const id = `pack_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const slug = `t-${id.slice(-10)}`;
  await prisma.pack.create({
    data: {
      id,
      slug,
      name: "Test pack",
      priceCents,
      status: "live",
      version: 1,
      liabilityCapCents: slotCount * 1000,
      description: "Concurrency fixture.",
      featured: false,
    },
  });
  await prisma.packTier.create({ data: { packId: id, version: 1, tier: "common", oddsBps: 10_000 } });
  for (let index = 0; index < slotCount; index++) {
    const card = await prisma.card.create({
      data: {
        grader: "PSA",
        certNumber: `T${randomUUID().replace(/-/g, "").slice(0, 18)}`,
        grade: "10.0",
        category: "other",
        subject: `Test slab ${index}`,
        setName: "Test Archive",
        year: 2024,
        fmvCents: 1000,
        priceConfidence: "high",
        fmvAt: new Date(),
        fmvSource: "manual",
        costCents: 700,
        ownerType: "house",
        custodyLocation: "TEST",
        bin: `T-${index}`,
        imageFrontUrl: "/api/slab/test?side=front",
        imageBackUrl: "/api/slab/test?side=back",
        status: "allocated",
        example: true,
      },
    });
    await prisma.packSlot.create({
      data: { packId: id, version: 1, tier: "common", slotIndex: index, cardId: card.id, state: "available" },
    });
  }
  return { id, slug };
}
