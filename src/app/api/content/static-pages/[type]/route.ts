import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { staticPageSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";

const TYPES = ["PRIVACY_POLICY", "ABOUT_US"] as const;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { type } = await params;
  if (!TYPES.includes(type as (typeof TYPES)[number])) return NextResponse.json({ error: "Unknown page type" }, { status: 404 });
  const parsed = staticPageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const pageType = type as (typeof TYPES)[number];
  const data = {
    ...parsed.data,
    contentHtmlEn: sanitizeRichHtml(parsed.data.contentHtmlEn),
    contentHtmlAr: sanitizeRichHtml(parsed.data.contentHtmlAr),
  };
  const before = await prisma.staticPage.findUnique({ where: { type: pageType } });
  const page = await prisma.staticPage.upsert({ where: { type: pageType }, create: { type: pageType, ...data }, update: data });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "STATIC_PAGE_UPDATE", entityType: "StaticPage", entityId: page.id, beforeData: before ? { type: before.type, isPublished: before.isPublished } : null, afterData: { type: page.type, isPublished: page.isPublished } });
  revalidatePath(pageType === "PRIVACY_POLICY" ? "/privacy" : "/about");
  return NextResponse.json({ page });
}
