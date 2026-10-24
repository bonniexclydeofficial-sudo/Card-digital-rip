"use server";

import { redirect } from "next/navigation";
import {
  claimReferral,
  enterAmoe,
  ensureReferralCode,
  proposeCardPrice,
  approveCardPrice,
  selfExclude,
  setFlag,
  setSpendLimit,
  startCoolOff,
  startKycInquiry,
} from "@cdr/db";
import { getSession } from "./session";

async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function spendLimitAction(formData: FormData) {
  const session = await requireUser();
  const dollars = Number(formData.get("dollars"));
  const result = await setSpendLimit(session.uid, Math.round(dollars * 100));
  if (!result.ok) redirect(`/settings?error=${encodeURIComponent(result.message)}`);
  redirect("/settings?saved=1");
}

export async function coolOffAction(formData: FormData) {
  const session = await requireUser();
  const hours = Number(formData.get("hours"));
  const result = await startCoolOff(session.uid, hours);
  if (!result.ok) redirect(`/settings?error=${encodeURIComponent(result.message)}`);
  redirect("/settings?saved=1");
}

export async function excludeAction() {
  const session = await requireUser();
  await selfExclude(session.uid);
  redirect("/restricted?reason=excluded");
}

export async function amoeAction(formData: FormData) {
  const session = await requireUser();
  const result = await enterAmoe({
    promoSlug: "launch-note",
    email: String(formData.get("email") ?? ""),
    state: String(formData.get("state") ?? ""),
    source: "free",
    userId: session.uid,
  });
  if (!result.ok) redirect(`/promos?error=${encodeURIComponent(result.message)}`);
  redirect("/promos?entered=1");
}

export async function referralAction(formData: FormData) {
  const session = await requireUser();
  const result = await claimReferral(session.uid, String(formData.get("code") ?? ""), formData.get("disclosed") === "on");
  if (!result.ok) redirect(`/promos?error=${encodeURIComponent(result.message)}`);
  redirect("/promos?referred=1");
}

export async function referralCodeAction() {
  const session = await requireUser();
  await ensureReferralCode(session.uid);
  redirect("/promos");
}

export async function flagAction(formData: FormData) {
  const session = await requireUser();
  const key = String(formData.get("key") ?? "");
  const enabled = formData.get("enabled") === "on";
  const result = await setFlag(session.uid, key, enabled);
  if (!result.ok) redirect("/admin/flags?error=1");
  redirect("/admin/flags?saved=1");
}

export async function priceAction(formData: FormData) {
  const session = await requireUser();
  const result = await proposeCardPrice(
    session.uid,
    String(formData.get("cardId") ?? ""),
    Number(formData.get("fmvCents")),
    String(formData.get("reason") ?? ""),
  );
  if (!result.ok) redirect("/admin?error=1");
  redirect(result.pending ? "/admin?pending=1" : "/admin?priced=1");
}

export async function approvePriceAction(formData: FormData) {
  const session = await requireUser();
  const result = await approveCardPrice(session.uid, String(formData.get("changeId") ?? ""));
  if (!result.ok) redirect("/admin?error=1");
  redirect("/admin?priced=1");
}

export async function kycAction() {
  const session = await requireUser();
  const inquiry = await startKycInquiry(session.uid, "persona");
  redirect(`/settings?kyc=${encodeURIComponent(inquiry.url)}`);
}
