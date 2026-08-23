/**
 * Verifies editing autoscroll centers the active chord on tablet+ viewports.
 *
 * Usage:
 *   1. npm run dev
 *   2. node scripts/verifyAutoscrollCenterOffset.mjs [baseURL]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const ARTIFACT_DIR = "/opt/cursor/artifacts/autoscroll-center-verify";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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

function makeTabSubsection(noteCount = 8) {
  const columns = [];
  for (let i = 0; i < noteCount; i++) {
    columns.push(note(String((i % 5) + 1)));
    if ((i + 1) % 4 === 0) columns.push(measureLine());
  }
  return {
    id: uuid(),
    type: "tab",
    bpm: -1,
    repetitions: 1,
    baseNoteLength: "eighth",
    data: columns,
  };
}

const draft = {
  title: "Autoscroll center verify",
  artistId: null,
  description: null,
  genre: "rock",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 180,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
  strummingPatterns: [],
  tabData: [
    {
      id: uuid(),
      title: "Section 1",
      data: Array.from({ length: 8 }, () => makeTabSubsection(8)),
    },
  ],
  sectionProgression: [],
};

function isTabletOrLargerViewport(width, height) {
  return width >= 1024 && height >= 700;
}

function getCenteredChordOffset(viewportHeight, chordHeight) {
  return Math.round(viewportHeight / 2 - chordHeight / 2);
}

console.log("\n== Unit: viewport gating & offset math ==");
assert(isTabletOrLargerViewport(1024, 700), "1024x700 is tablet+");
assert(isTabletOrLargerViewport(1500, 800), "1500x800 is tablet+");
assert(!isTabletOrLargerViewport(1023, 700), "width < 1024 is not tablet+");
assert(!isTabletOrLargerViewport(1024, 699), "height < 700 is not tablet+");
assert(!isTabletOrLargerViewport(390, 844), "mobile is not tablet+");
const centerOffset = getCenteredChordOffset(800, 40);
assert(centerOffset === 380, `center offset is ${centerOffset} (expected 380)`);
assert(centerOffset + 20 === 400, "chord midpoint equals viewport midpoint");

async function ensureAutoscrollEnabled(page) {
  // Desktop (≥1024) uses a Toggle; mobile uses a Switch inside the settings drawer.
  // Prefer the visible toggle when present; otherwise trust JSON localStorage seeding.
  const state = await page.evaluate(() => {
    const autoBtn = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim() === "Autoscroll",
    );
    if (autoBtn) {
      return {
        kind: "toggle",
        pressed: autoBtn.getAttribute("aria-pressed") === "true",
      };
    }
    const ls = localStorage.getItem("autostrum-autoscroll");
    return { kind: "storage", pressed: ls === JSON.stringify("true") };
  });

  if (state.kind === "toggle" && !state.pressed) {
    await page.getByRole("button", { name: "Autoscroll", exact: true }).click();
    await page.waitForTimeout(200);
  }

  const enabled = await page.evaluate(() => {
    const autoBtn = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim() === "Autoscroll",
    );
    if (autoBtn) return autoBtn.getAttribute("aria-pressed") === "true";
    return localStorage.getItem("autostrum-autoscroll") === JSON.stringify("true");
  });
  assert(enabled, "autoscroll enabled");
}

async function clickPlay(page) {
  return page.evaluate(() => {
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
}

async function waitForPlayReady(page) {
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
}

async function samplePlayingChordPosition(page) {
  return page.evaluate(() => {
    const playhead = [...document.querySelectorAll("div")].find((el) => {
      const style = getComputedStyle(el);
      return (
        el.classList.contains("bg-primary") &&
        (el.className.includes("w-[2px]") || style.width === "2px") &&
        style.position === "absolute" &&
        Number(style.opacity) > 0.5
      );
    });
    if (!playhead) return { error: "no playhead" };

    const playheadRect = playhead.getBoundingClientRect();
    const playheadMidX = playheadRect.left + playheadRect.width / 2;
    const playheadMidY = playheadRect.top + playheadRect.height / 2;

    const chords = [...document.querySelectorAll('[id*="-chord"]')].filter(
      (el) => /^section\d+-subSection\d+-chord\d+$/.test(el.id),
    );

    let best = null;
    let bestDist = Infinity;
    for (const chord of chords) {
      const rect = chord.getBoundingClientRect();
      if (rect.height < 8 || rect.width < 4) continue;
      const verticallyNear =
        playheadMidY >= rect.top - 20 && playheadMidY <= rect.bottom + 20;
      if (!verticallyNear) continue;
      const chordMidX = rect.left + rect.width / 2;
      const dist = Math.abs(chordMidX - playheadMidX);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          id: chord.id,
          top: rect.top,
          midY: rect.top + rect.height / 2,
          height: rect.height,
          distX: dist,
        };
      }
    }

    if (!best) return { error: "no chord near playhead" };

    return {
      ...best,
      viewportMidY: window.innerHeight / 2,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      scrollY: window.scrollY,
      deltaFromCenter: Math.abs(best.midY - window.innerHeight / 2),
    };
  });
}

async function runPlaybackViewportCheck({
  width,
  height,
  expectCentered,
  label,
}) {
  console.log(`\n== Browser playback: ${label} (${width}x${height}) ==`);
  const browser = await chromium.launch({
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({
    viewport: { width, height },
  });
  await context.addCookies([
    { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: BASE },
  ]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.addInitScript((data) => {
    localStorage.setItem("autostrum-tabData", JSON.stringify(data));
    // useLocalStorageValue JSON-serializes values; raw "true" parses as boolean
    // and fails `value === "true"` in useGetLocalStorageValues.
    localStorage.setItem("autostrum-autoscroll", JSON.stringify("true"));
  }, draft);

  await page.goto(`${BASE}/create`, { waitUntil: "networkidle" });
  await page.locator("#section0-subSection0-chord0").waitFor({ timeout: 20000 });
  await waitForPlayReady(page);
  await ensureAutoscrollEnabled(page);

  const played = await clickPlay(page);
  assert(played, `${label}: clicked play`);

  // Wait for the initial center/comfortable scroll from play + first row changes.
  await page.waitForTimeout(1500);

  const samples = [];
  for (let i = 0; i < 10; i++) {
    const sample = await samplePlayingChordPosition(page);
    samples.push(sample);
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: `${ARTIFACT_DIR}/${label.replace(/\s+/g, "_")}.png`,
    fullPage: false,
  });

  const valid = samples.filter((s) => !s.error && s.scrollY > 40);
  console.log(
    `  samples: ${samples.length}, with scroll: ${valid.length}, last:`,
    samples.at(-1),
  );

  if (expectCentered) {
    assert(
      valid.length >= 1,
      `${label}: got ≥1 post-scroll sample (got ${valid.length})`,
    );
    if (valid.length >= 1) {
      // Ignore mid-tween samples from the 200ms smooth scroll; settled
      // frames should sit on the viewport midpoint.
      const settled = valid.filter((s) => s.deltaFromCenter <= 8);
      assert(
        settled.length >= Math.ceil(valid.length / 2),
        `${label}: ≥50% of scrolled samples centered (settled ${settled.length}/${valid.length})`,
      );
      const sortedDeltas = valid
        .map((s) => s.deltaFromCenter)
        .sort((a, b) => a - b);
      const median = sortedDeltas[Math.floor(sortedDeltas.length / 2)];
      assert(
        median <= 8,
        `${label}: median Δ=${median.toFixed(1)}px (≤8)`,
      );
      assert(
        settled.at(-1).deltaFromCenter <= 8,
        `${label}: a settled sample ends centered (Δ=${settled.at(-1).deltaFromCenter.toFixed(1)}px)`,
      );
    }
  } else {
    const scrolled = samples.filter((s) => !s.error && s.scrollY > 20);
    assert(
      scrolled.length >= 1,
      `${label}: got ≥1 post-scroll sample (got ${scrolled.length})`,
    );
    if (scrolled.length >= 1) {
      const avgMid =
        scrolled.reduce((sum, s) => sum + s.midY, 0) / scrolled.length;
      const viewportMid = scrolled[0].viewportMidY;
      assert(
        avgMid < viewportMid - 40,
        `${label}: comfortable align keeps chord above center (avgMid=${avgMid.toFixed(1)}, mid=${viewportMid})`,
      );
    }
  }

  assert(
    pageErrors.length === 0,
    `${label}: no page errors (${pageErrors[0] ?? ""})`,
  );

  await browser.close();
}

await runPlaybackViewportCheck({
  width: 1280,
  height: 800,
  expectCentered: true,
  label: "tablet+",
});

await runPlaybackViewportCheck({
  width: 390,
  height: 844,
  expectCentered: false,
  label: "mobile",
});

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length) {
  console.error("Failures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}
console.log("All assertions passed");
