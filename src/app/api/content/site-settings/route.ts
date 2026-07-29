import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { siteSettingsSchema } from "@/lib/validation/content";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const parsed = siteSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const before = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
  });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "SITE_SETTINGS_UPDATE",
    entityType: "SiteSettings",
    entityId: "default",
    beforeData: before,
    afterData: settings,
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ settings });
}
