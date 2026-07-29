import "server-only";
import { prisma } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

type QuotaRow = { fileCount: number; byteCount: number };

function ammanDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Amman",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function reserveUploadQuota(userId: string, role: Role, bytes: number) {
  const dayKey = ammanDayKey();
  const rows = await prisma.$queryRaw<QuotaRow[]>`
    INSERT INTO "UploadQuota" ("id", "userId", "dayKey", "fileCount", "byteCount", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${userId}, ${dayKey}, 1, ${bytes}, NOW())
    ON CONFLICT ("userId", "dayKey") DO UPDATE SET
      "fileCount" = "UploadQuota"."fileCount" + 1,
      "byteCount" = "UploadQuota"."byteCount" + ${bytes},
      "updatedAt" = NOW()
    RETURNING "fileCount", "byteCount"
  `;
  const maxFiles = role === "CUSTOMER" || role === "DELIVERY" ? 10 : 100;
  const maxBytes = role === "CUSTOMER" || role === "DELIVERY"
    ? 40 * 1024 * 1024
    : 500 * 1024 * 1024;
  const allowed = rows[0].fileCount <= maxFiles && rows[0].byteCount <= maxBytes;
  if (!allowed) await releaseUploadQuota(userId, bytes);
  return allowed;
}

export async function releaseUploadQuota(userId: string, bytes: number) {
  const dayKey = ammanDayKey();
  await prisma.$executeRaw`
    UPDATE "UploadQuota"
    SET
      "fileCount" = GREATEST(0, "fileCount" - 1),
      "byteCount" = GREATEST(0, "byteCount" - ${bytes}),
      "updatedAt" = NOW()
    WHERE "userId" = ${userId} AND "dayKey" = ${dayKey}
  `;
}
