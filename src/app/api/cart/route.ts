import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

// GET: fetch this user's server-side cart (used to merge into the client store right after login).
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ items: [] });

  const cart = await prisma.cart.findUnique({
    where: { userId: session.userId },
    include: {
      items: { include: { product: true, bundle: true } },
    },
  });
  if (!cart) return NextResponse.json({ items: [] });

  const items = cart.items.map((i) => ({
    key: i.productId ? `product:${i.productId}` : `bundle:${i.bundleId}`,
    kind: i.productId ? "product" : "bundle",
    id: (i.productId ?? i.bundleId)!,
    slug: (i.product?.slug ?? i.bundle?.slug)!,
    nameEn: (i.product?.nameEn ?? i.bundle?.nameEn)!,
    nameAr: (i.product?.nameAr ?? i.bundle?.nameAr)!,
    price: Number(i.priceAtAdd),
    imageUrl: (i.product?.mainImageUrl ?? i.bundle?.mainImageUrl)!,
    quantity: i.quantity,
  }));
  return NextResponse.json({ items });
}

const syncSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["product", "bundle"]),
      id: z.string(),
      price: z.number(),
      quantity: z.number().int().positive(),
    }),
  ),
});

// POST: replace this user's server-side cart with the client's current snapshot. A no-op for
// guests (no DB cart exists until they have an account) - the client store is their cart.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: true, synced: false });

  const body = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });

  const cart = await prisma.cart.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, status: "ACTIVE", lastActivityAt: new Date() },
    update: { status: "ACTIVE", lastActivityAt: new Date() },
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (parsed.data.items.length > 0) {
    await prisma.cartItem.createMany({
      data: parsed.data.items.map((i) => ({
        cartId: cart.id,
        productId: i.kind === "product" ? i.id : null,
        bundleId: i.kind === "bundle" ? i.id : null,
        quantity: i.quantity,
        priceAtAdd: i.price,
      })),
    });
  }

  return NextResponse.json({ ok: true, synced: true });
}
