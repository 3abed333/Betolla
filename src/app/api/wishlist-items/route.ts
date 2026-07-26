import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { getOrCreateDefaultWishlist } from "@/lib/server/services/wishlists";

const addWishlistItemSchema = z.object({
  productId: z.string().min(1),
  wishlistId: z.string().min(1).optional(),
});
const removeWishlistItemSchema = z.object({ productId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addWishlistItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { productId, wishlistId } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const wishlist = wishlistId
    ? await prisma.wishlist.findUnique({ where: { id: wishlistId } })
    : await getOrCreateDefaultWishlist(session.userId);
  if (!wishlist || wishlist.userId !== session.userId) {
    return NextResponse.json({ error: "Wishlist not found" }, { status: 404 });
  }

  const item = await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId, priceAtAdd: product.price },
    update: {},
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = removeWishlistItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { productId } = parsed.data;

  await prisma.wishlistItem.deleteMany({
    where: { productId, wishlist: { userId: session.userId } },
  });
  return NextResponse.json({ ok: true });
}
