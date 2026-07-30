import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function DELETE() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await prisma.notification.deleteMany({
    where: { userId: session.userId, channel: "IN_APP" },
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}
