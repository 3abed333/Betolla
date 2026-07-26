import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

const createWishlistSchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const wishlists = await prisma.wishlist.findMany({
    where: { userId: session.userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ wishlists });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createWishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const wishlist = await prisma.wishlist.create({ data: { userId: session.userId, name: parsed.data.name } });
  return NextResponse.json({ wishlist });
}
