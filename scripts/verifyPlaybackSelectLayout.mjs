// npm run dev, then node scripts/verifyPlaybackSelectLayout.mjs [baseURL] [chromium|webkit]
// Uses local tab fixtures; all tRPC calls are fulfilled locally.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine));
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const failures = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
  ]);
  await context.route("**/api/trpc/**", (route) => {
    const url = new URL(route.request().url());
    const responses = url.pathname
      .split("/")
      .at(-1)
      .split(",")
      .map((name) => ({
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
        url.searchParams.get("batch") === "1" ? responses : responses[0],
      ),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${baseURL}/dev-virtualization-harness`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.addStyleTag({
    content:
      "nextjs-portal { display:none!important; } html { overflow-y:scroll; } ::-webkit-scrollbar { width:17px; }",
  });
  await page.locator('#devVirtualizationHarness[data-ready="true"]').waitFor();
  await page.locator("#sectionIndex0").scrollIntoViewIfNeeded();
  await page
    .locator("#stickyBottomControls")
    .getByRole("button", { name: "Play/Pause" })
    .click();
  await page.locator("#instrument").waitFor();
  await page.locator("#sectionPicker").waitFor();
  async function snapshot() {
    return page.evaluate(() => {
      const trigger = document.getElementById("instrument");
      const modal = trigger.closest('[tabindex="-1"]');
      const box = modal.getBoundingClientRect();
      return {
        htmlOverflow: getComputedStyle(document.documentElement).overflowY,
        bodyOverflow: getComputedStyle(document.body).overflowY,
        bodyWidth: document.body.clientWidth,
        viewportWidth: document.documentElement.clientWidth,
        scrollY,
        x: box.x,
        width: box.width,
      };
    });
  }
  for (const id of ["instrument", "loopDelay", "sectionPicker"]) {
    const before = await snapshot();
    await page.locator(`#${id}`).click();
    const list = page.getByRole("listbox");
    await list.waitFor();
    await list.evaluate(async (el) => {
      await Promise.all(
        el.parentElement.getAnimations().map((a) => a.finished.catch(() => {})),
      );
    });
    const after = await snapshot();
    try {
      assert.deepEqual(
        after,
        before,
        `${id} opening must preserve scrollbar/layout`,
      );
      console.log(`PASS ${id}: no scrollbar/layout changes`);
    } catch (error) {
      failures.push(error.message);
      console.error(`FAIL ${id}: ${JSON.stringify({ before, after })}`);
    }
    if (id === "loopDelay") {
      const layout = await page
        .getByRole("option", { name: "0 seconds", exact: true })
        .evaluate((el) => {
          const label = el.firstElementChild;
          const text = document.createRange();
          text.selectNodeContents(label);
          const mark = el.querySelector("svg").getBoundingClientRect();
          const rects = [...text.getClientRects()].filter((r) => r.width > 0);
          return {
            lines: new Set(rects.map((r) => r.top)).size,
            textRight: text.getBoundingClientRect().right,
            markLeft: mark.left,
            markRight: mark.right,
            itemRight: el.getBoundingClientRect().right,
            popupWidth: el.closest("[data-side]").getBoundingClientRect().width,
          };
        });
      try {
        assert.equal(layout.lines, 1, "loop-delay label fits on one line");
        assert.ok(
          layout.markLeft - layout.textRight >= 6,
          `checkmark has a separate column: ${JSON.stringify(layout)}`,
        );
        assert.ok(
          layout.markRight <= layout.itemRight,
          "checkmark stays within item",
        );
        console.log(
          `PASS loop-delay text/checkmark spacing (${layout.popupWidth}px popup)`,
        );
      } catch (error) {
        failures.push(error.message);
        console.error(`FAIL loop-delay layout: ${JSON.stringify(layout)}`);
      }
    }
    await page.keyboard.press("Escape");
    await list.waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("#instrument").isVisible(),
      true,
      "Escape dismisses only the select",
    );
  }
  await page.locator("#loopDelay").click();
  await page.getByRole("option", { name: "3 seconds", exact: true }).click();
  await page.getByRole("listbox").waitFor({ state: "hidden" });
  assert.equal((await page.locator("#loopDelay").innerText()).trim(), "3s");
  assert.equal(await page.locator("#instrument").isVisible(), true);
  assert.deepEqual(errors, [], "no browser runtime errors");
  assert.deepEqual(failures, [], "playback select regressions");
  console.log("PASS selection and Escape keep the playback modal open");
} finally {
  await browser.close();
}
