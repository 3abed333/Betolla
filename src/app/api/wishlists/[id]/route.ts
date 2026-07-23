import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const wishlist = await prisma.wishlist.findUnique({ where: { id } });
  if (!wishlist || wishlist.userId !== session.userId) {
    return NextResponse.json({ error: "Wishlist not found" }, { status: 404 });
  }

  await prisma.wishlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
