import { ripPack } from "@cdr/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in required." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { packSlug?: unknown; idempotencyKey?: unknown } | null;
  if (!body || typeof body.packSlug !== "string" || typeof body.idempotencyKey !== "string") {
    return Response.json(
      { ok: false, code: "IDEMPOTENCY_CONFLICT", message: "Pack and idempotency key are required." },
      { status: 400 },
    );
  }
  const result = await ripPack({
    userId: session.uid,
    packSlug: body.packSlug,
    idempotencyKey: body.idempotencyKey,
    requestGeoState: request.headers.get("x-geo-state"),
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
