import {
  DRAFT_OK,
  DRAFT_THIN_MARGIN,
  LIVE_PACKS,
  SPARE_CARD_COUNT,
  type ExamplePackSpec,
} from "@cdr/econ";
import { commitHash, EXAMPLE_CLIENT_SEED, EXAMPLE_SERVER_SEED_HEX, randomServerSeedHex } from "@cdr/fair";
import { prisma } from "../src/client";
import { insertJournal } from "../src/ledger";
import { hashPassword } from "../src/password";
import { ripWithSeed } from "../src/rip";

const GRADERS = ["PSA", "BGS", "CGC", "SGC"] as const;
const CATEGORIES = ["pokemon", "baseball", "basketball", "football", "one_piece", "other"] as const;
const GRADES = ["10.0", "9.5", "9.0", "8.5"];

async function main() {
  const now = new Date();
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      admin_audits,
      shipments,
      buybacks,
      vault_items,
      pulls,
      pack_slots,
      pack_tiers,
      packs,
      card_events,
      price_history,
      cards,
      payments,
      ledger_entries,
      wallets,
      user_limits,
      geo_checks,
      server_seeds,
      users
    RESTART IDENTITY CASCADE
  `);

  let seq = 1;
  const cards: {
    id: string;
    grader: (typeof GRADERS)[number];
    certNumber: string;
    grade: string;
    category: (typeof CATEGORIES)[number];
    subject: string;
    setName: string;
    year: number;
    cardNumber: string;
    variant: string;
    fmvCents: number;
    priceConfidence: "high";
    fmvAt: Date;
    fmvSource: string;
    costCents: number;
    ownerType: "house";
    custodyLocation: string;
    bin: string;
    imageFrontUrl: string;
    imageBackUrl: string;
    status: "available" | "allocated";
    example: boolean;
  }[] = [];

  function makeCard(fmvCents: number, status: "available" | "allocated") {
    const n = seq++;
    const id = `card_${String(n).padStart(4, "0")}`;
    const category = CATEGORIES[n % CATEGORIES.length];
    cards.push({
      id,
      grader: GRADERS[n % GRADERS.length],
      certNumber: `EX${String(n).padStart(6, "0")}`,
      grade: GRADES[n % GRADES.length],
      category,
      subject: `Example ${category} ${n}`,
      setName: "Example Archive",
      year: 2024,
      cardNumber: String(n),
      variant: "EXAMPLE",
      fmvCents,
      priceConfidence: "high",
      fmvAt: now,
      fmvSource: "manual",
      costCents: Math.round(fmvCents * 0.7),
      ownerType: "house",
      custodyLocation: "EX-VAULT",
      bin: `EX-${String(n).padStart(4, "0")}`,
      imageFrontUrl: `/api/slab/${id}?side=front`,
      imageBackUrl: `/api/slab/${id}?side=back`,
      status,
      example: true,
    });
    return id;
  }

  const allocations: { pack: ExamplePackSpec; status: "live" | "draft"; slots: { tier: string; cardId: string }[] }[] = [];
  for (const pack of [
    ...LIVE_PACKS.map((pack) => ({ pack, status: "live" as const })),
    { pack: DRAFT_OK, status: "draft" as const },
    { pack: DRAFT_THIN_MARGIN, status: "draft" as const },
  ]) {
    const slots: { tier: string; cardId: string }[] = [];
    for (const tier of pack.pack.tiers) {
      for (let i = 0; i < tier.count; i++) slots.push({ tier: tier.tier, cardId: makeCard(tier.fmvCents, "allocated") });
    }
    allocations.push({ pack: pack.pack, status: pack.status, slots });
  }
  for (let i = 0; i < SPARE_CARD_COUNT; i++) {
    const fmv = 1500 + (i % 9) * 800;
    makeCard(fmv, "available");
  }
  if (cards.length !== 200) throw new Error(`expected 200 cards, built ${cards.length}`);

  await prisma.card.createMany({ data: cards });
  await prisma.priceHistory.createMany({
    data: cards.map((card) => ({ cardId: card.id, fmvCents: card.fmvCents, source: "manual", at: now })),
  });
  await prisma.cardEvent.createMany({
    data: cards
      .filter((card) => card.status === "allocated")
      .map((card) => ({ cardId: card.id, fromStatus: "available", toStatus: "allocated", reason: "seed" })),
  });

  for (const allocation of allocations) {
    const liability = allocation.slots.reduce((sum, slot) => {
      const card = cards.find((item) => item.id === slot.cardId)!;
      return sum + card.fmvCents;
    }, 0);
    await prisma.pack.create({
      data: {
        id: allocation.pack.slug,
        slug: allocation.pack.slug,
        name: allocation.pack.name,
        priceCents: allocation.pack.priceCents,
        status: allocation.status,
        version: 1,
        liabilityCapCents: liability,
        description: allocation.pack.description,
        featured: allocation.pack.featured,
        tiers: {
          create: allocation.pack.tiers.map((tier) => ({
            version: 1,
            tier: tier.tier,
            oddsBps: tier.oddsBps,
          })),
        },
        slots: {
          create: allocation.slots.map((slot, index) => ({
            id: `slot_${allocation.pack.slug}_${index}`,
            version: 1,
            tier: slot.tier as "common",
            slotIndex: index,
            cardId: slot.cardId,
            state: "available",
          })),
        },
      },
    });
  }

  const adaHash = hashPassword("rip-demo");
  const adminHash = hashPassword("admin-demo");
  await prisma.user.create({
    data: {
      id: "user_ada",
      email: "ada@example.com",
      username: "ada",
      passwordHash: adaHash,
      dob: new Date("1998-04-12T00:00:00.000Z"),
      state: "CA",
      clientSeed: EXAMPLE_CLIENT_SEED,
      role: "user",
      wallet: { create: {} },
      limit: { create: { dailyLimitCents: 500_000 } },
    },
  });
  await prisma.user.create({
    data: {
      id: "user_admin",
      email: "admin@example.com",
      username: "admin",
      passwordHash: adminHash,
      dob: new Date("1990-01-01T00:00:00.000Z"),
      state: "CA",
      clientSeed: "admin-client-seed",
      role: "admin",
      wallet: { create: {} },
      limit: { create: { dailyLimitCents: 50_000 } },
    },
  });

  await prisma.$transaction((tx) =>
    insertJournal(tx, {
      userId: "user_ada",
      direction: "credit",
      amountCents: 200_000,
      fundingSource: "seed",
      refType: "seed",
      refId: "ada-opening",
      idempotencyKey: "grant:ada-opening",
    }),
  );

  await prisma.serverSeed.create({
    data: {
      id: "seed_example",
      seed: EXAMPLE_SERVER_SEED_HEX,
      hash: commitHash(EXAMPLE_SERVER_SEED_HEX),
      active: false,
    },
  });

  const ripped = await ripWithSeed({
    userId: "user_ada",
    packSlug: "pack-25",
    seedId: "seed_example",
    idempotencyKey: "seed-pull-example",
    pullId: "pull_example",
    now,
  });
  if (!ripped.ok) throw new Error(`example pull failed: ${ripped.code} ${ripped.message}`);

  await prisma.serverSeed.update({
    where: { id: "seed_example" },
    data: { revealedAt: now },
  });

  const activeSeed = randomServerSeedHex();
  await prisma.serverSeed.create({
    data: {
      id: "seed_active",
      seed: activeSeed,
      hash: commitHash(activeSeed),
      active: true,
    },
  });

  const balance = await prisma.wallet.findUniqueOrThrow({ where: { userId: "user_ada" } });
  console.log(
    `Seeded ${cards.length} EXAMPLE cards, 3 live packs, demo pull ${ripped.pullId} (${ripped.tier}). Ada balance ${balance.availableCents} cents.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
