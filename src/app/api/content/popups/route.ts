import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { popupCampaignSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const parsed = popupCampaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const popup = await prisma.popupCampaign.create({
    data: {
      ...parsed.data,
      bodyHtmlEn: sanitizeRichHtml(parsed.data.bodyHtmlEn),
      bodyHtmlAr: sanitizeRichHtml(parsed.data.bodyHtmlAr),
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "POPUP_CREATE", entityType: "PopupCampaign", entityId: popup.id, afterData: { name: popup.name, template: popup.template } });
  revalidatePath("/", "layout");
  return NextResponse.json({ popup }, { status: 201 });
}
