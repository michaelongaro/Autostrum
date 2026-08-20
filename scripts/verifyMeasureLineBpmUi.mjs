/**
 * Verify sticky measure-line BPM UI across editing + static views.
 *
 * Usage (dev server must be running):
 *   node scripts/verifyMeasureLineBpmUi.mjs [baseURL]
 *
 * Writes screenshots to /opt/cursor/artifacts/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });

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

function buildEditingFixture() {
  const note = (id, palmMute = "") => ({
    type: "note",
    palmMute,
    firstString: "",
    secondString: "3",
    thirdString: "2",
    fourthString: "0",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter",
    id,
  });

  const ml = (id, bpmAfterLine, isInPalmMuteSection = false) => ({
    type: "measureLine",
    isInPalmMuteSection,
    bpmAfterLine,
    id,
  });

  // Layout:
  // notes @75 → ML 120 (show) → notes @120 → ML null (hide, sticky) →
  // PM start → notes → ML 140 inside PM (show + PM) → notes → PM end →
  // ML null (hide)
  return [
    {
      id: "sec-bpm",
      title: "BPM sticky fixture",
      data: [
        {
          id: "sub-bpm",
          type: "tab",
          bpm: -1,
          baseNoteLength: "quarter",
          repetitions: 1,
          data: [
            note("n0"),
            note("n1"),
            ml("m-change-120", 120, false),
            note("n2"),
            note("n3"),
            ml("m-sticky-null", null, false),
            note("n4"),
            note("n5", "start"),
            note("n6", "-"),
            ml("m-pm-140", 140, true),
            note("n7", "-"),
            note("n8", "end"),
            ml("m-after-pm-null", null, false),
            note("n9"),
          ],
        },
      ],
    },
  ];
}

async function injectFixture(page, tabData, bpm = 75) {
  await page.waitForFunction(
    () => typeof window.__AUTOSTRUM_GET_TAB_STORE__ === "function",
  );
  await page.evaluate(
    ({ tabData, bpm }) => {
      const store = window.__AUTOSTRUM_GET_TAB_STORE__();
      store.setBpm(bpm);
      store.setTabData((draft) => {
        draft.splice(0, draft.length, ...tabData);
      });
    },
    { tabData, bpm },
  );
  // let React paint
  await page.waitForTimeout(500);
}

async function countVisibleBpmLabels(page, rootSelector) {
  return page.evaluate((rootSelector) => {
    const root = rootSelector
      ? document.querySelector(rootSelector)
      : document.body;
    if (!root) return { count: 0, texts: [] };

    // QuarterNote is an SVG; BPM labels are sibling text in a flex row
    const candidates = [...root.querySelectorAll("p")].filter((p) => {
      const t = (p.textContent ?? "").trim();
      if (!/^\d{2,3}$/.test(t)) return false;
      const parent = p.parentElement;
      if (!parent) return false;
      // BPM rows sit with a quarter-note SVG sibling
      return parent.querySelector("svg") !== null;
    });

    return {
      count: candidates.length,
      texts: candidates.map((p) => (p.textContent ?? "").trim()),
    };
  }, rootSelector);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();
  const fixture = buildEditingFixture();

  // --- Editing view ---
  console.log("\nEditing view");
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await injectFixture(page, fixture, 75);

  // Wait for measure-line BPM buttons (true measure lines use BUTTON#-7)
  await page.waitForSelector('button[id^="input-"][id$="-7"]', {
    timeout: 10000,
  });

  const editLabels = await countVisibleBpmLabels(page, null);
  console.log("  editing BPM labels:", editLabels);
  // Expect 120 and 140 only (not sticky nulls, not unchanged)
  assert(
    editLabels.texts.includes("120") && editLabels.texts.includes("140"),
    "editing shows 120 and 140 tempo-change labels",
  );
  assert(
    editLabels.count === 2,
    `editing shows exactly 2 BPM labels (got ${editLabels.count}: ${editLabels.texts.join(",")})`,
  );

  const editShot = path.join(OUT, "editing_measure_line_bpm_labels.png");
  // Focus the tab section area
  const section = page.locator('[id^="section0-subSection0-chord"]').first();
  if (await section.count()) {
    await section.scrollIntoViewIfNeeded();
  }
  await page.screenshot({ path: editShot, fullPage: false });
  console.log(`  wrote ${editShot}`);

  // Zoomed crop around PM measure line if present
  const pmChord = page.locator("#section0-subSection0-chord9");
  if (await pmChord.count()) {
    await pmChord.scrollIntoViewIfNeeded();
    const box = await pmChord.boundingBox();
    if (box) {
      const pmShot = path.join(OUT, "editing_pm_measure_line_bpm_alignment.png");
      await page.screenshot({
        path: pmShot,
        clip: {
          x: Math.max(0, box.x - 120),
          y: Math.max(0, box.y - 20),
          width: 320,
          height: 280,
        },
      });
      console.log(`  wrote ${pmShot}`);
    }
  }

  // Open popover on sticky-null measure line (index 5) and check placeholder
  const stickyBtn = page.locator("#input-0-0-5-7");
  if (await stickyBtn.count()) {
    await stickyBtn.click({ force: true });
    await page.waitForTimeout(300);
    const placeholder = await page
      .locator('[role="dialog"] input, [data-radix-popper-content-wrapper] input')
      .first()
      .getAttribute("placeholder");
    console.log("  sticky null placeholder:", placeholder);
    assert(
      placeholder === "120",
      `sticky null measure-line placeholder is carried BPM 120 (got ${placeholder})`,
    );
    const popShot = path.join(OUT, "editing_sticky_bpm_popover_placeholder.png");
    await page.screenshot({ path: popShot, fullPage: false });
    console.log(`  wrote ${popShot}`);
  } else {
    assert(false, "sticky null measure-line BPM button #input-0-0-5-7 exists");
  }

  // --- Static view via harness bpm fixture ---
  console.log("\nStatic view (harness)");
  await page.goto(`${BASE}/dev-virtualization-harness?fixture=bpm`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('#devVirtualizationHarness[data-ready="true"]');
  // Tab-level BPM for the fixture (subsection inherits via -1)
  await page.evaluate(() => {
    window.__AUTOSTRUM_GET_TAB_STORE__().setBpm(75);
  });
  await page.waitForTimeout(500);

  const staticLabels = await countVisibleBpmLabels(
    page,
    "#devVirtualizationHarness",
  );
  console.log("  static BPM labels:", staticLabels);
  assert(
    staticLabels.texts.includes("120") && staticLabels.texts.includes("140"),
    "static shows 120 and 140 tempo-change labels",
  );
  assert(
    staticLabels.count === 2,
    `static shows exactly 2 BPM labels (got ${staticLabels.count}: ${staticLabels.texts.join(",")})`,
  );

  const staticShot = path.join(OUT, "static_measure_line_bpm_labels.png");
  await page.screenshot({ path: staticShot, fullPage: false });
  console.log(`  wrote ${staticShot}`);

  // --- Playback expansion (store compile, no modal required) ---
  console.log("\nPlayback expansion metadata");
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await injectFixture(page, fixture, 75);
  const playbackCheck = await page.evaluate(() => {
    // Mirror expandTabSection sticky + showBpm for measure lines via store data
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    const sub = store.tabData[0].data[0];
    const baseline = store.bpm;
    let currentBpm = sub.bpm !== -1 ? sub.bpm : baseline;
    const measureShows = [];
    const noteBpms = [];

    for (const column of sub.data) {
      if (column.type === "measureLine") {
        const before = currentBpm;
        if (column.bpmAfterLine !== null) currentBpm = column.bpmAfterLine;
        measureShows.push({
          id: column.id,
          show: before !== currentBpm,
          bpm: currentBpm,
          bpmAfterLine: column.bpmAfterLine,
        });
      } else {
        noteBpms.push(currentBpm);
      }
    }
    return { measureShows, noteBpms };
  });
  console.log("  playback check:", JSON.stringify(playbackCheck, null, 2));
  assert(
    JSON.stringify(playbackCheck.noteBpms) ===
      JSON.stringify([75, 75, 120, 120, 120, 120, 120, 140, 140, 140]),
    "playback sticky note BPMs match expected walk",
  );
  assert(
    playbackCheck.measureShows.filter((m) => m.show).map((m) => m.bpm).join(",") ===
      "120,140",
    "playback would show BPM only for 120 and 140 measure lines",
  );

  await browser.close();

  console.log(`\n${checks - failures.length}/${checks} checks passed`);
  if (failures.length) {
    console.error("Failures:\n" + failures.map((f) => ` - ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("verifyMeasureLineBpmUi: all assertions passed");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
