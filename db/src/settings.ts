import { randomServerSeedHex, commitHash } from "@cdr/fair";
import { prisma } from "./client";
import { writeAudit } from "./audit";

export async function updatePlayerSettings(
  userId: string,
  input: { clientSeed?: string; skipAnimation?: boolean; haptics?: boolean; muteSound?: boolean },
) {
  if (input.clientSeed != null && !/^[A-Za-z0-9_-]{1,64}$/.test(input.clientSeed)) {
    return { ok: false as const, message: "Client seed must be 1–64 letters, numbers, _ or -." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.clientSeed != null ? { clientSeed: input.clientSeed } : {}),
      ...(input.skipAnimation != null ? { skipAnimation: input.skipAnimation } : {}),
      ...(input.haptics != null ? { haptics: input.haptics } : {}),
      ...(input.muteSound != null ? { muteSound: input.muteSound } : {}),
    },
  });
  return { ok: true as const };
}

export async function rotateServerSeed(actorId: string) {
  const seed = randomServerSeedHex();
  const hash = commitHash(seed);
  return prisma.$transaction(async (tx) => {
    const current = await tx.serverSeed.findFirst({ where: { active: true } });
    if (current) {
      await tx.$queryRaw`SELECT id FROM server_seeds WHERE id = ${current.id} FOR UPDATE`;
      await tx.serverSeed.update({
        where: { id: current.id },
        data: { active: false, revealedAt: new Date() },
      });
    }
    const created = await tx.serverSeed.create({
      data: { seed, hash, active: true },
    });
    await writeAudit(actorId, "seed.rotate", "server_seed", created.id, { revealed: current?.id ?? null }, tx);
    return { hash, revealedId: current?.id ?? null };
  });
}
