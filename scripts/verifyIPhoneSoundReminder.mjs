// Start npm run dev, then run:
// node scripts/verifyIPhoneSoundReminder.mjs [baseURL] [chromium|webkit]
// Uses local tool pages and homepage demos; creates no remote data.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
assert.ok(["chromium", "webkit"].includes(engine), "Unsupported engine");
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const preferenceKey = "autostrum-iphone-sound-reminder-dismissed:v1";
const screenshots = path.join(os.tmpdir(), "autostrum-iphone-audio", engine);
await mkdir(screenshots, { recursive: true });

async function openPage(device, options = {}) {
  const context = await browser.newContext({
    ...(device ? devices[device] : { viewport: { width: 1280, height: 800 } }),
    ...options,
  });
  // Same dev-only Clerk handshake bypass as verifyStaticTabVirtualization.mjs.
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
  ]);
  await context.addInitScript(() => {
    window.audioStarts = 0;
    for (const type of [OscillatorNode, AudioBufferSourceNode]) {
      const original = type.prototype.start;
      type.prototype.start = function (...args) {
        window.audioStarts++;
        return original.apply(this, args);
      };
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/tools/note-trainer`);
  return { context, page, errors };
}

const reminder = (page) =>
  page.getByRole("dialog", { name: "Turn off Silent Mode", exact: true });
const play = (page) =>
  page.getByRole("button", { name: "Play/Pause", exact: true }).first();
const starts = (page) => page.evaluate(() => window.audioStarts);
const waitForAudio = (page, previous = 0) =>
  page.waitForFunction((count) => window.audioStarts > count, previous);

try {
  for (const device of [undefined, "Pixel 7", "iPad Mini"]) {
    const { context, page, errors } = await openPage(device);
    await play(page).click();
    await waitForAudio(page);
    assert.equal(await reminder(page).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${device ?? "desktop"}: playback has no reminder`);
  }

  {
    const { context, page, errors } = await openPage("iPhone 13");
    assert.equal(await reminder(page).count(), 0, "No reminder before play");
    await play(page).click();
    await reminder(page).waitFor();
    assert.equal(await starts(page), 0, "First play waits for dismissal");
    assert.ok(
      await reminder(page).evaluate((el) =>
        el.contains(document.activeElement),
      ),
      "Focus moves into the reminder",
    );
    await page.waitForTimeout(350);
    assert.equal(
      await page
        .locator("[data-silent-mode-icon]")
        .evaluate((el) => getComputedStyle(el).color),
      "rgb(255, 59, 48)",
      "The silent bell starts red",
    );
    assert.equal(
      await page
        .locator("[data-silent-mode-slash]")
        .evaluate((el) => getComputedStyle(el).opacity),
      "1",
      "The silent bell starts crossed out",
    );
    await page.screenshot({
      path: path.join(screenshots, "silent-mode-on.png"),
    });
    await page
      .locator("[data-silent-mode-icon]")
      .evaluate((el) =>
        Promise.all(el.getAnimations().map((animation) => animation.finished)),
      );
    assert.ok(
      await page
        .locator("[data-silent-mode-icon]")
        .evaluate(
          (el) =>
            getComputedStyle(el).color ===
            getComputedStyle(el.parentElement).color,
        ),
      "The unmuted bell uses the foreground color",
    );
    assert.equal(
      await page
        .locator("[data-silent-mode-slash]")
        .evaluate((el) => getComputedStyle(el).opacity),
      "0",
      "The unmuted bell has no slash",
    );
    await page.screenshot({
      path: path.join(screenshots, "silent-mode-off.png"),
    });
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await reminder(page).evaluate((el) =>
          el.contains(document.activeElement),
        ),
        "Keyboard focus stays in the Drawer",
      );
    }
    await reminder(page)
      .getByRole("button", { name: "Got it", exact: true })
      .click();
    await reminder(page).waitFor({ state: "hidden" });
    assert.equal(await starts(page), 0, "Dismissal does not autoplay");
    await play(page).click();
    await waitForAudio(page);
    assert.equal(
      await reminder(page).count(),
      0,
      "Retry does not prompt again",
    );

    await page.evaluate(() => window.next.router.push("/tools/metronome"));
    await page.waitForURL("**/tools/metronome");
    const beforeMetronome = await starts(page);
    await play(page).click();
    await waitForAudio(page, beforeMetronome);
    assert.equal(
      await reminder(page).count(),
      0,
      "Navigation preserves dismissal",
    );

    await page.reload();
    await play(page).click();
    await reminder(page).waitFor();
    await reminder(page)
      .getByRole("button", { name: "Do not show this again", exact: true })
      .click();
    await reminder(page).waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), preferenceKey),
      "true",
    );
    await page.reload();
    await play(page).click();
    await waitForAudio(page);
    assert.equal(await reminder(page).count(), 0, "Opt-out survives reload");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS iPhone: first play, focus, animation, retry, navigation, persistent opt-out",
    );
  }

  {
    const { context, page, errors } = await openPage("iPhone SE", {
      reducedMotion: "reduce",
    });
    await page.evaluate((key) => {
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (name) {
        if (name === key)
          throw new DOMException("Storage blocked", "SecurityError");
        return getItem.call(this, name);
      };
      Storage.prototype.setItem = function (name, value) {
        if (name === key)
          throw new DOMException("Storage full", "QuotaExceededError");
        return setItem.call(this, name, value);
      };
    }, preferenceKey);
    await play(page).click();
    await reminder(page).waitFor();
    const animation = await page
      .locator("[data-silent-mode-icon]")
      .evaluate((el) => ({
        name: getComputedStyle(el).animationName,
        color: getComputedStyle(el).color,
        foreground: getComputedStyle(el.parentElement).color,
      }));
    assert.equal(animation.name, "none");
    assert.equal(animation.color, animation.foreground);
    assert.equal(
      await page
        .locator("[data-silent-mode-slash]")
        .evaluate((el) => getComputedStyle(el).opacity),
      "0",
    );
    const optOut = reminder(page).getByRole("button", {
      name: "Do not show this again",
      exact: true,
    });
    await optOut.scrollIntoViewIfNeeded();
    assert.ok(
      await optOut.evaluate(
        (el) => el.getBoundingClientRect().bottom <= innerHeight,
      ),
      "Opt-out remains reachable on a small portrait screen",
    );
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await page.screenshot({
      path: path.join(screenshots, "small-dark-reduced-motion.png"),
    });
    await page.setViewportSize({ width: 667, height: 375 });
    await page.screenshot({ path: path.join(screenshots, "landscape.png") });
    await optOut.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: path.join(screenshots, "landscape-controls.png"),
    });
    await optOut.click();
    await reminder(page).waitFor({ state: "hidden" });
    await play(page).click();
    await waitForAudio(page);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS reduced motion, small/landscape layouts, blocked storage dismissal",
    );
  }

  {
    const { context, page, errors } = await openPage("iPhone 13");
    await page.goto(baseURL);
    const carousel = page.getByRole("region", { name: /^Practice features/ });
    await carousel.focus();
    await carousel.press("ArrowRight");
    await carousel.press("ArrowRight");
    await page
      .locator('[data-feature-demo="speed"]')
      .getByRole("button", { name: "Play example", exact: true })
      .click();
    await reminder(page).waitFor();
    assert.equal(
      await starts(page),
      0,
      "Independent demo waits for the shared reminder",
    );
    await page.keyboard.press("Escape");
    await reminder(page).waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS independent homepage demo and Escape dismissal");
  }
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
