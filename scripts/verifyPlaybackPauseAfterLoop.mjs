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
const MOBILE_VIEWPORT = { width: 375, height: 667 };

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

function readScrollPx(transform) {
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
}

function getPlaybackSnapshot(page) {
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
        centerChordIndex: null,
        visibleIndices: [],
        viewportWidth: 0,
      };
    }

    const viewport = container.getBoundingClientRect();
    const centerX = viewport.left + viewport.width / 2;
    const chordNodes = [...strip.querySelectorAll('[data-testid="playback-chord"]')];

    const visibleIndices = [];
    let centerChordIndex = null;

    chordNodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const index = Number(node.getAttribute("data-chord-index") ?? "-1");
      const inViewport =
        rect.right > viewport.left + 8 &&
        rect.left < viewport.right - 8 &&
        rect.height > 0 &&
        rect.width > 0;

      if (inViewport && index >= 0) {
        visibleIndices.push(index);
      }

      if (
        rect.left <= centerX &&
        rect.right >= centerX &&
        rect.height > 0 &&
        rect.width > 0 &&
        index >= 0
      ) {
        centerChordIndex = index;
      }
    });

    return {
      ok: true,
      visible: visibleIndices.length,
      mounted: chordNodes.length,
      transform: strip.style.transform || getComputedStyle(strip).transform,
      centerChordIndex,
      visibleIndices,
      viewportWidth: viewport.width,
      currentChordIndex: window.__playbackHarness?.currentChordIndex ?? null,
      chordCount: window.__playbackHarness?.chordCount ?? 0,
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

async function playThroughFirstLoop(page) {
  await page.locator('[data-testid="playback-play-pause"]').click();
  await page.waitForFunction(() => window.__playbackHarness?.playing === true, {
    timeout: 10000,
  });
  await page.waitForFunction(
    () => window.__playbackHarness?.hasCompletedLoop === true,
    { timeout: 90000 },
  );
}

async function pauseViaHarness(page) {
  const result = await page.evaluate(async () => {
    const readScrollPx = (transform) => {
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

    const readStripScrollPosition = () => {
      const strip = document.querySelector(
        '[data-testid="playback-scroll-strip"]',
      );
      if (!strip) return 0;

      const transform = getComputedStyle(strip).transform;
      if (!transform || transform === "none") {
        return readScrollPx(strip.style.transform);
      }
      return readScrollPx(transform);
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

    return {
      prePauseScroll,
      postPauseScroll: readStripScrollPosition(),
    };
  });

  return result;
}

function assertHealthyMobilePause(snapshot, label) {
  const midpoint = snapshot.chordCount * 0.5;
  const earlyVisible = snapshot.visibleIndices.filter(
    (index) => index < midpoint,
  ).length;
  const lateOnlyCenter =
    snapshot.centerChordIndex !== null && snapshot.centerChordIndex >= midpoint;

  console.log(
    `  ${label}: visible=${snapshot.visible}/${snapshot.mounted}, centerIndex=${snapshot.centerChordIndex}, earlyVisible=${earlyVisible}, transform=${snapshot.transform}, viewport=${snapshot.viewportWidth}`,
  );

  assert(snapshot.ok, `${label}: playback strip present`);
  assert(
    Math.round(snapshot.viewportWidth) === MOBILE_VIEWPORT.width,
    `${label}: harness uses mobile viewport width (${snapshot.viewportWidth})`,
  );
  assert(
    snapshot.visible >= 3,
    `${label}: multiple chords visible after pause (got ${snapshot.visible})`,
  );
  assert(
    snapshot.centerChordIndex !== null,
    `${label}: center highlight has a chord after pause`,
  );
  assert(
    !lateOnlyCenter,
    `${label}: center chord is not from the tail half (index=${snapshot.centerChordIndex})`,
  );
  assert(
    earlyVisible >= 2,
    `${label}: early-tab chords visible after pause (got ${earlyVisible})`,
  );
}

async function testMobile375PauseAfterLoop(browser) {
  console.log(
    `\n--- mobile ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height} pause after loop ---`,
  );

  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  page.on("pageerror", (err) => {
    failures.push(`pageerror: ${err.message}`);
  });

  await openHarness(page);
  await initAudio(page);

  const beforePlay = await getPlaybackSnapshot(page);
  assert(
    beforePlay.centerChordIndex !== null,
    `chords occupy center before play (visible=${beforePlay.visible})`,
  );

  await playThroughFirstLoop(page);
  const { prePauseScroll, postPauseScroll } = await pauseViaHarness(page);
  const delta = Math.abs(postPauseScroll - prePauseScroll);

  assert(
    prePauseScroll > 300,
    `meaningful pre-pause scroll depth on mobile (${prePauseScroll}px)`,
  );
  assert(
    delta < 5,
    `mobile pause preserves strip position within 5px (delta=${delta}px)`,
  );

  const afterPause = await getPlaybackSnapshot(page);
  assertHealthyMobilePause(afterPause, "post-loop pause");

  await context.close();
}

async function testMobile375DoubleLoopPause(browser) {
  console.log(
    `\n--- mobile ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height} pause after two loops ---`,
  );

  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);
  await playThroughFirstLoop(page);

  await page.waitForFunction(
    () => (window.__playbackHarness?.currentChordIndex ?? 0) > 8,
    { timeout: 90000 },
  );

  const { prePauseScroll, postPauseScroll } = await pauseViaHarness(page);
  const delta = Math.abs(postPauseScroll - prePauseScroll);

  assert(
    delta < 5,
    `mobile double-loop pause preserves strip position (delta=${delta}px)`,
  );

  const afterPause = await getPlaybackSnapshot(page);
  assertHealthyMobilePause(afterPause, "double-loop pause");

  await context.close();
}

async function testMobile375ManualScrollAfterPause(browser) {
  console.log(
    `\n--- mobile ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height} manual scroll after pause ---`,
  );

  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);
  await playThroughFirstLoop(page);
  await pauseViaHarness(page);

  const strip = page.locator('[data-testid="playback-scrolling-container"]');
  const box = await strip.boundingBox();
  if (!box) {
    failures.push("could not get scrolling container bounds on mobile");
    await context.close();
    return;
  }

  for (let i = 0; i < 10; i++) {
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  const afterScroll = await getPlaybackSnapshot(page);
  assert(
    afterScroll.visible >= 3,
    `mobile chords visible after manual forward scroll (got ${afterScroll.visible})`,
  );
  assert(
    afterScroll.centerChordIndex !== null,
    "mobile center occupied after manual forward scroll",
  );

  await context.close();
}

async function testDesktopPauseAfterLoop(browser) {
  console.log("\n--- desktop pause after loop ---");

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page);
  await initAudio(page);
  await playThroughFirstLoop(page);

  const { prePauseScroll, postPauseScroll } = await pauseViaHarness(page);
  const delta = Math.abs(postPauseScroll - prePauseScroll);
  const afterPause = await getPlaybackSnapshot(page);

  console.log(
    `  desktop pause: delta=${delta}px visible=${afterPause.visible} center=${afterPause.centerChordIndex}`,
  );

  assert(delta < 5, `desktop pause preserves strip position (delta=${delta}px)`);
  assert(
    afterPause.visible >= 3,
    `desktop chords visible after pause (got ${afterPause.visible})`,
  );
  assert(
    afterPause.centerChordIndex !== null,
    "desktop center occupied after pause",
  );

  await context.close();
}

const browser = await chromium.launch();

try {
  for (let run = 1; run <= 3; run++) {
    console.log(`\n========== deterministic run ${run}/3 ==========`);
    await testMobile375PauseAfterLoop(browser);
    await testMobile375DoubleLoopPause(browser);
    await testMobile375ManualScrollAfterPause(browser);
    await testDesktopPauseAfterLoop(browser);
  }
  console.log(`\n${checks - failures.length}/${checks} checks passed`);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\nFAILED:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("ALL CHECKS PASSED");
