import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signKycWebhook } from "@cdr/kyc";
import { ExamplePriceFeed } from "@cdr/pricing";
import { signWebhook } from "@cdr/pay";
import {
  applyChargeback,
  approveCardPrice,
  claimReferral,
  confirmProcessorTopUp,
  enterAmoe,
  ingestWebhook,
  ensureReferralCode,
  grantPromoCredits,
  ingestKycWebhook,
  newEventId,
  prisma,
  proposeCardPrice,
  publishPack,
  registerUser,
  requestShipment,
  ripPack,
  ripSequence,
  runPriceRefresh,
  setFlag,
  setSpendLimit,
  startCoolOff,
  startKycInquiry,
  startProcessorTopUp,
  turboBuyback,
} from "@cdr/db";
import { makePack, makeUser } from "./helpers";

const now = new Date("2026-10-24T12:00:00.000Z");

describe("production compliance", () => {
  it("keeps NJ, TN, and LA closed until their flags open, and uses the age of majority", async () => {
    const admin = await makeUser();
    await prisma.user.update({ where: { id: admin }, data: { role: "admin" } });
    for (const state of ["NJ", "TN", "LA"]) {
      const blocked = await registerUser({
        email: `${state}-${randomUUID()}@example.com`,
        username: `s${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        password: "password-test",
        dob: "1990-01-01",
        state,
        now,
      });
      expect(blocked.ok, state).toBe(false);
      if (!blocked.ok) expect(blocked.code).toBe("GEO_BLOCKED");
    }
    await setFlag(admin, "state_open_NJ", true);
    const opened = await registerUser({
      email: `open-${randomUUID()}@example.com`,
      username: `o${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      password: "password-test",
      dob: "1990-01-01",
      state: "NJ",
      now,
    });
    expect(opened.ok).toBe(true);
    await setFlag(admin, "state_open_NJ", false);

    const younger = await registerUser({
      email: `ms-${randomUUID()}@example.com`,
      username: `y${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      password: "password-test",
      dob: "2006-10-24",
      state: "MS",
      now,
    });
    expect(younger.ok).toBe(false);
    if (!younger.ok) expect(younger.code).toBe("UNDERAGE");
  });

  it("spends promotional credits first and leaves purchased credits unexpired", async () => {
    const userId = await makeUser(10_000);
    const grant = await grantPromoCredits(userId, 40, "test", now, 60_000);
    expect(grant.ok).toBe(true);
    const pack = await makePack(2, 100);
    const rip = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `promo-${randomUUID()}`, now });
    expect(rip.ok).toBe(true);
    if (!rip.ok) return;
    const pull = await prisma.pull.findUniqueOrThrow({ where: { id: rip.pullId } });
    expect(pull.fundingSource).toBe("promo");
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.promoCents).toBe(0);
    expect(wallet.availableCents).toBe(10_000 + 40 - 100);
    const expired = await grantPromoCredits(userId, 25, "old", new Date(now.getTime() - 120_000), 1_000);
    expect(expired.ok).toBe(true);
    const again = await ripPack({
      userId,
      packSlug: pack.slug,
      idempotencyKey: `promo2-${randomUUID()}`,
      now,
    });
    expect(again.ok).toBe(true);
    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(after.promoCents).toBe(0);
  });

  it("enforces spend limits, cool-off, and self-exclusion", async () => {
    const userId = await makeUser(50_000);
    await setSpendLimit(userId, 50, now);
    const pack = await makePack(1, 100);
    const limited = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `lim-${randomUUID()}`, now });
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.code).toBe("SPEND_LIMIT");

    const cooled = await makeUser();
    await startCoolOff(cooled, 2, now);
    const pack2 = await makePack(1, 100);
    const blocked = await ripPack({ userId: cooled, packSlug: pack2.slug, idempotencyKey: `cool-${randomUUID()}`, now });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("COOL_OFF");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: cooled } })).status).toBe("active");

    const gone = await makeUser();
    await prisma.user.update({ where: { id: gone }, data: { status: "self_excluded" } });
    const pack3 = await makePack(1, 100);
    const excluded = await ripPack({ userId: gone, packSlug: pack3.slug, idempotencyKey: `ex-${randomUUID()}`, now });
    expect(excluded.ok).toBe(false);
    if (!excluded.ok) expect(excluded.code).toBe("USER_BLOCKED");
  });

  it("confirms a Stripe test top-up without charging and claws back a dispute", async () => {
    const userId = await makeUser(0);
    const started = await startProcessorTopUp({
      userId,
      amountCents: 1_000,
      processor: "stripe",
      idempotencyKey: `pi_${randomUUID()}`,
      now,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.charged).toBe(false);
    expect(started.status).toBe("requires_action");
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId } })).availableCents).toBe(0);
    const confirmed = await confirmProcessorTopUp(userId, started.paymentId, now);
    expect(confirmed.ok && confirmed.charged).toBe(false);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(wallet.availableCents).toBe(1_000);
    const lot = await prisma.reserveLot.findFirstOrThrow({ where: { paymentId: started.paymentId } });
    expect(lot.amountCents).toBe(50);

    const pack = await makePack(1, 100);
    const rip = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `cb-${randomUUID()}`, now });
    expect(rip.ok).toBe(true);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: started.paymentId } });
    const dispute = await applyChargeback({ ref: payment.ref, id: newEventId() });
    expect(dispute.ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).status).toBe("locked");
    if (rip.ok) {
      const item = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: rip.pullId } });
      expect(item.status).toBe("recalled");
      expect((await prisma.pull.findUniqueOrThrow({ where: { id: rip.pullId } })).voided).toBe(true);
    }
  });

  it("requires a second admin for a $500 pack and for a price above $1,000", async () => {
    const first = await makeUser();
    const second = await makeUser();
    await prisma.user.updateMany({ where: { id: { in: [first, second] } }, data: { role: "admin" } });
    const pack = await prisma.pack.findUniqueOrThrow({ where: { slug: "pack-500" } });
    await prisma.pack.update({ where: { id: pack.id }, data: { status: "draft" } });
    const needs = await publishPack(first, pack.id, now);
    expect(needs.ok).toBe(false);
    if (!needs.ok) expect(needs.code).toBe("NEEDS_SECOND");
    const same = await publishPack(first, pack.id, now);
    expect(same.ok).toBe(false);
    const published = await publishPack(second, pack.id, now);
    expect(published.ok).toBe(true);
    await prisma.pack.update({ where: { id: pack.id }, data: { status: "live" } });

    const card = await prisma.card.findFirstOrThrow({ where: { status: "available", example: true } });
    const pending = await proposeCardPrice(first, card.id, 100_001, "manual above a thousand", now);
    expect(pending.ok && pending.pending).toBe(true);
    if (!pending.ok || !pending.pending) return;
    const denied = await approveCardPrice(first, pending.changeId, now);
    expect(denied.ok).toBe(false);
    const applied = await approveCardPrice(second, pending.changeId, now);
    expect(applied.ok).toBe(true);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: card.id } })).fmvCents).toBe(100_001);
  });

  it("issues a Shippo test label with a two-business-day SLA when the ship hold is clear", async () => {
    const userId = await makeUser();
    const pack = await makePack(1, 100);
    const rip = await ripPack({ userId, packSlug: pack.slug, idempotencyKey: `ship-${randomUUID()}`, now });
    expect(rip.ok).toBe(true);
    if (!rip.ok) return;
    const item = await prisma.vaultItem.findFirstOrThrow({ where: { pullId: rip.pullId } });
    const friday = new Date("2026-10-23T15:00:00.000Z");
    const shipment = await requestShipment(userId, [item.id], friday);
    expect(shipment.ok).toBe(true);
    if (!shipment.ok) return;
    expect(shipment.shipment.status).toBe("requested");
    expect(shipment.shipment.labelUrl).toContain("shippo.test");
    expect(shipment.shipment.insured).toBe(true);
    expect(shipment.shipment.slaDueAt?.toISOString().slice(0, 10)).toBe("2026-10-27");
  });

  it("gives free and paid promo entries equal weight and voids New York", async () => {
    const userId = await makeUser();
    const free = await enterAmoe({
      promoSlug: "note",
      email: `free-${randomUUID()}@example.com`,
      state: "CA",
      source: "free",
      userId,
    });
    const paid = await enterAmoe({
      promoSlug: "note",
      email: `paid-${randomUUID()}@example.com`,
      state: "CA",
      source: "purchase",
      userId,
    });
    expect(free.ok && paid.ok).toBe(true);
    if (!free.ok || !paid.ok) return;
    expect(free.weight).toBe(paid.weight);
    const ny = await enterAmoe({
      promoSlug: "note",
      email: `ny-${randomUUID()}@example.com`,
      state: "NY",
      source: "free",
    });
    expect(ny.ok).toBe(false);

    const referrer = await makeUser();
    const referee = await makeUser();
    const code = await ensureReferralCode(referrer);
    expect(code.ok).toBe(true);
    if (!code.ok) return;
    const hidden = await claimReferral(referee, code.code, false, now);
    expect(hidden.ok).toBe(false);
    const claimed = await claimReferral(referee, code.code, true, now);
    expect(claimed.ok).toBe(true);
    const self = await claimReferral(referrer, code.code, true, now);
    expect(self.ok).toBe(false);
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: referee } })).promoCents).toBe(500);
  });

  it("passes a sandbox KYC webhook and pauses a pack after a price drop", async () => {
    const userId = await makeUser();
    const session = await startKycInquiry(userId, "persona");
    const body = JSON.stringify({ inquiryId: session.inquiryId, referenceId: "ref", status: "passed" });
    const signature = signKycWebhook(body, "test-kyc-secret");
    const result = await ingestKycWebhook("persona", body, signature);
    expect(result.ok).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).kycStatus).toBe("passed");

    const pack = await makePack(1, 100);
    const card = await prisma.card.findFirstOrThrow({ where: { slots: { some: { packId: pack.id } } } });
    const feed = new ExamplePriceFeed({
      [card.certNumber]: { fmvCents: 100, source: "example", confidence: "high" },
    });
    const refresh = await runPriceRefresh(feed, now, { packIds: [pack.id] });
    expect(refresh.paused).toContain(pack.id);
    expect((await prisma.pack.findUniqueOrThrow({ where: { id: pack.id } })).status).toBe("paused");
  });

  it("rips three packs in one batch and keeps turbo buyback behind its flag", async () => {
    const userId = await makeUser();
    const pack = await makePack(3, 100);
    const batch = await ripSequence({
      userId,
      packSlug: pack.slug,
      idempotencyKey: `seq-${randomUUID().slice(0, 8)}`,
      count: 3,
      now,
    });
    expect(batch.results).toHaveLength(3);
    expect(batch.results.every((result) => result.ok)).toBe(true);
    const ids = batch.results.flatMap((result) => (result.ok ? [result.pullId] : []));
    const pulls = await prisma.pull.findMany({ where: { id: { in: ids } } });
    expect(new Set(pulls.map((pull) => pull.batchId))).toEqual(new Set([batch.batchId]));
    const turbo = await turboBuyback(userId, 10_000, false, now);
    expect(turbo.ok).toBe(false);
  });

  it("rejects a stale payment webhook signature", async () => {
    const raw = JSON.stringify({
      id: newEventId(),
      type: "payment_intent.succeeded",
      ref: "missing",
      amountCents: 100,
    });
    const bad = await ingestWebhook("stripe", raw, "t=1,v1=nope");
    expect(bad.ok).toBe(false);
    const good = await ingestWebhook("stripe", raw, signWebhook(raw, "test-webhook-secret"));
    expect(good.ok).toBe(false);
    if (!good.ok) expect(good.code).toBe("NOT_FOUND");
  });
});
