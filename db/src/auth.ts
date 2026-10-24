import { randomBytes } from "node:crypto";
import { ageDecision, DEFAULT_DAILY_TOPUP_CENTS, geoDecision, minimumAge } from "@cdr/risk";
import { prisma } from "./client";
import { loadStateOpenFlags } from "./flags";
import { clearFailedLogins, noteFailedLogin } from "./identity";
import { hashPassword, verifyPassword } from "./password";

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  dob: string;
  state: string;
  now?: Date;
  termsAccepted?: boolean;
}

export type RegisterResult =
  | { ok: true; userId: string; role: "user" | "admin" }
  | { ok: false; code: "UNDERAGE" | "GEO_BLOCKED" | "VALIDATION" | "EMAIL_TAKEN"; message: string };

function parseDob(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value.trim()) return null;
  return date;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const now = input.now ?? new Date();
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "VALIDATION", message: "Enter a valid email." };
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { ok: false, code: "VALIDATION", message: "Username must be 3–20 letters, numbers, or underscores." };
  }
  if (input.password.length < 8) {
    return { ok: false, code: "VALIDATION", message: "Password must be at least 8 characters." };
  }
  const dob = parseDob(input.dob);
  if (!dob) return { ok: false, code: "VALIDATION", message: "Enter a real date of birth." };

  const age = ageDecision(dob, now, minimumAge(input.state));
  if (!age.allowed) {
    await prisma.geoCheck.create({
      data: { state: input.state.trim().toUpperCase() || "??", source: "signup", passed: false, reason: "underage" },
    });
    return { ok: false, code: "UNDERAGE", message: age.reason ?? "You must be 18 or older." };
  }

  const geo = geoDecision(input.state, await loadStateOpenFlags());
  if (!geo.allowed) {
    await prisma.geoCheck.create({
      data: {
        state: (geo.state ?? input.state.trim().toUpperCase()) || "??",
        source: "signup",
        passed: false,
        reason: "geo_blocked",
      },
    });
    return { ok: false, code: "GEO_BLOCKED", message: geo.reason ?? "This state is blocked." };
  }

  const taken = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (taken) return { ok: false, code: "EMAIL_TAKEN", message: "That email or username is already registered." };

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: hashPassword(input.password),
      dob,
      state: geo.state!,
      clientSeed: randomBytes(16).toString("hex"),
      termsAcceptedAt: input.termsAccepted ? now : null,
      wallet: { create: {} },
      limit: { create: { dailyLimitCents: DEFAULT_DAILY_TOPUP_CENTS } },
      geoChecks: { create: { state: geo.state!, source: "signup", passed: true, reason: null } },
    },
  });
  return { ok: true, userId: user.id, role: user.role };
}

export async function authenticate(email: string, password: string, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null;
  if (user.lockedUntil && user.lockedUntil > now) return null;
  if (!verifyPassword(password, user.passwordHash)) {
    await noteFailedLogin(user.id, now);
    return null;
  }
  if (user.status === "blocked" || user.status === "locked") return null;
  if (user.failedLogins > 0 || user.lockedUntil) await clearFailedLogins(user.id);
  return user;
}
