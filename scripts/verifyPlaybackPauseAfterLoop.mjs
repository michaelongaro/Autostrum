// End-to-end verification of playback modal chord visibility after pausing
// shortly post-loop.
//
// Usage:
//   1. start the dev server (npm run dev)
//   2. node scripts/verifyPlaybackPauseAfterLoop.mjs [baseURL]
//
// Exits non-zero if chord visibility assertions fail.

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const HARNESS = `${BASE}/dev-playback-harness`;

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks++;
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function getVisibleChordSnapshot(page) {
  return page.evaluate(() => {
    const strip = document.querySelector(
      '[data-testid="playback-scroll-strip"]',
    );
    const container = strip?.parentElement;
    if (!strip || !container) {
      return {
        ok: false,
        visible: 0,
        mounted: 0,
        transform: null,
        centerOccupied: false,
      };
    }

    const viewport = container.getBoundingClientRect();
    const centerX = viewport.left + viewport.width / 2;
    const chordNodes = strip.querySelectorAll(
      '[data-testid="playback-chord"]',
    );

    let visible = 0;
    let centerOccupied = false;

    chordNodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const inViewport =
        rect.right > viewport.left + 8 &&
        rect.left < viewport.right - 8 &&
        rect.height > 0 &&
        rect.width > 0;

      if (inViewport) visible++;

      if (
        rect.left <= centerX &&
        rect.right >= centerX &&
        rect.height > 0 &&
        rect.width > 0
      ) {
        centerOccupied = true;
      }
    });

    return {
      ok: true,
      visible,
      mounted: chordNodes.length,
      transform: strip.style.transform || getComputedStyle(strip).transform,
      centerOccupied,
      viewportWidth: viewport.width,
    };
  });
}

async function openHarness(page) {
  await page.goto(HARNESS, { waitUntil: "networkidle" });
  await page.waitForSelector('#devPlaybackHarness[data-ready="true"]', {
    timeout: 30000,
  });
  await page.waitForSelector('[data-testid="playback-scroll-strip"]', {
    timeout: 30000,
  });
}

async function initAudio(page) {
  await page.click("body");
  await page.waitForSelector('[data-testid="playback-play-pause"]:not([disabled])', {
    timeout: 30000,
  });
}

async function waitForLoopCompletion(page) {
  await page.waitForFunction(
    () => window.__playbackHarness?.hasCompletedLoop === true,
    { timeout: 90000 },
  );

  // shortly after loop boundary
  await page.waitForTimeout(400);
}

async function testPauseAfterLoop(browser) {
  console.log("\n--- pause shortly after loop completion ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  page.on("pageerror", (err) => {
    failures.push(`pageerror: ${err.message}`);
  });

  await openHarness(page);
  await initAudio(page);

  const chordCount = await page.evaluate(
    () => window.__playbackHarness?.chordCount ?? 0,
  );
  assert(chordCount > 20, `harness tab has enough chords (${chordCount})`);

  const beforePlay = await getVisibleChordSnapshot(page);
  assert(
    beforePlay.centerOccupied,
    `chords occupy center before play (visible=${beforePlay.visible})`,
  );

  const playButton = page.locator('[data-testid="playback-play-pause"]');
  await playButton.click();

  await page.waitForFunction(
    () => window.__playbackHarness?.playing === true,
    { timeout: 10000 },
  );

  await waitForLoopCompletion(page);

  await playButton.click();

  await page.waitForFunction(
    () => window.__playbackHarness?.playing === false,
    { timeout: 10000 },
  );
  await page.waitForTimeout(300);

  const afterPause = await getVisibleChordSnapshot(page);
  console.log(
    `  snapshot after pause: visible=${afterPause.visible}/${afterPause.mounted}, transform=${afterPause.transform}`,
  );

  assert(
    afterPause.ok,
    "playback strip is present after pause",
  );
  assert(
    afterPause.visible >= 3,
    `multiple chords visible after pause (got ${afterPause.visible})`,
  );
  assert(
    afterPause.centerOccupied,
    "center highlight region has a visible chord after pause",
  );

  await context.close();
}

