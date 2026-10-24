// Slices each character sheet (4 poses side by side) into per-frame WebPs for poster images,
// so pages don't download the whole sheet to show one pose. Runs before dev/build.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dir = path.join(process.cwd(), "public", "characters");
const out = path.join(dir, "generated");
fs.mkdirSync(out, { recursive: true });

for (const id of ["uvi", "ruvi"]) {
  const sheet = [`${id}-sheet.webp`, `${id}-sheet.png`].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
  if (!sheet) continue;
  const meta = await sharp(sheet).metadata();
  const fw = Math.floor(meta.width / 4);
  for (let i = 0; i < 4; i++) {
    const target = path.join(out, `${id}-frame-${i + 1}.webp`);
    if (fs.existsSync(target) && fs.statSync(target).mtimeMs > fs.statSync(sheet).mtimeMs) continue;
    await sharp(sheet)
      .extract({ left: i * fw, top: 0, width: fw, height: meta.height })
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(target);
  }
  console.log(`sliced ${path.basename(sheet)} → generated/${id}-frame-1..4.webp`);
}
