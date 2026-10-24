import { ingestWebhook } from "@cdr/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const result = await ingestWebhook("stripe", raw, request.headers.get("stripe-signature"));
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
