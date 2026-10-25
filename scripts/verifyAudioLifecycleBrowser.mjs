// Start npm run dev, then: node scripts/verifyAudioLifecycleBrowser.mjs [baseURL]
// Native Chromium contexts + fake microphone. No remote records are created.
import assert from "node:assert/strict";
import { chromium } from "playwright";

let debugPage;
let stage = "opening";
const baseURL = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ],
});
async function open(
  path,
  {
    holdSamples = false,
    holdCountIn = false,
    requireGestureUnlock = false,
  } = {},
) {
  const context = await browser.newContext({ permissions: ["microphone"] });
  if (holdSamples) {
    // Leave downloads pending instead of failing them: tools must not await them.
    await context.route(/\/sounds\/instruments\/|gleitz\.github\.io/, () => {});
  }
  if (holdCountIn) await context.route("**/sounds/countIn.wav", () => {});
  await context.addInitScript(
    ({ requireGestureUnlock }) => {
      // Headless wake-lock permissions are unrelated to audio recovery.
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: { request: async () => ({ release: async () => {} }) },
      });
      window.__audioContexts = [];
      window.__audioStarts = 0;
      window.__audioUnlocks = 0;
      window.__lockAudioContexts = [];
      window.__micStreams = [];
      window.__pendingMic = [];
      const Base = window.AudioContext;
      window.AudioContext = class extends Base {
        constructor(...args) {
          super(...args);
          window.__audioContexts.push(this);
          if (requireGestureUnlock) {
            let unlocked = false;
            const getTime = Object.getOwnPropertyDescriptor(
              BaseAudioContext.prototype,
              "currentTime",
            ).get;
            Object.defineProperty(this, "currentTime", {
              get: () => (unlocked ? getTime.call(this) : 0),
            });
            this.__unlockForTest = () => {
              unlocked = true;
            };
            window.__lockAudioContexts.push(() => {
              unlocked = false;
            });
          }
          for (const name of ["createOscillator", "createBufferSource"]) {
            const original = this[name].bind(this);
            this[name] = (...args) => {
              const node = original(...args);
              const start = node.start.bind(node);
              node.start = (...args) => {
                const isUnlockSource = node.buffer?.length === 1;
                if (!isUnlockSource) window.__audioStarts++;
                if (
                  requireGestureUnlock &&
                  isUnlockSource &&
                  navigator.userActivation.isActive
                ) {
                  this.__unlockForTest();
                  window.__audioUnlocks++;
                }
                return start(...args);
              };
              return node;
            };
          }
        }
      };
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (window.__audioHidden ? "hidden" : "visible"),
      });
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async (...args) => {
        const stream = await getUserMedia(...args);
        window.__micStreams.push(stream);
        if (window.__interruptOnMic)
          await window.__AUTOSTRUM_GET_TAB_STORE__().audioContext.suspend();
        if (window.__delayMic)
          return new Promise((resolve) =>
            window.__pendingMic.push(() => resolve(stream)),
          );
        return stream;
      };
    },
    { requireGestureUnlock },
  );
  const page = await context.newPage();
  debugPage = page;
  stage = path;
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("crash", () => console.error("Browser page crashed"));
  await page.goto(`${baseURL}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => window.__AUTOSTRUM_GET_TAB_STORE__?.().audioContext,
  );
  await page.getByRole("button").first().waitFor();
  return { context, page, errors };
}
const button = (page, name) =>
  page
    .getByRole("button")
    .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) })
    .first();
async function background(page, hidden) {
  await page.evaluate((hidden) => {
    window.__audioHidden = hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}
try {
  {
    const { context, page, errors } = await open("/tools/scales", {
      requireGestureUnlock: true,
    });
    await page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasText: "Begin" })
      .click();
    const play = page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasNotText: "Begin" })
      .first();
    await play.waitFor();
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().setCountInTimerEnabled(false),
    );
    await play.click();
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().audioMetadata.playing,
    );
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().currentChordIndex > 0,
    );
    await play.click();
    assert.ok(await page.evaluate(() => window.__audioUnlocks > 0));
    // Model a foregrounded Safari graph that reports running but needs another
    // source started in a tap. Lock every replacement too, so recreation alone
    // cannot hide the original repeated-Play failure.
    const before = await page.evaluate(() => {
      window.__lockAudioContexts.forEach((lock) => lock());
      return window.__audioUnlocks;
    });
    await background(page, true);
    await background(page, false);
    await play.click();
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().audioMetadata.playing,
    );
    assert.ok(
      await page.evaluate((before) => window.__audioUnlocks > before, before),
    );
    await play.click();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: modal playback unlocks inside the first tap; a running-but-locked graph recovers on the next Play",
    );
  }
  {
    const { context, page, errors } = await open("/tools/metronome", {
      holdSamples: true,
    });
    await button(page, "Start").click();
    await button(page, "Stop").waitFor();
    assert.equal(
      await page.evaluate(
        () => window.__AUTOSTRUM_GET_TAB_STORE__().currentInstrument,
      ),
      null,
    );
    await page.waitForFunction(() => window.__audioStarts > 0);
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().audioContext.suspend(),
    );
    await button(page, "Start").waitFor();
    await button(page, "Start").click();
    await button(page, "Stop").waitFor();
    const before = await page.evaluate(() => window.__audioContexts.length);
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().audioContext.close(),
    );
    await button(page, "Start").waitFor();
    await button(page, "Start").click();
    await button(page, "Stop").waitFor();
    assert.equal(
      await page.evaluate(() => window.__audioContexts.length),
      before + 1,
    );
    await background(page, true);
    await button(page, "Start").waitFor();
    await background(page, false);
    assert.ok(await button(page, "Start").isVisible());
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: metronome ignores sample stalls; suspension, closure, replacement, and backgrounding stop cleanly",
    );
  }
  {
    const { context, page, errors } = await open("/tools/note-trainer", {
      holdSamples: true,
    });
    await button(page, "Play note").click();
    await page.waitForFunction(() => window.__audioStarts > 0);
    assert.equal(
      await page.evaluate(
        () => window.__AUTOSTRUM_GET_TAB_STORE__().currentInstrument,
      ),
      null,
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: generated note trainer plays while guitar samples are unavailable",
    );
  }
  {
    const { context, page, errors } = await open("/tools/scales", {
      holdCountIn: true,
    });
    await page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasText: "Begin" })
      .click();
    const play = page
      .getByRole("button", { name: "Play/Pause", exact: true })
      .filter({ hasNotText: "Begin" })
      .first();
    await play.waitFor();
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().setCountInTimerEnabled(true),
    );
    await play.click();
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().countInTimer.showing,
    );
    await background(page, true);
    await background(page, false);
    await page.waitForTimeout(3200);
    assert.equal(
      await page.evaluate(
        () => window.__AUTOSTRUM_GET_TAB_STORE__().audioMetadata.playing,
      ),
      false,
    );
    assert.equal(
      await page.evaluate(
        () => window.__AUTOSTRUM_GET_TAB_STORE__().countInTimer.showing,
      ),
      false,
    );
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().setCountInTimerEnabled(false),
    );
    await play.click();
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().audioMetadata.playing,
    );
    await page.waitForFunction(
      () => window.__AUTOSTRUM_GET_TAB_STORE__().currentChordIndex > 0,
    );
    await play.click();
    assert.equal(
      await page.evaluate(
        () => window.__AUTOSTRUM_GET_TAB_STORE__().audioMetadata.playing,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: sampled tab playback advances; backgrounding cancels count-in and never revives its delayed start",
    );
  }
  {
    const { context, page, errors } = await open("/tuner");
    await page.evaluate(() => {
      window.__interruptOnMic = true;
    });
    await button(page, "Start").click();
    await button(page, "Stop").waitFor();
    assert.equal(
      await page.evaluate(() => window.__micStreams.length),
      1,
      "mic startup interruption must not cause reacquisition loops",
    );
    await page.evaluate(() => {
      window.__interruptOnMic = false;
    });
    await page.evaluate(() =>
      window.__AUTOSTRUM_GET_TAB_STORE__().audioContext.close(),
    );
    await button(page, "Start").waitFor();
    await button(page, "Start").click();
    await button(page, "Stop").waitFor();
    assert.equal(
      await page.evaluate(
        () => window.__micStreams[0].getAudioTracks()[0].readyState,
      ),
      "ended",
    );
    await button(page, "Stop").click();
    await button(page, "Start").waitFor();
    await page.evaluate(() => {
      window.__delayMic = true;
    });
    await button(page, "Start").click();
    await page.waitForFunction(() => window.__pendingMic.length === 1);
    await background(page, true);
    await page.evaluate(() => window.__pendingMic.shift()());
    await page.waitForFunction(
      () =>
        window.__micStreams.at(-1).getAudioTracks()[0].readyState === "ended",
    );
    await page.evaluate(() => {
      window.__delayMic = false;
    });
    await background(page, false);
    await button(page, "Stop").waitFor();
    await button(page, "Stop").click();
    await button(page, "Start").waitFor();
    assert.deepEqual(errors, []);
    assert.ok(
      await page.evaluate(() =>
        window.__micStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
    );
    await context.close();
    console.log(
      "PASS: tuner rebuilds its mic graph after replacement; late permission streams are released; foreground intent recovers",
    );
  }
} catch (error) {
  console.error(
    "Failed browser stage:",
    stage,
    await debugPage?.locator("body").innerText(),
    await debugPage?.getByRole("button").allTextContents(),
  );
  throw error;
} finally {
  await browser.close();
}
