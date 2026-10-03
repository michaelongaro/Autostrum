/**
 * Long single-section editing tab should virtualize columns and still accept
 * note input + arrow-key focus.
 *
 * Usage:
 *   1. npm run dev
 *   2. node scripts/verifyEditingTabScale.mjs [baseURL]
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

function note(id) {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "eighth",
    id,
  };
}

function measureLine(id) {
  return {
    type: "measureLine",
    isInPalmMuteSection: false,
    bpmAfterLine: null,
    id,
  };
}

const MEASURES = 80;
const columns = [];
for (let measure = 0; measure < MEASURES; measure++) {
  for (let beat = 0; beat < 8; beat++) {
    columns.push(note(`n-${measure}-${beat}`));
  }
  if (measure < MEASURES - 1) {
    columns.push(measureLine(`m-${measure}`));
  }
}

const draft = {
  title: "Scale verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 120,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
  strummingPatterns: [],
  sectionProgression: [],
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: [
        {
          id: uuid(),
          type: "tab",
          bpm: -1,
          repetitions: 1,
          baseNoteLength: "eighth",
          data: columns,
        },
      ],
    },
  ],
};

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: {
    dir: ARTIFACT_DIR,
    size: { width: 1280, height: 800 },
  },
});
await context.addCookies([
  { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
]);
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (err) => pageErrors.push(err.message));

await page.addInitScript((data) => {
  localStorage.setItem("autostrum-tabData", JSON.stringify(data));
}, draft);

await page.goto(`${BASE}/create`, { waitUntil: "domcontentloaded" });

const staff = page.locator("[data-editing-tab-staff]");
await staff.waitFor({ timeout: 20000 });
await page.waitForFunction(
  () =>
    document
      .querySelector("[data-editing-tab-staff]")
      ?.getAttribute("data-editing-tab-virtualized") === "true",
  null,
  { timeout: 20000 },
);

const initial = await page.evaluate(() => {
  const store = window.__AUTOSTRUM_GET_TAB_STORE__?.().tabData ?? [];
  const columnCount = store[0]?.data?.[0]?.data?.length ?? 0;
  const mounted = document.querySelectorAll(
    '[id^="section0-subSection0-chord"]',
  ).length;
  return {
    columnCount,
    mounted,
    virtualized: document
      .querySelector("[data-editing-tab-staff]")
      ?.getAttribute("data-editing-tab-virtualized"),
  };
});
console.log("initial:", initial);
assert.ok(initial.columnCount > 500, `long section loaded (${initial.columnCount})`);
assert.equal(initial.virtualized, "true");
assert.ok(
  initial.mounted > 0 && initial.mounted < 220,
  `only a window of columns is mounted (${initial.mounted} of ${initial.columnCount})`,
);

const firstInput = page.locator("#input-0-0-0-1");
await firstInput.waitFor({ timeout: 10000 });
await firstInput.click();
await firstInput.fill("7");
await page.waitForTimeout(100);

const typed = await page.evaluate(() => {
  const column = window.__AUTOSTRUM_GET_TAB_STORE__?.().tabData?.[0]?.data?.[0]
    ?.data?.[0];
  return {
    value: document.querySelector("#input-0-0-0-1")?.value ?? "",
    firstString: column?.firstString ?? null,
  };
});
console.log("typed:", typed);
assert.equal(typed.value, "7");
assert.equal(typed.firstString, "7");

await page.screenshot({
  path: `${ARTIFACT_DIR}/editing-tab-virtualized-top.png`,
  fullPage: false,
});

await page.keyboard.press("ArrowRight");
await page.waitForTimeout(50);
const focusedAfterArrow = await page.evaluate(
  () => document.activeElement?.id ?? "",
);
console.log("focused after arrow:", focusedAfterArrow);
assert.ok(
  focusedAfterArrow.startsWith("input-0-0-1-"),
  `arrow moves to the next column (${focusedAfterArrow})`,
);

await page.evaluate(() => {
  const staffEl = document.querySelector("[data-editing-tab-staff]");
  staffEl?.scrollIntoView({ block: "end" });
  window.scrollTo(0, document.body.scrollHeight);
});
await page.waitForTimeout(200);

const afterScroll = await page.evaluate(() => {
  const mountedIds = [
    ...document.querySelectorAll('[id^="section0-subSection0-chord"]'),
  ].map((el) => el.id);
  const indexes = mountedIds.map((id) =>
    Number(id.replace("section0-subSection0-chord", "")),
  );
  indexes.sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] - indexes[i - 1] > 1) {
      gaps.push([indexes[i - 1], indexes[i]]);
    }
  }
  return {
    mounted: mountedIds.length,
    min: indexes[0],
    max: indexes[indexes.length - 1],
    hasFirst: mountedIds.includes("section0-subSection0-chord0"),
    gaps,
    scrollY: window.scrollY,
    staffTop: document
      .querySelector("[data-editing-tab-staff]")
      ?.getBoundingClientRect().top,
  };
});
console.log("after scroll:", afterScroll);
assert.ok(afterScroll.max > 400, `scrolled window reaches later columns (${afterScroll.max})`);
assert.equal(
  afterScroll.hasFirst,
  false,
  "the first column unmounts once it leaves the overscan window",
);
assert.ok(
  afterScroll.mounted < 220,
  `scrolled window stays bounded (${afterScroll.mounted})`,
);

// Jump to a column outside the mounted window. The staff should mount that
// row and focus the input.
await page.evaluate(() => {
  window.scrollTo(0, 0);
  window.dispatchEvent(
    new CustomEvent("editing-tab-reveal-column", {
      detail: {
        sectionIndex: 0,
        subSectionIndex: 0,
        columnIndex: 400,
        noteIndex: 3,
      },
    }),
  );
});
await page.waitForFunction(
  () => document.activeElement?.id === "input-0-0-400-3",
  null,
  { timeout: 5000 },
);
const revealed = await page.evaluate(() => ({
  focused: document.activeElement?.id ?? "",
  mounted: !!document.getElementById("section0-subSection0-chord400"),
}));
console.log("revealed:", revealed);
assert.equal(revealed.focused, "input-0-0-400-3");
assert.equal(revealed.mounted, true);

assert.equal(pageErrors.length, 0, `no page errors: ${pageErrors.join("; ")}`);
await page.screenshot({
  path: `${ARTIFACT_DIR}/editing-tab-virtualized-scrolled.png`,
  fullPage: false,
});

console.log("\nALL EDITING TAB SCALE CHECKS PASSED");
const video = page.video();
await context.close();
if (video) {
  const videoPath = await video.path();
  console.log("video:", videoPath);
}
await browser.close();
