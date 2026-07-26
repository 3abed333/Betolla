import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function PATCH(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!notification || notification.userId !== session.userId) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
