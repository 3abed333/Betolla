import "server-only";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export async function logActivity(params: {
  actorId: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeData: params.beforeData as never,
      afterData: params.afterData as never,
    },
  });
}
