import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

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

  const { name } = await request.json().catch(() => ({ name: null }));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A list name is required" }, { status: 400 });
  }

  const wishlist = await prisma.wishlist.create({ data: { userId: session.userId, name: name.trim() } });
  return NextResponse.json({ wishlist });
}
