/**
 * Capture / compare layout geometry for editing, static, and playback tabs.
 *
 * Usage (dev server must be running):
 *   node scripts/snapshotTabGeometry.mjs capture [baseURL]
 *   node scripts/snapshotTabGeometry.mjs compare [baseURL]
 *
 * Writes:
 *   /opt/cursor/artifacts/geometry-baseline/{editing,static,playback}.json
 *   /opt/cursor/artifacts/geometry-baseline/{editing,static,playback}.png
 *   /opt/cursor/artifacts/geometry-after/... (compare mode)
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const MODE = process.argv[2] ?? "capture";
const BASE = process.argv[3] ?? "http://127.0.0.1:3000";
const ROOT =
  MODE === "compare"
    ? "/opt/cursor/artifacts/geometry-after"
    : "/opt/cursor/artifacts/geometry-baseline";
const BASELINE_ROOT = "/opt/cursor/artifacts/geometry-baseline";

fs.mkdirSync(ROOT, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

function note(id, palmMute = "", fret = "3") {
  return {
    type: "note",
    palmMute,
    firstString: "",
    secondString: fret,
    thirdString: "2",
    fourthString: "0",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter",
    id,
  };
}

function measureLine(id, options = {}) {
  return {
    type: "measureLine",
    isInPalmMuteSection: options.isInPalmMuteSection ?? false,
    bpmAfterLine: options.bpmAfterLine ?? null,
    id,
  };
}

function buildFixture() {
  return [
    {
      id: "sec-geo",
      title: "Geometry fixture",
      data: [
        {
          id: "sub-geo",
          type: "tab",
          bpm: -1,
          baseNoteLength: "quarter",
          repetitions: 1,
          data: [
            note("n0"),
            note("n1"),
            measureLine("m-120", { bpmAfterLine: 120 }),
            note("n2"),
            note("n3"),
            measureLine("m-sticky", { bpmAfterLine: null }),
            note("n4", "start"),
            note("n5", "-"),
            measureLine("m-pm-140", {
              bpmAfterLine: 140,
              isInPalmMuteSection: true,
            }),
            note("n6", "-"),
            note("n7", "end"),
            measureLine("m-after", { bpmAfterLine: null }),
            note("n8"),
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
      store.setTuning("e2 a2 d3 g3 b3 e4");
      store.setTabData((draft) => {
        draft.splice(0, draft.length, ...structuredClone(tabData));
      });
    },
    { tabData, bpm },
  );
  await page.waitForTimeout(400);
}

async function collectEditingGeometry(page) {
  return page.evaluate(() => {
    const staff = document.querySelector(
      ".baseFlex.relative.mt-4.w-full.flex-wrap",
    );
    if (!staff) return { error: "no editing staff" };
    const staffRect = staff.getBoundingClientRect();

    const columns = [...staff.querySelectorAll('[id^="section0-subSection0-chord"]')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          x: +(r.left - staffRect.left).toFixed(2),
          y: +(r.top - staffRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    // Tuning gutter is the first shrink-0 column without a chord id
    const gutters = [...staff.children]
      .filter((el) => !el.id?.startsWith("section"))
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          i,
          x: +(r.left - staffRect.left).toFixed(2),
          y: +(r.top - staffRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      });

    // Sample absolute children style heights that use geometry constants
    const styleSamples = columns.slice(0, 5).map((c) => {
      const el = document.getElementById(c.id);
      if (!el) return null;
      const kids = [...el.querySelectorAll(":scope > div")].map((d) => {
        const cs = getComputedStyle(d);
        return {
          h: cs.height,
          mt: cs.marginTop,
          top: cs.top,
          pos: cs.position,
        };
      });
      return { id: c.id, kids };
    });

    return {
      staff: {
        w: +staffRect.width.toFixed(2),
        h: +staffRect.height.toFixed(2),
      },
      columns,
      gutters,
      styleSamples,
    };
  });
}

async function collectStaticGeometry(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#devVirtualizationHarness");
    if (!root) return { error: "no harness" };
    const rootRect = root.getBoundingClientRect();

    // All fixed-height row children (notes cols, measure lines, gutters)
    const sized = [...root.querySelectorAll("div")]
      .filter((el) => {
        const style = el.getAttribute("style") ?? "";
        return (
          style.includes("height:") &&
          (style.includes("width:") || el.className.includes("baseVertFlex"))
        );
      })
      .slice(0, 80)
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        const style = el.getAttribute("style") ?? "";
        return {
          i,
          styleHeight: style.match(/height:\s*([^;]+)/)?.[1]?.trim() ?? null,
          styleWidth: style.match(/width:\s*([^;]+)/)?.[1]?.trim() ?? null,
          x: +(r.left - rootRect.left).toFixed(2),
          y: +(r.top - rootRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      })
      .filter((e) => e.w > 0 && e.h > 0);

    // Zero-height spacers (should disappear after cleanup)
    const zeroHeightCount = [...root.querySelectorAll("div")].filter((el) => {
      const style = el.getAttribute("style") ?? "";
      if (!style.includes("height:")) return false;
      const r = el.getBoundingClientRect();
      return r.height === 0 && r.width > 0;
    }).length;

    return {
      root: { w: +rootRect.width.toFixed(2), h: +rootRect.height.toFixed(2) },
      sized,
      zeroHeightCount,
    };
  });
}

async function collectPlaybackGeometry(page) {
  return page.evaluate(() => {
    const modal = document.querySelector(".playbackModalGradient");
    if (!modal) return { error: "no playback modal" };
    const modalRect = modal.getBoundingClientRect();

    // Chord strip columns: fixed widths 34 / 1 / 40
    const strip = modal.querySelector('[class*="will-change-transform"]')?.parentElement
      ?? modal;
    const columns = [...modal.querySelectorAll(".baseVertFlex")]
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          i,
          x: +(r.left - modalRect.left).toFixed(2),
          y: +(r.top - modalRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      })
      .filter((c) => c.w === 34 || c.w === 1 || c.w === 40)
      .slice(0, 40);

    // Measure-line vertical bars
    const measureBars = [...modal.querySelectorAll("div")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width === 1 && r.height >= 100 && r.height <= 250;
      })
      .slice(0, 20)
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          i,
          x: +(r.left - modalRect.left).toFixed(2),
          y: +(r.top - modalRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      });

    // String staff heights (126px expected)
    const staffs = [...modal.querySelectorAll("div")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.height - 126) < 1 && r.width >= 30 && r.width <= 45;
      })
      .slice(0, 20)
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          i,
          x: +(r.left - modalRect.left).toFixed(2),
          y: +(r.top - modalRect.top).toFixed(2),
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
        };
      });

    return {
      modal: {
        w: +modalRect.width.toFixed(2),
        h: +modalRect.height.toFixed(2),
      },
      columns,
      measureBars,
      staffs,
    };
  });
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, deepSort(value[k])]),
    );
  }
  return value;
}

function diffJson(a, b, prefix = "") {
  const diffs = [];
  if (typeof a !== typeof b) {
    diffs.push(`${prefix}: type ${typeof a} vs ${typeof b}`);
    return diffs;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push(`${prefix}: length ${a.length} vs ${b.length}`);
    }
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      diffs.push(...diffJson(a[i], b[i], `${prefix}[${i}]`));
    }
    return diffs;
  }
  if (a && typeof a === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      diffs.push(...diffJson(a[k], b[k], prefix ? `${prefix}.${k}` : k));
    }
    return diffs;
  }
  if (a !== b) {
    // Allow 0.5px float noise
    if (
      typeof a === "number" &&
      typeof b === "number" &&
      Math.abs(a - b) <= 0.5
    ) {
      return diffs;
    }
    diffs.push(`${prefix}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
  return diffs;
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
  const fixture = buildFixture();
  const results = {};

  function writeResult(name, data) {
    results[name] = data;
    fs.writeFileSync(
      path.join(ROOT, `${name}.json`),
      JSON.stringify(deepSort(data), null, 2),
    );
    console.log(`  wrote ${name}.json`);
  }

  // --- Editing ---
  console.log("Capturing editing…");
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await injectFixture(page, fixture, 75);
  await page.waitForSelector("#section0-subSection0-chord0", { timeout: 20000 });
  await page.waitForTimeout(300);
  const editSection = page.locator("#section0-subSection0-chord0");
  await editSection.scrollIntoViewIfNeeded();
  writeResult("editing", await collectEditingGeometry(page));
  await page.screenshot({
    path: path.join(ROOT, "editing.png"),
    fullPage: false,
  });
  // Crop around staff
  const staffBox = await page
    .locator(".baseFlex.relative.mt-4.w-full.flex-wrap")
    .first()
    .boundingBox();
  if (staffBox) {
    await page.screenshot({
      path: path.join(ROOT, "editing_staff.png"),
      clip: {
        x: Math.max(0, staffBox.x - 8),
        y: Math.max(0, staffBox.y - 8),
        width: Math.min(1380, staffBox.width + 16),
        height: Math.min(500, staffBox.height + 16),
      },
    });
  }

  // --- Static ---
  console.log("Capturing static…");
  await page.goto(`${BASE}/dev-virtualization-harness?fixture=bpm&bare=1`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('#devVirtualizationHarness[data-ready="true"]');
  await page.evaluate(() => {
    window.__AUTOSTRUM_GET_TAB_STORE__().setBpm(75);
  });
  await page.waitForTimeout(400);
  writeResult("static", await collectStaticGeometry(page));
  await page.screenshot({
    path: path.join(ROOT, "static.png"),
    fullPage: false,
  });
  const harnessBox = await page
    .locator("#devVirtualizationHarness")
    .boundingBox();
  if (harnessBox) {
    await page.screenshot({
      path: path.join(ROOT, "static_staff.png"),
      clip: {
        x: Math.max(0, harnessBox.x - 8),
        y: Math.max(0, harnessBox.y - 8),
        width: Math.min(1380, harnessBox.width + 16),
        height: Math.min(400, harnessBox.height + 16),
      },
    });
  }

  // --- Playback (needs editing=false so expandFullTab runs) ---
  console.log("Capturing playback…");
  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await injectFixture(page, fixture, 75);
  await page.waitForSelector("#section0-subSection0-chord0", { timeout: 20000 });
  await page.evaluate(() => {
    const store = window.__AUTOSTRUM_GET_TAB_STORE__();
    store.setEditing(false);
  });
  await page.waitForFunction(
    () => {
      const s = window.__AUTOSTRUM_GET_TAB_STORE__();
      return s.editing === false && (s.expandedTabData?.length ?? 0) > 0;
    },
    null,
    { timeout: 30000 },
  );
  await page.evaluate(() => {
    window.__AUTOSTRUM_GET_TAB_STORE__().setShowPlaybackModal(true);
  });
  await page.waitForSelector(".playbackModalGradient", { timeout: 15000 });
  await page.waitForTimeout(600);
  writeResult("playback", await collectPlaybackGeometry(page));
  await page.screenshot({
    path: path.join(ROOT, "playback.png"),
    fullPage: false,
  });

  await browser.close();

  if (MODE === "compare") {
    console.log("\nComparing against baseline…");
    let failed = false;
    for (const name of ["editing", "static", "playback"]) {
      const baselinePath = path.join(BASELINE_ROOT, `${name}.json`);
      const afterPath = path.join(ROOT, `${name}.json`);
      if (!fs.existsSync(baselinePath)) {
        console.error(`  FAIL  missing baseline ${baselinePath}`);
        failed = true;
        continue;
      }
      const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
      const after = JSON.parse(fs.readFileSync(afterPath, "utf8"));

      // For static: ignore zeroHeightCount when comparing layout — we expect it
      // to drop to 0 after removing BORDER_SPACER. Layout positions must match.
      const baselineCmp = structuredClone(baseline);
      const afterCmp = structuredClone(after);
      if (name === "static") {
        delete baselineCmp.zeroHeightCount;
        delete afterCmp.zeroHeightCount;
      }

      const diffs = diffJson(baselineCmp, afterCmp);
      if (diffs.length === 0) {
        console.log(`  PASS  ${name} geometry matches baseline`);
        if (
          name === "static" &&
          after.zeroHeightCount !== undefined &&
          baseline.zeroHeightCount !== undefined
        ) {
          console.log(
            `         zero-height spacers: ${baseline.zeroHeightCount} → ${after.zeroHeightCount}`,
          );
        }
      } else {
        failed = true;
        console.log(`  FAIL  ${name} differs (${diffs.length} diffs):`);
        for (const d of diffs.slice(0, 40)) console.log(`    - ${d}`);
        if (diffs.length > 40) console.log(`    … ${diffs.length - 40} more`);
      }
    }
    if (failed) process.exit(1);
    console.log("\nAll geometry snapshots match baseline.");
  } else {
    console.log(`\nBaseline captured under ${ROOT}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
