import { completeOAuth, readTestIdentity } from "@cdr/db";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Test-mode Google and Apple identity tokens. Real OAuth uses Auth.js when client ids are set. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const secret = process.env.AUTH_TEST_SECRET || process.env.SESSION_SECRET || "test-auth-secret";
  const identity = body?.token ? readTestIdentity(body.token, secret) : null;
  if (!identity) return Response.json({ ok: false, code: "TOKEN" }, { status: 400 });
  const linked = await completeOAuth(identity);
  if (!linked.ok) return Response.json(linked, { status: 400 });
  await setSession(linked.userId, linked.role);
  return Response.json({ ok: true, userId: linked.userId });
}
