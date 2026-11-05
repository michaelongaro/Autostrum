// npm run dev, then node scripts/verifyMobileMigrationRegressions.mjs [baseURL]
// Trusted Chromium touch input; all tRPC requests are fulfilled locally.
import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const failures = [];
async function open(path) {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
  ]);
  await context.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const procedures = url.pathname.split("/").at(-1).split(",");
    const results = procedures.map((name) => ({
      result: {
        data: {
          json:
            name === "tab.getRatingBookmarkAndViewCount"
              ? {
                  averageRating: 0,
                  ratingsCount: 0,
                  pageViews: 0,
                  bookmarked: false,
                  userRating: null,
                }
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
  await page.goto(baseURL + path, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  return { context, page, cdp: await context.newCDPSession(page) };
}
async function settle(locator) {
  await locator.waitFor();
  await locator.evaluate(async (el) => {
    await Promise.all(
      el.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
}
async function touchDrag(cdp, from, to, sample) {
  const touch = (x, y) => [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touch(from.x, from.y),
  });
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: touch(
        from.x + ((to.x - from.x) * i) / 12,
        from.y + ((to.y - from.y) * i) / 12,
      ),
    });
    if (sample && i % 3 === 0) await sample();
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}
async function check(name, path, run) {
  const session = await open(path);
  try {
    await run(session);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    await session.context.close();
  }
}
try {
  await check(
    "drawer zoom follows a continuous touch drag",
    "/dev-base-ui-harness",
    async ({ page, cdp }) => {
      await page
        .getByRole("button", { name: "Open drawer", exact: true })
        .click();
      const drawer = page.getByRole("dialog", { name: "Fixture drawer" });
      await settle(drawer);
      const slider = drawer.getByRole("slider", { name: "Zoom", exact: true });
      const thumb = await slider.boundingBox();
      const track = await drawer.locator("[data-scale-track]").boundingBox();
      const values = [];
      await touchDrag(
        cdp,
        { x: thumb.x + thumb.width / 2, y: thumb.y + thumb.height / 2 },
        { x: track.x + track.width * 0.95, y: thumb.y + thumb.height / 2 },
        async () =>
          values.push(Number(await slider.getAttribute("aria-valuenow"))),
      );
      assert.ok(
        new Set(values).size >= 3 && values.at(-1) >= 1.4,
        `zoom should follow the finger before release, got ${values}`,
      );
      assert.equal(await drawer.isVisible(), true);
      await touchDrag(
        cdp,
        { x: track.x + track.width * 0.95, y: thumb.y + thumb.height / 2 },
        { x: track.x + track.width * 0.15, y: thumb.y + thumb.height / 2 },
      );
      assert.ok(
        Number(await slider.getAttribute("aria-valuenow")) <= 0.8,
        "zoom drags back down",
      );
    },
  );
  await check(
    "image editor ignores body drags and still swipes from its handle",
    "/dev-base-ui-harness",
    async ({ page, cdp }) => {
      await page
        .getByTestId("profile-image-fixture")
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      const drawer = page.getByRole("dialog", { name: "Image editor" });
      await settle(drawer);
      const title = await drawer
        .getByText("Edit image", { exact: true })
        .boundingBox();
      await touchDrag(
        cdp,
        { x: title.x + title.width / 2, y: title.y + title.height / 2 },
        { x: title.x + title.width / 2 + 120, y: title.y + 330 },
      );
      await drawer.evaluate(async (el) => {
        await Promise.all(
          el.getAnimations().map((a) => a.finished.catch(() => {})),
        );
      });
      assert.equal(
        await drawer.isVisible(),
        true,
        "a diagonal body drag must not dismiss the editor",
      );
      const crop = drawer.locator(".reactEasyCrop_Container");
      await crop.waitFor();
      const box = await crop.boundingBox();
      await touchDrag(
        cdp,
        { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 },
        { x: box.x + box.width * 0.7, y: box.y + box.height * 0.7 },
      );
      assert.equal(
        await drawer.isVisible(),
        true,
        "crop gestures stay inside the editor",
      );
      const handle = await drawer
        .locator('[data-slot="drawer-swipe-handle"]')
        .boundingBox();
      await touchDrag(
        cdp,
        { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
        { x: handle.x + handle.width / 2, y: 830 },
      );
      await drawer.waitFor({ state: "hidden", timeout: 3000 });
    },
  );
  await check(
    "popover restores the Radix arrow-aware vertical gap",
    "/dev-base-ui-harness",
    async ({ page }) => {
      for (const [name, expected] of [
        ["Open popover", 9],
        ["Arrowless popover", 7],
        ["Custom offset popover", 13],
      ]) {
        const trigger = page.getByRole("button", { name, exact: true });
        await trigger.click();
        const popup = page.getByRole("dialog");
        await settle(popup);
        const anchor = await trigger.boundingBox();
        const box = await popup.boundingBox();
        const side = await popup.getAttribute("data-side");
        const gap =
          side === "top"
            ? anchor.y - box.y - box.height
            : box.y - anchor.y - anchor.height;
        assert.ok(
          Math.abs(gap - expected) < 1,
          `${name}: expected ${expected}px including arrow height, got ${gap}px`,
        );
        await page.keyboard.press("Escape");
        await popup.waitFor({ state: "hidden" });
      }
    },
  );
  await check(
    "mobile bookmark matches Share and Print widths",
    "/dev-virtualization-harness?fixture=bpm",
    async ({ page }) => {
      await page
        .locator('#devVirtualizationHarness[data-ready="true"]')
        .waitFor();
      const bookmark = page.getByRole("button", {
        name: "Bookmark toggle",
        exact: true,
      });
      await bookmark.waitFor();
      const widths = await Promise.all(
        [
          bookmark,
          page.getByRole("button", { name: "Share tab", exact: true }),
          page.getByRole("button", { name: "Print tab", exact: true }),
        ].map(async (el) => (await el.boundingBox()).width),
      );
      assert.ok(
        widths.every((width) => Math.abs(width - 40) < 1),
        `expected three 40px buttons, got ${widths}`,
      );
      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[aria-label="Bookmark toggle"]')
            ?.getBoundingClientRect().width === 144,
      );
      assert.ok(
        (await bookmark.innerText()).includes("Bookmark"),
        "desktop bookmark keeps its text and 144px width",
      );
    },
  );
  assert.deepEqual(failures, [], "mobile migration regressions");
} finally {
  await browser.close();
}
