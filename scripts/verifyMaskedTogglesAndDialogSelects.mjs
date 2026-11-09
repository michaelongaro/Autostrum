// Start npm run dev, then: node scripts/verifyMaskedTogglesAndDialogSelects.mjs [baseURL]
// Local fixtures only; no database reads or writes.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 1000 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    const page = await context.newPage();
    await page.route("**/api/trpc/*", (route) => {
      const url = new URL(route.request().url());
      const responses = url.pathname
        .split("/")
        .at(-1)
        .split(",")
        .map(() => ({ result: { data: { json: [] } } }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          url.searchParams.get("batch") === "1" ? responses : responses[0],
        ),
      });
    });
    await page.goto(`${baseURL}/dev-base-ui-harness`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator('[data-testid="base-ui-harness"][data-ready="true"]')
      .waitFor();
    await page.addStyleTag({
      content:
        "nextjs-portal { display:none!important; } html { overflow-y:scroll; } ::-webkit-scrollbar { width:17px; }",
    });

    const toggle = page.getByRole("group", { name: "Masked toggle fixture" });
    const auto = toggle.getByRole("button", { name: "Auto", exact: true });
    const manual = toggle.getByRole("button", { name: "Manual", exact: true });
    const beforeColor = await auto.evaluate((el) => getComputedStyle(el).color);
    await manual.click();
    const animation = await toggle.evaluate(async (el) => {
      await new Promise(requestAnimationFrame);
      const mask = el.querySelector("[data-layout-pill]");
      const slide = mask.getAnimations()[0];
      if (!slide) throw new Error("Missing mask slide animation");
      slide.pause();
      slide.currentTime = 125;
      const middle = getComputedStyle(mask).clipPath;
      slide.finish();
      return { middle, end: getComputedStyle(mask).clipPath };
    });
    assert.notEqual(
      animation.middle,
      animation.end,
      "mask interpolates as the highlight slides",
    );
    assert.equal(
      await auto.evaluate((el) => getComputedStyle(el).color),
      beforeColor,
      "base label never fades between colors",
    );
    assert.equal(await manual.getAttribute("aria-pressed"), "true");
    await toggle.evaluate((el) => {
      const buttons = [...el.querySelectorAll("button")];
      const mask = el.querySelector("[data-layout-pill]");
      const copies = [...mask.children];
      if (!mask.inert || mask.getAttribute("aria-hidden") !== "true")
        throw new Error(
          "Presentation copy must be inert and hidden from accessibility",
        );
      buttons.forEach((button, index) => {
        const actual = button.getBoundingClientRect();
        const copy = copies[index].getBoundingClientRect();
        if (
          Math.abs(actual.x - copy.x) > 0.5 ||
          Math.abs(actual.width - copy.width) > 0.5
        )
          throw new Error("Mask labels must align with unequal-width buttons");
      });
    });
    await manual.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(
      await auto.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Space");
    assert.equal(await auto.getAttribute("aria-pressed"), "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await manual.click();
    assert.equal(
      await toggle
        .locator("[data-layout-pill]")
        .evaluate((el) => getComputedStyle(el).transitionDuration),
      "0s",
    );

    for (const [openLabel, title, selectLabel] of [
      ["Open dialog", "Fixture dialog", "Nested select"],
      ["Open drawer", "Fixture drawer", "Drawer select"],
    ]) {
      await page.getByRole("button", { name: openLabel, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: title, exact: true });
      await dialog.waitFor();
      const select = dialog.getByRole("combobox", { name: selectLabel });
      await select.scrollIntoViewIfNeeded();
      // Finish entrance motion before comparing dialog geometry.
      await dialog.evaluate(async (el) => {
        await Promise.all(
          el
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const snapshot = () =>
        dialog.evaluate((el) => {
          const { x, width } = el.getBoundingClientRect();
          return {
            htmlStyle: document.documentElement.style.cssText,
            bodyStyle: document.body.style.cssText,
            viewportWidth: document.documentElement.clientWidth,
            bodyWidth: document.body.clientWidth,
            scrollY,
            x,
            width,
          };
        });
      const before = await snapshot();
      await select.click();
      await page.getByRole("listbox").waitFor();
      assert.deepEqual(
        await snapshot(),
        before,
        `${selectLabel}: opening must preserve page scrollbar and layout`,
      );
      await page.getByRole("option", { name: "Beta", exact: true }).click();
      assert.deepEqual(
        await snapshot(),
        before,
        `${selectLabel}: selecting must preserve page scrollbar and layout`,
      );
      await select.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    if (!mobile) {
      await page
        .getByRole("button", { name: "Open pinned tab modal", exact: true })
        .click();
      const select = page.getByRole("combobox", {
        name: "Sort by",
        exact: true,
      });
      await select.waitFor();
      await page.waitForFunction(
        () => !document.getElementById("sortBy").disabled,
      );
      const snapshot = () =>
        select.evaluate((el) => ({
          htmlStyle: document.documentElement.style.cssText,
          bodyStyle: document.body.style.cssText,
          viewportWidth: document.documentElement.clientWidth,
          x: el.getBoundingClientRect().x,
          scrollY,
        }));
      const before = await snapshot();
      await select.click();
      await page.getByRole("option", { name: "Newest", exact: true }).waitFor();
      assert.deepEqual(
        await snapshot(),
        before,
        "pinned tab select must preserve the page scrollbar",
      );
      await page.getByRole("option", { name: "Newest", exact: true }).click();
      assert.equal(await select.innerText(), "Newest");
      assert.deepEqual(
        await snapshot(),
        before,
        "pinned tab sorting must preserve page layout",
      );
      await select.press("Escape");
      await select.waitFor({ state: "hidden" });
    }
    console.log(
      `PASS ${mobile ? "touch/mobile" : "desktop"}: masked labels, keyboard controls, reduced motion, dialog and drawer selects`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
