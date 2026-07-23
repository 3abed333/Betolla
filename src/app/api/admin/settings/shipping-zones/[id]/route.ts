import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { shippingZoneSchema } from "@/lib/validation/settings";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.shippingZone.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Shipping zone not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = shippingZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const clash = await prisma.shippingZone.findFirst({ where: { cityEn: parsed.data.cityEn, NOT: { id } } });
  if (clash) {
    return NextResponse.json({ error: "A shipping zone for this city already exists" }, { status: 409 });
  }

  const zone = await prisma.shippingZone.update({
    where: { id },
    data: {
      cityEn: parsed.data.cityEn,
      cityAr: parsed.data.cityAr,
      fee: parsed.data.fee,
      estimatedDaysMin: parsed.data.estimatedDaysMin ?? null,
      estimatedDaysMax: parsed.data.estimatedDaysMax ?? null,
      isActive: parsed.data.isActive,
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "SHIPPING_ZONE_UPDATE",
    entityType: "ShippingZone",
    entityId: id,
    beforeData: existing,
    afterData: parsed.data,
  });

  return NextResponse.json({ zone });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const existing = await prisma.shippingZone.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Shipping zone not found" }, { status: 404 });

  await prisma.shippingZone.delete({ where: { id } });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "SHIPPING_ZONE_DELETE",
    entityType: "ShippingZone",
    entityId: id,
    beforeData: existing,
  });

  return NextResponse.json({ ok: true });
}
