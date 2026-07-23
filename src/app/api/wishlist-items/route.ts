import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { getOrCreateDefaultWishlist } from "@/lib/server/services/wishlists";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { productId, wishlistId } = await request.json().catch(() => ({ productId: null, wishlistId: null }));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

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

  const { productId } = await request.json().catch(() => ({ productId: null }));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  await prisma.wishlistItem.deleteMany({
    where: { productId, wishlist: { userId: session.userId } },
  });
  return NextResponse.json({ ok: true });
}
