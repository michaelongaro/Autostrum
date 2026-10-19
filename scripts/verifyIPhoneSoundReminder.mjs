// Start npm run dev, then run:
// node scripts/verifyIPhoneSoundReminder.mjs [baseURL] [chromium|webkit] [device]
// Uses local practice/tool pages; creates no remote data.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, devices, webkit } from "playwright";

const baseURL = process.argv[2] ?? "http://localhost:3000";
const engine = process.argv[3] ?? "chromium";
const onlyDevice = process.argv[4];
assert.ok(["chromium", "webkit"].includes(engine), "Unsupported engine");
const browser = await (engine === "webkit" ? webkit : chromium).launch();
const probe = await browser.newPage();
const hasWebAudio = await probe.evaluate(
  () => typeof AudioContext === "function",
);
await probe.close();
if (!hasWebAudio) {
  await browser.close();
  throw new Error(
    `${engine} has no Web Audio support in this installation; use a browser build with Web Audio enabled.`,
  );
}
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
    // Headless browsers may deny screen wake locks; unrelated to drawer behavior.
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request: async () => ({ release: async () => {} }) },
    });
    window.audioSessionWrites = [];
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: {
        get type() {
          return "auto";
        },
        set type(value) {
          window.audioSessionWrites.push(value);
        },
      },
    });
    window.audioStarts = 0;
    const Context = window.AudioContext ?? window.webkitAudioContext;
    for (const method of ["createOscillator", "createBufferSource"]) {
      const original = Context.prototype[method];
      Context.prototype[method] = function (...args) {
        const node = original.apply(this, args);
        const start = node.start;
        node.start = function (...startArgs) {
          window.audioStarts++;
          return start.apply(this, startArgs);
        };
        return node;
      };
    }
    // Previous automatic-reminder preferences must not suppress manual help.
    localStorage.setItem(
      "autostrum-iphone-sound-reminder-dismissed:v1",
      "true",
    );
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/tools/scales`);
  try {
    await page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasText: "Begin" })
      .click();
  } catch (error) {
    console.error({
      url: page.url(),
      body: await page.locator("body").innerText(),
      errors,
    });
    throw error;
  }
  return { context, page, errors };
}

const drawer = (page) =>
  page.getByRole("dialog", { name: "No sound on iPhone?", exact: true });
const settings = (page) =>
  page.getByRole("button", {
    name: "Playback settings",
    exact: true,
    includeHidden: true,
  });
const help = (page) =>
  page.getByRole("button", { name: "No sound?", exact: true });
const settingsContent = (page) =>
  page.getByRole("dialog").filter({ has: help(page) });
const play = (page) =>
  page
    .getByRole("button", { name: "Play/Pause", exact: true })
    .filter({ hasNotText: "Begin" })
    .first();

async function openHelp(page, screenshotPath, useKeyboard = false) {
  await settings(page).click();
  await help(page).waitFor();
  await help(page).scrollIntoViewIfNeeded();
  assert.ok(
    await help(page).evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= innerHeight;
    }),
    "Help remains reachable inside the viewport",
  );
  if (screenshotPath) await page.screenshot({ path: screenshotPath });
  assert.equal(
    await help(page).evaluate(
      (el) => el.closest('[role="dialog"]').lastElementChild === el,
    ),
    true,
    "No sound is the last action in the settings popover",
  );
  const startsBeforeHelp = await page.evaluate(() => window.audioStarts);
  if (useKeyboard) await help(page).press("Space");
  else await help(page).click();
  try {
    await drawer(page).waitFor();
  } catch (error) {
    console.error(
      await page.evaluate(() => ({
        active: document.activeElement?.outerHTML,
        dialogs: [...document.querySelectorAll('[role="dialog"]')].map(
          (el) => el.textContent,
        ),
        starts: window.audioStarts,
      })),
    );
    await page.screenshot({
      path: path.join(screenshots, "failed-handoff.png"),
    });
    throw error;
  }
  assert.equal(
    await page.evaluate(() => window.audioStarts),
    startsBeforeHelp,
    "Opening help must not start playback",
  );
  assert.equal(
    await settingsContent(page).count(),
    0,
    "Settings closes before help opens",
  );
  assert.equal(await settings(page).getAttribute("data-state"), "closed");
  await page.waitForFunction(() => {
    const dialog = document.querySelector(
      '[data-vaul-drawer][data-state="open"]',
    );
    return dialog?.contains(document.activeElement);
  });
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Tab");
    assert.ok(
      await drawer(page).evaluate((el) => el.contains(document.activeElement)),
      "Focus stays inside help",
    );
  }
}

async function closeHelp(page, method = "button") {
  if (method === "escape") await page.keyboard.press("Escape");
  else
    await drawer(page)
      .getByRole("button", { name: "Got it", exact: true })
      .click();
  await drawer(page).waitFor({ state: "hidden" });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Playback settings",
  );
  assert.equal(
    await help(page).count(),
    0,
    "Settings stays closed after dismissal",
  );
}

try {
  for (const device of [undefined, "Pixel 7", "iPad Mini"]) {
    if (onlyDevice && onlyDevice !== (device ?? "desktop")) continue;
    const { context, page, errors } = await openPage(device);
    if (await settings(page).count()) {
      await settings(page).click();
      await page.getByText("Instrument", { exact: true }).waitFor();
    }
    assert.equal(
      await help(page).count(),
      0,
      "Help action is exclusive to iPhone",
    );
    assert.equal(await drawer(page).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `PASS ${device ?? "desktop"}: no iPhone help action or automatic drawer`,
    );
  }

  for (const [device, options] of [
    ["iPhone 13", {}],
    ["iPhone SE", { reducedMotion: "reduce" }],
    ["iPhone SE", { viewport: { width: 667, height: 375 } }],
  ]) {
    if (onlyDevice && onlyDevice !== device) continue;
    const { context, page, errors } = await openPage(device, options);
    assert.equal(
      await drawer(page).count(),
      0,
      "Opening playback never opens help",
    );
    await openHelp(
      page,
      path.join(
        screenshots,
        `${device.replaceAll(" ", "-")}-${options.viewport ? "landscape" : "portrait"}-settings.png`,
      ),
    );
    await page.screenshot({
      path: path.join(
        screenshots,
        `${device.replaceAll(" ", "-")}-${options.viewport ? "landscape" : "portrait"}.png`,
      ),
    });
    if (options.reducedMotion) {
      assert.equal(
        await page
          .locator("[data-silent-mode-icon]")
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
    }
    await closeHelp(page);
    await openHelp(page, undefined, true);
    await closeHelp(page, "escape");
    const before = await page.evaluate(() => window.audioStarts);
    await play(page).click();
    await page.waitForFunction((count) => window.audioStarts > count, before);
    assert.equal(
      await drawer(page).count(),
      0,
      "Playback does not automatically open help",
    );
    assert.deepEqual(
      await page.evaluate(() => window.audioSessionWrites),
      [],
      "Playback must not change the iOS audio-session category",
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      `PASS ${device}${options.viewport ? " landscape" : " portrait"}: manual open/reopen, focus handoff, dismissal, playback, no media-session override`,
    );
  }
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
