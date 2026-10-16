// Verify the editing-tab moving playhead on /create.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyEditingTabPlayhead.mjs [baseURL]
//
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/playhead-verify";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

function note(fret, noteLength = "eighth") {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "",
    thirdString: "",
    fourthString: "",
    fifthString: fret,
    sixthString: "",
    chordEffects: "",
    noteLength,
    id: uuid(),
  };
}

function measureLine() {
  return {
    type: "measureLine",
    isInPalmMuteSection: false,
    bpmAfterLine: null,
    id: uuid(),
  };
}

// Enough note columns that a ~500px viewport wraps to a second row.
const columns = [];
for (let measure = 0; measure < 6; measure++) {
  for (let beat = 0; beat < 4; beat++) {
    columns.push(note(String((beat % 5) + 1)));
  }
  columns.push(measureLine());
}

const draft = {
  title: "Playhead verify",
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
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: [
        {
          id: uuid(),
          type: "tab",
          bpm: -1,
          // Two reps so we can assert the playhead snaps (not glides) on wrap.
          repetitions: 2,
          baseNoteLength: "eighth",
          data: columns,
        },
      ],
    },
  ],
  sectionProgression: [],
};

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({
  viewport: { width: 520, height: 900 },
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

await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });

const firstChordLocator = page.locator("#section0-subSection0-chord0");
await firstChordLocator.waitFor({ timeout: 20000 });

// Wait until the sticky audio Play button is enabled (metadata compiled + instrument).
await page.waitForFunction(
  () => {
    const buttons = [...document.querySelectorAll("button")];
    return buttons.some((btn) => {
      if (btn.disabled) return false;
      const cls = btn.className || "";
      if (!cls.includes("bg-audio") && !cls.includes("audio")) return false;
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.bottom > window.innerHeight - 160;
    });
  },
  null,
  { timeout: 45000 },
);

function readPlayheadSample() {
  return page.evaluate(() => {
    const staffEl = document.querySelector(
      ".baseFlex.relative.mt-4.w-full.flex-wrap",
    );
    if (!staffEl) return { error: "no staff" };
    const head = [...staffEl.querySelectorAll("div")].find((el) => {
      const style = getComputedStyle(el);
      return (
        el.classList.contains("bg-primary") &&
        (el.className.includes("w-[2px]") || style.width === "2px") &&
        style.position === "absolute"
      );
    });
    if (!head) return { error: "no playhead element" };
    const opacity = getComputedStyle(head).opacity;
    const transform = getComputedStyle(head).transform;
    const rect = head.getBoundingClientRect();
    const staffRect = staffEl.getBoundingClientRect();
    return {
      opacity: Number(opacity),
      transform,
      x: rect.left - staffRect.left,
      y: rect.top - staffRect.top,
      height: rect.height,
    };
  });
}

// Playhead must be visible as soon as metadata exists (before first play).
const beforePlay = await readPlayheadSample();
console.log("before play:", beforePlay);
assert.ok(!beforePlay.error, `before-play playhead ok: ${beforePlay.error}`);
assert.ok(
  beforePlay.opacity > 0.5,
  `playhead visible before first play (opacity=${beforePlay.opacity})`,
);

const playClicked = await page.evaluate(async () => {
  const buttons = [...document.querySelectorAll("button")];
  const candidate = buttons.find((btn) => {
    if (btn.disabled) return false;
    const cls = btn.className || "";
    const rect = btn.getBoundingClientRect();
    return (
      (cls.includes("bg-audio") || cls.includes("audio")) &&
      rect.bottom > window.innerHeight - 160 &&
      rect.width > 0
    );
  });
  if (!candidate) return false;
  candidate.click();
  // Resume AudioContext if present on any audio element / we can't access store.
  return true;
});

assert.ok(playClicked, "clicked sticky audio play button");

// Give playTab a moment to start AudioContext + rAF playhead.
await page.waitForTimeout(800);

const playingState = await page.evaluate(() => {
  // Infer playing from a pause icon appearing in the audio button, or from
  // any visible playhead opacity.
  const audioBtns = [...document.querySelectorAll("button")].filter((btn) =>
    (btn.className || "").includes("audio"),
  );
  return {
    audioButtonCount: audioBtns.length,
    htmlHasPause: document.body.innerHTML.includes("PauseIcon") ||
      !!document.querySelector('[class*="pause" i]'),
  };
});
console.log("post-click state", playingState);

