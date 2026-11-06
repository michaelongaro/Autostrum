// Start npm run dev, then:
// node scripts/verifyPlaybackModalScroll.mjs [baseURL] [chromium|webkit]
// Uses local scale exercises; does not publish tabs or write remote data.
import assert from "node:assert/strict";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const browser = await (engine === "webkit" ? webkit : chromium).launch();
try {
  for (const device of ["iPhone 13", "Pixel 7", "Desktop Chrome"]) {
    const context = await browser.newContext({ ...devices[device] });
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    await page.goto(`${baseURL}/tools/scales`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    const begin = page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasText: "Begin" });
    await begin.scrollIntoViewIfNeeded();
    await begin.click({ trial: true });
    const snapshot = () =>
      page.evaluate(() => ({
        body: document.body.style.cssText,
        html: document.documentElement.style.cssText,
        pinned: getComputedStyle(document.body).position === "fixed",
        noScroll: document.body.classList.contains("noScroll"),
        y: window.scrollY,
      }));
    const before = await snapshot();
    await begin.click();
    const modal = page.locator(".playbackModalGradient[tabindex='-1']");
    await modal.waitFor();
    assert.deepEqual(
      await snapshot(),
      before,
      `${device}: opening playback preserves page scrolling and styles`,
    );
    const wheel = (node, deltaY) => {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY,
      });
      node.dispatchEvent(event);
      return event.defaultPrevented;
    };
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      true,
      `${device}: background gestures are intercepted`,
    );
    const fullScreen = !device.startsWith("Desktop");
    if (fullScreen) {
      const box = await modal.boundingBox();
      const height = await page.evaluate(() => window.innerHeight);
      assert.ok(
        Math.abs(box.height - height) < 2 && Math.abs(box.y) < 2,
        `${device}: playback fills the dynamic viewport`,
      );
      await page
        .getByRole("button", { name: "Playback settings", exact: true })
        .click();
      const settings = page
        .getByRole("dialog")
        .filter({ has: page.getByText("Instrument", { exact: true }) });
      await settings.waitFor();
      const owned = await settings.evaluate((node) => {
        const scroller = document.createElement("div");
        scroller.style.cssText = "height:60px;overflow:auto;flex-shrink:0";
        scroller.innerHTML =
          '<div style="height:400px">Settings scroller</div>';
        node.append(scroller);
        scroller.scrollTop = 100;
        const move = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 30,
        });
        scroller.dispatchEvent(move);
        const canScroll = !move.defaultPrevented;
        scroller.scrollTop = scroller.scrollHeight;
        node.scrollTop = node.scrollHeight;
        const edge = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 30,
        });
        scroller.dispatchEvent(edge);
        scroller.remove();
        return { canScroll, edgeBlocked: edge.defaultPrevented };
      });
      assert.deepEqual(
        owned,
        { canScroll: true, edgeBlocked: true },
        `${device}: portaled playback controls can scroll without chaining`,
      );
      assert.deepEqual(
        await snapshot(),
        before,
        `${device}: opening settings does not pin the page`,
      );
      await page
        .getByRole("button", { name: "Playback settings", exact: true })
        .click();
      await settings.waitFor({ state: "hidden" });
    }
    await modal.getByRole("button", { name: "Close", exact: true }).click();
    await modal.waitFor({ state: "hidden" });
    assert.deepEqual(
      await snapshot(),
      before,
      `${device}: closing playback preserves page position`,
    );
    assert.equal(
      await page.locator("body").evaluate(wheel, 50),
      false,
      `${device}: gesture guard is removed`,
    );
    console.log(
      `PASS ${engine} ${device}: playback stays unpinned, gestures and cleanup work${fullScreen ? ", viewport and portaled settings work" : ""}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