async function getStripScrollPosition(page) {
  return page.evaluate(() => {
    const strip = document.querySelector(
      '[data-testid="playback-scroll-strip"]',
    );
    if (!strip) return null;

    const transform =
      strip.style.transform || getComputedStyle(strip).transform;
    if (!transform || transform === "none") return 0;

    if (transform.startsWith("matrix")) {
      const parts = transform
        .replace("matrix(", "")
        .replace("matrix3d(", "")
        .replace(")", "")
        .split(",")
        .map((value) => Number(value.trim()));
      return Math.abs(parts[4] ?? 0);
    }

    const match = transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
    return match ? Math.abs(Number(match[1])) : 0;
  });
}

async function testPausePreservesStripPosition(browser) {
  console.log("\n--- pause preserves WAAPI strip position ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);

  const playButton = page.locator('[data-testid="playback-play-pause"]');
  await playButton.click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true);
  await page.waitForFunction(
    () => window.__playbackHarness?.hasCompletedLoop === true,
    { timeout: 90000 },
  );

  const { prePauseScroll, postPauseScroll } = await page.evaluate(async () => {
    const readStripScrollPosition = () => {
      const strip = document.querySelector(
        '[data-testid="playback-scroll-strip"]',
      );
      if (!strip) return 0;

      const transform =
        strip.style.transform || getComputedStyle(strip).transform;
      if (!transform || transform === "none") return 0;

      if (transform.startsWith("matrix")) {
        const parts = transform
          .replace("matrix(", "")
          .replace("matrix3d(", "")
          .replace(")", "")
          .split(",")
          .map((value) => Number(value.trim()));
        return Math.abs(parts[4] ?? 0);
      }

      const match = transform.match(/translateX\((-?\d+(?:\.\d+)?)px\)/);
      return match ? Math.abs(Number(match[1])) : 0;
    };

    const prePauseScroll = readStripScrollPosition();
    window.__playbackHarness?.pause();

    await new Promise((resolve) => {
      const startedAt = performance.now();
      const waitUntilPaused = () => {
        if (
          !window.__playbackHarness?.playing ||
          performance.now() - startedAt > 2000
        ) {
          resolve(undefined);
          return;
        }
        requestAnimationFrame(waitUntilPaused);
      };
      waitUntilPaused();
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    const postPauseScroll = readStripScrollPosition();

    return { prePauseScroll, postPauseScroll };
  });

  const delta = Math.abs(postPauseScroll - prePauseScroll);

  console.log(
    `  scroll position pre-pause=${prePauseScroll}px post-pause=${postPauseScroll}px delta=${delta}px`,
  );

  assert(
    prePauseScroll > 500,
    `meaningful pre-pause scroll depth (${prePauseScroll}px)`,
  );
  assert(
    delta < 5,
    `pause preserves strip position within 5px (delta=${delta}px)`,
  );

  await context.close();
}

async function testStartOfTabChordsVisibleAfterPause(browser) {
  console.log("\n--- start-of-tab chords visible after pause (not only tail) ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);

  const chordCount = await page.evaluate(
    () => window.__playbackHarness?.chordCount ?? 0,
  );

  await page.locator('[data-testid="playback-play-pause"]').click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true);
  await waitForLoopCompletion(page);
  await page.locator('[data-testid="playback-play-pause"]').click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === false);
  await page.waitForTimeout(300);

  const distribution = await page.evaluate(() => {
    const strip = document.querySelector(
      '[data-testid="playback-scroll-strip"]',
    );
    const container = strip?.parentElement;
    if (!strip || !container) {
      return { ok: false, earlyVisible: 0, lateVisible: 0 };
    }

    const viewport = container.getBoundingClientRect();
    const chordNodes = strip.querySelectorAll('[data-testid="playback-chord"]');
    let earlyVisible = 0;
    let lateVisible = 0;
    const midpoint = chordNodes.length / 2;

    chordNodes.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      const inViewport =
        rect.right > viewport.left + 8 &&
        rect.left < viewport.right - 8 &&
        rect.height > 0 &&
        rect.width > 0;

      if (!inViewport) return;
      if (index < midpoint) earlyVisible++;
      else lateVisible++;
    });

    return { ok: true, earlyVisible, lateVisible, midpoint };
  });

  console.log(
    `  visible chord distribution: early=${distribution.earlyVisible}, late=${distribution.lateVisible}`,
  );

  assert(distribution.ok, "could read visible chord distribution");
  assert(
    distribution.earlyVisible >= 2,
    `early-tab chords visible after pause (got ${distribution.earlyVisible})`,
  );

  await context.close();
}