const samples = [];
for (let i = 0; i < 12; i++) {
  const sample = await page.evaluate(() => {
    const staffEl = document.querySelector(
      ".baseFlex.relative.mt-4.w-full.flex-wrap",
    );
    if (!staffEl) return { error: "no staff" };
    const head = [...staffEl.querySelectorAll("div")].find((el) => {
      const style = getComputedStyle(el);
      return (
        el.classList.contains("bg-primary") &&
        (el.className.includes("w-[2px]") || style.width === "2px") &&
        style.position === "absolute"
      );
    });
    if (!head) return { error: "no playhead element" };
    const opacity = getComputedStyle(head).opacity;
    const transform = getComputedStyle(head).transform;
    const rect = head.getBoundingClientRect();
    const staffRect = staffEl.getBoundingClientRect();
    return {
      opacity: Number(opacity),
      transform,
      x: rect.left - staffRect.left,
      y: rect.top - staffRect.top,
      height: rect.height,
      visibleFills: [
        ...document.querySelectorAll(".bg-primary\\/25, [class*='bg-primary/25']"),
      ].filter((el) => {
        const t = getComputedStyle(el).transform;
        const o = getComputedStyle(el).opacity;
        return o !== "0" && t !== "matrix(0, 0, 0, 0, 0, 0)" && !t.includes("matrix(0,");
      }).length,
    };
  });
  samples.push(sample);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, `playhead-sample-${i}.png`),
    fullPage: false,
  });
  await page.waitForTimeout(180);
}

console.log("samples:", JSON.stringify(samples, null, 2));

const visible = samples.filter((s) => s.opacity > 0.5 && !s.error);
assert.ok(visible.length >= 3, `playhead visible in >=3 samples (got ${visible.length})`);

const xs = visible.map((s) => s.x);
const ys = visible.map((s) => s.y);
const xSpan = Math.max(...xs) - Math.min(...xs);
assert.ok(xSpan > 20, `playhead X moved meaningfully (span=${xSpan.toFixed(1)}px)`);

// Heights should span first–sixth strings (~121px).
for (const s of visible) {
  assert.ok(
    s.height >= 100 && s.height <= 140,
    `playhead height ~staff (${s.height})`,
  );
}

// Old column fills should not be expanding during play.
const maxFills = Math.max(...samples.map((s) => s.visibleFills ?? 0));
assert.ok(maxFills === 0, `no scaleX column fills during play (max=${maxFills})`);

// If Y changed across samples, it should be a snap (large jump), not a diagonal crawl.
const uniqueYs = [...new Set(ys.map((y) => Math.round(y)))];
if (uniqueYs.length > 1) {
  const sorted = [...ys].sort((a, b) => a - b);
  const jump = sorted[sorted.length - 1] - sorted[0];
  assert.ok(jump > 40, `row wrap snapped Y by >40px (jump=${jump.toFixed(1)})`);
  console.log(`  PASS  row wrap Y snap observed (${jump.toFixed(1)}px)`);
} else {
  console.log("  INFO  single-row playback in this viewport; X motion verified");
}

// --- Note highlight coloring (playback-modal style) while playing ---
const highlightWhilePlaying = await page.evaluate(() => {
  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  const inputs = [
    ...document.querySelectorAll('input[id^="input-0-0-"]'),
  ].filter((el) => {
    const id = el.id;
    // string notes only (noteIndex 1-6), skip chord effects (7)
    const parts = id.split("-");
    const noteIndex = Number(parts[4]);
    return noteIndex >= 1 && noteIndex <= 6 && el.value.length > 0;
  });
  const highlighted = inputs.filter((el) => {
    const color = getComputedStyle(el).color;
    // primary is applied as hsl(var(--primary)); resolve via a probe.
    return color.includes("rgb") && el.style.color.includes("primary");
  });
  return {
    primaryVar: primary,
    visibleNoteInputs: inputs.length,
    highlightedViaInline: inputs.filter((el) =>
      (el.getAttribute("style") || "").includes("primary"),
    ).length,
  };
});
console.log("highlight while playing:", highlightWhilePlaying);
assert.ok(
  highlightWhilePlaying.highlightedViaInline >= 1,
  "at least one string note uses primary highlight while playing",
);

// --- Pause: playhead stays; chord note highlights clear ---
const paused = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const candidate = buttons.find((btn) => {
    if (btn.disabled) return false;
    const cls = btn.className || "";
    const rect = btn.getBoundingClientRect();
    return (
      (cls.includes("bg-audio") || cls.includes("audio")) &&
      rect.bottom > window.innerHeight - 160 &&
      rect.width > 0
    );
  });
  if (!candidate) return { clicked: false };
  candidate.click();
  return { clicked: true };
});
assert.ok(paused.clicked, "clicked sticky audio button to pause");
await page.waitForTimeout(400);

