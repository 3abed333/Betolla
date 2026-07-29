import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/server/services/activityLog";

const featuredProductSchema = z.object({ isFeatured: z.boolean() }).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = featuredProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id } = await params;
  const before = await prisma.product.findUnique({
    where: { id },
    select: { id: true, sku: true, nameEn: true, isFeatured: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isFeatured: parsed.data.isFeatured },
    select: { id: true, isFeatured: true },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "PRODUCT_UPDATE",
    entityType: "Product",
    entityId: id,
    beforeData: { sku: before.sku, nameEn: before.nameEn, isFeatured: before.isFeatured },
    afterData: { sku: before.sku, nameEn: before.nameEn, isFeatured: product.isFeatured },
  });

  return NextResponse.json({ product });
}
