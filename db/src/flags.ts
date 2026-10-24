import { DEFAULT_STATE_OPEN, FLAG_STATES, type FlagState } from "@cdr/risk";
import { writeAudit } from "./audit";
import { prisma } from "./client";

const FLAG_KEY = (state: FlagState) => `state_open_${state}`;

export async function loadStateOpenFlags(): Promise<Partial<Record<FlagState, boolean>>> {
  const keys = FLAG_STATES.map(FLAG_KEY);
  const rows = await prisma.featureFlag.findMany({ where: { key: { in: keys } } });
  const open: Partial<Record<FlagState, boolean>> = {};
  for (const state of FLAG_STATES) {
    const row = rows.find((item) => item.key === FLAG_KEY(state));
    open[state] = row ? row.enabled : DEFAULT_STATE_OPEN[state];
  }
  return open;
}

export async function flagEnabled(key: string): Promise<boolean> {
  const row = await prisma.featureFlag.findUnique({ where: { key } });
  return row?.enabled ?? false;
}

export async function setFlag(actorId: string, key: string, enabled: boolean) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || actor.role !== "admin") return { ok: false as const, code: "FORBIDDEN" as const };
  await prisma.featureFlag.upsert({ where: { key }, update: { enabled }, create: { key, enabled } });
  await writeAudit(actorId, "flag.set", "feature_flag", key, { enabled });
  return { ok: true as const };
}
