import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

const reorderSchema = z.object({ orderId: z.string().min(1) });

// Returns the current, live details (price/stock/availability) for a past order's items so the
// client can add them back to the cart - never trusts the historical price snapshot, since
// prices may have changed since the order was placed.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { orderId } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, bundle: true } } },
  });
  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = order.items
    .filter((i) => (i.product?.isActive ?? i.bundle?.isActive) && (i.product?.stock ?? 1) > 0)
    .map((i) => ({
      kind: i.productId ? "product" : "bundle",
      id: (i.productId ?? i.bundleId)!,
      slug: (i.product?.slug ?? i.bundle?.slug)!,
      nameEn: (i.product?.nameEn ?? i.bundle?.nameEn)!,
      nameAr: (i.product?.nameAr ?? i.bundle?.nameAr)!,
      price: Number(i.product?.price ?? i.bundle?.bundlePrice),
      imageUrl: (i.product?.mainImageUrl ?? i.bundle?.mainImageUrl)!,
      quantity: i.quantity,
      maxStock: i.product?.stock,
    }));

  const skippedCount = order.items.length - items.length;
  return NextResponse.json({ items, skippedCount });
}
