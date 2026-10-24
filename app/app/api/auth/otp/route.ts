import { requestEmailOtp, verifyEmailOtp } from "@cdr/db";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; code?: string } | null;
  if (!body?.email) {
    return Response.json({ ok: false, message: "Email is required." }, { status: 400 });
  }
  if (!body.code) {
    const result = await requestEmailOtp(body.email);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  const result = await verifyEmailOtp(body.email, body.code);
  if (!result.ok) return Response.json(result, { status: 400 });
  await setSession(result.userId, result.role);
  return Response.json({ ok: true });
}
