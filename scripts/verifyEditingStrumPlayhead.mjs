// Verify the editing chord-sequence strum playhead on /create.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyEditingStrumPlayhead.mjs [baseURL]
//
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/strum-playhead-verify";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

function uuid() {
  return crypto.randomUUID();
}

const patternId = uuid();
// Mixed chord name lengths so Select widths (and column centers) vary.
const chordNames = ["A", "Cmaj7", "Em", "G", "Am7add11", "D", "F#m", "B7"];
const strums = chordNames.map((name, index) => ({
  palmMute: "",
  strum: index % 2 === 0 ? "v" : "^",
  noteLength: "eighth",
}));

const pattern = {
  id: patternId,
  baseNoteLength: "eighth",
  strums,
};

const draft = {
  title: "Strum playhead verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 100,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [
    {
      id: uuid(),
      name: "A",
      frets: ["0", "0", "2", "2", "2", "0"],
    },
    {
      id: uuid(),
      name: "Cmaj7",
      frets: ["0", "3", "2", "0", "0", "0"],
    },
    {
      id: uuid(),
      name: "Em",
      frets: ["0", "2", "2", "0", "0", "0"],
    },
    {
      id: uuid(),
      name: "G",
      frets: ["3", "2", "0", "0", "0", "3"],
    },
    {
      id: uuid(),
      name: "Am7add11",
      frets: ["0", "0", "0", "0", "0", "0"],
    },
    {
      id: uuid(),
      name: "D",
      frets: ["", "", "0", "2", "3", "2"],
    },
    {
      id: uuid(),
      name: "F#m",
      frets: ["2", "4", "4", "2", "2", "2"],
    },
    {
      id: uuid(),
      name: "B7",
      frets: ["", "2", "1", "2", "0", "2"],
    },
  ],
  strummingPatterns: [pattern],
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: [
        {
          id: uuid(),
          type: "chord",
          bpm: -1,
          repetitions: 1,
          data: [
            {
              id: uuid(),
              bpm: -1,
              repetitions: 2,
              strummingPattern: pattern,
              data: chordNames,
            },
          ],
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
  viewport: { width: 720, height: 900 },
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

const firstStrum = page.locator(
  "#section0-subSection0-chordSequence0-chord0",
);
await firstStrum.waitFor({ timeout: 20000 });

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
    const first = document.getElementById(
      "section0-subSection0-chordSequence0-chord0",
    );
    if (!first) return { error: "no first strum" };
    // Walk up to the relative flex-wrap pattern container.
    let container = first.parentElement;
    while (
      container &&
      !(
        container.classList.contains("relative") &&
        container.classList.contains("flex-wrap")
      )
    ) {
      container = container.parentElement;
    }
    if (!container) return { error: "no pattern container" };

    const head = [...container.querySelectorAll("div")].find((el) => {
      const style = getComputedStyle(el);
      return (
        el.classList.contains("bg-primary") &&
        (el.className.includes("w-[2px]") || style.width === "2px") &&
        style.position === "absolute"
      );
    });
    if (!head) return { error: "no playhead element" };

    const start = first.querySelector("[data-strum-playhead-span-start]");
    const end = first.querySelector("[data-strum-playhead-span-end]");
    const containerRect = container.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const startRect = start?.getBoundingClientRect();
    const endRect = end?.getBoundingClientRect();

    // Column widths should vary with chord name Selects.
    const widths = [
      ...document.querySelectorAll(
        '[id^="section0-subSection0-chordSequence0-chord"]',
      ),
    ].map((el) => el.getBoundingClientRect().width);
    const uniqueWidths = [...new Set(widths.map((w) => Math.round(w)))];

    return {
      opacity: Number(getComputedStyle(head).opacity),
      transform: getComputedStyle(head).transform,
      x: headRect.left - containerRect.left,
      y: headRect.top - containerRect.top,
      height: headRect.height,
      expectedTop: startRect ? startRect.top - containerRect.top : null,
      expectedBottom: endRect ? endRect.bottom - containerRect.top : null,
      uniqueColumnWidths: uniqueWidths,
    };
  });
}

await firstStrum.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

const beforePlay = await readPlayheadSample();
console.log("before play:", beforePlay);
assert.ok(!beforePlay.error, `before-play ok: ${beforePlay.error}`);
assert.ok(
  beforePlay.opacity > 0.5,
  `playhead visible before play (opacity=${beforePlay.opacity})`,
);
assert.ok(
  beforePlay.uniqueColumnWidths.length >= 2,
  `variable chord Select widths present (widths=${beforePlay.uniqueColumnWidths})`,
);
assert.ok(
  beforePlay.expectedTop != null &&
    Math.abs(beforePlay.y - beforePlay.expectedTop) <= 2,
  `playhead top aligns with strum icon (y=${beforePlay.y}, expected=${beforePlay.expectedTop})`,
);
assert.ok(
  beforePlay.expectedBottom != null &&
    Math.abs(beforePlay.y + beforePlay.height - beforePlay.expectedBottom) <= 2,
  `playhead bottom aligns with beat label (bottom=${beforePlay.y + beforePlay.height}, expected=${beforePlay.expectedBottom})`,
);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "strum-playhead-before.png"),
  fullPage: false,
});

