import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { promoCodeSchema } from "@/lib/validation/promoCode";
import { logActivity } from "@/lib/server/services/activityLog";

// Promo codes are financial (control discounting/margin directly) - Admin-only, unlike
// Products/Bundles/Orders which are intentionally Admin|Staff.
export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = promoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.promoCode.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 409 });
  }

  const promoCode = await prisma.promoCode.create({
    data: {
      code: parsed.data.code,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      minOrderTotal: parsed.data.minOrderTotal,
      targetSegment: parsed.data.targetSegment,
      startsAt: parsed.data.startsAt ?? null,
      expiresAt: parsed.data.expiresAt ?? null,
      usageLimitTotal: parsed.data.usageLimitTotal ?? null,
      usageLimitPerUser: parsed.data.usageLimitPerUser ?? null,
      isActive: parsed.data.isActive,
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "PROMO_CODE_CREATE",
    entityType: "PromoCode",
    entityId: promoCode.id,
    afterData: { code: promoCode.code, discountType: promoCode.discountType, discountValue: promoCode.discountValue.toString() },
  });

  return NextResponse.json({ promoCode });
}
