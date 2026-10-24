import { ripPack, ripSequence } from "@cdr/db";
import { crossSite, rateLimit } from "@/lib/guard";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (crossSite(request.headers.get("sec-fetch-site"))) {
    return Response.json({ ok: false, code: "CSRF", message: "Cross-site rip requests are rejected." }, { status: 403 });
  }
  const session = await getSession();
  if (!session) {
    return Response.json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in required." }, { status: 401 });
  }
  const loadToken = process.env.LOAD_TEST_TOKEN;
  const loadHeader = request.headers.get("x-load-test");
  if (!(loadToken && loadHeader === loadToken) && !rateLimit(`rip:${session.uid}`, 30, 60_000)) {
    return Response.json({ ok: false, code: "RATE", message: "Too many rips. Wait a minute." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as {
    packSlug?: unknown;
    idempotencyKey?: unknown;
    count?: unknown;
  } | null;
  if (!body || typeof body.packSlug !== "string" || typeof body.idempotencyKey !== "string") {
    return Response.json(
      { ok: false, code: "IDEMPOTENCY_CONFLICT", message: "Pack and idempotency key are required." },
      { status: 400 },
    );
  }
  const signals = {
    userId: session.uid,
    packSlug: body.packSlug,
    idempotencyKey: body.idempotencyKey,
    requestGeoState: request.headers.get("x-geo-state"),
    ipState: request.headers.get("x-ip-state"),
    billingState: request.headers.get("x-billing-state"),
    vpn: ["1", "true", "yes"].includes((request.headers.get("x-vpn") ?? "").toLowerCase()),
  };
  const count = body.count === 3 || body.count === 5 ? body.count : 1;
  if (count === 1) {
    const result = await ripPack(signals);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  const sequence = await ripSequence({ ...signals, count });
  const first = sequence.results.find((result) => result.ok);
  const failed = sequence.results.find((result) => !result.ok);
  const ok = sequence.results.length === count && sequence.results.every((result) => result.ok);
  return Response.json(
    {
      ok,
      pullId: first && first.ok ? first.pullId : undefined,
      batchId: sequence.batchId,
      results: sequence.results,
      code: failed && !failed.ok ? failed.code : undefined,
      message: failed && !failed.ok ? failed.message : undefined,
    },
    { status: ok ? 200 : 400 },
  );
}
