import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

function secret(): string {
  return process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
}

export function signSession(uid: string, role: string): string {
  const body = Buffer.from(JSON.stringify({ uid, role, exp: Date.now() + 14 * 24 * 60 * 60 * 1000 })).toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token?: string | null): { uid: string; role: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { uid: string; role: string; exp: number };
    if (!payload.uid || payload.exp < Date.now()) return null;
    return { uid: payload.uid, role: payload.role };
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return readSession(jar.get("cdr_session")?.value);
}

export async function setSession(uid: string, role: string) {
  const jar = await cookies();
  jar.set("cdr_session", signSession(uid, role), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete("cdr_session");
}
