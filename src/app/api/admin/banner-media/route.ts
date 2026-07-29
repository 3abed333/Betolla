import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { saveUploadedBannerVideo, saveUploadedImage, pruneOrphanedBannerMedia } from "@/lib/server/storage";
import { prisma } from "@/lib/db";
import { reserveUploadQuota, releaseUploadQuota } from "@/lib/server/uploadQuota";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.includes("multipart/form-data") || !contentLength) {
    return NextResponse.json({ error: "A media file is required" }, { status: 400 });
  }
  if (contentLength > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Upload request is too large" }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A media file is required" }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Use JPEG, PNG, WebP, MP4 or WebM" }, { status: 400 });
  }
  if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: isVideo ? "Video must be under 25MB" : "Image must be under 8MB" }, { status: 400 });
  }
  const reserved = await reserveUploadQuota(session.userId, session.role, file.size);
  if (!reserved) {
    return NextResponse.json(
      { error: "Daily upload quota reached. Please try again tomorrow." },
      { status: 429 },
    );
  }

  try {
    const banners = await prisma.banner.findMany({ select: { desktopMediaUrl: true, mobileMediaUrl: true, posterUrl: true } });
    await pruneOrphanedBannerMedia(new Set(banners.flatMap((banner) => [
      banner.desktopMediaUrl, banner.mobileMediaUrl, banner.posterUrl,
    ]).filter((url): url is string => Boolean(url))));
    const url = isVideo ? await saveUploadedBannerVideo(file) : await saveUploadedImage(file, "banners");
    return NextResponse.json({ url, mediaType: isVideo ? "VIDEO" : "IMAGE" });
  } catch (error) {
    await releaseUploadQuota(session.userId, file.size);
    const message = error instanceof Error && error.message === "BANNER_QUOTA"
      ? "Banner media quota reached. Remove unused media first."
      : "The uploaded file is not valid media.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
