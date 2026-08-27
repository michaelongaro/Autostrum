// End-to-end verification that patterned chord trainer playback
// parks the strip on a chord group and only slides after a pattern finishes.
//
// Usage:
//   1. start the dev server (npm run dev)
//   2. node scripts/verifyChordTrainerPatternScroll.mjs [baseURL]
//
// Exits non-zero if any assertion fails.

import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const PARK_EPSILON_PX = 1.5;

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

function readPatternState() {
  const slider = document.getElementById("chord-trainer-slider");
  const stage = document.getElementById("chord-trainer-pattern-visualizer");
  if (!slider || !stage) {
    return { ok: false, reason: "missing pattern slider/stage" };
  }

  const transform =
    slider.style.transform || window.getComputedStyle(slider).transform;
  const matrix = new DOMMatrix(transform);
  const translateX = matrix.m41;
  const baseOffset = stage.clientWidth / 2 - 136 / 2;
  const visualScrollX = baseOffset - translateX;
  const groupIndex = Math.round(visualScrollX / 176);
  const distanceFromGroup = Math.abs(visualScrollX - groupIndex * 176);
  const nextLabel = [...stage.querySelectorAll("span")].some(
    (el) => el.textContent?.trim() === "Next",
  );
  const played = [...stage.querySelectorAll("[data-strum-played]")].map(
    (el) => el.getAttribute("data-strum-played") === "true",
  );
  const currentName = stage.querySelector('[data-current-group="true"]')
    ?.getAttribute("data-chord-name");
  const startPause = document.getElementById("chord-trainer-start-pause");

  return {
    ok: true,
    visualScrollX,
    groupIndex,
    distanceFromGroup,
    nextLabel,
    played,
    currentName,
    groupCount: stage.querySelectorAll("[data-group-index]").length,
    buttonText: startPause?.textContent?.replace(/\s+/g, " ").trim() ?? "",
  };
}

async function readState(page) {
  return page.evaluate(readPatternState);
}

async function waitForState(page, predicate, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = await readState(page);

  while (Date.now() < deadline) {
    last = await readState(page);
    if (last.ok && predicate(last)) return last;
    await page.waitForTimeout(50);
  }

  return last;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
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
await page.click("#chord-trainer-strumming-pattern");
await page.getByRole("option", { name: "DDDD" }).click();
await page.waitForSelector("#chord-trainer-pattern-visualizer");
await page.waitForTimeout(300);

const initial = await readState(page);
assert(initial.ok, "pattern visualizer mounted");
assert(!initial.nextLabel, "Next label is not shown");
assert(
  initial.distanceFromGroup <= PARK_EPSILON_PX,
  `initial strip parks on a chord group (distance ${initial.distanceFromGroup?.toFixed?.(3)})`,
);
assert(initial.groupIndex === 0, `initial group is 0 (got ${initial.groupIndex})`);
assert(
  initial.played?.[0] === true && initial.played?.at(-1) === false,
  `idle strums are current/upcoming (${JSON.stringify(initial.played)})`,
);
assert(
  (initial.groupCount ?? 0) >= 3,
  `multiple aligned chord groups are rendered (got ${initial.groupCount})`,
);

await page.click("#chord-trainer-start-pause");
const midPattern = await waitForState(
  page,
  (state) =>
    state.buttonText.includes("Pause") &&
    state.groupIndex === 0 &&
    (state.played?.filter(Boolean).length ?? 0) >= 2,
);
assert(
  midPattern.buttonText.includes("Pause"),
  `playing button reads Pause (got "${midPattern.buttonText}")`,
);
assert(
  midPattern.groupIndex === 0 && midPattern.distanceFromGroup <= PARK_EPSILON_PX,
  `strip stays on group 0 during the pattern (group ${midPattern.groupIndex}, distance ${midPattern.distanceFromGroup?.toFixed?.(3)})`,
);
assert(
  (midPattern.played?.filter(Boolean).length ?? 0) >= 2,
  `played strum icons light up during the pattern (${JSON.stringify(midPattern.played)})`,
);

const afterPattern = await waitForState(
  page,
  (state) => state.groupIndex >= 1 && state.distanceFromGroup <= PARK_EPSILON_PX,
  10000,
);
assert(
  afterPattern.groupIndex >= 1,
  `strip advances to the next chord after the pattern (group ${afterPattern.groupIndex})`,
);
assert(
  afterPattern.distanceFromGroup <= PARK_EPSILON_PX,
  `next chord parks in the center (distance ${afterPattern.distanceFromGroup?.toFixed?.(3)})`,
);
assert(
  afterPattern.played?.[0] === true &&
    (afterPattern.played?.filter(Boolean).length ?? 0) <= 2,
  `strum progress resets on the new chord (${JSON.stringify(afterPattern.played)})`,
);

await page.click("#chord-trainer-start-pause");
await page.waitForTimeout(150);
const afterPause = await readState(page);
assert(
  afterPause.buttonText.includes("Start"),
  `paused button reads Start (got "${afterPause.buttonText}")`,
);
assert(
  afterPause.distanceFromGroup <= PARK_EPSILON_PX,
  `pause parks on the current chord group (distance ${afterPause.distanceFromGroup?.toFixed?.(3)}, group ${afterPause.groupIndex})`,
);

await browser.close();

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error(failures.map((failure) => ` - ${failure}`).join("\n"));
  process.exit(1);
}

console.log("verifyChordTrainerPatternScroll: all assertions passed");
