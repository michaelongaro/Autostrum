// End-to-end verification that chord trainer pause parks on a chord start.
//
// Usage:
//   1. start the dev server (npm run dev)
//   2. node scripts/verifyChordTrainerPauseSnap.mjs [baseURL]
//
// Exits non-zero if any assertion fails.

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const TOTAL_CHORD_WIDTH = 176;
const CHORD_ITEM_WIDTH = 136;
const PARK_EPSILON_PX = 0.75;

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

function getScrollState() {
  const slider = document.getElementById("chord-trainer-slider");
  const stage = slider?.parentElement;
  if (!slider || !stage) {
    return { ok: false, reason: "missing slider/stage" };
  }

  const transform = slider.style.transform || window.getComputedStyle(slider).transform;
  const matrix = new DOMMatrix(transform);
  const translateX = matrix.m41;
  const baseOffset = stage.clientWidth / 2 - 136 / 2;
  const scrollX = baseOffset - translateX;
  const chordIndex = Math.max(0, Math.floor(scrollX / 176 + 0.001));
  const chordStart = chordIndex * 176;
  const distanceFromStart = Math.abs(scrollX - chordStart);

  const startPause = document.getElementById("chord-trainer-start-pause");

  return {
    ok: true,
    translateX,
    scrollX,
    chordIndex,
    distanceFromStart,
    buttonText: startPause?.textContent?.replace(/\s+/g, " ").trim() ?? "",
  };
}

async function readState(page) {
  return page.evaluate(getScrollState);
}

async function waitUntilPlayingOffBoundary(page, { minChordIndex = 0 } = {}) {
  const deadline = Date.now() + 6000;
  let last = await readState(page);

  while (Date.now() < deadline) {
    last = await readState(page);
    if (
      last.ok &&
      last.buttonText.includes("Pause") &&
      last.chordIndex >= minChordIndex &&
      last.distanceFromStart > 24
    ) {
      return last;
    }
    await page.waitForTimeout(50);
  }

  return last;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addCookies([
  {
    name: "__clerk_db_jwt",
    value: "dev_browser_fake_jwt",
    url: BASE,
  },
]);
const page = await context.newPage();
page.on("pageerror", (err) => {
  failures.push(`pageerror: ${err.message}`);
});

await page.goto(`${BASE}/tools/chord-trainer`, { waitUntil: "networkidle" });
await page.waitForSelector("#chord-trainer-start-pause");
await page.waitForSelector("#chord-trainer-slider");
await page.waitForTimeout(400);

const initial = await readState(page);
assert(initial.ok, "slider mounted");
assert(
  initial.distanceFromStart <= PARK_EPSILON_PX,
  `initial park is on a chord start (distance ${initial.distanceFromStart?.toFixed?.(3)})`,
);
assert(
  initial.buttonText.includes("Start"),
  `idle button reads Start (got "${initial.buttonText}")`,
);

await page.click("#chord-trainer-start-pause");
const midPlay = await waitUntilPlayingOffBoundary(page, { minChordIndex: 1 });
assert(
  midPlay.buttonText.includes("Pause"),
  `playing button reads Pause (got "${midPlay.buttonText}")`,
);
assert(
  midPlay.distanceFromStart > 24,
  `while playing, strip is between chords (distance ${midPlay.distanceFromStart?.toFixed?.(3)})`,
);

await page.click("#chord-trainer-start-pause");
await page.waitForTimeout(120);
const afterPause = await readState(page);
assert(
  afterPause.buttonText.includes("Start"),
  `paused button reads Start (got "${afterPause.buttonText}")`,
);
assert(
  afterPause.distanceFromStart <= PARK_EPSILON_PX,
  `pause parks on current chord start (distance ${afterPause.distanceFromStart?.toFixed?.(3)}, index ${afterPause.chordIndex})`,
);
assert(
  afterPause.chordIndex === midPlay.chordIndex && afterPause.chordIndex >= 1,
  `pause keeps the current chord index (${midPlay.chordIndex} -> ${afterPause.chordIndex})`,
);

await page.click("#chord-trainer-start-pause");
const midPlayAgain = await waitUntilPlayingOffBoundary(page);
assert(
  midPlayAgain.distanceFromStart > 24,
  `second play leaves a chord boundary (distance ${midPlayAgain.distanceFromStart?.toFixed?.(3)})`,
);

await page.locator("#chord-trainer-bpm").click({ position: { x: 40, y: 4 } });
await page.waitForTimeout(150);
const afterBpm = await readState(page);
assert(
  afterBpm.buttonText.includes("Start"),
  `BPM change pauses playback (got "${afterBpm.buttonText}")`,
);
assert(
  afterBpm.distanceFromStart <= PARK_EPSILON_PX,
  `BPM change parks on a chord start (distance ${afterBpm.distanceFromStart?.toFixed?.(3)})`,
);

await page.click("#chord-trainer-start-pause");
await waitUntilPlayingOffBoundary(page);
await page.getByRole("button", { name: "Color-coded" }).click();
await page.waitForTimeout(150);
const afterColor = await readState(page);
assert(
  afterColor.buttonText.includes("Start"),
  `color-coding toggle pauses playback (got "${afterColor.buttonText}")`,
);
assert(
  afterColor.distanceFromStart <= PARK_EPSILON_PX,
  `color-coding toggle parks on a chord start (distance ${afterColor.distanceFromStart?.toFixed?.(3)})`,
);

await page.click("#chord-trainer-start-pause");
await waitUntilPlayingOffBoundary(page);
await page.locator("#chordTrainerInstrument").click();
await page.getByRole("option", { name: "Acoustic - Nylon" }).click();
await page.waitForTimeout(150);
const afterInstrument = await readState(page);
assert(
  afterInstrument.buttonText.includes("Start"),
  `instrument change pauses playback (got "${afterInstrument.buttonText}")`,
);
assert(
  afterInstrument.distanceFromStart <= PARK_EPSILON_PX,
  `instrument change parks on a chord start (distance ${afterInstrument.distanceFromStart?.toFixed?.(3)})`,
);

await page.click("#chord-trainer-start-pause");
await waitUntilPlayingOffBoundary(page);
await page.locator(".grid button").nth(10).click();
await page.waitForTimeout(150);
const afterChordToggle = await readState(page);
assert(
  afterChordToggle.buttonText.includes("Start"),
  `selecting a chord pauses playback (got "${afterChordToggle.buttonText}")`,
);
assert(
  afterChordToggle.distanceFromStart <= PARK_EPSILON_PX,
  `selecting a chord parks on a chord start (distance ${afterChordToggle.distanceFromStart?.toFixed?.(3)})`,
);

await browser.close();

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error(failures.map((failure) => ` - ${failure}`).join("\n"));
  process.exit(1);
}

console.log("verifyChordTrainerPauseSnap: all assertions passed");
