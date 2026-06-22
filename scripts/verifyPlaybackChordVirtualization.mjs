// End-to-end verification of playback chord virtualization after loop + pause.
//
// Usage:
//   1. start the dev server (npm run dev)
//   2. node scripts/verifyPlaybackChordVirtualization.mjs [baseURL]
//
// Exits non-zero if any assertion fails.

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

async function openHarness(page, query, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${HARNESS}?${query}`, { waitUntil: "networkidle" });
  await page.waitForSelector('#devPlaybackHarness[data-ready="true"]');
  await page.waitForTimeout(1000);
}

async function readHarnessState(page) {
  return page.evaluate(() => {
    const harness = window.__playbackHarness;
    if (!harness) return null;

    const strip = document.querySelector("[data-playback-strip]");
    const stripRect = strip?.parentElement?.getBoundingClientRect();
    const playheadX = stripRect
      ? stripRect.left + stripRect.width / 2
      : window.innerWidth / 2;

    const chordBoundingBoxes = harness.mountedChordIndices.map((index) => {
      const element = document.querySelector(
        `[data-testid="playback-chord-${index}"]`,
      );
      const rect = element?.getBoundingClientRect();
      return {
        index,
        left: rect?.left ?? -1,
        right: rect?.right ?? -1,
      };
    });

    return {
      ...harness,
      playheadX,
      chordBoundingBoxes,
    };
  });
}

async function testSplitRepDeadZone(browser, viewportName, viewport) {
  console.log(`\n--- split-rep dead zone viewport=${viewportName} ---`);

  const context = await browser.newContext({ viewport });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();
  page.on("pageerror", (err) => {
    failures.push(`pageerror: ${err.message}`);
  });

  await openHarness(page, "fixture=long&repState=split&chordIndex=0", viewport);
  const state = await readHarnessState(page);

  assert(state !== null, "window.__playbackHarness is available");
  if (!state) {
    await context.close();
    return;
  }

  assert(
    state.currentChordIndex === 0,
    `playhead at index 0 (got ${state.currentChordIndex})`,
  );
  assert(
    state.chordRepetitions[0] !== state.chordRepetitions.at(-1),
    "chord repetitions are split",
  );
  assert(
    state.mountedChordIndices.some(
      (index) => index >= state.virtualizationStartIndex,
    ),
    `mounted chords include tail indices >= virtualizationStartIndex (${state.virtualizationStartIndex})`,
  );

  const behindPlayhead = state.chordBoundingBoxes.filter(
    (box) => box.right > 0 && box.right <= state.playheadX + 4,
  );
  assert(
    behindPlayhead.length > 0,
    `at least one mounted chord is rendered behind the playhead (${behindPlayhead.length}, last=${state.chordBoundingBoxes.at(-1)?.right ?? "n/a"})`,
  );

  await context.close();
}

async function testUnifiedBaseline(browser, viewportName, viewport) {
  console.log(`\n--- unified reps baseline viewport=${viewportName} ---`);

  const context = await browser.newContext({ viewport });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(
    page,
    "fixture=long&repState=unified&chordIndex=50",
    viewport,
  );
  const state = await readHarnessState(page);

  assert(state !== null, "harness snapshot available for unified reps");
  if (!state) {
    await context.close();
    return;
  }

  assert(
    state.chordRepetitions[0] === state.chordRepetitions.at(-1),
    "chord repetitions are unified",
  );
  assert(
    state.mountedChordIndices.includes(50),
    "current chord index is mounted",
  );
  assert(
    state.mountedChordIndices.some((index) => index < 50) &&
      state.mountedChordIndices.some((index) => index > 50),
    "neighbors on both sides of the playhead are mounted",
  );

  await context.close();
}

async function testCatchupWindow(browser, viewportName, viewport) {
  console.log(`\n--- split reps at catchup index viewport=${viewportName} ---`);

  const context = await browser.newContext({ viewport });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page, "fixture=long&repState=split&chordIndex=0", viewport);
  const bootstrap = await readHarnessState(page);
  assert(bootstrap !== null, "bootstrap harness snapshot available");

  if (!bootstrap) {
    await context.close();
    return;
  }

  const catchupIndex = bootstrap.virtualizationCatchupIndex;
  await openHarness(
    page,
    `fixture=long&repState=split&chordIndex=${catchupIndex}`,
    viewport,
  );
  const state = await readHarnessState(page);

  assert(state !== null, "catchup harness snapshot available");
  if (!state) {
    await context.close();
    return;
  }

  assert(
    state.currentChordIndex === catchupIndex,
    `playhead at catchup index ${catchupIndex}`,
  );
  assert(
    state.mountedChordIndices.includes(catchupIndex),
    "catchup index chord is mounted",
  );
  assert(
    state.mountedChordCount > 0,
    `mounted chord count is nonzero (${state.mountedChordCount})`,
  );

  await context.close();
}

async function testPausedStripTransform(browser, viewportName, viewport) {
  console.log(`\n--- paused strip transform viewport=${viewportName} ---`);

  const context = await browser.newContext({ viewport });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();

  await openHarness(page, "fixture=long&repState=split&chordIndex=0", viewport);
  const state = await readHarnessState(page);

  assert(state !== null, "paused strip snapshot available");
  if (!state) {
    await context.close();
    return;
  }

  assert(
    typeof state.stripTransform === "string" &&
      state.stripTransform.startsWith("translateX("),
    `strip uses translateX while paused (${state.stripTransform})`,
  );

  await context.close();
}

const browser = await chromium.launch();

try {
  const desktop = { width: 1280, height: 800 };
  const mobile = { width: 390, height: 844 };

  for (const viewport of [
    ["desktop", desktop],
    ["mobile", mobile],
  ]) {
    const [name, size] = viewport;
    await testSplitRepDeadZone(browser, name, size);
    await testUnifiedBaseline(browser, name, size);
    await testCatchupWindow(browser, name, size);
    await testPausedStripTransform(browser, name, size);
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
