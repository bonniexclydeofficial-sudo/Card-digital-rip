import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

export async function writeAudit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  detail?: Prisma.InputJsonValue,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  await tx.adminAudit.create({
    data: { actorId, action, entity, entityId, detail },
  });
}
