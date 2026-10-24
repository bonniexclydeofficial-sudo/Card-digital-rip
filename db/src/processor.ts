import { randomUUID } from "node:crypto";
import type { PaymentProvider, ProcessorName, WebhookEvent } from "@cdr/pay";
import { planChargeback, providerByName, reserveReleaseAt } from "@cdr/pay";
import { fundingHoldUntil, withinDailyLimit } from "@cdr/risk";
import { writeAudit } from "./audit";
import { prisma } from "./client";
import { insertJournal, lockWallet } from "./ledger";

const secretFor = (processor: ProcessorName) =>
  process.env[processor === "stripe" ? "STRIPE_WEBHOOK_SECRET" : "HIGH_RISK_WEBHOOK_SECRET"] || "test-webhook-secret";

export async function startProcessorTopUp(input: {
  userId: string;
  amountCents: number;
  processor: Exclude<ProcessorName, "stub">;
  idempotencyKey: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (!Number.isInteger(input.amountCents) || input.amountCents < 500 || input.amountCents > 200_000) {
    return { ok: false as const, code: "AMOUNT" as const, message: "Top-ups are between $5 and $2,000." };
  }
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    return { ok: true as const, replay: true as const, paymentId: existing.id, status: existing.status, ref: existing.ref, charged: false as const };
  }
  const user = await prisma.user.findUnique({ where: { id: input.userId }, include: { limit: true } });
  if (!user) return { ok: false as const, code: "NOT_FOUND" as const, message: "Unknown user." };
  if (user.status !== "active") return { ok: false as const, code: "USER_BLOCKED" as const, message: "This account cannot add credits." };
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const spent = await prisma.payment.aggregate({
    where: { userId: user.id, status: { in: ["succeeded", "stubbed", "requires_action"] }, createdAt: { gte: start } },
    _sum: { amountCents: true },
  });
  const limit = user.limit?.dailyLimitCents ?? 50_000;
  if (!withinDailyLimit(spent._sum.amountCents ?? 0, input.amountCents, limit)) {
    return { ok: false as const, code: "LIMIT" as const, message: `Daily top-up limit is $${(limit / 100).toFixed(0)}.` };
  }
  const provider = providerByName(input.processor);
  const intent = await provider.createTopUp({
    userId: user.id,
    amountCents: input.amountCents,
    idempotencyKey: input.idempotencyKey,
  });
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      provider: intent.processor,
      processor: intent.processor,
      ref: intent.ref,
      amountCents: input.amountCents,
      status: intent.status,
      threeDs: intent.threeDs,
      threeDsStatus: intent.status === "requires_action" ? "required" : "authenticated",
      idempotencyKey: input.idempotencyKey,
      reserveCents: intent.reserveCents,
      risk: "test-mode-no-charge",
    },
  });
  if (intent.status === "succeeded") await creditTopUp(payment.id, now);
  return {
    ok: true as const,
    replay: false as const,
    paymentId: payment.id,
    status: intent.status,
    ref: intent.ref,
    clientSecret: intent.clientSecret,
    charged: false as const,
    threeDs: intent.threeDs,
  };
}

export async function confirmProcessorTopUp(userId: string, paymentId: string, now = new Date()) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
  if (!payment) return { ok: false as const, code: "NOT_FOUND" as const };
  if (payment.status === "succeeded" || payment.status === "stubbed") {
    return { ok: true as const, replay: true as const, charged: false as const };
  }
  const provider: PaymentProvider = providerByName(payment.processor as ProcessorName);
  const confirmed = await provider.confirmThreeDs(payment.ref);
  if (confirmed.status !== "succeeded") return { ok: false as const, code: "FAILED" as const };
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "succeeded", threeDsStatus: "authenticated" },
  });
  await creditTopUp(payment.id, now);
  return { ok: true as const, replay: false as const, charged: false as const };
}

async function creditTopUp(paymentId: string, now: Date) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  const prior = await prisma.payment.count({
    where: { userId: payment.userId, status: { in: ["succeeded", "stubbed"] }, id: { not: payment.id } },
  });
  const holdUntil = fundingHoldUntil({ now, firstCardTopUp: prior === 0 });
  await prisma.$transaction(async (tx) => {
    await insertJournal(tx, {
      userId: payment.userId,
      direction: "credit",
      amountCents: payment.amountCents,
      fundingSource: "card",
      holdUntil,
      refType: "payment",
      refId: payment.ref,
      idempotencyKey: `topup:${payment.ref}`,
    });
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: payment.userId } });
    await tx.wallet.update({
      where: { userId: payment.userId },
      data: { heldCardCents: wallet.heldCardCents + payment.amountCents, fundingHoldUntil: holdUntil },
    });
    if (payment.reserveCents > 0) {
      await tx.reserveLot.create({
        data: { paymentId: payment.id, amountCents: payment.reserveCents, releaseAt: reserveReleaseAt(now) },
      });
    }
  });
}

export async function releaseReserves(now = new Date()) {
  const due = await prisma.reserveLot.findMany({ where: { releasedAt: null, releaseAt: { lte: now } } });
  if (due.length === 0) return { released: 0, cents: 0 };
  await prisma.reserveLot.updateMany({
    where: { id: { in: due.map((lot) => lot.id) } },
    data: { releasedAt: now },
  });
  return { released: due.length, cents: due.reduce((sum, lot) => sum + lot.amountCents, 0) };
}

