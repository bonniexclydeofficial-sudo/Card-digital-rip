import { createHmac, timingSafeEqual } from "node:crypto";

export type KycVendor = "persona" | "sumsub";

export interface KycSession {
  vendor: KycVendor;
  inquiryId: string;
  url: string;
  sandbox: true;
}

export interface KycProvider {
  vendor: KycVendor;
  start(input: { userId: string; referenceId: string }): Promise<KycSession>;
  parseWebhook(rawBody: string, signature: string | null, secret: string): { inquiryId: string; referenceId: string; status: "passed" | "failed" } | null;
}

/** Persona-style sandbox. No documents leave the process. */
export class PersonaSandbox implements KycProvider {
  vendor = "persona" as const;
  async start(input: { userId: string; referenceId: string }): Promise<KycSession> {
    const inquiryId = `inq_${input.referenceId}`;
    return {
      vendor: this.vendor,
      inquiryId,
      url: `https://sandbox.withpersona.test/verify?inquiry=${inquiryId}&user=${input.userId}`,
      sandbox: true,
    };
  }
  parseWebhook(rawBody: string, signature: string | null, secret: string) {
    return readWebhook(rawBody, signature, secret);
  }
}

export class SumsubSandbox implements KycProvider {
  vendor = "sumsub" as const;
  async start(input: { userId: string; referenceId: string }): Promise<KycSession> {
    const inquiryId = `sb_${input.referenceId}`;
    return {
      vendor: this.vendor,
      inquiryId,
      url: `https://sandbox.sumsub.test/websdk?applicant=${inquiryId}&user=${input.userId}`,
      sandbox: true,
    };
  }
  parseWebhook(rawBody: string, signature: string | null, secret: string) {
    return readWebhook(rawBody, signature, secret);
  }
}

function readWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
): { inquiryId: string; referenceId: string; status: "passed" | "failed" } | null {
  if (!signature) return null;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const body = JSON.parse(rawBody) as { inquiryId?: string; referenceId?: string; status?: string };
  if (!body.inquiryId || !body.referenceId) return null;
  if (body.status !== "passed" && body.status !== "failed") return null;
  return { inquiryId: body.inquiryId, referenceId: body.referenceId, status: body.status };
}

export function signKycWebhook(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}
