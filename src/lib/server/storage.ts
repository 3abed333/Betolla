import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Local filesystem today; swap the implementation of these two functions for an S3/Cloudinary
// SDK call later and every caller (product forms, etc.) keeps working unchanged.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
// delivery-reports/ holds photos attached to a driver's internal problem reports - not meant for
// public viewing, so it deliberately lives outside public/ entirely and is only ever served
// through the authenticated route at src/app/api/uploads/delivery-reports/[filename]/route.ts
// (see PROGRESS.md's security audit section for why). Every other subfolder is public-by-design
// (product photos, review photos on a public product page) and stays under public/uploads/.
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), "uploads-private");
const MAX_DIMENSION = 1600;

export type UploadSubfolder = "products" | "avatars" | "delivery-reports" | "reviews";

function rootFor(subfolder: UploadSubfolder): string {
  return subfolder === "delivery-reports" ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
}

export async function saveUploadedImage(file: File, subfolder: UploadSubfolder): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(rootFor(subfolder), subfolder);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const filepath = path.join(dir, filename);

  const optimized = await sharp(bytes)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(filepath, optimized);
  return getFileUrl(subfolder, filename);
}

export function getFileUrl(subfolder: UploadSubfolder, filename: string): string {
  if (subfolder === "delivery-reports") return `/api/uploads/delivery-reports/${filename}`;
  return `/uploads/${subfolder}/${filename}`;
}

/** Reads a delivery-report photo from the private (non-public) upload root, for the authenticated serving route. */
export async function readPrivateUpload(subfolder: UploadSubfolder, filename: string): Promise<Buffer | null> {
  // Reject anything that isn't a bare filename (no path separators, no "..") before touching the
  // filesystem - defense in depth even though saveUploadedImage never accepts a client-supplied
  // filename in the first place.
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  const filepath = path.join(rootFor(subfolder), subfolder, filename);
  const { readFile } = await import("node:fs/promises");
  return readFile(filepath).catch(() => null);
}

export async function deleteUploadedImage(url: string): Promise<void> {
  if (url.startsWith("/api/uploads/delivery-reports/")) {
    const filename = url.split("/").pop()!;
    const filepath = path.join(PRIVATE_UPLOAD_ROOT, "delivery-reports", filename);
    await unlink(filepath).catch(() => undefined);
    return;
  }
  if (!url.startsWith("/uploads/")) return; // external (e.g. seeded picsum) URL - nothing to delete
  const filepath = path.join(process.cwd(), "public", url);
  await unlink(filepath).catch(() => undefined);
}