export async function refundPayment(actorId: string, paymentId: string, amountCents: number) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.role !== "admin") return { ok: false as const, code: "FORBIDDEN" as const };
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || (payment.status !== "succeeded" && payment.status !== "stubbed")) {
    return { ok: false as const, code: "NOT_REFUNDABLE" as const };
  }
  const remaining = payment.amountCents - payment.refundedCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > remaining) {
    return { ok: false as const, code: "AMOUNT" as const };
  }
  const provider = providerByName((payment.processor as ProcessorName) || "stripe");
  const refund = await provider.refund(payment.ref, amountCents);
  await prisma.$transaction(async (tx) => {
    const wallet = await lockWallet(tx, payment.userId);
    if (wallet.available_cents < amountCents) throw new Error("insufficient credits to refund");
    await insertJournal(tx, {
      userId: payment.userId,
      direction: "debit",
      amountCents,
      fundingSource: "card",
      refType: "refund",
      refId: refund.refundRef,
      idempotencyKey: `refund:${refund.refundRef}`,
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { refundedCents: payment.refundedCents + amountCents, status: amountCents === remaining ? "refunded" : payment.status },
    });
  });
  await writeAudit(actorId, "payment.refund", "payment", payment.id, { amountCents, charged: false });
  return { ok: true as const, charged: false as const, refundRef: refund.refundRef };
}

export async function ingestWebhook(processor: ProcessorName, rawBody: string, signature: string | null, secret = secretFor(processor)) {
  const provider = providerByName(processor);
  const event = provider.parseWebhook(rawBody, signature, secret);
  if (!event) return { ok: false as const, code: "SIGNATURE" as const };
  return applyWebhook(event);
}

export async function applyWebhook(event: WebhookEvent) {
  const seen = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
  if (seen) return { ok: true as const, replay: true as const };
  await prisma.webhookEvent.create({ data: { id: event.id, processor: event.processor, type: event.type } });
  if (event.type === "charge.dispute.created") return applyChargeback(event);
  if (event.type === "charge.refunded") {
    const payment = await prisma.payment.findUnique({ where: { ref: event.ref } });
    if (!payment) return { ok: false as const, code: "NOT_FOUND" as const };
    return refundPayment(await adminId(), payment.id, event.amountCents);
  }
  if (event.type === "payment_intent.succeeded") {
    const payment = await prisma.payment.findUnique({ where: { ref: event.ref } });
    if (!payment) return { ok: false as const, code: "NOT_FOUND" as const };
    if (payment.status !== "succeeded") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "succeeded", threeDsStatus: "authenticated" } });
      await creditTopUp(payment.id, new Date());
    }
  }
  return { ok: true as const, replay: false as const };
}

async function adminId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!admin) throw new Error("no admin for webhook refund");
  return admin.id;
}

export async function applyChargeback(event: Pick<WebhookEvent, "ref" | "id">) {
  const payment = await prisma.payment.findUnique({ where: { ref: event.ref } });
  if (!payment) return { ok: false as const, code: "NOT_FOUND" as const };
  const existing = await prisma.dispute.findUnique({ where: { paymentId: payment.id } });
  if (existing) return { ok: true as const, replay: true as const, disputeId: existing.id };

  const items = await prisma.vaultItem.findMany({
    where: { userId: payment.userId, pull: { fundingSource: "card", voided: false } },
    include: { pull: true },
  });
  const unshipped = items.filter((item) => item.status === "held" || item.status === "shipping").map((item) => item.id);
  const shipped = items.filter((item) => item.status === "shipped").map((item) => item.id);
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: payment.userId } });
  const plan = planChargeback({
    paymentCents: payment.amountCents,
    alreadyReversedCents: payment.refundedCents,
    availableCents: wallet.availableCents,
    unshippedVaultItemIds: unshipped,
    shippedVaultItemIds: shipped,
  });

  const dispute = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: payment.userId }, data: { status: "locked" } });
    if (plan.clawbackCents > 0) {
      await insertJournal(tx, {
        userId: payment.userId,
        direction: "debit",
        amountCents: plan.clawbackCents,
        fundingSource: "card",
        refType: "dispute",
        refId: event.id,
        idempotencyKey: `dispute:${event.id}`,
      });
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { refundedCents: payment.refundedCents + plan.clawbackCents, status: "disputed" },
    });
    for (const id of plan.recallVaultItemIds) {
      const item = await tx.vaultItem.findUniqueOrThrow({ where: { id }, include: { pull: true } });
      await tx.vaultItem.update({ where: { id }, data: { status: "recalled", buybackBlocked: true } });
      await tx.pull.update({ where: { id: item.pullId }, data: { voided: true } });
      await tx.card.update({ where: { id: item.cardId }, data: { status: "available" } });
      await tx.cardEvent.create({
        data: { cardId: item.cardId, fromStatus: "pulled", toStatus: "available", reason: `chargeback ${event.id}` },
      });
    }
    if (plan.recallVaultItemIds.length) {
      await tx.shipment.updateMany({
        where: { userId: payment.userId, status: { in: ["requested", "waiting_hold", "labeled"] } },
        data: { status: "canceled", holdReason: "chargeback" },
      });
    }
    return tx.dispute.create({
      data: {
        paymentId: payment.id,
        userId: payment.userId,
        status: "open",
        reason: "chargeback",
        clawbackCents: plan.clawbackCents,
        evidence: {
          eventId: event.id,
          threeDs: payment.threeDs,
          recalled: plan.recallVaultItemIds,
          shipped: plan.shippedEvidenceIds,
          note: "Shipped items stay out for the evidence pack. Unshipped items are voided.",
        },
      },
    });
  });
  await writeAudit(null, "payment.chargeback", "dispute", dispute.id, { ref: event.ref, clawbackCents: plan.clawbackCents });
  return { ok: true as const, replay: false as const, disputeId: dispute.id, plan };
}

export function newEventId(): string {
  return `evt_${randomUUID()}`;
}
