import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { popupCampaignSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";
import { deleteUploadedImage } from "@/lib/server/storage";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = popupCampaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const before = await prisma.popupCampaign.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Popup not found" }, { status: 404 });
  const popup = await prisma.popupCampaign.update({
    where: { id },
    data: {
      ...parsed.data,
      bodyHtmlEn: sanitizeRichHtml(parsed.data.bodyHtmlEn),
      bodyHtmlAr: sanitizeRichHtml(parsed.data.bodyHtmlAr),
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "POPUP_UPDATE", entityType: "PopupCampaign", entityId: id, beforeData: { name: before.name, isActive: before.isActive }, afterData: { name: popup.name, isActive: popup.isActive } });
  if (before.imageUrl && before.imageUrl !== popup.imageUrl) {
    await deleteUploadedImage(before.imageUrl);
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ popup });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const before = await prisma.popupCampaign.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Popup not found" }, { status: 404 });
  await prisma.popupCampaign.delete({ where: { id } });
  if (before.imageUrl) await deleteUploadedImage(before.imageUrl);
  await logActivity({ actorId: session.userId, actorRole: session.role, action: "POPUP_DELETE", entityType: "PopupCampaign", entityId: id, beforeData: { name: before.name } });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
