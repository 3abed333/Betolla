import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { shippingZoneSchema } from "@/lib/validation/settings";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = shippingZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.shippingZone.findUnique({ where: { cityEn: parsed.data.cityEn } });
  if (existing) {
    return NextResponse.json({ error: "A shipping zone for this city already exists" }, { status: 409 });
  }

  const zone = await prisma.shippingZone.create({
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
    action: "SHIPPING_ZONE_CREATE",
    entityType: "ShippingZone",
    entityId: zone.id,
    afterData: parsed.data,
  });

  return NextResponse.json({ zone });
}
