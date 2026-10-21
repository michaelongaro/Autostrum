// Start npm run dev, then run:
// node scripts/verifyMobileChordColumns.mjs [baseURL] [chromium|webkit|all] [width]
// Uses the dev fixture and local store; all API requests are stubbed.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "all";
assert.ok(["chromium", "webkit", "all"].includes(engine));
const widths = process.argv[4]
  ? [Number(process.argv[4])]
  : [320, 375, 390, 393, 430, 1280];
const screenshotDir = path.join(os.tmpdir(), "autostrum-mobile-chord-columns");
await mkdir(screenshotDir, { recursive: true });

const diagramSelector = 'svg[aria-label^="Guitar chord diagram"]';
const chords = ["C", "G", "Am", "F", "Dm"].map((name, index) => ({
  id: `chord-layout-${index}`,
  name,
  color: "#22c55e",
  // Include a taller diagram to check sizing for extended fret ranges.
  frets:
    index === 3
      ? ["x", "7", "2", "0", "0", "0"]
      : ["0", "1", "0", "2", "3", "x"],
}));

async function checkColumns(diagrams, expectedColumns, label) {
  // Embla can take longer to settle in the Windows WebKit build.
  await diagrams
    .first()
    .page()
    .waitForFunction(
      (selector) => {
        const elements = [...document.querySelectorAll(selector)];
        return (
          elements.length > 0 &&
          elements.every((svg) => {
            const rect =
              svg.parentElement.parentElement.parentElement.getBoundingClientRect();
            return rect.x >= -1 && rect.right <= innerWidth + 1;
          })
        );
      },
      await diagrams
        .first()
        .evaluate((svg) =>
          svg.closest('[role="dialog"]')
            ? '[role="dialog"] svg[aria-label^="Guitar chord diagram"]'
            : 'svg[aria-label^="Guitar chord diagram"]',
        ),
    );
  assert.equal(
    await diagrams.count(),
    chords.length,
    `${label}: all chords render`,
  );
  const boxes = await diagrams.evaluateAll((elements) =>
    elements.map((svg) => {
      const card = svg.parentElement.parentElement.parentElement;
      const rect = card.getBoundingClientRect();
      const diagram = svg.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        diagramWidth: diagram.width,
        diagramHeight: diagram.height,
        viewportWidth: innerWidth,
      };
    }),
  );
  const firstRow = boxes.filter((box) => Math.abs(box.y - boxes[0].y) < 1);
  assert.equal(
    firstRow.length,
    expectedColumns,
    `${label}: columns in first row`,
  );
  for (const box of boxes) {
    assert.ok(
      box.width > 0 && box.diagramWidth > 0 && box.diagramHeight > 0,
      `${label}: visible diagrams`,
    );
    assert.ok(
      box.diagramWidth <= box.width + 1,
      `${label}: diagrams fit their cards`,
    );
    assert.ok(
      box.x >= -1 && box.x + box.width <= box.viewportWidth + 1,
      `${label}: cards stay inside the viewport`,
    );
  }
  console.log(
    `${label}: ${firstRow.length} columns, card widths ${boxes.map((box) => Math.round(box.width)).join(", ")}`,
  );
}

for (const browserType of [chromium, webkit]) {
  if (engine !== "all" && engine !== browserType.name()) continue;
  const browser = await browserType.launch();
  try {
    for (const width of widths) {
      const desktop = width === 1280;
      const context = await browser.newContext({
        ...(desktop ? {} : devices["iPhone 15"]),
        viewport: { width, height: desktop ? 900 : 852 },
        reducedMotion: "reduce",
      });
      try {
        // Same dev-only Clerk handshake bypass as the existing verify scripts.
        await context.addCookies([
          {
            name: "__clerk_db_jwt",
            value: "dev_browser_fake_jwt",
            url: baseURL,
          },
        ]);
        await context.route("**/api/trpc/**", (route) => {
          const url = new URL(route.request().url());
          const count = url.pathname.split("/").at(-1).split(",").length;
          return route.fulfill({
            contentType: "application/json",
            body: JSON.stringify(
              Array.from({ length: count }, () => ({
                result: { data: { json: null } },
              })),
            ),
          });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        await page.goto(`${baseURL}/dev-virtualization-harness?fixture=bpm`);
        await page.waitForFunction(
          () =>
            window.__AUTOSTRUM_GET_TAB_STORE__?.().tabData[0]?.id ===
            "bpm-section",
        );
        // The Next development toolbar can intercept touch clicks in WebKit.
        await page.addStyleTag({
          content: "nextjs-portal { display: none !important; }",
        });
        await page.evaluate(
          (data) => window.__AUTOSTRUM_GET_TAB_STORE__().setChords(data),
          chords,
        );
        await page.getByRole("button", { name: "Chords", exact: true }).click();
        const metadataDiagrams = page.locator(diagramSelector);
        await metadataDiagrams.first().waitFor();
        // Let the Embla carousel and metadata height animation settle.
        await page.waitForFunction((selector) => {
          const svg = document.querySelector(selector);
          const rect = svg?.getBoundingClientRect();
          return rect && rect.x >= 0 && rect.right <= innerWidth;
        }, diagramSelector);
        await page.waitForTimeout(700);
        const label = `${browserType.name()} ${width}px`;
        await checkColumns(
          metadataDiagrams,
          desktop ? 5 : 2,
          `${label} metadata collapsed`,
        );
        if (!desktop) {
          await page
            .getByRole("button", {
              name: "Expand extra tab metadata",
              exact: true,
            })
            .click();
          await page.waitForTimeout(400);
          await checkColumns(metadataDiagrams, 2, `${label} metadata expanded`);
        }
        if (width === 393) {
          await metadataDiagrams.first().scrollIntoViewIfNeeded();
          await page.screenshot({
            path: path.join(
              screenshotDir,
              `${browserType.name()}-metadata.png`,
            ),
          });
        }

        await page.evaluate(() =>
          window.__AUTOSTRUM_GET_TAB_STORE__().setShowPlaybackModal(true),
        );
        if (desktop) {
          const modal = page.locator(".playbackModalGradient");
          await modal
            .getByRole("button", { name: "Chords", exact: true })
            .click();
          const playbackDiagrams = modal.locator(diagramSelector);
          await playbackDiagrams.first().waitFor();
          await page.waitForTimeout(400);
          await checkColumns(playbackDiagrams, 5, `${label} playback menu`);
        } else {
          await page.getByRole("button", { name: "Menu", exact: true }).click();
          const dialog = page.getByRole("dialog");
          await dialog
            .getByRole("button", { name: "Chords", exact: true })
            .click();
          const playbackDiagrams = dialog.locator(diagramSelector);
          await playbackDiagrams.first().waitFor();
          await page.waitForTimeout(700);
          await checkColumns(playbackDiagrams, 2, `${label} playback menu`);
          await playbackDiagrams.last().scrollIntoViewIfNeeded();
          assert.ok(
            await playbackDiagrams.last().isVisible(),
            `${label}: final chord is reachable`,
          );
          if (width === 393) {
            await playbackDiagrams.first().scrollIntoViewIfNeeded();
            await page.screenshot({
              path: path.join(
                screenshotDir,
                `${browserType.name()}-playback.png`,
              ),
            });
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

console.log(`Chord columns verified. Screenshots: ${screenshotDir}`);
