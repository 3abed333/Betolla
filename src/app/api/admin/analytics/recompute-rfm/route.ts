import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { recomputeAllRfmSegments } from "@/lib/server/services/customerStats";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST() {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const result = await recomputeAllRfmSegments();

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "RFM_SEGMENTS_RECOMPUTED",
    entityType: "CustomerStats",
    afterData: result,
  });

  return NextResponse.json(result);
}
