import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "public");
const backupDir = path.join(root, "assets/image-originals");
const imageExtension = /\.(avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i;

async function findImages(directory, prefix = "") {
  const images = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      images.push(
        ...(await findImages(path.join(directory, entry.name), relativePath)),
      );
    } else if (imageExtension.test(entry.name)) {
      images.push(relativePath);
    }
  }
  return images.sort();
}

function resizeOptions(image) {
  // Cover the largest rendered card at 2x density without cropping its source.
  if (image.startsWith("genreThumbnails/")) {
    return { width: 1000, height: 288, fit: "outside" };
  }
  if (image.startsWith("homepage/guitars/")) {
    return { width: 768, height: 384, fit: "outside" };
  }
  if (image === "explore/header.jpg") {
    return { width: 2800, height: 288, fit: "outside" };
  }
  // Legacy desktop screenshots are unused; retain a full-HD version in public.
  if (image.startsWith("homepage/hero/goodDesktopHero")) {
    return { width: 1920 };
  }
  return null;
}

const images = await findImages(publicDir);

// Finish all backups before modifying any public asset. Never replace originals
// on subsequent runs, so resizing always starts from the full-resolution source.
for (const image of images) {
  const backupPath = path.join(backupDir, "public", image);
  await mkdir(path.dirname(backupPath), { recursive: true });
  try {
    await copyFile(
      path.join(publicDir, image),
      backupPath,
      constants.COPYFILE_EXCL,
    );
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

const manifest = [];
let resized = 0;
for (const image of images) {
  const original = await readFile(path.join(backupDir, "public", image));
  const entry = {
    path: `public/${image}`,
    sha256: createHash("sha256").update(original).digest("hex"),
    originalBytes: original.length,
  };
  const options = resizeOptions(image);
  if (options) {
    const metadata = await sharp(original).metadata();
    entry.originalWidth = metadata.width;
    entry.originalHeight = metadata.height;

    let pipeline = sharp(original)
      .autoOrient()
      .resize({ ...options, withoutEnlargement: true });
    if (metadata.format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 84, mozjpeg: true });
    } else if (metadata.format === "webp") {
      pipeline = pipeline.webp({ quality: 82, effort: 6 });
    } else if (metadata.format === "png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    // Already-small images retain their original bytes and quality.
    if (info.width < metadata.width || info.height < metadata.height) {
      await writeFile(path.join(publicDir, image), data);
      entry.width = info.width;
      entry.height = info.height;
      resized++;
      console.log(
        `${image}: ${metadata.width}x${metadata.height} -> ${info.width}x${info.height}`,
      );
    }
  }
  entry.bytes = (await readFile(path.join(publicDir, image))).length;
  manifest.push(entry);
}

await writeFile(
  path.join(backupDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
const before = manifest.reduce((sum, image) => sum + image.originalBytes, 0);
const after = manifest.reduce((sum, image) => sum + image.bytes, 0);
console.log(
  `Backed up ${images.length} images; resized ${resized}. Public images: ${(before / 1024 / 1024).toFixed(2)} -> ${(after / 1024 / 1024).toFixed(2)} MiB (${((1 - after / before) * 100).toFixed(1)}% smaller).`,
);
