import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { bundleSchema } from "@/lib/validation/bundle";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bundleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.productBundle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  await prisma.productBundleItem.deleteMany({ where: { bundleId: id } });
  const bundle = await prisma.productBundle.update({
    where: { id },
    data: {
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr,
      descriptionEn: parsed.data.descriptionEn,
      descriptionAr: parsed.data.descriptionAr,
      bundlePrice: parsed.data.bundlePrice,
      mainImageUrl: parsed.data.mainImageUrl,
      isActive: parsed.data.isActive,
      items: { create: parsed.data.items },
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BUNDLE_UPDATE",
    entityType: "ProductBundle",
    entityId: id,
  });

  return NextResponse.json({ bundle });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const bundle = await prisma.productBundle.findUnique({ where: { id } });
  if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });

  await prisma.productBundle.update({ where: { id }, data: { isActive: false } });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BUNDLE_DELETE",
    entityType: "ProductBundle",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
