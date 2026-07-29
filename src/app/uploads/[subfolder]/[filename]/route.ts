import { NextResponse } from "next/server";
import { readPublicUpload } from "@/lib/server/storage";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subfolder: string; filename: string }> },
) {
  const { subfolder, filename } = await params;
  const bytes = await readPublicUpload(subfolder, filename);
  if (!bytes) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
