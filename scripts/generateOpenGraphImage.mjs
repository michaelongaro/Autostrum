import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(
  new URL("../assets/opengraph/homepage-hero-desktop.png", import.meta.url),
);
const destination = fileURLToPath(
  new URL("../public/opengraphScreenshots/homepage-hero.png", import.meta.url),
);

await sharp(source)
  .resize(1200, 630, {
    fit: "inside",
    withoutEnlargement: true,
  })
  .png({ compressionLevel: 9 })
  .toFile(destination);

console.log("Generated the desktop hero social preview at 1200 × 630.");
