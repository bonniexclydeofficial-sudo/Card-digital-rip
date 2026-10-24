import { describe, expect, it } from "vitest";
import {
  HighRiskProvider,
  StripeTestProvider,
  planChargeback,
  signWebhook,
} from "../src/index";

describe("payment providers", () => {
  it("requires 3DS on Stripe test mode and never charges", async () => {
    const stripe = new StripeTestProvider();
    const intent = await stripe.createTopUp({ userId: "u", amountCents: 10_000, idempotencyKey: "idem-stripe-1" });
    expect(intent.charged).toBe(false);
    expect(intent.threeDs).toBe(true);
    expect(intent.status).toBe("requires_action");
    expect(intent.reserveCents).toBe(500);
    const confirmed = await stripe.confirmThreeDs(intent.ref);
    expect(confirmed.status).toBe("succeeded");
    expect(confirmed.charged).toBe(false);
  });

  it("holds a larger reserve on the high-risk stub", async () => {
    const high = new HighRiskProvider();
    const intent = await high.createTopUp({ userId: "u", amountCents: 10_000, idempotencyKey: "idem-hr-1" });
    expect(intent.processor).toBe("high_risk");
    expect(intent.reserveCents).toBe(1_000);
    expect(intent.charged).toBe(false);
  });

  it("rejects a bad webhook signature and accepts a signed one once", () => {
    const stripe = new StripeTestProvider();
    const body = JSON.stringify({
      id: "evt_1",
      type: "charge.dispute.created",
      ref: "stripe_idem-stripe-1",
      amountCents: 10_000,
    });
    expect(stripe.parseWebhook(body, "t=1,v1=nope", "secret")).toBeNull();
    const signature = signWebhook(body, "secret");
    const event = stripe.parseWebhook(body, signature, "secret");
    expect(event?.id).toBe("evt_1");
    expect(event?.type).toBe("charge.dispute.created");
  });

  it("voids unshipped items and claws back only remaining credits", () => {
    const plan = planChargeback({
      paymentCents: 5_000,
      alreadyReversedCents: 0,
      availableCents: 1_200,
      unshippedVaultItemIds: ["v1"],
      shippedVaultItemIds: ["v2"],
    });
    expect(plan.lockAccount).toBe(true);
    expect(plan.clawbackCents).toBe(1_200);
    expect(plan.recallVaultItemIds).toEqual(["v1"]);
    expect(plan.shippedEvidenceIds).toEqual(["v2"]);
  });
});
