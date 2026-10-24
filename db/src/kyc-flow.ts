import { randomUUID } from "node:crypto";
import { PersonaSandbox, SumsubSandbox, type KycVendor } from "@cdr/kyc";
import { kycRequired } from "@cdr/risk";
import { prisma } from "./client";

function providerFor(vendor: KycVendor) {
  return vendor === "sumsub" ? new SumsubSandbox() : new PersonaSandbox();
}

export async function kycStatusForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const [topups, vault] = await Promise.all([
    prisma.payment.aggregate({
      where: { userId, status: { in: ["succeeded", "stubbed"] } },
      _sum: { amountCents: true },
    }),
    prisma.vaultItem.aggregate({ where: { userId }, _max: { fmvCentsAtPull: true } }),
  ]);
  return {
    kycStatus: user.kycStatus,
    required: kycRequired({
      lifetimeTopupCents: topups._sum.amountCents ?? 0,
      shipmentFmvCents: vault._max.fmvCentsAtPull ?? 0,
      vipTier: user.vipTier,
    }),
  };
}

export async function startKycInquiry(userId: string, vendor: KycVendor = "persona") {
  const provider = providerFor(vendor);
  const referenceId = randomUUID().replace(/-/g, "");
  const session = await provider.start({ userId, referenceId });
  await prisma.kycInquiry.create({
    data: { userId, vendor, inquiryId: session.inquiryId, status: "pending" },
  });
  await prisma.user.update({ where: { id: userId }, data: { kycStatus: "pending" } });
  return session;
}

export async function ingestKycWebhook(vendor: KycVendor, rawBody: string, signature: string | null) {
  const secret = process.env.KYC_WEBHOOK_SECRET || "test-kyc-secret";
  const parsed = providerFor(vendor).parseWebhook(rawBody, signature, secret);
  if (!parsed) return { ok: false as const, code: "SIGNATURE" as const };
  const inquiry = await prisma.kycInquiry.findUnique({ where: { inquiryId: parsed.inquiryId } });
  if (!inquiry) return { ok: false as const, code: "NOT_FOUND" as const };
  await prisma.kycInquiry.update({ where: { id: inquiry.id }, data: { status: parsed.status } });
  await prisma.user.update({
    where: { id: inquiry.userId },
    data: { kycStatus: parsed.status === "passed" ? "passed" : "failed" },
  });
  return { ok: true as const, status: parsed.status };
}
