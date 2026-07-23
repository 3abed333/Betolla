import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { loyaltyTierSchema } from "@/lib/validation/settings";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.loyaltyTier.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tier not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = loyaltyTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const tier = await prisma.loyaltyTier.update({ where: { id }, data: parsed.data });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "LOYALTY_TIER_UPDATE",
    entityType: "LoyaltyTier",
    entityId: id,
    beforeData: existing,
    afterData: parsed.data,
  });

  return NextResponse.json({ tier });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.loyaltyTier.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Tier not found" }, { status: 404 });

  await prisma.loyaltyTier.delete({ where: { id } });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "LOYALTY_TIER_DELETE",
    entityType: "LoyaltyTier",
    entityId: id,
    beforeData: existing,
  });

  return NextResponse.json({ ok: true });
}
