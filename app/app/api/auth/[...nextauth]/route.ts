import { authenticate } from "@cdr/db";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Auth.js entry. Password credentials set the same httpOnly session as the demo login.
 * Google and Apple are listed when AUTH_GOOGLE_ID / AUTH_APPLE_ID exist; otherwise the
 * test identity route at /api/auth/oauth links a signed token to an existing account.
 */
export async function GET() {
  return Response.json({
    framework: "auth.js",
    session: "cdr_session",
    providers: [
      "credentials",
      "email-otp",
      ...(process.env.AUTH_GOOGLE_ID ? ["google"] : []),
      ...(process.env.AUTH_APPLE_ID ? ["apple"] : []),
      ...(!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_APPLE_ID ? ["test-identity"] : []),
    ],
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    provider?: string;
    email?: string;
    password?: string;
  } | null;
  if (body?.provider !== "credentials") {
    return Response.json(
      { ok: false, message: "Use credentials here, /api/auth/otp for email codes, or /api/auth/oauth for a test identity token." },
      { status: 400 },
    );
  }
  const user = await authenticate(body.email ?? "", body.password ?? "");
  if (!user) return Response.json({ ok: false }, { status: 401 });
  await setSession(user.id, user.role);
  return Response.json({ ok: true, userId: user.id });
}
