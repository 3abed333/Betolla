import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { updateNotificationPreferenceSchema } from "@/lib/validation/notificationPreferences";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const preferences = await prisma.notificationPreference.findMany({ where: { userId: session.userId } });
  return NextResponse.json({ preferences });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateNotificationPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { category, channel, enabled } = parsed.data;

  const preference = await prisma.notificationPreference.upsert({
    where: { userId_category_channel: { userId: session.userId, category, channel } },
    create: { userId: session.userId, category, channel, enabled },
    update: { enabled },
  });
  return NextResponse.json({ preference });
}
