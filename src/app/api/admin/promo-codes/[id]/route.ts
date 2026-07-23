import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { promoCodeSchema } from "@/lib/validation/promoCode";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = promoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.promoCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });

  const codeClash = await prisma.promoCode.findFirst({ where: { code: parsed.data.code, NOT: { id } } });
  if (codeClash) {
    return NextResponse.json({ error: "A promo code with this code already exists" }, { status: 409 });
  }

  const promoCode = await prisma.promoCode.update({
    where: { id },
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
    action: "PROMO_CODE_UPDATE",
    entityType: "PromoCode",
    entityId: id,
    beforeData: { code: existing.code, isActive: existing.isActive },
    afterData: { code: promoCode.code, isActive: promoCode.isActive },
  });

  return NextResponse.json({ promoCode });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.promoCode.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Promo code not found" }, { status: 404 });

  await prisma.promoCode.update({ where: { id }, data: { isActive: false } });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "PROMO_CODE_DELETE",
    entityType: "PromoCode",
    entityId: id,
    beforeData: { code: existing.code },
  });

  return NextResponse.json({ ok: true });
}
