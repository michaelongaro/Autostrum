// npm run dev -- --webpack, then node scripts/verifyMobilePresentation.mjs [baseURL]
// Uses local fixtures and mocked tRPC responses; never writes application data.
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"] });
await context.addCookies([
  { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
]);
await context.route("**/api/trpc/**", (route) => {
  const url = new URL(route.request().url());
  const results = url.pathname
    .split("/")
    .at(-1)
    .split(",")
    .map((name) => ({
      result: {
        data: {
          json:
            name === "user.getProfileMetadataByUsername"
              ? {
                  user: {
                    userId: "presentation-fixture",
                    username: "presentation-fixture",
                    profileImageUrl: "",
                    totalTabs: 0,
                    totalTabViews: 0,
                    totalTabRatings: 0,
                    averageTabRating: 0,
                    totalBookmarksReceived: 0,
                  },
                  pinnedTab: null,
                }
              : name === "genre.getAllWithTotalTabCount"
                ? []
                : name === "search.getInfiniteTabsBySearchQuery"
                  ? { count: 0, data: { tabs: [], nextCursor: null } }
                  : name === "search.getMostPopularDailyTabsAndArtists"
                    ? { tabs: [], artists: [] }
                    : null,
        },
      },
    }));
  return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(
      url.searchParams.get("batch") === "1" ? results : results[0],
    ),
  });
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function open(path) {
  await page.goto(baseURL + path, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
}
async function settle(locator) {
  await locator.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
}
// Start sampling before the click so the first frame cannot escape the assertion.
async function recordEntrance(selector, trigger) {
  await page.evaluate((selector) => {
    const frames = [];
    window.presentationFrames = frames;
    let remaining = 60;
    const deadline = performance.now() + 30_000;
    function sample() {
      const element = document.querySelector(selector);
      if (element) {
        const style = getComputedStyle(element);
        frames.push({
          opacity: Number(style.opacity),
          transform: style.transform,
          top: element.getBoundingClientRect().top,
          animating: element
            .getAnimations()
            .some((a) => a.playState === "running"),
        });
        remaining--;
      }
      if (remaining > 0 && performance.now() < deadline)
        requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, selector);
  await trigger.click();
  await page.waitForFunction(() => window.presentationFrames.length >= 8);
  const frames = await page.evaluate(() => window.presentationFrames);
  assert.ok(
    frames.some((f) => f.animating),
    "first open runs an entrance transition",
  );
  return frames;
}

try {
  await open("/dev-base-ui-harness");
  await page
    .locator('[data-testid="base-ui-harness"][data-ready="true"]')
    .waitFor();
  const accordion = page.getByRole("button", { name: "Expand details" });
  const chevron = accordion.locator("svg");
  await accordion.click();
  await page.waitForFunction(() => {
    const icon = [...document.querySelectorAll("button")]
      .find((el) => el.textContent.includes("Expand details"))
      ?.querySelector("svg");
    return icon && getComputedStyle(icon).transform.startsWith("matrix(-1,");
  });
  await accordion.click();
  await chevron.evaluate(async (el) => {
    await Promise.all(
      el.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
  assert.equal(
    await chevron.evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  console.log("PASS accordion chevron rotates open and returns closed");

  await recordEntrance(
    '[data-slot="drawer-content"]',
    page.getByRole("button", { name: "Open drawer", exact: true }),
  );
  const drawer = page.getByRole("dialog", { name: "Fixture drawer" });
  await settle(drawer);
  assert.ok(
    await drawer.evaluate((el) => {
      const viewport = el.parentElement;
      return (
        parseFloat(getComputedStyle(viewport).paddingBottom) >= 16 &&
        el.getBoundingClientRect().bottom <= innerHeight - 16
      );
    }),
    "drawer clears bottom screen corners",
  );
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
  console.log("PASS drawer entrance and bottom safe spacing");

  await open("/dev-virtualization-harness?fixture=print");
  await page.locator('#devPrintHarness[data-ready="true"]').waitFor();
  for (let attempt = 0; attempt < 2; attempt++) {
    const frames = await recordEntrance(
      '[role="dialog"][data-open]',
      page.getByRole("button", { name: "Print tab", exact: true }),
    );
    assert.ok(
      frames.some((f) => f.opacity > 0 && f.opacity < 1),
      "print dialog visibly fades in",
    );
    const dialog = page.getByRole("dialog", { name: "Print tab", exact: true });
    await settle(dialog);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Print tab",
    );
  }
  console.log(
    "PASS first and repeated print entrances, exit, and focus restoration",
  );

  await open("/user/presentation-fixture/filters");
  const indicators = page.getByRole("group", { name: "Choose a profile pane" });
  await indicators.waitFor();
  const carousel = page
    .getByRole("region", { name: "" })
    .filter({ has: page.getByText("No active pinned tab").first() });
  const box = await carousel.boundingBox();
  assert.ok(box);
  const cdp = await context.newCDPSession(page);
  const x = box.x + box.width * 0.8;
  const y = box.y + box.height / 2;
  const touch = (x) => [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touch(x),
  });
  const positions = [];
  for (let step = 1; step <= 8; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: touch(x - (box.width * step) / 16),
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    positions.push(
      await indicators
        .locator("span")
        .first()
        .evaluate((el) => {
          if (getComputedStyle(el.parentElement).overflow !== "hidden") {
            throw new Error("Highlight must be clipped inside each indicator");
          }
          if (getComputedStyle(el).opacity !== "1") {
            throw new Error("Sliding highlight must remain fully opaque");
          }
          return (
            el.getBoundingClientRect().left -
            el.parentElement.getBoundingClientRect().left
          );
        }),
    );
  }
  assert.ok(
    new Set(positions.map((v) => v.toFixed(2))).size >= 4,
    `indicator slides with the finger: ${positions}`,
  );
  assert.ok(positions.some((v) => v > 4 && v < 36));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await indicators.getByRole("button", { name: "Show pinned tab" }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Show pinned tab"]')
        ?.getAttribute("aria-current") === "true",
  );
  // Embla owns its destruction: re-mounting the mobile view must still work.
  await page.setViewportSize({ width: 1280, height: 900 });
  await indicators.waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  await indicators.waitFor();
  await indicators.getByRole("button", { name: "Show pinned tab" }).click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Show pinned tab"]')
        ?.getAttribute("aria-current") === "true",
  );
  console.log(
    "PASS profile indicators follow touch scrubbing and survive responsive remounts",
  );

  await open("/tools/scales");
  await recordEntrance(
    '[class*="bg-black/70"]',
    page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasText: "Begin" }),
  );
  const settings = page.getByRole("button", {
    name: "Playback settings",
    exact: true,
  });
  await settings.click();
  const help = page.getByRole("button", { name: "No sound?", exact: true });
  await help.scrollIntoViewIfNeeded();
  await recordEntrance('[data-slot="drawer-content"]', help);
  const soundDrawer = page.getByRole("dialog", {
    name: "No sound on iPhone?",
    exact: true,
  });
  await settle(soundDrawer);
  await soundDrawer.getByRole("button", { name: "Got it" }).click();
  await soundDrawer.waitFor({ state: "hidden" });
  console.log("PASS first playback and iPhone sound drawer entrances");

  await open("/");
  await page.setViewportSize({ width: 320, height: 720 });
  const hero = page.getByText("Find your next favorite song to play.", {
    exact: true,
  });
  assert.ok(
    await hero.evaluate((el) => {
      const box = el.getBoundingClientRect();
      return (
        getComputedStyle(el).textWrapStyle === "pretty" &&
        box.left >= 0 &&
        box.right <= innerWidth
      );
    }),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS mobile hero wraps prettily within a 320px screen; no runtime errors",
  );
} finally {
  await browser.close();
}
