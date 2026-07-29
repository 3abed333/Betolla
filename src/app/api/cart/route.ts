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
    price: Number(i.product?.price ?? i.bundle?.bundlePrice ?? i.priceAtAdd),
    imageUrl: (i.product?.mainImageUrl ?? i.bundle?.mainImageUrl)!,
    quantity: i.quantity,
  }));
  return NextResponse.json({ items });
}

const syncSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(["product", "bundle"]),
      id: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(99),
    }),
  ).max(100),
});

// POST: replace this user's server-side cart with the client's current snapshot. A no-op for
// guests (no DB cart exists until they have an account) - the client store is their cart.
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ ok: true, synced: false });

  const body = await request.json().catch(() => null);
  const parsed = syncSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart payload" }, { status: 400 });

  const uniqueItems = new Map<string, (typeof parsed.data.items)[number]>();
  for (const item of parsed.data.items) {
    const key = `${item.kind}:${item.id}`;
    const previous = uniqueItems.get(key);
    uniqueItems.set(key, {
      ...item,
      quantity: Math.min(99, (previous?.quantity ?? 0) + item.quantity),
    });
  }
  const items = [...uniqueItems.values()];
  const productIds = items.filter((item) => item.kind === "product").map((item) => item.id);
  const bundleIds = items.filter((item) => item.kind === "bundle").map((item) => item.id);

  const saved = await prisma.$transaction(async (tx) => {
    const [products, bundles] = await Promise.all([
      tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, price: true },
      }),
      tx.productBundle.findMany({
        where: { id: { in: bundleIds }, isActive: true },
        select: { id: true, bundlePrice: true },
      }),
    ]);
    if (products.length !== productIds.length || bundles.length !== bundleIds.length) {
      throw new Error("INVALID_CART_ITEM");
    }
    const productPrice = new Map(products.map((product) => [product.id, product.price]));
    const bundlePrice = new Map(bundles.map((bundle) => [bundle.id, bundle.bundlePrice]));
    const cart = await tx.cart.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, status: "ACTIVE", lastActivityAt: new Date() },
      update: { status: "ACTIVE", lastActivityAt: new Date() },
    });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    if (items.length > 0) {
      await tx.cartItem.createMany({
        data: items.map((item) => ({
          cartId: cart.id,
          productId: item.kind === "product" ? item.id : null,
          bundleId: item.kind === "bundle" ? item.id : null,
          quantity: item.quantity,
          priceAtAdd:
            item.kind === "product"
              ? productPrice.get(item.id)!
              : bundlePrice.get(item.id)!,
        })),
      });
    }
    return true;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "INVALID_CART_ITEM") return null;
    throw error;
  });
  if (!saved) return NextResponse.json({ error: "A cart item is unavailable" }, { status: 400 });

  return NextResponse.json({ ok: true, synced: true });
}