const pauseState = await page.evaluate(() => {
  const staffEl = document.querySelector(
    ".baseFlex.relative.mt-4.w-full.flex-wrap",
  );
  if (!staffEl) return { error: "no staff" };
  const head = [...staffEl.querySelectorAll("div")].find((el) => {
    const style = getComputedStyle(el);
    return (
      el.classList.contains("bg-primary") &&
      (el.className.includes("w-[2px]") || style.width === "2px") &&
      style.position === "absolute"
    );
  });
  if (!head) return { error: "no playhead element" };

  const staffRect = staffEl.getBoundingClientRect();
  const headRect = head.getBoundingClientRect();
  const playheadX = headRect.left - staffRect.left + headRect.width / 2;

  // Paused playhead should sit slightly left of the nearest chord's center.
  let chordCenterX = null;
  let leftOfCenterBy = null;
  let bestDistance = Infinity;
  for (const chordEl of document.querySelectorAll(
    '[id^="section0-subSection0-chord"]',
  )) {
    const chordRect = chordEl.getBoundingClientRect();
    // Skip skinny measure lines.
    if (chordRect.width < 8) continue;
    const center = chordRect.left - staffRect.left + chordRect.width / 2;
    const distance = Math.abs(center - (playheadX + 10));
    if (distance < bestDistance) {
      bestDistance = distance;
      chordCenterX = center;
      leftOfCenterBy = center - playheadX;
    }
  }

  const highlightedViaInline = [
    ...document.querySelectorAll('input[id^="input-0-0-"]'),
  ].filter((el) => {
    const parts = el.id.split("-");
    const noteIndex = Number(parts[4]);
    return (
      noteIndex >= 1 &&
      noteIndex <= 6 &&
      el.value.length > 0 &&
      (el.getAttribute("style") || "").includes("primary")
    );
  }).length;

  return {
    playheadOpacity: Number(getComputedStyle(head).opacity),
    playheadTransform: getComputedStyle(head).transform,
    playheadX,
    chordCenterX,
    leftOfCenterBy,
    highlightedViaInline,
  };
});
console.log("pause state:", pauseState);
assert.ok(!pauseState.error, `pause state ok: ${pauseState.error}`);
assert.ok(
  pauseState.playheadOpacity > 0.5,
  `playhead stays visible on pause (opacity=${pauseState.playheadOpacity})`,
);
assert.equal(
  pauseState.highlightedViaInline,
  0,
  "no chord note highlighting while paused",
);
assert.ok(
  pauseState.leftOfCenterBy != null &&
    pauseState.leftOfCenterBy >= 6 &&
    pauseState.leftOfCenterBy <= 16,
  `paused playhead sits left of chord center (delta=${pauseState.leftOfCenterBy})`,
);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "playhead-paused.png"),
  fullPage: false,
});

// --- Resume and sample densely for measure-line continuity + repeat snap ---
const resumed = await page.evaluate(() => {
  const buttons = [...document.querySelectorAll("button")];
  const candidate = buttons.find((btn) => {
    if (btn.disabled) return false;
    const cls = btn.className || "";
    const rect = btn.getBoundingClientRect();
    return (
      (cls.includes("bg-audio") || cls.includes("audio")) &&
      rect.bottom > window.innerHeight - 160 &&
      rect.width > 0
    );
  });
  if (!candidate) return false;
  candidate.click();
  return true;
});
assert.ok(resumed, "resumed playback for continuity/snap checks");
await page.waitForTimeout(400);

const dense = [];
for (let i = 0; i < 80; i++) {
  dense.push(await readPlayheadSample());
  await page.waitForTimeout(40);
}

const denseVisible = dense.filter((s) => s.opacity > 0.5 && !s.error);
assert.ok(
  denseVisible.length >= 40,
  `dense playhead samples visible (got ${denseVisible.length})`,
);

// Measure-line continuity: on a single row, successive X should not jump by
 // more than ~one column while moving forward (skipping the measure line).
const forwardSteps = [];
for (let i = 1; i < denseVisible.length; i++) {
  const prev = denseVisible[i - 1];
  const curr = denseVisible[i];
  if (Math.abs(curr.y - prev.y) > 30) continue; // row wrap — separate concern
  const dx = curr.x - prev.x;
  if (dx > 0) forwardSteps.push(dx);
}
const maxForwardStep = forwardSteps.length ? Math.max(...forwardSteps) : 0;
console.log("max forward step px:", maxForwardStep.toFixed(1));
assert.ok(
  maxForwardStep < 55,
  `no playhead skip across measure lines (max forward step=${maxForwardStep.toFixed(1)}px)`,
);

// Repeat snap: a large backward X jump on the same row should happen in one
 // sample (snap), not as a multi-step glide back to the start.
const backwardRuns = [];
let run = 0;
for (let i = 1; i < denseVisible.length; i++) {
  const prev = denseVisible[i - 1];
  const curr = denseVisible[i];
  if (Math.abs(curr.y - prev.y) > 30) {
    run = 0;
    continue;
  }
  const dx = curr.x - prev.x;
  if (dx < -48) {
    backwardRuns.push({ dx, runBefore: run });
    run = 0;
  } else if (dx < -2) {
    run += 1;
  } else {
    run = 0;
  }
}
console.log("backward snaps:", backwardRuns);
if (backwardRuns.length > 0) {
  for (const snap of backwardRuns) {
    assert.ok(
      snap.runBefore === 0,
      `repeat wrap snaps in one frame (gradual steps before snap=${snap.runBefore})`,
    );
  }
  console.log(`  PASS  ${backwardRuns.length} repeat wrap snap(s) observed`);
} else {
  console.log(
    "  INFO  no subsection-repeat wrap observed in this window; snap rule still covered by unit glide logic",
  );
}

assert.equal(pageErrors.length, 0, `no page errors: ${pageErrors.join("; ")}`);

console.log("\nALL PLAYHEAD CHECKS PASSED");
await browser.close();
