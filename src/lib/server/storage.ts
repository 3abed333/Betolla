import "server-only";
import { writeFile, mkdir, unlink, readdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

// Local filesystem today; swap the implementation of these two functions for an S3/Cloudinary
// SDK call later and every caller (product forms, etc.) keeps working unchanged.
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
// delivery-reports/ holds photos attached to a driver's internal problem reports - not meant for
// public viewing, so it deliberately lives outside public/ entirely and is only ever served
// through the authenticated route at src/app/api/uploads/delivery-reports/[filename]/route.ts
// (see PROGRESS.md's security audit section for why). Every other subfolder is public-by-design
// (product photos, review photos on a public product page), stays under public/uploads/, and is
// served through the /uploads/[subfolder]/[filename] route. A route is required because Next's
// production static-file manifest does not discover files uploaded after `next build`.
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), "uploads-private");
const MAX_DIMENSION = 1600;

export type UploadSubfolder = "products" | "avatars" | "delivery-reports" | "reviews" | "banners" | "popups";
export type PublicUploadSubfolder = Exclude<UploadSubfolder, "delivery-reports">;

const PUBLIC_UPLOAD_SUBFOLDERS = new Set<PublicUploadSubfolder>([
  "products",
  "avatars",
  "reviews",
  "banners",
  "popups",
]);

function rootFor(subfolder: UploadSubfolder): string {
  return subfolder === "delivery-reports" ? PRIVATE_UPLOAD_ROOT : UPLOAD_ROOT;
}

export async function saveUploadedImage(file: File, subfolder: UploadSubfolder): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(rootFor(subfolder), subfolder);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.webp`;
  const filepath = path.join(dir, filename);

  const optimized = await sharp(bytes, {
    limitInputPixels: 40_000_000,
    sequentialRead: true,
  })
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(filepath, optimized);
  return getFileUrl(subfolder, filename);
}

const VIDEO_SIGNATURES: Record<string, (bytes: Buffer) => boolean> = {
  "video/mp4": (bytes) => bytes.length >= 12 && bytes.subarray(4, 12).toString("ascii").includes("ftyp"),
  "video/webm": (bytes) => bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
};

/** Stores a validated Admin banner video without passing it through Sharp. */
export async function saveUploadedBannerVideo(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const signatureMatches = VIDEO_SIGNATURES[file.type]?.(bytes) ?? false;
  if (!signatureMatches) throw new Error("INVALID_VIDEO");

  const dir = path.join(UPLOAD_ROOT, "banners");
  await mkdir(dir, { recursive: true });
  const existing = await readdir(dir);
  if (existing.length >= 80) throw new Error("BANNER_QUOTA");

  const extension = file.type === "video/webm" ? "webm" : "mp4";
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(dir, filename), bytes, { flag: "wx" });
  return `/uploads/banners/${filename}`;
}

/** Removes abandoned banner uploads after a grace period, never media referenced by a banner. */
export async function pruneOrphanedBannerMedia(referencedUrls: Set<string>, olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const dir = path.join(UPLOAD_ROOT, "banners");
  const files = await readdir(dir).catch(() => []);
  const now = Date.now();
  await Promise.all(files.map(async (filename) => {
    const url = `/uploads/banners/${filename}`;
    if (referencedUrls.has(url)) return;
    const filepath = path.join(dir, filename);
    const details = await stat(filepath).catch(() => null);
    if (details && now - details.mtimeMs > olderThanMs) await unlink(filepath).catch(() => undefined);
  }));
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

export async function readPublicUpload(subfolder: string, filename: string): Promise<Buffer | null> {
  if (!PUBLIC_UPLOAD_SUBFOLDERS.has(subfolder as PublicUploadSubfolder)) return null;
  if (
    !filename ||
    filename.length > 160 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..") ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(webp|mp4|webm)$/.test(filename)
  ) {
    return null;
  }
  const filepath = path.join(UPLOAD_ROOT, subfolder, filename);
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
