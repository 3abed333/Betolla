import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { faqSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const parsed = faqSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const faq = await prisma.faq.create({
    data: {
      ...parsed.data,
      answerHtmlEn: sanitizeRichHtml(parsed.data.answerHtmlEn),
      answerHtmlAr: sanitizeRichHtml(parsed.data.answerHtmlAr),
    },
  });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "FAQ_CREATE", entityType: "Faq", entityId: faq.id, afterData: { questionEn: faq.questionEn } });
  revalidatePath("/faq");
  return NextResponse.json({ faq }, { status: 201 });
}
