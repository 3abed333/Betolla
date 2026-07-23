import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { saveUploadedImage, type UploadSubfolder } from "@/lib/server/storage";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF", "DELIVERY");
  if (session instanceof NextResponse) return session;

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (!contentType.includes("multipart/form-data") || !contentLength) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
  }

  // Never trust the client for the destination folder - a DELIVERY session's uploads always go
  // to delivery-reports/ regardless of what the request claims (matching how isInternalNote is
  // force-set server-side for non-staff senders on support-ticket messages), and only ADMIN/STAFF
  // may ever choose "avatars" - delivery-reports is exclusively the DELIVERY-forced path.
  const requestedSubfolder = formData?.get("subfolder");
  let subfolder: UploadSubfolder = "products";
  if (session.role === "DELIVERY") {
    subfolder = "delivery-reports";
  } else if (requestedSubfolder === "avatars") {
    subfolder = "avatars";
  }

  const url = await saveUploadedImage(file, subfolder);
  return NextResponse.json({ url });
}
