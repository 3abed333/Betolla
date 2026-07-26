import sharp from "sharp";

const out = process.argv[2];
await sharp({
  create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 50, b: 50 } },
})
  .png()
  .toFile(out);
console.log("wrote", out);
