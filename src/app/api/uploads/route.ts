import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { saveUploadedImage, type UploadSubfolder } from "@/lib/server/storage";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF", "DELIVERY", "CUSTOMER");
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
  // force-set server-side for non-staff senders on support-ticket messages), a CUSTOMER session's
  // uploads always go to reviews/ the same way, and only ADMIN/STAFF may ever choose "avatars" -
  // delivery-reports/reviews are exclusively their respective role-forced paths.
  const requestedSubfolder = formData?.get("subfolder");
  let subfolder: UploadSubfolder = "products";
  if (session.role === "DELIVERY") {
    subfolder = "delivery-reports";
  } else if (session.role === "CUSTOMER") {
    subfolder = "reviews";
  } else if (requestedSubfolder === "avatars") {
    subfolder = "avatars";
  }

  // The `file.type` check above only trusts the client-supplied MIME string - a request can claim
  // image/png while sending non-image bytes. sharp() throws when it can't actually decode the
  // file as an image, so that failure is caught here and turned into a clean 400 instead of an
  // unhandled 500 (confirmed live during the Phase 15 security audit: a text file with a spoofed
  // image/png Content-Type previously reached sharp() and crashed the request with a raw 500).
  try {
    const url = await saveUploadedImage(file, subfolder);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "The file could not be read as a valid image" }, { status: 400 });
  }
}
