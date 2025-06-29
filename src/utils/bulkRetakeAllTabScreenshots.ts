import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { env } from "process";
import pLimit from "p-limit";

const prisma = new PrismaClient();

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

// Reasonable concurrency for 64GB RAM machine
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

  try {
    await page.goto(
      `http://localhost:3000/tab/${tab.id}/${encodeURIComponent(tab.title)}?screenshot=true`,
    );

    await page.locator("#tabBodyContent").waitFor({ state: "visible" });

    // Hide the sticky bottom controls
    await page.evaluate(() => {
      const el = document.getElementById("stickyBottomControls");
      if (el) {
        el.style.display = "none";
      }
    });

    // Scroll to the tab body content
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      }
    }, "tabBodyContent");

    // Get a screenshot of the tab body content
    const screenshotBuffer = await page.screenshot({
      clip: {
        x: 300,
        y: 70,
        width: 1318,
        height: 615,
      },
      type: "jpeg",
      quality: 75,
    });

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: "autostrum-screenshots",
      Key: `${tab.id}.jpeg`,
      Body: screenshotBuffer,
      ContentType: "image/jpeg",
    });

    await s3.send(command);
    console.log(`Uploaded screenshot for tab ${tab.id}`);
  } catch (e) {
    console.error(`Error processing tab ${tab.id}:`, e);
  } finally {
    await browser.close();
  }
}

async function main() {
  // Use p-limit to control concurrency
  const tasks = tabs.map((tab) => limit(() => screenshotAndUpload(tab)));
  await Promise.all(tasks);
  console.log("All screenshots processed and uploaded.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
