import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { faqSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = faqSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const before = await prisma.faq.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  const faq = await prisma.faq.update({
    where: { id },
    data: { ...parsed.data, answerHtmlEn: sanitizeRichHtml(parsed.data.answerHtmlEn), answerHtmlAr: sanitizeRichHtml(parsed.data.answerHtmlAr) },
  });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "FAQ_UPDATE", entityType: "Faq", entityId: id, beforeData: { questionEn: before.questionEn }, afterData: { questionEn: faq.questionEn } });
  revalidatePath("/faq");
  return NextResponse.json({ faq });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const before = await prisma.faq.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  await prisma.faq.delete({ where: { id } });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "FAQ_DELETE", entityType: "Faq", entityId: id, beforeData: { questionEn: before.questionEn } });
  revalidatePath("/faq");
  return NextResponse.json({ ok: true });
}
