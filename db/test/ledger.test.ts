import { randomUUID } from "node:crypto";
import pg from "pg";
import fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import { applyLedgerOp, emptyLedger, ledgerProblems, prisma, type Funding } from "@cdr/db";

const sources: Funding[] = ["card", "credit_buyback", "promo", "seed"];

describe("ledger invariants", () => {
  it("keeps 10k random ops non-negative and balanced", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            kind: fc.constantFrom("credit" as const, "debit" as const),
            amountCents: fc.integer({ min: 1, max: 50_000 }),
            fundingSource: fc.constantFrom(...sources),
          }),
          { minLength: 10_000, maxLength: 10_000 },
        ),
        (ops) => {
          let state = emptyLedger();
          for (const op of ops) state = applyLedgerOp(state, "user_prop", op);
          expect(ledgerProblems(state, "user_prop")).toEqual([]);
          expect(state.entries.length).toBe((ops.length - state.rejected) * 2);
        },
      ),
      { numRuns: 3 },
    );
  });

  it("persists 10k entries, matches the wallet, and rejects mutation", async () => {
    let state = emptyLedger();
    const userId = `user_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    for (let i = 0; i < 10_000; i++) {
      const kind = i % 5 === 0 ? "debit" : "credit";
      const amountCents = (i % 40) + 1;
      state = applyLedgerOp(state, userId, { kind, amountCents, fundingSource: sources[i % sources.length] });
    }
    expect(ledgerProblems(state, userId)).toEqual([]);
    expect(state.entries.length).toBeGreaterThan(10_000);

    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.com`,
        username: userId,
        passwordHash: "x",
        dob: new Date("1992-02-02T00:00:00.000Z"),
        state: "CA",
        clientSeed: "ledger-test",
        wallet: { create: { availableCents: state.balance } },
      },
    });
    for (let offset = 0; offset < state.entries.length; offset += 2000) {
      await prisma.ledgerEntry.createMany({
        data: state.entries.slice(offset, offset + 2000).map((entry) => ({
          ...entry,
          idempotencyKey: `${userId}:${entry.idempotencyKey}`,
        })),
      });
    }

    const rows = await prisma.ledgerEntry.findMany({ where: { userId, account: `user:${userId}` } });
    const net = rows.reduce(
      (sum, row) => sum + (row.direction === "credit" ? row.amountCents : -row.amountCents),
      0,
    );
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(net).toBe(state.balance);
    expect(wallet.availableCents).toBe(net);
    expect(net).toBeGreaterThanOrEqual(0);

    await expect(
      prisma.ledgerEntry.update({
        where: { idempotencyKey: `${userId}:j0:user` },
        data: { amountCents: 1 },
      }),
    ).rejects.toThrow(/immutable/i);
    await expect(prisma.$executeRaw`DELETE FROM ledger_entries WHERE user_id = ${userId}`).rejects.toThrow(/immutable/i);
  });

  it("gives ledger_app insert and select only", async () => {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledger_app') THEN
          CREATE ROLE ledger_app LOGIN PASSWORD 'ledger_app_test';
        END IF;
      END $$;
    `);
    await prisma.$executeRawUnsafe(`ALTER ROLE ledger_app WITH LOGIN PASSWORD 'ledger_app_test'`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ledger_app`);
    await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE ledger_entries FROM ledger_app`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT ON TABLE ledger_entries TO ledger_app`);

    const grants = await prisma.$queryRaw<{ privilege_type: string }[]>`
      SELECT privilege_type
      FROM information_schema.role_table_grants
      WHERE grantee = 'ledger_app' AND table_name = 'ledger_entries'
    `;
    const privileges = grants.map((grant) => grant.privilege_type).sort();
    expect(privileges).toEqual(["INSERT", "SELECT"]);

    const client = new pg.Client({
      connectionString: process.env.LEDGER_APP_URL ?? "postgresql://ledger_app:ledger_app_test@127.0.0.1:5432/card_digital_rip",
    });
    await client.connect();
    try {
      await expect(client.query("UPDATE ledger_entries SET amount_cents = amount_cents")).rejects.toThrow(/permission denied/i);
      await expect(client.query("DELETE FROM ledger_entries")).rejects.toThrow(/permission denied/i);
    } finally {
      await client.end();
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
