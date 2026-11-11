// npm run dev, then node scripts/verifyLargeViewportLayouts.mjs [baseURL] [chromium|webkit]
// Reads public pages and uses the existing dev fixture. No application data writes.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert(["chromium", "webkit"].includes(engine));
const artifacts = `coverage/large-viewport-layouts/${engine}`;
await mkdir(artifacts, { recursive: true });
const browser = await { chromium, webkit }[engine].launch();
const context = await browser.newContext();
await context.addCookies([
  { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
]);
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const viewports = [
  [390, 844],
  [844, 390],
  [768, 1024],
  [1023, 600],
  [1024, 350],
  [1024, 500],
  [1024, 600],
  [1024, 699],
  [1024, 700],
  [1280, 600],
  [1366, 640],
  [1366, 768],
  [1536, 720],
  [1920, 1080],
];

async function resize(width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForFunction(
    ({ width }) => {
      const label = window.__AUTOSTRUM_GET_TAB_STORE__?.().viewportLabel;
      return label && label.includes("mobile") === width < 1024;
    },
    { width },
  );
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

async function open(path) {
  await page.goto(baseURL + path, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForFunction(() => window.__AUTOSTRUM_GET_TAB_STORE__);
}

async function noPageOverflow(label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  assert(overflow <= 1, `${label}: document overflow ${overflow}px`);
}

async function inViewport(locator, label) {
  const rect = await locator.boundingBox();
  const { width, height } = page.viewportSize();
  assert(rect && rect.width > 0 && rect.height > 0, `${label}: has bounds`);
  assert(rect.x >= -1 && rect.y >= -1, `${label}: starts inside viewport`);
  assert(rect.x + rect.width <= width + 1, `${label}: right edge fits`);
  assert(rect.y + rect.height <= height + 1, `${label}: bottom edge fits`);
}

try {
  await open("/search/filters");
  await page.getByRole("button", { name: "Grid view" }).waitFor();
  for (const [width, height] of viewports) {
    await resize(width, height);
    await page.evaluate(() => scrollTo(0, 300));
    const sidebar = page.locator("div.sticky.top-20.w-56");
    const mobileTrigger = page.getByRole("button", { name: "Search filters" });
    assert.equal(await sidebar.isVisible(), width >= 1024);
    assert.equal(await mobileTrigger.isVisible(), width < 1024);
    if (width >= 1024) {
      const bounds = await sidebar.boundingBox();
      assert(
        bounds.height <= height - 96 + 1,
        "sidebar fits below sticky navigation",
      );
      const geometry = await sidebar.evaluate((element) => {
        const controls = [...element.children].map((child) =>
          child.getBoundingClientRect(),
        );
        return {
          nonOverlapping: controls.every(
            (r, i) => i === 0 || r.top >= controls[i - 1].bottom - 1,
          ),
        };
      });
      assert(
        geometry.nonOverlapping,
        "filter groups must not collapse together",
      );
      const apply = sidebar.getByRole("button", { name: "Apply", exact: true });
      await apply.scrollIntoViewIfNeeded();
      await inViewport(apply, "Apply filters");
    }
    await noPageOverflow("search");
    console.log(`PASS search filters ${width}x${height}`);
  }

  await open("/dev-virtualization-harness?fixture=huge");
  await page.locator('#devVirtualizationHarness[data-ready="true"]').waitFor();
  await page.waitForFunction(
    () => window.__AUTOSTRUM_GET_TAB_STORE__().expandedTabData?.length === 899,
  );
  await page.evaluate(() => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    store.setTitle(
      "A long song title to verify desktop playback controls and section selection",
    );
    store.setBpm(120);
    store.setTabData((sections) => {
      sections.push({
        id: "responsive-second-section",
        title: "Second section",
        data: [],
      });
    });
    store.setSectionProgression(
      Array.from({ length: 30 }, (_, i) => ({
        id: `progression-${i}`,
        sectionId: i % 2 ? "responsive-second-section" : "huge-section",
        title: i % 2 ? "Second section" : "Huge section",
        repetitions: 1,
        startSeconds: i * 10,
        endSeconds: (i + 1) * 10,
      })),
    );
    store.setChords(
      Array.from({ length: 16 }, (_, i) => ({
        id: `responsive-chord-${i}`,
        name: `Chord ${i + 1}`,
        color: "#ef4444",
        frets: ["0", "1", "0", "2", "3", ""],
      })),
    );
    store.setStrummingPatterns(
      Array.from({ length: 8 }, (_, i) => ({
        id: `responsive-pattern-${i}`,
        baseNoteLength: "eighth",
        strums: Array.from({ length: 8 }, () => ({
          palmMute: "",
          strum: "v",
          noteLength: "eighth",
        })),
      })),
    );
    store.setShowPlaybackModal(true);
  });
  const modal = page.locator('.playbackModalGradient[tabindex="-1"]');
  await modal.waitFor();
  for (const [width, height] of viewports) {
    await resize(width, height);
    await modal.evaluate((element) => {
      element.scrollTop = 0;
    });
    await inViewport(modal, "playback modal");
    const overflow = await modal.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    assert(
      overflow <= 1,
      `playback ${width}x${height}: horizontal overflow ${overflow}`,
    );
    if (width >= 1024) {
      const menu = modal.getByRole("button", { name: "Chords", exact: true });
      assert(await menu.isVisible(), "desktop playback menus remain available");
      assert.equal(
        await modal
          .getByRole("button", { name: "Practice", exact: true })
          .locator("span")
          .evaluate((e) => getComputedStyle(e).bottom),
        "4px",
        "desktop underline overrides height-only mobile rules",
      );
      await inViewport(modal.locator("#sectionPicker"), "section selector");
      const tuner = modal.getByRole("button", { name: "Tuner", exact: true });
      await tuner.click();
      const dialog = page.getByRole("dialog", { name: "Guitar Tuner" });
      await dialog.waitFor();
      await inViewport(dialog, "tuner dialog");
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      const editLoop = modal.getByRole("button", {
        name: "Enter the loop range editor",
      });
      await editLoop.scrollIntoViewIfNeeded();
      await inViewport(editLoop, "loop editor control");
      await editLoop.click();
      const returnButton = modal.getByRole("button", {
        name: "Return",
        exact: true,
      });
      await returnButton.scrollIntoViewIfNeeded();
      await inViewport(returnButton, "loop editor Return");
      assert.equal(
        await returnButton
          .locator("..")
          .locator("..")
          .evaluate((e) => e.getBoundingClientRect().height),
        94,
        "desktop loop actions keep their height on short screens",
      );
      await returnButton.click();
      for (const name of [
        "Section progression",
        "Chords",
        "Strumming patterns",
        "Practice",
      ]) {
        await modal.getByRole("button", { name, exact: true }).click();
        await noPageOverflow(`playback ${name}`);
        if (name === "Chords") {
          const lastChord = modal.getByText("Chord 16", { exact: true });
          await lastChord.scrollIntoViewIfNeeded();
          await inViewport(lastChord, "last chord in menu");
        }
      }
    }
    await modal.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: `${artifacts}/playback-${width}x${height}.png`,
    });
    await noPageOverflow("playback");
    console.log(`PASS playback, menus, loop editor, tuner ${width}x${height}`);
  }
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await modal.waitFor({ state: "hidden" });
  for (const [width, height] of [
    [390, 844],
    [1023, 600],
    [1024, 600],
    [1366, 640],
  ]) {
    await resize(width, height);
    await noPageOverflow("static tab");
    await page.evaluate(() => scrollTo(0, 1000));
    await page
      .locator("[data-static-tab-body] > :not([aria-hidden])")
      .first()
      .waitFor({ state: "attached" });
    console.log(`PASS tab viewer ${width}x${height}`);
  }

  // Smoke the route shells that share the migrated header, inputs, tabs, and tuner.
  for (const path of [
    "/",
    "/explore",
    "/create",
    "/tools/chord-trainer",
    "/tools/scales",
    "/tuner",
  ]) {
    await open(path);
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(700);
    for (const [width, height] of [
      [390, 844],
      [1024, 600],
      [1366, 640],
      [1440, 900],
    ]) {
      await resize(width, height);
      await noPageOverflow(path);
      assert(
        (await page.locator("main").innerText()).length > 10,
        `${path}: content rendered`,
      );
      await page.screenshot({
        path: `${artifacts}/route-${path.replaceAll("/", "_")}-${width}x${height}.png`,
      });
      console.log(`PASS route ${path} ${width}x${height}`);
    }
  }
  assert.deepEqual(errors, [], "No uncaught browser errors");
} finally {
  await browser.close();
}
