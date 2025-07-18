import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { env } from "process";
import pLimit from "p-limit";
import sharp from "sharp";

const prisma = new PrismaClient();

// FYI: directly running this from node, didn't like the "~/" import of T3 env package,
// just using process.env directly
if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  throw new Error(
    "AWS credentials are not set. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your environment variables.",
  );
}

const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const CONCURRENCY = 10;

const tabs = await prisma.tab.findMany();

if (!tabs.length) {
  throw new Error("No tabs found in the database.");
}

const { chromium } = await import("playwright");

const limit = pLimit(CONCURRENCY);

async function screenshotAndUpload(tab: { id: number; title: string }) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  async function resizeImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: Math.round(1318 / 3.25) }) // 1318px is the original width of the screenshot
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  try {
    await page.goto(
      `http://localhost:3000/tab/${tab.id}/${encodeURIComponent(tab.title)}?screenshot=true`,
    );

    await page
      .locator("#tabPreviewScreenshotLight")
      .waitFor({ state: "visible" });

    // Hide the header
    await page.evaluate(() => {
      const el = document.getElementById("desktopHeader");
      if (el) {
        el.style.display = "none";
      }
    });

    // Hide the sticky bottom controls
    await page.evaluate(() => {
      const el = document.getElementById("stickyBottomControls");
      if (el) {
        el.style.display = "none";
      }
    });

    // Get light screenshot
    const lightImageBuffer = await page
      .locator("#tabPreviewScreenshotLight")
      .screenshot({
        type: "jpeg",
        quality: 90,
      });

    // Get dark screenshot
    const darkImageBuffer = await page
      .locator("#tabPreviewScreenshotDark")
      .screenshot({
        type: "jpeg",
        quality: 90,
      });

    // Resize both images
    const [resizedLight, resizedDark] = await Promise.all([
      resizeImage(lightImageBuffer),
      resizeImage(darkImageBuffer),
    ]);

    // Upload to S3
    const lightCommand = new PutObjectCommand({
      // FYI: always using npm start alongside this script, so manually toggle "-dev" when necessary
      Bucket: `autostrum-screenshots-dev`,
      Key: `${tab.id}/light.jpeg`,
      Body: resizedLight,
      ContentType: "image/jpeg",
    });

    const darkCommand = new PutObjectCommand({
      // FYI: always using npm start alongside this script, so manually toggle "-dev" when necessary
      Bucket: `autostrum-screenshots-dev`,
      Key: `${tab.id}/dark.jpeg`,
      Body: resizedDark,
      ContentType: "image/jpeg",
    });

    // uploading screenshots to s3 bucket
    Promise.all([s3.send(lightCommand), s3.send(darkCommand)]).catch((e) => {
      console.error(e);
    });

    console.log(`Uploaded screenshot for tab ${tab.id}`);
  } catch (e) {
    console.error(`Error processing tab ${tab.id}:`, e);
  } finally {
    await browser.close();
  }
}

async function main() {
  const tasks = tabs.map((tab) => limit(() => screenshotAndUpload(tab)));
  await Promise.all(tasks);
  console.log("All screenshots processed and uploaded.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
