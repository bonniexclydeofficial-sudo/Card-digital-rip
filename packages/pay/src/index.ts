import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { HIGH_RISK_RESERVE_BPS, RESERVE_RELEASE_MS, STRIPE_RESERVE_BPS, reserveCents } from "@cdr/risk";

export type ProcessorName = "stripe" | "high_risk" | "stub";

export interface TopUpRequest {
  userId: string;
  amountCents: number;
  idempotencyKey: string;
  currency?: "usd";
}

export interface TopUpIntent {
  processor: ProcessorName;
  ref: string;
  status: "requires_action" | "succeeded" | "failed";
  threeDs: boolean;
  clientSecret: string | null;
  reserveCents: number;
  charged: boolean;
}

export interface RefundResult {
  ref: string;
  refundRef: string;
  amountCents: number;
  status: "succeeded";
}

export interface WebhookEvent {
  id: string;
  type: "payment_intent.succeeded" | "payment_intent.payment_failed" | "charge.refunded" | "charge.dispute.created";
  ref: string;
  amountCents: number;
  processor: ProcessorName;
}

export interface PaymentProvider {
  name: ProcessorName;
  reserveBps: number;
  createTopUp(input: TopUpRequest): Promise<TopUpIntent>;
  confirmThreeDs(ref: string): Promise<TopUpIntent>;
  refund(ref: string, amountCents: number): Promise<RefundResult>;
  parseWebhook(rawBody: string, signature: string | null, secret: string): WebhookEvent | null;
}

function intent(processor: ProcessorName, reserveBps: number, input: TopUpRequest, status: TopUpIntent["status"]): TopUpIntent {
  const ref = `${processor}_${input.idempotencyKey}`;
  return {
    processor,
    ref,
    status,
    threeDs: true,
    clientSecret: status === "requires_action" ? `seti_${input.idempotencyKey}` : null,
    reserveCents: reserveCents(input.amountCents, reserveBps),
    charged: false,
  };
}

/** Stripe test-mode adapter. No network call and no card charge. 3DS is required, then confirmed. */
export class StripeTestProvider implements PaymentProvider {
  name = "stripe" as const;
  reserveBps = STRIPE_RESERVE_BPS;
  async createTopUp(input: TopUpRequest): Promise<TopUpIntent> {
    return intent(this.name, this.reserveBps, input, "requires_action");
  }
  async confirmThreeDs(ref: string): Promise<TopUpIntent> {
    return {
      processor: this.name,
      ref,
      status: "succeeded",
      threeDs: true,
      clientSecret: null,
      reserveCents: 0,
      charged: false,
    };
  }
  async refund(ref: string, amountCents: number): Promise<RefundResult> {
    return { ref, refundRef: `re_${randomUUID()}`, amountCents, status: "succeeded" };
  }
  parseWebhook(rawBody: string, signature: string | null, secret: string): WebhookEvent | null {
    return parseSignedWebhook(rawBody, signature, secret, this.name);
  }
}

/** High-risk acquirer stub (Nuvei / Paysafe style). Higher rolling reserve. Still no charge. */
export class HighRiskProvider implements PaymentProvider {
  name = "high_risk" as const;
  reserveBps = HIGH_RISK_RESERVE_BPS;
  async createTopUp(input: TopUpRequest): Promise<TopUpIntent> {
    return intent(this.name, this.reserveBps, input, "succeeded");
  }
  async confirmThreeDs(ref: string): Promise<TopUpIntent> {
    return {
      processor: this.name,
      ref,
      status: "succeeded",
      threeDs: true,
      clientSecret: null,
      reserveCents: 0,
      charged: false,
    };
  }
  async refund(ref: string, amountCents: number): Promise<RefundResult> {
    return { ref, refundRef: `hr_${randomUUID()}`, amountCents, status: "succeeded" };
  }
  parseWebhook(rawBody: string, signature: string | null, secret: string): WebhookEvent | null {
    return parseSignedWebhook(rawBody, signature, secret, this.name);
  }
}

export function providerByName(name: ProcessorName): PaymentProvider {
  if (name === "stripe") return new StripeTestProvider();
  if (name === "high_risk") return new HighRiskProvider();
  return new StripeTestProvider();
}

export function signWebhook(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const payload = `${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

export function parseSignedWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
  processor: ProcessorName,
): WebhookEvent | null {
  if (!signature || !secret) return null;
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const given = parts.v1;
  if (!timestamp || !given) return null;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return null;
  const body = JSON.parse(rawBody) as WebhookEvent;
  if (!body.id || !body.type || !body.ref || !Number.isInteger(body.amountCents)) return null;
  return { ...body, processor };
}

export function reserveReleaseAt(now: Date): Date {
  return new Date(now.getTime() + RESERVE_RELEASE_MS);
}

export interface ChargebackPlan {
  lockAccount: true;
  clawbackCents: number;
  recallVaultItemIds: string[];
  shippedEvidenceIds: string[];
}

/** Void unshipped outcomes and claw back only the credits still on the account. */
export function planChargeback(input: {
  paymentCents: number;
  alreadyReversedCents: number;
  availableCents: number;
  unshippedVaultItemIds: string[];
  shippedVaultItemIds: string[];
}): ChargebackPlan {
  const remaining = Math.max(0, input.paymentCents - input.alreadyReversedCents);
  return {
    lockAccount: true,
    clawbackCents: Math.min(input.availableCents, remaining),
    recallVaultItemIds: input.unshippedVaultItemIds,
    shippedEvidenceIds: input.shippedVaultItemIds,
  };
}
