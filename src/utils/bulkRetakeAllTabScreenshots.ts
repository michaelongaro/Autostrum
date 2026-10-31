import "dotenv/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "../generated/client.js";
import { env } from "node:process";
import { parseArgs } from "node:util";
import pLimit from "p-limit";
import sharp from "sharp";
import { chromium, type Browser } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { captureTabScreenshotMasks } from "./captureTabScreenshotMasks";
import { getTabScreenshotMaskKey } from "./tabScreenshotMasks";

// npx tsx src/utils/bulkRetakeAllTabScreenshots.ts --masks-only
// Options: --tab=123 --bucket=autostrum-screenshots-dev
//          --base-url=http://localhost:3000 --concurrency=3
const { values } = parseArgs({
  options: {
    "masks-only": { type: "boolean", default: false },
    tab: { type: "string" },
    bucket: { type: "string" },
    "base-url": { type: "string", default: "http://localhost:3000" },
    concurrency: { type: "string", default: "3" },
  },
});

const concurrency = Number(values.concurrency);
const tabId = values.tab === undefined ? undefined : Number(values.tab);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
  throw new Error("--concurrency must be an integer from 1 to 10");
}
if (tabId !== undefined && (!Number.isSafeInteger(tabId) || tabId < 1)) {
  throw new Error("--tab must be a positive integer");
}
if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.DATABASE_URL) {
  throw new Error("Database and AWS credentials are required");
}

const bucket =
  values.bucket ??
  `autostrum-screenshots${env.NODE_ENV === "production" ? "" : "-dev"}`;
const baseURL = new URL(values["base-url"]);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});
const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

async function screenshotAndUpload(
  browser: Browser,
  tab: { id: number; title: string; updatedAt: Date },
) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  try {
    const page = await context.newPage();
    const url = new URL(
      `/tab/${tab.id}/${encodeURIComponent(tab.title)}`,
      baseURL,
    );
    url.searchParams.set("screenshot", "true");
    url.searchParams.set("screenshotRenderer", "gradient-map");
    await page.goto(url.href, { waitUntil: "networkidle", timeout: 120_000 });
    await page.locator("#tabPreviewScreenshotLight").waitFor();
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const id of ["desktopHeader", "stickyBottomControls"]) {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
      }
    });

    if (!values["masks-only"]) {
      for (const theme of ["light", "dark"] as const) {
        const image = await page
          .locator(
            theme === "light"
              ? "#tabPreviewScreenshotLight"
              : "#tabPreviewScreenshotDark",
          )
          .screenshot({ type: "png", animations: "disabled" });
        const body = await sharp(image)
          .resize({ width: 1200 })
          .jpeg({ quality: 90 })
          .toBuffer();
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${tab.id}/${theme}.jpeg`,
            Body: body,
            ContentType: "image/jpeg",
          }),
        );
      }
    }

    const masks = await captureTabScreenshotMasks(page);
    // Do not label masks with an old revision if the tab changed mid-capture.
    const current = await prisma.tab.findUnique({
      where: { id: tab.id },
      select: { updatedAt: true },
    });
    if (current?.updatedAt.toISOString() !== tab.updatedAt.toISOString()) {
      throw new Error("Tab changed while its screenshot was being captured");
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: getTabScreenshotMaskKey(tab.id),
        Body: masks,
        ContentType: "image/png",
        Metadata: { "tab-version": tab.updatedAt.toISOString() },
      }),
    );
    console.log(`Tab ${tab.id}: uploaded masks (${masks.length} bytes)`);
    return true;
  } catch (error) {
    // Avoid printing SDK/HTTP objects, which may include credentials or URLs.
    console.error(
      `Tab ${tab.id}: capture failed`,
      error instanceof Error ? error.message : "Unknown error",
    );
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  let browser: Browser | undefined;
  try {
    const tabs = await prisma.tab.findMany({
      where: tabId === undefined ? undefined : { id: tabId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { id: "asc" },
    });
    if (!tabs.length) throw new Error("No matching tabs found");
    console.log(
      `Capturing ${tabs.length} tabs into ${bucket} (${values["masks-only"] ? "masks only; JPEGs preserved" : "JPEGs and masks"})`,
    );
    browser = await chromium.launch({ headless: true });
    const captureBrowser = browser;
    const limit = pLimit(concurrency);
    const results = await Promise.all(
      tabs.map((tab) => limit(() => screenshotAndUpload(captureBrowser, tab))),
    );
    const failures = results.filter((success) => !success).length;
    console.log(`Completed ${tabs.length - failures}/${tabs.length} tabs`);
    if (failures > 0) process.exitCode = 1;
  } finally {
    await browser?.close();
    await prisma.$disconnect();
    s3.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Screenshot capture failed",
  );
  process.exitCode = 1;
});
