import { ingestWebhook } from "@cdr/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const result = await ingestWebhook("high_risk", raw, request.headers.get("x-signature"));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
