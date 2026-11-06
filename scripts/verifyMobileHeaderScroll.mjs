// Start npm run dev, then:
// node scripts/verifyMobileHeaderScroll.mjs [baseURL] [chromium|webkit]
// Uses a local fixture and anonymous navigation; writes no remote data.
import assert from "node:assert/strict";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const browser = await (engine === "webkit" ? webkit : chromium).launch();
try {
  for (const device of ["iPhone SE", "Pixel 7"]) {
    const context = await browser.newContext({
      ...devices[device],
      // A short viewport exercises overflow even on taller Android devices.
      viewport: { width: devices[device].viewport.width, height: 667 },
    });
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    await page.goto(`${baseURL}/dev-base-ui-harness`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator('[data-testid="base-ui-harness"][data-ready="true"]')
      .waitFor();
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    await page.evaluate(() => {
      document.body.style.minHeight = "3000px";
      window.scrollTo({ top: 250, behavior: "instant" });
    });
    const toggle = page.getByRole("button", {
      name: "Toggle navigation menu",
      exact: true,
    });
    const menu = page.locator('[data-slot="mobile-header-menu"]');
    const backdrop = page.locator('[data-slot="mobile-header-backdrop"]');
    await toggle.click({ trial: true });
    const snapshot = () =>
      page.evaluate(() => ({
        body: document.body.style.cssText,
        html: document.documentElement.style.cssText,
        y: window.scrollY,
      }));
    const wheel = (node, deltaY) => {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY,
      });
      node.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const before = await snapshot();
    await toggle.click();
    await menu.waitFor();
    assert.deepEqual(
      await snapshot(),
      before,
      `${device}: opening the header preserves page styles and position`,
    );
    assert.equal(
      await backdrop.evaluate(wheel, 50),
      true,
      `${device}: backdrop scrolling is intercepted`,
    );
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      true,
      `${device}: background scrolling is intercepted`,
    );

    // The theme accordion makes the real menu content overflow its viewport.
    await menu.locator("button[aria-expanded]").click();
    await menu.getByText("Color", { exact: true }).waitFor();
    await page.waitForFunction(() => {
      const trigger = document.querySelector(
        '[data-slot="mobile-header-menu"] button[aria-expanded="true"]',
      );
      const panel = document.getElementById(
        trigger.getAttribute("aria-controls"),
      );
      return (
        panel &&
        !panel.hasAttribute("data-starting-style") &&
        panel
          .getAnimations()
          .every((animation) => animation.playState === "finished")
      );
    });
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-slot="mobile-header-menu"]');
      return node.scrollHeight > node.clientHeight;
    });
    await menu.evaluate((node) => {
      node.scrollTop = 20;
    });
    assert.equal(
      await menu.evaluate(wheel, 30),
      false,
      `${device}: menu content can scroll`,
    );
    await menu.evaluate((node) => {
      node.scrollTop = 0;
    });
    assert.equal(
      await menu.evaluate(wheel, -30),
      true,
      `${device}: top edge cannot scroll the page`,
    );
    assert.equal(
      await menu.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
        const event = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 30,
        });
        node.dispatchEvent(event);
        return event.defaultPrevented;
      }),
      true,
      `${device}: bottom edge cannot scroll the page`,
    );

    if (engine === "chromium") {
      const cdp = await context.newCDPSession(page);
      async function swipe(x, y, deltaY) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 10; step++) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x, y: y + (deltaY * step) / 10 }],
          });
        }
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await menu.scrollIntoViewIfNeeded();
      await menu.evaluate((node) => {
        node.scrollTop = 20;
      });
      await swipe(180, 200, -60);
      assert.ok(
        await menu.evaluate((node) => node.scrollTop > 20),
        `${device}: native touch scrolls the menu`,
      );
      await menu.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await swipe(180, 200, -60);
      const height = page.viewportSize().height;
      await swipe(10, height - 15, -45);
      assert.deepEqual(
        await snapshot(),
        before,
        `${device}: native edge/backdrop swipes leave the page still`,
      );
      assert.equal(
        await menu.isVisible(),
        true,
        `${device}: a backdrop swipe does not dismiss the menu`,
      );
    }
    await toggle.click();
    if (await menu.count()) {
      assert.equal(
        await page.locator("body").evaluate(wheel, 50),
        true,
        `${device}: guard remains during exit animation`,
      );
    }
    await menu.waitFor({ state: "hidden" });
    await backdrop.waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      false,
      `${device}: closing removes the guard`,
    );
    assert.deepEqual(
      await snapshot(),
      before,
      `${device}: closing preserves page styles and position`,
    );

    await toggle.click();
    await menu.waitFor();
    const backdropBox = await backdrop.boundingBox();
    await backdrop.click({ position: { x: 5, y: backdropBox.height - 5 } });
    await menu.waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      false,
      `${device}: backdrop tap dismisses and cleans up`,
    );

    await toggle.click();
    await menu.waitFor();
    await page.setViewportSize({ width: 1280, height: 900 });
    await menu.waitFor({ state: "hidden" });
    await backdrop.waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      false,
      `${device}: desktop resize removes the guard and backdrop`,
    );
    console.log(
      `PASS ${engine} ${device}: header scrolling, edges, dismissal, exit cleanup and desktop resize${engine === "chromium" ? ", native touch" : ""}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
