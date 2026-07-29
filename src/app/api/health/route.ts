import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRequestId } from "@/lib/server/request-id";
import { logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "healthy",
        checks: { database: "reachable" },
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
        },
      },
    );
  } catch (error) {
    logError("health_check_failed", error, { requestId, check: "database" });
    return NextResponse.json(
      {
        status: "unhealthy",
        checks: { database: "unreachable" },
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": requestId,
        },
      },
    );
  }
}
