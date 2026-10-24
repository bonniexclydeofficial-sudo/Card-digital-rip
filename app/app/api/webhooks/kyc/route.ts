import { ingestKycWebhook } from "@cdr/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const vendor = request.headers.get("x-kyc-vendor") === "sumsub" ? "sumsub" : "persona";
  const result = await ingestKycWebhook(vendor, raw, request.headers.get("x-kyc-signature"));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