async function testPauseAtLoopBoundary(browser) {
  console.log("\n--- pause at last chord before store loop reset ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);

  const chordCount = await page.evaluate(
    () => window.__playbackHarness?.chordCount ?? 0,
  );

  const playButton = page.locator('[data-testid="playback-play-pause"]');
  await playButton.click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true);

  await page.waitForFunction(
    (count) => (window.__playbackHarness?.currentChordIndex ?? 0) > count * 0.85,
    chordCount,
    { timeout: 90000 },
  );

  const prePauseScroll = await getStripScrollPosition(page);
  await playButton.click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === false);
  await page.waitForTimeout(200);

  const postPauseScroll = await getStripScrollPosition(page);
  const afterPause = await getVisibleChordSnapshot(page);
  const delta = Math.abs(postPauseScroll - prePauseScroll);

  console.log(
    `  boundary pause: pre=${prePauseScroll}px post=${postPauseScroll}px delta=${delta}px visible=${afterPause.visible}`,
  );

  assert(
    afterPause.visible >= 3,
    `chords visible when pausing near loop end (got ${afterPause.visible})`,
  );
  assert(
    afterPause.centerOccupied,
    "center occupied when pausing near loop end",
  );
  assert(
    delta <= 40,
    `strip position stable when pausing near loop end (delta=${delta}px)`,
  );

  await context.close();
}

async function testPauseImmediatelyAfterLoopReset(browser) {
  console.log("\n--- pause immediately after loop reset (split repetitions) ---");

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);

  const playButton = page.locator('[data-testid="playback-play-pause"]');
  await playButton.click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true);

  await page.waitForFunction(
    () => window.__playbackHarness?.hasCompletedLoop === true,
    { timeout: 90000 },
  );

  const prePauseScroll = await getStripScrollPosition(page);
  await playButton.click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === false);
  await page.waitForTimeout(100);

  const postPauseScroll = await getStripScrollPosition(page);
  const afterPause = await getVisibleChordSnapshot(page);
  const delta = Math.abs(postPauseScroll - prePauseScroll);

  console.log(
    `  mobile post-loop pause: pre=${prePauseScroll}px post=${postPauseScroll}px delta=${delta}px visible=${afterPause.visible}`,
  );

  assert(
    afterPause.visible >= 3,
    `mobile chords visible after post-loop pause (got ${afterPause.visible})`,
  );
  assert(
    afterPause.centerOccupied,
    "mobile center occupied after post-loop pause",
  );
  assert(
    delta < 5,
    `mobile strip position stable after post-loop pause (delta=${delta}px)`,
  );

  await context.close();
}

async function testManualScrollAfterPause(browser) {
  console.log("\n--- manual scroll still shows chords across the tab ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);

  const chordCount = await page.evaluate(
    () => window.__playbackHarness?.chordCount ?? 0,
  );

  await page.locator('[data-testid="playback-play-pause"]').click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true);
  await waitForLoopCompletion(page);
  await page.locator('[data-testid="playback-play-pause"]').click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === false);
  await page.waitForTimeout(300);

  const strip = page.locator('[data-testid="playback-scrolling-container"]');
  const box = await strip.boundingBox();
  if (!box) {
    failures.push("could not get scrolling container bounds");
    await context.close();
    return;
  }

  // swipe left repeatedly to advance through the tab
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  const afterScroll = await getVisibleChordSnapshot(page);
  assert(
    afterScroll.visible >= 3,
    `chords visible after manual forward scroll (got ${afterScroll.visible})`,
  );
  assert(
    afterScroll.centerOccupied,
    "center region occupied after manual forward scroll",
  );

  await context.close();
}

const browser = await chromium.launch();

try {
  await testPauseAfterLoop(browser);
  await testPausePreservesStripPosition(browser);
  await testStartOfTabChordsVisibleAfterPause(browser);
  await testPauseAtLoopBoundary(browser);
  await testPauseImmediatelyAfterLoopReset(browser);
  await testManualScrollAfterPause(browser);
  console.log(`\n${checks - failures.length}/${checks} checks passed`);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("ALL CHECKS PASSED");
