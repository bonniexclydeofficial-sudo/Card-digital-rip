import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./client";
import { writeAudit } from "./audit";

const OTP_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export function testAuthEnabled(): boolean {
  if (process.env.AUTH_TEST_MODE === "1") return true;
  if (process.env.AUTH_TEST_MODE === "0") return false;
  return process.env.NODE_ENV !== "production";
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function requestEmailOtp(emailRaw: string, now = new Date(), code = String(randomInt(0, 1_000_000)).padStart(6, "0")) {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, code: "VALIDATION" as const, message: "Enter a valid email." };
  }
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await prisma.loginCode.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= 5) return { ok: false as const, code: "RATE" as const, message: "Too many codes. Try again later." };
  await prisma.loginCode.create({
    data: { email, codeHash: hashCode(code), expiresAt: new Date(now.getTime() + OTP_MS) },
  });
  return { ok: true as const, devCode: testAuthEnabled() ? code : undefined };
}

export async function verifyEmailOtp(emailRaw: string, code: string, now = new Date()) {
  const email = emailRaw.trim().toLowerCase();
  const row = await prisma.loginCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false as const, code: "EXPIRED" as const };
  const given = Buffer.from(hashCode(code));
  const expected = Buffer.from(row.codeHash);
  const match = given.length === expected.length && timingSafeEqual(given, expected);
  if (!match) {
    await prisma.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    if (row.attempts + 1 >= 5) {
      await prisma.loginCode.update({ where: { id: row.id }, data: { usedAt: now } });
    }
    return { ok: false as const, code: "MISMATCH" as const };
  }
  await prisma.loginCode.update({ where: { id: row.id }, data: { usedAt: now } });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, code: "UNKNOWN" as const };
  if (user.status === "locked" || user.status === "blocked") return { ok: false as const, code: "LOCKED" as const };
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? now, failedLogins: 0 } });
  return { ok: true as const, userId: user.id, role: user.role };
}

export function signTestIdentity(payload: { provider: "google" | "apple"; email: string; subject: string }, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readTestIdentity(token: string, secret: string): { provider: "google" | "apple"; email: string; subject: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    provider: "google" | "apple";
    email: string;
    subject: string;
  };
  if ((payload.provider !== "google" && payload.provider !== "apple") || !payload.email || !payload.subject) return null;
  return payload;
}

/** Links a verified Google or Apple subject to a user. Real ID tokens are verified by Auth.js in production. */
export async function completeOAuth(input: {
  provider: "google" | "apple";
  email: string;
  subject: string;
  now?: Date;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.subject } },
  });
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing.userId } });
    if (!user || user.status === "locked" || user.status === "blocked") return { ok: false as const, code: "LOCKED" as const };
    return { ok: true as const, userId: user.id, role: user.role };
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, code: "UNKNOWN" as const, message: "Create an account with date of birth and state before linking Google or Apple." };
  await prisma.oAuthAccount.create({
    data: { userId: user.id, provider: input.provider, providerAccountId: input.subject },
  });
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: input.now ?? new Date() } });
  await writeAudit(user.id, "oauth.link", "user", user.id, { provider: input.provider });
  return { ok: true as const, userId: user.id, role: user.role };
}

export async function noteFailedLogin(userId: string, now = new Date()) {
  const user = await prisma.user.update({ where: { id: userId }, data: { failedLogins: { increment: 1 } } });
  if (user.failedLogins >= 5) {
    await prisma.user.update({ where: { id: userId }, data: { lockedUntil: new Date(now.getTime() + LOCK_MS) } });
  }
}

export async function clearFailedLogins(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null } });
}
