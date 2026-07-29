import "server-only";
import { prisma } from "@/lib/db";

type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

type BucketRow = {
  count: number;
  windowStart: Date;
};

/**
 * Atomically consumes one attempt from a PostgreSQL-backed fixed window. This is shared across
 * app replicas and survives process restarts. The UPSERT is a single database statement so two
 * concurrent failures cannot both observe and write the same counter.
 */
export async function consumeRateLimit(
  key: string,
  options: RateLimitOptions = {},
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const limit = options.limit ?? 10;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  const rows = await prisma.$queryRaw<BucketRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count", "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${cutoff} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" <= ${cutoff} THEN ${now}
        ELSE "RateLimitBucket"."windowStart"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "windowStart"
  `;
  const bucket = rows[0];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.windowStart.getTime() + windowMs - now.getTime()) / 1000),
  );
  return { limited: bucket.count > limit, retryAfterSeconds };
}

export async function clearRateLimit(key: string) {
  await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE "key" = ${key}`;
}
