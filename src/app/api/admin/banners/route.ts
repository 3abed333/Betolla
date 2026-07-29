import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { bannerSchema } from "@/lib/validation/banner";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/server/services/activityLog";
import { normalizeYouTubeUrl } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const parsed = bannerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const desktopMediaUrl = parsed.data.mediaType === "YOUTUBE"
    ? normalizeYouTubeUrl(parsed.data.desktopMediaUrl)!
    : parsed.data.desktopMediaUrl;

  const banner = await prisma.banner.create({
    data: {
      ...parsed.data,
      desktopMediaUrl,
      mobileMediaUrl: parsed.data.mediaType === "YOUTUBE" ? null : parsed.data.mobileMediaUrl,
      posterUrl: parsed.data.mediaType === "YOUTUBE" ? null : parsed.data.posterUrl,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    },
  });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BANNER_CREATE",
    entityType: "Banner",
    entityId: banner.id,
    afterData: { titleEn: banner.titleEn, mediaType: banner.mediaType, isActive: banner.isActive },
  });
  return NextResponse.json({ banner }, { status: 201 });
}
