import sharp from "sharp";
import { readFileSync } from "node:fs";

const path = process.argv[2];
const bytes = readFileSync(path);
console.log("Input bytes:", bytes.length);
try {
  const out = await sharp(bytes)
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  console.log("SUCCESS, output bytes:", out.length);
} catch (e) {
  console.error("SHARP ERROR:", e);
}
