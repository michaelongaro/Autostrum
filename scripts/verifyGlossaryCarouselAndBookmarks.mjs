// Start npm run dev, then: node scripts/verifyGlossaryCarouselAndBookmarks.mjs [baseURL]
// Uses local fixtures and mocked reads; never writes to the database.
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();

try {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 1280, height: 1000 },
  ]) {
    const mobile = viewport.width < 768;
    const context = await browser.newContext({
      viewport,
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
    // Other fixtures can overflow at 320px and inflate the mobile layout viewport.
    await page.addStyleTag({
      content:
        "nextjs-portal { display:none!important } html, body { overflow-x:clip }",
    });

    const fixture = page.getByTestId("glossary-bookmark-fixture");
    const bookmark = fixture.getByRole("button", { name: "Bookmark toggle" });
    const fill = bookmark.locator('span[style*="clip-path"]');
    for (const bookmarked of [true, false]) {
      await fixture
        .getByRole("button", { name: "Toggle bookmark visual" })
        .click();
      await expect(bookmark).toHaveAttribute(
        "aria-pressed",
        String(bookmarked),
      );
      const middle = await fill.evaluate(async (el) => {
        await new Promise(requestAnimationFrame);
        const animation = el.getAnimations()[0];
        if (!animation) throw new Error("Missing bookmark fill slide");
        animation.pause();
        animation.currentTime = 150;
        await new Promise(requestAnimationFrame);
        const style = getComputedStyle(el);
        const snapshot = { clipPath: style.clipPath, opacity: style.opacity };
        animation.finish();
        return snapshot;
      });
      assert.equal(middle.opacity, "1", "bookmark fill never crossfades");
      assert.match(middle.clipPath, /inset\(0(?:px|%) 0(?:px|%) [\d.]+%/);
      assert.notEqual(middle.clipPath, "inset(0px 0px 100%)");
      assert.notEqual(middle.clipPath, "inset(0px)");
      await expect(fill).toHaveCSS(
        "clip-path",
        bookmarked ? "inset(0px)" : "inset(0px 0px 100%)",
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(fill).toHaveCSS("transition-property", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const cdp = mobile ? await context.newCDPSession(page) : null;
    const touch = async (type, x, y) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
      await page.evaluate(() => new Promise(requestAnimationFrame));
    };

    for (const editing of [false, true]) {
      await fixture
        .getByRole("button", {
          name: editing ? "Open editing glossary" : "Open viewing glossary",
        })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Modifier Glossary",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await dialog.evaluate(async (el) => {
        await Promise.all(
          el.getAnimations().map((a) => a.finished.catch(() => {})),
        );
      });
      const modifiers = dialog.getByRole("button", {
        name: "Modifier Glossary",
        exact: true,
      });
      const notes = dialog.getByRole("button", {
        name: "Note Lengths",
        exact: true,
      });
      const carousel = dialog.getByRole("region", {
        name: "Modifier and note length glossary",
      });

      if (mobile) {
        await expect(carousel).toBeVisible();
        await expect(modifiers).toHaveAttribute("aria-pressed", "true");
        const bounds = await carousel.boundingBox();
        const firstButton = await modifiers.boundingBox();
        const secondButton = await notes.boundingBox();
        const indicator = carousel.locator(":scope > div:first-child > span");
        await expect
          .poll(async () => (await indicator.boundingBox()).width)
          .toBeCloseTo(firstButton.width, 0);

        const startX = bounds.x + bounds.width - 25;
        const y = bounds.y + 110;
        await touch("touchStart", startX, y);
        await touch("touchMove", startX - 30, y);
        await touch("touchMove", startX - 90, y);
        const duringDrag = await indicator.boundingBox();
        assert.ok(
          duringDrag.x > firstButton.x + 5,
          "indicator follows partial swipe",
        );
        assert.ok(
          duringDrag.x < secondButton.x - 5,
          "indicator does not jump to next tab",
        );
        assert.ok(
          duringDrag.width < firstButton.width &&
            duringDrag.width > secondButton.width,
        );
        await touch("touchMove", startX - 240, y);
        await touch("touchEnd", 0, 0);
        await expect(notes).toHaveAttribute("aria-pressed", "true");
        await expect
          .poll(async () => (await indicator.boundingBox()).x)
          .toBeCloseTo(secondButton.x, 0);
        await expect
          .poll(async () => (await indicator.boundingBox()).width)
          .toBeCloseTo(secondButton.width, 0);

        await touch("touchStart", bounds.x + 25, y);
        await touch("touchMove", bounds.x + 55, y);
        await touch("touchMove", bounds.x + 265, y);
        await touch("touchEnd", 0, 0);
        await expect(modifiers).toHaveAttribute("aria-pressed", "true");
        await expect
          .poll(async () => (await indicator.boundingBox()).x)
          .toBeCloseTo(firstButton.x, 0);

        // Narrow editing layouts must still scroll vertically through every modifier.
        if (editing) {
          const slide = carousel.getByRole("group", {
            name: "Modifier Glossary",
            exact: true,
          });
          assert.ok(
            await slide.evaluate((el) => el.scrollHeight > el.clientHeight),
          );
          const rect = await slide.boundingBox();
          await touch("touchStart", rect.x + 140, rect.y + 200);
          await touch("touchMove", rect.x + 140, rect.y + 160);
          await touch("touchMove", rect.x + 140, rect.y + 70);
          await touch("touchEnd", 0, 0);
          await expect
            .poll(() => slide.evaluate((el) => el.scrollTop))
            .toBeGreaterThan(0);
          await expect(modifiers).toHaveAttribute("aria-pressed", "true");
        }
        const dialogBounds = await dialog.boundingBox();
        assert.ok(dialogBounds.height <= viewport.height * 0.9 + 1);
      } else {
        await expect(carousel).toHaveCount(0);
        await expect(
          dialog.getByText("Note Modifiers", { exact: true }),
        ).toBeVisible();
      }

      await notes.click();
      await expect(
        dialog.getByText("Supported Note Lengths", { exact: true }),
      ).toBeVisible();
      if (!mobile)
        await expect(
          dialog.getByText("Note Modifiers", { exact: true }),
        ).toHaveCount(0);
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await expect(dialog).toBeHidden();
    }

    const noise = await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      const el = document.createElement("div");
      el.className = "heroScreenshotApp playbackModalGradient";
      document.body.append(el);
      const hero = getComputedStyle(el, "::after").opacity;
      el.className = "playbackModalGradient";
      const playback = getComputedStyle(el, "::after").opacity;
      el.remove();
      return { hero, playback };
    });
    assert.deepEqual(noise, { hero: "0.15", playback: "0.5" });
    console.log(
      `PASS ${viewport.width}px: bookmark fill, glossary navigation, and screenshot noise`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
