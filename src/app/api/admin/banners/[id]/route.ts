import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { bannerSchema } from "@/lib/validation/banner";
import { prisma } from "@/lib/db";
import { deleteUploadedImage } from "@/lib/server/storage";
import { logActivity } from "@/lib/server/services/activityLog";
import { normalizeYouTubeUrl } from "@/lib/youtube";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = bannerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const desktopMediaUrl = parsed.data.mediaType === "YOUTUBE"
    ? normalizeYouTubeUrl(parsed.data.desktopMediaUrl)!
    : parsed.data.desktopMediaUrl;

  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  const banner = await prisma.banner.update({
    where: { id },
    data: {
      ...parsed.data,
      desktopMediaUrl,
      mobileMediaUrl: parsed.data.mediaType === "YOUTUBE" ? null : parsed.data.mobileMediaUrl,
      posterUrl: parsed.data.mediaType === "YOUTUBE" ? null : parsed.data.posterUrl,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });
  for (const oldUrl of [before.desktopMediaUrl, before.mobileMediaUrl, before.posterUrl]) {
    if (oldUrl && ![banner.desktopMediaUrl, banner.mobileMediaUrl, banner.posterUrl].includes(oldUrl)) {
      await deleteUploadedImage(oldUrl);
    }
  }
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BANNER_UPDATE",
    entityType: "Banner",
    entityId: id,
    beforeData: { titleEn: before.titleEn, isActive: before.isActive },
    afterData: { titleEn: banner.titleEn, isActive: banner.isActive },
  });
  return NextResponse.json({ banner });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  await prisma.banner.delete({ where: { id } });
  await Promise.all([banner.desktopMediaUrl, banner.mobileMediaUrl, banner.posterUrl].filter(Boolean).map((url) => deleteUploadedImage(url!)));
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BANNER_DELETE",
    entityType: "Banner",
    entityId: id,
    beforeData: { titleEn: banner.titleEn },
  });
  return NextResponse.json({ ok: true });
}
