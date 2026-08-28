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
const ICON_GAP_EPSILON_PX = 1;

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
  const groupIndex = Math.round(visualScrollX / 152);
  const distanceFromGroup = Math.abs(visualScrollX - groupIndex * 152);
  const nextLabel = [...stage.querySelectorAll("span")].some(
    (el) => el.textContent?.trim() === "Next",
  );
  const currentName = stage.querySelector('[data-current-group="true"]')
    ?.getAttribute("data-chord-name");
  const startPause = document.getElementById("chord-trainer-start-pause");
  const groups = [...stage.querySelectorAll("[data-group-index]")];
  const firstGroup = groups[0];
  const secondGroup = groups[1];
  const groupMarginRight = firstGroup
    ? Number.parseFloat(firstGroup.style.marginRight || "0")
    : null;
  const row = stage.querySelector("[data-strum-pattern-row]");
  const icons = row
    ? [...row.querySelectorAll("[data-strum-index]")]
    : [];
  const iconGap =
    icons[0] && icons[1]
      ? icons[1].getBoundingClientRect().left -
        icons[0].getBoundingClientRect().right
      : null;
  const rowGap = row ? window.getComputedStyle(row).columnGap : null;
  const playhead = stage.querySelector("[data-strum-playhead]");
  const playheadProgress = Number.parseFloat(
    playhead?.getAttribute("data-progress") ?? "0",
  );
  const playheadRect = playhead?.getBoundingClientRect();
  const rowRect = row?.getBoundingClientRect();
  const lowestGroupIndex = groups.reduce((lowest, group) => {
    const index = Number(group.getAttribute("data-group-index"));
    return Number.isFinite(index) ? Math.min(lowest, index) : lowest;
  }, Number.POSITIVE_INFINITY);

  return {
    ok: true,
    visualScrollX,
    groupIndex,
    distanceFromGroup,
    nextLabel,
    currentName,
    groupCount: groups.length,
    lowestGroupIndex: Number.isFinite(lowestGroupIndex)
      ? lowestGroupIndex
      : null,
    pastGroupCount: groups.filter((group) => {
      const index = Number(group.getAttribute("data-group-index"));
      return Number.isFinite(index) && index < groupIndex;
    }).length,
    groupMarginRight,
    groupGap:
      firstGroup && secondGroup
        ? secondGroup.getBoundingClientRect().left -
          firstGroup.getBoundingClientRect().right
        : null,
    iconGap,
    rowGap,
    playheadProgress,
    playheadX: playheadRect && rowRect ? playheadRect.left - rowRect.left : null,
    hasPlayhead: Boolean(playhead),
    played: [...stage.querySelectorAll("[data-strum-played]")].map(
      (el) => el.getAttribute("data-strum-played") === "true",
    ),
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
  initial.hasPlayhead,
  "strumming pattern has a vertical playhead",
);
assert(
  (initial.playheadProgress ?? 1) <= 0.02,
  `idle playhead starts at the beginning of the pattern (progress ${initial.playheadProgress})`,
);
assert(
  (initial.played?.length ?? 0) === 0,
  `strum icons no longer use opacity played markers (${JSON.stringify(initial.played)})`,
);
assert(
  (initial.groupCount ?? 0) >= 16,
  `enough chord groups are rendered for an infinite strip (got ${initial.groupCount})`,
);
assert(
  (initial.groupMarginRight ?? 99) <= 16,
  `chord group margin-right is tightened (got ${initial.groupMarginRight})`,
);
assert(
  (initial.iconGap ?? 99) <= ICON_GAP_EPSILON_PX,
  `strum icons have no gap between them (gap ${initial.iconGap})`,
);
assert(
  initial.rowGap === "0px" || initial.rowGap === "normal",
  `strum row has no CSS gap (got ${initial.rowGap})`,
);

await page.click("#chord-trainer-start-pause");
const midPattern = await waitForState(
  page,
  (state) =>
    state.buttonText.includes("Pause") &&
    state.groupIndex === 0 &&
    (state.playheadProgress ?? 0) >= 0.2,
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
  (midPattern.playheadProgress ?? 0) >= 0.2 &&
    (midPattern.playheadProgress ?? 1) < 1,
  `playhead advances across the pattern without sliding (${midPattern.playheadProgress})`,
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
  (afterPattern.playheadProgress ?? 1) < 0.35,
  `playhead resets near the start of the new pattern (${afterPattern.playheadProgress})`,
);

const afterSecondSlide = await waitForState(
  page,
  (state) => state.groupIndex >= 2 && state.distanceFromGroup <= PARK_EPSILON_PX,
  12000,
);
assert(
  afterSecondSlide.groupIndex >= 2,
  `strip advances again after the next pattern (group ${afterSecondSlide.groupIndex})`,
);
assert(
  (afterSecondSlide.lowestGroupIndex ?? 1) === 0,
  `earliest rendered group remains off to the left instead of unmounting (lowest ${afterSecondSlide.lowestGroupIndex})`,
);
assert(
  (afterSecondSlide.pastGroupCount ?? 0) >= 2,
  `at least two past chord groups stay mounted (${afterSecondSlide.pastGroupCount})`,
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
