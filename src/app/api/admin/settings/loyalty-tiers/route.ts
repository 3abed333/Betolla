import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { loyaltyTierSchema } from "@/lib/validation/settings";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = loyaltyTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const tier = await prisma.loyaltyTier.create({ data: parsed.data });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "LOYALTY_TIER_CREATE",
    entityType: "LoyaltyTier",
    entityId: tier.id,
    afterData: parsed.data,
  });

  return NextResponse.json({ tier });
}