const playClicked = await page.evaluate(() => {
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
assert.ok(playClicked, "clicked sticky audio play");
await page.waitForTimeout(800);

const samples = [];
for (let i = 0; i < 14; i++) {
  samples.push(await readPlayheadSample());
  await page.waitForTimeout(160);
}
console.log("samples:", JSON.stringify(samples, null, 2));

const visible = samples.filter((s) => s.opacity > 0.5 && !s.error);
assert.ok(
  visible.length >= 5,
  `playhead visible in >=5 samples (got ${visible.length})`,
);

const xs = visible.map((s) => s.x);
const xSpan = Math.max(...xs) - Math.min(...xs);
assert.ok(xSpan > 30, `playhead X moved meaningfully (span=${xSpan.toFixed(1)}px)`);

for (const s of visible) {
  assert.ok(
    s.height >= 28 && s.height <= 80,
    `playhead height spans icon→beat (~${s.height}px)`,
  );
}

// Highlights while playing: primary color on at least one strum/beat.
const highlightWhilePlaying = await page.evaluate(() => {
  const nodes = [
    ...document.querySelectorAll(
      "#section0-subSection0-chordSequence0-chord0 [style], [id^='section0-subSection0-chordSequence0-chord'] p, [id^='section0-subSection0-chordSequence0-chord'] div",
    ),
  ];
  return nodes.filter((el) =>
    (el.getAttribute("style") || "").includes("primary"),
  ).length;
});
console.log("highlight while playing count:", highlightWhilePlaying);
assert.ok(
  highlightWhilePlaying >= 1,
  "at least one strum uses primary highlight while playing",
);

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "strum-playhead-playing.png"),
  fullPage: false,
});

// Pause: playhead stays, highlights clear.
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
  if (!candidate) return false;
  candidate.click();
  return true;
});
assert.ok(paused, "clicked sticky audio to pause");
await page.waitForTimeout(400);

const pauseState = await page.evaluate(() => {
  const first = document.getElementById(
    "section0-subSection0-chordSequence0-chord0",
  );
  let container = first?.parentElement ?? null;
  while (
    container &&
    !(
      container.classList.contains("relative") &&
      container.classList.contains("flex-wrap")
    )
  ) {
    container = container.parentElement;
  }
  if (!container) return { error: "no container" };
  const head = [...container.querySelectorAll("div")].find((el) => {
    const style = getComputedStyle(el);
    return (
      el.classList.contains("bg-primary") &&
      (el.className.includes("w-[2px]") || style.width === "2px") &&
      style.position === "absolute"
    );
  });
  if (!head) return { error: "no playhead" };

  const highlighted = [
    ...document.querySelectorAll(
      "[id^='section0-subSection0-chordSequence0-chord'] [style]",
    ),
  ].filter((el) => (el.getAttribute("style") || "").includes("primary")).length;

  return {
    opacity: Number(getComputedStyle(head).opacity),
    highlighted,
  };
});
console.log("pause state:", pauseState);
assert.ok(!pauseState.error, `pause ok: ${pauseState.error}`);
assert.ok(
  pauseState.opacity > 0.5,
  `playhead stays visible on pause (opacity=${pauseState.opacity})`,
);
assert.equal(pauseState.highlighted, 0, "no strum highlighting while paused");

await page.screenshot({
  path: path.join(ARTIFACT_DIR, "strum-playhead-paused.png"),
  fullPage: false,
});

// Resume and look for a large backward snap on sequence repeat.
await page.evaluate(() => {
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
  candidate?.click();
});
await page.waitForTimeout(300);

const dense = [];
for (let i = 0; i < 70; i++) {
  dense.push(await readPlayheadSample());
  await page.waitForTimeout(50);
}
const denseVisible = dense.filter((s) => s.opacity > 0.5 && !s.error);
const forwardSteps = [];
const backwardSnaps = [];
for (let i = 1; i < denseVisible.length; i++) {
  const prev = denseVisible[i - 1];
  const curr = denseVisible[i];
  if (Math.abs(curr.y - prev.y) > 30) continue;
  const dx = curr.x - prev.x;
  if (dx > 0) forwardSteps.push(dx);
  if (dx < -40) backwardSnaps.push(dx);
}
const maxForward = forwardSteps.length ? Math.max(...forwardSteps) : 0;
console.log("max forward step:", maxForward.toFixed(1));
console.log("backward snaps:", backwardSnaps);
assert.ok(
  maxForward < 80,
  `no large forward skips across variable-width columns (max=${maxForward.toFixed(1)})`,
);
if (backwardSnaps.length > 0) {
  console.log(`  PASS  ${backwardSnaps.length} repeat snap(s) observed`);
} else {
  console.log("  INFO  no wrap observed in this window; snap rule still in hook");
}

assert.equal(pageErrors.length, 0, `no page errors: ${pageErrors.join("; ")}`);
console.log("\nALL STRUM PLAYHEAD CHECKS PASSED");
await browser.close();
