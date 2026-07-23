import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const preferences = await prisma.notificationPreference.findMany({ where: { userId: session.userId } });
  return NextResponse.json({ preferences });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { category, channel, enabled } = await request.json().catch(() => ({}));
  if (!category || !channel || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "category, channel and enabled are required" }, { status: 400 });
  }

  const preference = await prisma.notificationPreference.upsert({
    where: { userId_category_channel: { userId: session.userId, category, channel } },
    create: { userId: session.userId, category, channel, enabled },
    update: { enabled },
  });
  return NextResponse.json({ preference });
}
