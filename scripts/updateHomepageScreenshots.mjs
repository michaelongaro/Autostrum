// Refresh only the player in the existing marketing images, preserving their
// framing, copy, header/avatar, and background. Start npm run dev first, then:
// node scripts/updateHomepageScreenshots.mjs [baseURL]
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import sharp from "sharp";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const artifacts = "coverage/homepage-images";
const readmePath = "public/README/homepage_screenshot.png";
const socialSourcePath = "assets/opengraph/homepage-hero-desktop.png";
const readmeOriginal = await readFile(readmePath);
const socialOriginal = await readFile(socialSourcePath);
await mkdir(artifacts, { recursive: true });

async function refreshPlayer(original, capture, points, width, height) {
  const metadata = await sharp(original).metadata();
  assert.equal(metadata.width, width);
  assert.equal(metadata.height, height);
  const mask = await sharp(
    Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="white"/></svg>`,
    ),
  )
    .png()
    .toBuffer();
  const player = await sharp(capture)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  let pipeline = sharp(original).composite([{ input: player }]);
  if (!metadata.hasAlpha) pipeline = pipeline.removeAlpha();
  const result = await pipeline.png({ compressionLevel: 9 }).toBuffer();

  // Check decoded pixels, not PNG bytes: everything outside the player stays
  // exactly the same, even when screenshot rendering/fonts/auth have changed.
  const before = await sharp(original).ensureAlpha().raw().toBuffer();
  const after = await sharp(result).ensureAlpha().raw().toBuffer();
  const alpha = await sharp(mask).ensureAlpha().raw().toBuffer();
  let changedPixels = 0;
  for (let i = 0; i < before.length; i += 4) {
    const changed = !before.subarray(i, i + 4).equals(after.subarray(i, i + 4));
    if (alpha[i + 3] === 0)
      assert.equal(changed, false, "Pixel outside player changed");
    if (changed) changedPixels++;
  }
  assert.ok(changedPixels > 0, "Player screenshot did not update");
  return { result, changedPixels };
}

// Map an untransformed DOM player onto the four corners of the existing
// perspective frame. CSS performs the projection before rasterizing the UI.
function perspectiveMatrix(width, height, points) {
  const source = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
  const rows = [];
  source.forEach(([x, y], i) => {
    const [u, v] = points[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    assert.ok(Math.abs(divisor) > 1e-10);
    rows[col] = rows[col].map((value) => value / divisor);
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      rows[row] = rows[row].map(
        (value, index) => value - factor * rows[col][index],
      );
    }
  }
  const [a, b, c, d, e, f, g, h] = rows.map((row) => row[8]);
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].join(",")})`;
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 910 },
    colorScheme: "dark",
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("autostrum-theme", "dark");
    localStorage.setItem("autostrum-color", "maple");
    localStorage.setItem("autostrum-follows-device-theme", "false");
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: "networkidle" });
  const player = page.locator(
    ".heroScreenshotStage.lg\\:block .heroScreenshotApp",
  );
  await player.waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll("section img")].map((img) =>
        img.decode().catch(() => {}),
      ),
    );
  });
  await page.addStyleTag({
    content:
      "html {scrollbar-width:none} nextjs-portal {display:none!important}",
  });

  // README retains the original 1920 x 910 desktop framing, reduced to 960 x 455.
  const readmePoints = await player.evaluate((app) => {
    return [
      ["-1px", "-1px"],
      ["calc(100% + 1px)", "-1px"],
      ["calc(100% + 1px)", "calc(100% + 1px)"],
      ["-1px", "calc(100% + 1px)"],
    ].map(([left, top]) => {
      const point = document.createElement("span");
      Object.assign(point.style, {
        position: "absolute",
        left,
        top,
        width: "0",
        height: "0",
      });
      app.append(point);
      const { x, y } = point.getBoundingClientRect();
      point.remove();
      return [x / 2, y / 2];
    });
  });
  const fullCapture = await page.screenshot();
  const readmeCapture = await sharp(fullCapture)
    .resize(960, 455)
    .png()
    .toBuffer();
  const readme = await refreshPlayer(
    readmeOriginal,
    readmeCapture,
    readmePoints,
    960,
    455,
  );

  // The social source was authored with a smaller Arial player. Keep that
  // typography and its original frame rather than changing the surrounding hero.
  const socialPoints = [
    [640, 191],
    [1488, 166],
    [1505, 695],
    [580, 672],
  ];
  const transform = perspectiveMatrix(1150, 650, socialPoints);
  await page.setViewportSize({ width: 1600, height: 840 });
  await player.evaluate(
    (app, { transform, background }) => {
      const clone = app.cloneNode(true);
      Object.assign(clone.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "1150px",
        height: "650px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        transformOrigin: "0 0",
        transform,
      });
      const frame = document.createElement("div");
      Object.assign(frame.style, {
        position: "fixed",
        inset: "0",
        width: "1600px",
        height: "840px",
        overflow: "hidden",
        zIndex: "2147483647",
        backgroundImage: `url(${background})`,
        backgroundSize: "100% 100%",
      });
      frame.append(clone);
      document.body.append(frame);
    },
    {
      transform,
      background: `data:image/png;base64,${socialOriginal.toString("base64")}`,
    },
  );
  await page.evaluate(async () => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const socialCapture = await page.screenshot();
  const social = await refreshPlayer(
    socialOriginal,
    socialCapture,
    socialPoints,
    1600,
    840,
  );

  await writeFile(`${artifacts}/readme-before.png`, readmeOriginal);
  await writeFile(`${artifacts}/social-before.png`, socialOriginal);
  await writeFile(readmePath, readme.result);
  await writeFile(socialSourcePath, social.result);
  console.log(
    `Updated README: 960 x 455 (${readme.changedPixels} player pixels changed).`,
  );
  console.log(
    `Updated social source: 1600 x 840 (${social.changedPixels} player pixels changed).`,
  );
  console.log("All pixels outside the player frames are unchanged.");
} finally {
  await browser.close();
}
