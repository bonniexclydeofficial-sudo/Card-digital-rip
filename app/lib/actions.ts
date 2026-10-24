"use server";

import { redirect } from "next/navigation";
import {
  authenticate,
  buybackNow,
  createPackFromBuilder,
  importCsv,
  prisma,
  publishPack,
  registerUser,
  requestShipment,
  rotateServerSeed,
  stubTopUp,
  updatePlayerSettings,
} from "@cdr/db";
import type { TierName } from "@cdr/econ";
import { clearSession, getSession, setSession } from "./session";

export async function signupAction(formData: FormData) {
  const result = await registerUser({
    email: String(formData.get("email") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
    dob: String(formData.get("dob") ?? ""),
    state: String(formData.get("state") ?? ""),
  });
  if (!result.ok && result.code === "UNDERAGE") redirect("/restricted?reason=age");
  if (!result.ok && result.code === "GEO_BLOCKED") redirect("/restricted?reason=geo");
  if (!result.ok) redirect(`/signup?error=${encodeURIComponent(result.message)}`);
  await setSession(result.userId, result.role);
  redirect("/catalog");
}

export async function loginAction(formData: FormData) {
  const user = await authenticate(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!user) redirect("/login?error=Those%20credentials%20did%20not%20match.");
  await setSession(user.id, user.role);
  redirect("/catalog");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

export async function topupAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const amount = Number(formData.get("amountCents"));
  const result = await stubTopUp(session.uid, amount);
  if (!result.ok) redirect(`/wallet?error=${encodeURIComponent(result.message)}`);
  redirect("/wallet?topped=1");
}

export async function buybackAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const vaultItemId = String(formData.get("vaultItemId") ?? "");
  const result = await buybackNow(session.uid, vaultItemId);
  if (!result.ok) redirect(`/vault?error=${encodeURIComponent(result.code)}`);
  redirect(`/vault?bought=${result.creditCents}`);
}

export async function shipAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const vaultItemId = String(formData.get("vaultItemId") ?? "");
  const result = await requestShipment(session.uid, [vaultItemId]);
  if (!result.ok) redirect(`/vault?error=${encodeURIComponent(result.message)}`);
  redirect(`/vault?ship=${result.shipment.status}`);
}

export async function settingsAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const result = await updatePlayerSettings(session.uid, {
    clientSeed: String(formData.get("clientSeed") ?? ""),
    skipAnimation: formData.get("skipAnimation") === "on",
  });
  if (!result.ok) redirect(`/settings?error=${encodeURIComponent(result.message)}`);
  redirect("/settings?saved=1");
}

export async function rotateAction() {
  const session = await getSession();
  if (!session) redirect("/login");
  await rotateServerSeed(session.uid);
  redirect("/settings?rotated=1");
}

export async function publishAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const packId = String(formData.get("packId") ?? "");
  const result = await publishPack(session.uid, packId);
  if (!result.ok) redirect("/admin/packs?blocked=1");
  redirect("/admin/packs?published=1");
}

export async function csvAction(_prev: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) return { ok: false, message: "Sign in as an admin.", errors: [], written: 0 };
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") return { ok: false, message: "Admin only.", errors: [], written: 0 };
  const file = formData.get("file");
  let text = String(formData.get("csv") ?? "");
  if (file instanceof File && file.size > 0) text = await file.text();
  const dryRun = formData.get("mode") !== "commit";
  const result = await importCsv(session.uid, text, { dryRun });
  const ranDry = "dryRun" in result && result.dryRun;
  return {
    ok: result.ok,
    message: ranDry
      ? "Dry run. Nothing was written."
      : result.ok
        ? `Committed ${result.written} cards.`
        : "Nothing was written.",
    errors: result.errors,
    written: result.written,
  };
}

interface BuilderPayload {
  name: string;
  slug: string;
  priceCents: number;
  publish: boolean;
  description?: string;
  tiers: { tier: TierName; oddsBps: number; cardIds: string[] }[];
}

function readBuilderPayload(raw: string): BuilderPayload | null {
  try {
    const value = JSON.parse(raw) as BuilderPayload;
    if (!value || typeof value.name !== "string" || !Array.isArray(value.tiers)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function builderAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || user.role !== "admin") redirect("/login");
  const payload = readBuilderPayload(String(formData.get("payload") ?? ""));
  if (!payload) redirect("/admin/packs?error=Could%20not%20read%20the%20builder%20payload.");
  const result = await createPackFromBuilder(session.uid, payload);
  if (!result.ok) {
    if (result.code === "BLOCKED") redirect("/admin/packs?blocked=1");
    const detail = result.code === "VALIDATION" ? result.message : result.code;
    redirect(`/admin/packs?error=${encodeURIComponent(detail)}`);
  }
  redirect(payload.publish ? "/admin/packs?published=1" : "/admin/packs?built=1");
}
