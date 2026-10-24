import { randomUUID } from "node:crypto";
import type { FundingSource, LedgerDirection, Prisma } from "@prisma/client";

export type Funding = "card" | "credit_buyback" | "promo" | "seed";

export interface LedgerEntryDraft {
  journalId: string;
  account: string;
  userId: string;
  direction: "credit" | "debit";
  amountCents: number;
  fundingSource: Funding;
  refType: string;
  refId: string;
  idempotencyKey: string;
}

export interface LedgerSim {
  balance: number;
  entries: LedgerEntryDraft[];
  rejected: number;
}

export function emptyLedger(): LedgerSim {
  return { balance: 0, entries: [], rejected: 0 };
}

export function applyLedgerOp(
  state: LedgerSim,
  userId: string,
  op: { kind: "credit" | "debit"; amountCents: number; fundingSource: Funding },
): LedgerSim {
  if (!Number.isInteger(op.amountCents) || op.amountCents <= 0) {
    state.rejected += 1;
    return state;
  }
  if (op.kind === "debit" && state.balance < op.amountCents) {
    state.rejected += 1;
    return state;
  }
  const journalId = `j${state.entries.length / 2}`;
  const house: "credit" | "debit" = op.kind === "credit" ? "debit" : "credit";
  const shared = {
    journalId,
    userId,
    amountCents: op.amountCents,
    fundingSource: op.fundingSource,
    refType: "sim",
    refId: journalId,
  };
  state.entries.push(
    { ...shared, account: `user:${userId}`, direction: op.kind, idempotencyKey: `${journalId}:user` },
    { ...shared, account: "house:offset", direction: house, idempotencyKey: `${journalId}:house` },
  );
  state.balance += op.kind === "credit" ? op.amountCents : -op.amountCents;
  return state;
}

export function ledgerProblems(state: LedgerSim, userId: string): string[] {
  const problems: string[] = [];
  if (state.balance < 0) problems.push("negative");
  const net = state.entries
    .filter((entry) => entry.account === `user:${userId}`)
    .reduce((sum, entry) => sum + (entry.direction === "credit" ? entry.amountCents : -entry.amountCents), 0);
  if (net !== state.balance) problems.push(`balance ${state.balance} != ${net}`);
  const journals = new Map<string, { credit: number; debit: number }>();
  for (const entry of state.entries) {
    const bucket = journals.get(entry.journalId) ?? { credit: 0, debit: 0 };
    bucket[entry.direction] += entry.amountCents;
    journals.set(entry.journalId, bucket);
  }
  for (const [id, bucket] of journals) {
    if (bucket.credit !== bucket.debit) problems.push(`journal ${id} unbalanced`);
  }
  return problems;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

type WalletRow = {
  user_id: string;
  available_cents: number;
  held_card_cents: number;
  buyback_cents: number;
  promo_cents: number;
  funding_hold_until: Date | null;
};

export async function lockWallet(tx: Prisma.TransactionClient, userId: string): Promise<WalletRow> {
  const rows = await tx.$queryRaw<WalletRow[]>`
    SELECT user_id, available_cents, held_card_cents, buyback_cents, promo_cents, funding_hold_until
    FROM wallets
    WHERE user_id = ${userId}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new Error(`wallet missing for ${userId}`);
  return {
    ...row,
    available_cents: Number(row.available_cents),
    held_card_cents: Number(row.held_card_cents),
    buyback_cents: Number(row.buyback_cents),
    promo_cents: Number(row.promo_cents),
  };
}

export async function insertJournal(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    direction: LedgerDirection;
    amountCents: number;
    fundingSource: FundingSource;
    holdUntil?: Date | null;
    refType: string;
    refId: string;
    idempotencyKey: string;
  },
): Promise<{ availableCents: number }> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("amount must be a positive integer");
  }
  const wallet = await lockWallet(tx, input.userId);
  if (input.direction === "debit" && wallet.available_cents < input.amountCents) {
    throw new InsufficientCreditsError();
  }
  const availableCents =
    wallet.available_cents + (input.direction === "credit" ? input.amountCents : -input.amountCents);
  const journalId = randomUUID();
  const offset: LedgerDirection = input.direction === "credit" ? "debit" : "credit";
  await tx.ledgerEntry.createMany({
    data: [
      {
        journalId,
        account: `user:${input.userId}`,
        userId: input.userId,
        direction: input.direction,
        amountCents: input.amountCents,
        fundingSource: input.fundingSource,
        holdUntil: input.holdUntil ?? null,
        refType: input.refType,
        refId: input.refId,
        idempotencyKey: input.idempotencyKey,
      },
      {
        journalId,
        account: "house:offset",
        userId: input.userId,
        direction: offset,
        amountCents: input.amountCents,
        fundingSource: input.fundingSource,
        holdUntil: null,
        refType: input.refType,
        refId: input.refId,
        idempotencyKey: `${input.idempotencyKey}:offset`,
      },
    ],
  });
  await tx.wallet.update({
    where: { userId: input.userId },
    data: { availableCents },
  });
  return { availableCents };
}

export async function userBalanceFromLedger(
  tx: Prisma.TransactionClient | { ledgerEntry: Prisma.TransactionClient["ledgerEntry"] },
  userId: string,
): Promise<number> {
  const entries = await tx.ledgerEntry.findMany({
    where: { userId, account: `user:${userId}` },
  });
  return entries.reduce(
    (sum, entry) => sum + (entry.direction === "credit" ? entry.amountCents : -entry.amountCents),
    0,
  );
}
