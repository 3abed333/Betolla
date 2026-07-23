import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Local filesystem today; swap the implementation of these two functions for an S3/Cloudinary
// SDK call later and every caller (product forms, etc.) keeps working unchanged.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const MAX_DIMENSION = 1600;

export type UploadSubfolder = "products" | "avatars" | "delivery-reports";

export async function saveUploadedImage(file: File, subfolder: UploadSubfolder): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(UPLOAD_ROOT, subfolder);
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

export function getFileUrl(subfolder: string, filename: string): string {
  return `/uploads/${subfolder}/${filename}`;
}

export async function deleteUploadedImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return; // external (e.g. seeded picsum) URL - nothing to delete
  const filepath = path.join(process.cwd(), "public", url);
  await unlink(filepath).catch(() => undefined);
}
