// Start npm run dev, then: node scripts/verifyTabScreenshotFailures.mjs [baseURL]
// Uses mocked search/images; never creates tabs or writes to S3/the database.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import superjson from "superjson";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const version = new Date("2026-11-11T19:20:27.857Z");
const tabs = [
  "Missing images",
  "Legacy JPEG",
  "Masks without JPEG",
  "Storage failure",
  "Pending masks",
  "Pending JPEG",
].map((title, index) => ({
  id: 900001 + index,
  title,
  genre: "Misc.",
  createdAt: version,
  updatedAt: version,
  difficulty: 2,
  averageRating: 0,
  ratingsCount: 0,
  artist: null,
  createdBy: null,
}));
const jpeg = await sharp({
  create: { width: 400, height: 187, channels: 3, background: "white" },
})
  .jpeg()
  .toBuffer();
const masks = await sharp({
  create: { width: 400, height: 187 * 7, channels: 4, background: "white" },
})
  .png()
  .toBuffer();
let resolveMasks;
let resolveJPEG;
const pendingMasks = new Promise((resolve) => (resolveMasks = resolve));
const pendingJPEG = new Promise((resolve) => (resolveJPEG = resolve));
let repaired = false;
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1400 },
    reducedMotion: "reduce",
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const responses = url.pathname
      .split("/")
      .at(-1)
      .split(",")
      .map((procedure) => ({
        result: {
          data: superjson.serialize(
            procedure === "search.getInfiniteTabsBySearchQuery"
              ? { data: { tabs, nextCursor: null }, count: tabs.length }
              : null,
          ),
        },
      }));
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        url.searchParams.get("batch") === "1" ? responses : responses[0],
      ),
    });
  });
  await page.route("**/api/getTabScreenshot**", async (route) => {
    const url = new URL(route.request().url());
    const isMask = url.pathname.includes("getTabScreenshotMasks");
    const id = Number(url.pathname.split("/")[3]);
    if (!repaired && id === 900005 && isMask) await pendingMasks;
    if (!repaired && id === 900006 && !isMask) await pendingJPEG;
    const available =
      repaired || (isMask ? id === 900003 : [900002, 900006].includes(id));
    return route.fulfill(
      available
        ? {
            status: 200,
            contentType: isMask ? "image/png" : "image/jpeg",
            body: isMask ? masks : jpeg,
          }
        : { status: id === 900004 ? 500 : 404, body: "" },
    );
  });
  await page.goto(`${baseURL}/search/filters`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  const grid = page.locator("[data-search-grid]");
  const card = (title) =>
    grid
      .locator(":scope > div")
      .filter({ has: page.getByText(title, { exact: true }) });
  await expect(grid.locator(":scope > div")).toHaveCount(tabs.length);
  for (const title of ["Missing images", "Storage failure"]) {
    await expect(card(title).getByRole("status")).toHaveText(
      "Preview unavailable",
    );
    await expect(card(title).locator(".pulseAnimation")).toHaveCount(0);
  }
  for (const title of ["Legacy JPEG", "Masks without JPEG"]) {
    await expect(card(title).locator(".pulseAnimation")).toHaveCount(0);
    await expect(card(title).getByRole("status")).toHaveCount(0);
  }
  await expect(
    card("Masks without JPEG").locator('[data-screenshot-renderer="masks"]'),
  ).toBeVisible();
  for (const title of ["Pending masks", "Pending JPEG"]) {
    await expect(card(title).locator(".pulseAnimation")).toHaveCount(1);
    await expect(card(title).getByRole("status")).toHaveCount(0);
  }
  resolveMasks();
  await expect(card("Pending masks").getByRole("status")).toHaveText(
    "Preview unavailable",
  );
  await expect(card("Pending masks").locator(".pulseAnimation")).toHaveCount(0);
  resolveJPEG();
  await expect(card("Pending JPEG").locator(".pulseAnimation")).toHaveCount(0);
  await expect(card("Pending JPEG").getByRole("status")).toHaveCount(0);

  // A revisit must retry missing assets, since capture may have completed later.
  repaired = true;
  await page.getByRole("button", { name: "Table view", exact: true }).click();
  await expect(grid).toHaveCount(0);
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  for (const { title } of tabs) {
    await expect(card(title).locator(".pulseAnimation")).toHaveCount(0);
    await expect(card(title).getByRole("status")).toHaveCount(0);
    await expect(
      card(title).locator('[data-screenshot-renderer="masks"]'),
    ).toBeVisible();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Screenshot failure checks passed: missing/failed assets stop loading, either format can succeed independently, pending fallbacks wait, and revisits recover after capture.",
  );
} finally {
  resolveMasks();
  resolveJPEG();
  await browser.close();
}
