// Browser verification for the playback-modal WAAPI strip.
//
// Usage:
//   1. npm run dev
//   2. node scripts/verifyPlaybackStripWaapi.mjs [baseURL]
//
// Covers the real hook and the driver:
// - free-run keyframes stay on the motion model (no per-frame seeks)
// - playbackRate stays 1, including the pre-scheduled successor
// - loop-continuous motion and short-horizon segment handoff do not jump
// - a painted-frame slew absorbs an audio-clock jump without a seek
// - lead-in holds the anchor chord, then moves
// - resume anchor is that chord's position
// - pause commits the painted frame and cancels the animation
// - a main-thread stall advances WAAPI and does not advance an rAF writer

import { chromium } from "playwright";
import fs from "node:fs";
import sharp from "sharp";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const HARNESS = `${BASE}/dev-playback-strip-harness`;
const ARTIFACT_DIR = "/opt/cursor/artifacts/playback-strip-waapi";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${message}`);
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  const delta = Math.abs(actual - expected);
  assert(
    delta <= tolerance,
    `${message} (actual ${actual.toFixed(2)}, expected ${expected.toFixed(2)}, delta ${delta.toFixed(2)})`,
  );
}

async function openHarness(page, params) {
  const url = `${HARNESS}?${new URLSearchParams(params).toString()}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('#devPlaybackStripHarness[data-ready="1"]', {
    timeout: 30000,
  });
  await page.waitForFunction(
    () => {
      const harness = window.__playbackStripHarness;
      const snapshot = harness?.getSnapshot();
      if (!snapshot || harness.readPositionPx() === null) return false;
      // Lead-in holds an inline transform before the animation exists.
      // Once audio has started, exactly one WAAPI animation should own the strip.
      if (snapshot.audioElapsedMs < 0) return true;
      return snapshot.playStates.length === 1;
    },
    { timeout: 15000 },
  );
}

async function sampleFrames(page, durationMs) {
  return page.evaluate(async (duration) => {
    const harness = window.__playbackStripHarness;
    const frames = [];
    const start = performance.now();

    await new Promise((resolve) => {
      const tick = () => {
        const snapshot = harness.getSnapshot();
        frames.push({
          t: performance.now() - start,
          painted: harness.readPositionPx(),
          expected: snapshot?.expectedPositionPx ?? null,
          audio: snapshot?.audioPositionPx ?? null,
          audioElapsed: snapshot?.audioElapsedMs ?? null,
          visualElapsed: snapshot?.visualElapsedMs ?? null,
          rates: snapshot?.playbackRates ?? [],
          states: snapshot?.playStates ?? [],
          corrections: snapshot?.correctionCount ?? 0,
          queued: (snapshot?.playStates.length ?? 0) > 1,
          scrollRef: harness.scrollPosition(),
        });
        if (performance.now() - start < duration) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

    return frames;
  }, durationMs);
}

function summarizeMotion(frames, { syncTo = "expected" } = {}) {
  const usable = frames.filter(
    (frame) =>
      typeof frame.painted === "number" &&
      typeof frame[syncTo] === "number" &&
      frame.audioElapsed > 40,
  );
  const errors = usable.map((frame) => Math.abs(frame.painted - frame[syncTo]));
  const deltas = [];
  for (let index = 1; index < frames.length; index++) {
    const previous = frames[index - 1];
    const current = frames[index];
    if (
      typeof previous.painted === "number" &&
      typeof current.painted === "number"
    ) {
      deltas.push(current.painted - previous.painted);
    }
  }
  const positive = deltas.filter((delta) => delta > 0.2).sort((a, b) => a - b);
  const median =
    positive.length === 0 ? 0 : positive[Math.floor(positive.length / 2)];
  const maxDelta = deltas.reduce(
    (max, delta) => Math.max(max, delta),
    0,
  );
  const minDelta = deltas.reduce(
    (min, delta) => Math.min(min, delta),
    0,
  );
  const maxError = errors.reduce((max, error) => Math.max(max, error), 0);
  const rates = new Set(frames.flatMap((frame) => frame.rates));
  const stalled = (() => {
    let lastMoveAt = null;
    let worst = 0;
    for (let index = 1; index < frames.length; index++) {
      const previous = frames[index - 1];
      const current = frames[index];
      if ((current.audioElapsed ?? 0) < 80) continue;
      if (lastMoveAt === null) lastMoveAt = previous.t;
      if (
        Math.abs((current.painted ?? 0) - (previous.painted ?? 0)) > 0.05
      ) {
        lastMoveAt = current.t;
      }
      worst = Math.max(worst, current.t - lastMoveAt);
    }
    return worst;
  })();

  return {
    frames: frames.length,
    usable: usable.length,
    maxError,
    medianDelta: median,
    maxDelta,
    minDelta,
    rates: [...rates],
    stalledMs: stalled,
    corrections: frames[frames.length - 1]?.corrections ?? 0,
    sawQueued: frames.some((frame) => frame.queued),
  };
}

function assertSmooth(summary, label) {
  assert(summary.frames > 20, `${label}: sampled enough frames (${summary.frames})`);
  assert(
    summary.rates.length > 0 && summary.rates.every((rate) => rate === 1),
    `${label}: playbackRate stays 1 (${summary.rates.join(",") || "none"})`,
  );
  assert(
    summary.maxError <= 2,
    `${label}: painted position stays within 2px of the model (max ${summary.maxError.toFixed(2)}px)`,
  );
  assert(
    summary.minDelta >= -0.75,
    `${label}: strip never jumps backward (min frame delta ${summary.minDelta.toFixed(2)}px)`,
  );
  const jumpLimit = Math.max(8, summary.medianDelta * 3.5);
  assert(
    summary.maxDelta <= jumpLimit,
    `${label}: no forward stutter (max ${summary.maxDelta.toFixed(2)}px, median ${summary.medianDelta.toFixed(2)}px, limit ${jumpLimit.toFixed(2)}px)`,
  );
  assert(
    summary.stalledMs < 90,
    `${label}: no stall longer than a couple of frames (${summary.stalledMs.toFixed(0)}ms)`,
  );
}

async function markerColumn(buffer) {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bestX = -1;
  let bestScore = 0;
  for (let x = 0; x < info.width; x++) {
    let score = 0;
    for (let y = 0; y < info.height; y += 2) {
      const index = (y * info.width + x) * info.channels;
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      if (green > 200 && red < 80 && blue < 80) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }
  return { x: bestX, score: bestScore };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
page.setDefaultTimeout(20000);

try {
  console.log("\n[hook] free-run across a loop");
  await openHarness(page, { mode: "hook", autostart: "1", leadMs: "30" });
  const loopFrames = await sampleFrames(page, 2400);
  fs.writeFileSync(
    `${ARTIFACT_DIR}/hook-loop-frames.json`,
    JSON.stringify(loopFrames),
  );
  const loopSummary = summarizeMotion(loopFrames);
  console.log(" ", loopSummary);
  assertSmooth(loopSummary, "hook loop");
  assert(
    loopFrames.every((frame) => !frame.queued),
    "hook loop: a second transform animation is never stacked on the strip",
  );
  assert(loopSummary.corrections === 0, "hook loop: clocks did not need a correction");
  const early = loopFrames.find((frame) => frame.audioElapsed > 40);
  assert(early, "hook loop: saw a frame after the lead-in");
  const endKeyframesAway = Math.abs((early.painted ?? 0) - (early.expected ?? 0));
  assert(
    endKeyframesAway < 8,
    `hook loop: opening frame is the playhead, not the end keyframe (delta ${endKeyframesAway.toFixed(2)}px)`,
  );
  const final = loopFrames[loopFrames.length - 1];
  assertClose(
    final.painted,
    final.audio,
    8,
    "hook loop: end position is within 8px of the audio clock",
  );

  console.log("\n[hook] lead-in hold then motion");
  await openHarness(page, { mode: "hook", autostart: "1", leadMs: "220" });
  const leadFrames = await sampleFrames(page, 500);
  const held = leadFrames.filter((frame) => frame.audioElapsed < -30);
  const moved = leadFrames.filter((frame) => frame.audioElapsed > 80);
  assert(held.length > 3, `lead-in: captured hold frames (${held.length})`);
  const holdPositions = held
    .map((frame) => frame.painted)
    .filter((position) => typeof position === "number");
  const holdSpread =
    Math.max(...holdPositions) - Math.min(...holdPositions);
  assert(
    holdSpread < 0.6,
    `lead-in: strip stays parked (spread ${holdSpread.toFixed(2)}px)`,
  );
  assert(moved.length > 3, `lead-in: captured moving frames (${moved.length})`);
  assert(
    moved[moved.length - 1].painted > holdPositions[0] + 4,
    "lead-in: strip moves after the audio clock starts",
  );

  console.log("\n[hook] resume anchor");
  await openHarness(page, {
    mode: "hook",
    autostart: "1",
    leadMs: "180",
    anchor: "5",
  });
  const anchorFrames = await sampleFrames(page, 120);
  const anchorHold = anchorFrames.find((frame) => frame.audioElapsed < 0);
  assert(anchorHold, "anchor: saw the lead-in");
  const expectedAnchor = await page.evaluate(() =>
    window.__playbackStripHarness.expectedPositionPx(0),
  );
  assertClose(
    anchorHold.painted,
    expectedAnchor,
    1,
    "anchor: lead-in parks on the anchored chord",
  );
  assert(expectedAnchor > 20, "anchor: anchored chord is not the strip origin");

  console.log("\n[hook] pause commits the painted frame");
  await openHarness(page, { mode: "hook", autostart: "1", leadMs: "20" });
  await page.waitForTimeout(350);
  const beforePause = await page.evaluate(
    () => window.__playbackStripHarness.readPositionPx(),
  );
  await page.evaluate(() => window.__playbackStripHarness.pause());
  await page.waitForTimeout(40);
  const afterPause = await page.evaluate(() => {
    const strip = document.querySelector("[data-strip]");
    return {
      position: window.__playbackStripHarness.readPositionPx(),
      animations: strip.getAnimations().length,
      motion: strip.dataset.playbackMotion ?? "",
    };
  });
  await page.waitForTimeout(180);
  const laterPause = await page.evaluate(
    () => window.__playbackStripHarness.readPositionPx(),
  );
  assertClose(afterPause.position, beforePause, 2, "pause: holds the frame that was playing");
  assertClose(laterPause, afterPause.position, 0.5, "pause: stays parked");
  assert(afterPause.animations === 0, "pause: WAAPI animations are cancelled");
  assert(afterPause.motion === "", "pause: compositor session flag is cleared");

  console.log("\n[driver] segment handoff");
  await openHarness(page, {
    mode: "driver",
    autostart: "1",
    leadMs: "20",
    segmentMs: "420",
  });
  const handoffFrames = await sampleFrames(page, 1500);
  fs.writeFileSync(
    `${ARTIFACT_DIR}/handoff-frames.json`,
    JSON.stringify(handoffFrames),
  );
  const handoffSummary = summarizeMotion(handoffFrames);
  console.log(" ", handoffSummary);
  assertSmooth(handoffSummary, "handoff");
  assert(
    handoffFrames.every((frame) => !frame.queued),
    "handoff: extension replaces the animation instead of stacking one",
  );
  assert(
    handoffSummary.corrections === 0,
    "handoff: chaining does not take the drift-correction path",
  );
  assert(
    handoffFrames[handoffFrames.length - 1].painted > 80,
    "handoff: motion continues past several segments",
  );

  console.log("\n[driver] audio jump slews instead of seeking");
  await openHarness(page, { mode: "driver", autostart: "1", leadMs: "20" });
  await page.waitForTimeout(250);
  const beforeJump = await sampleFrames(page, 120);
  await page.evaluate(() => window.__playbackStripHarness.jumpAudioByMs(80));
  const afterJump = await sampleFrames(page, 1800);
  const jumpFrames = [...beforeJump, ...afterJump];
  fs.writeFileSync(
    `${ARTIFACT_DIR}/slew-frames.json`,
    JSON.stringify(jumpFrames),
  );
  const slewSummary = summarizeMotion(jumpFrames);
  console.log(" ", slewSummary);
  assert(
    slewSummary.rates.every((rate) => rate === 1),
    "slew: playbackRate stays 1 through the correction",
  );
  assert(
    slewSummary.minDelta >= -0.75,
    `slew: correction does not jump backward (${slewSummary.minDelta.toFixed(2)}px)`,
  );
  const slewJumpLimit = Math.max(8, slewSummary.medianDelta * 3.5);
  assert(
    slewSummary.maxDelta <= slewJumpLimit,
    `slew: correction does not jump forward (max ${slewSummary.maxDelta.toFixed(2)}px, limit ${slewJumpLimit.toFixed(2)}px)`,
  );
  assert(slewSummary.corrections >= 1, "slew: a correction actually ran");
  const slewEnd = afterJump[afterJump.length - 1];
  assertClose(
    slewEnd.painted,
    slewEnd.audio,
    8,
    "slew: strip catches the audio clock",
  );

  console.log("\n[hook] main-thread stall");
  await openHarness(page, { mode: "hook", autostart: "1", leadMs: "20" });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const node = document.createElement("div");
    node.dataset.rafWriter = "1";
    node.dataset.x = "0";
    document.body.appendChild(node);
    let x = 0;
    const step = () => {
      x += 1;
      node.dataset.x = String(x);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await page.waitForTimeout(80);
  const stall = await page.evaluate(() => {
    const harness = window.__playbackStripHarness;
    const raf = document.querySelector("[data-raf-writer]");
    const before = {
      waapi: harness.readPositionPx(),
      raf: Number(raf.dataset.x),
      audio: harness.getSnapshot()?.audioElapsedMs ?? 0,
      expected: harness.getSnapshot()?.expectedPositionPx ?? null,
    };
    const start = performance.now();
    while (performance.now() - start < 280) {
      // Document timeline updates on rendering steps, so an in-task style read
      // stays latched. rAF cannot run at all.
    }
    return {
      before,
      during: {
        waapi: harness.readPositionPx(),
        raf: Number(raf.dataset.x),
      },
      blockedMs: performance.now() - start,
    };
  });
  const afterFrame = await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          const harness = window.__playbackStripHarness;
          const snapshot = harness.getSnapshot();
          resolve({
            waapi: harness.readPositionPx(),
            raf: Number(document.querySelector("[data-raf-writer]").dataset.x),
            audio: snapshot?.audioElapsedMs ?? 0,
            expected: snapshot?.expectedPositionPx ?? null,
          });
        });
      }),
  );
  fs.writeFileSync(
    `${ARTIFACT_DIR}/stall.json`,
    JSON.stringify({ stall, afterFrame }, null, 2),
  );
  console.log(" ", { stall, afterFrame });
  assert(
    stall.during.raf === stall.before.raf,
    "stall: rAF writer does not advance inside the long task",
  );
  assert(
    afterFrame.raf - stall.before.raf <= 5,
    `stall: rAF writer only flushes a few frames after the task (${afterFrame.raf - stall.before.raf})`,
  );
  assert(
    afterFrame.audio - stall.before.audio > 240,
    "stall: audio clock includes the whole blocked interval",
  );
  assertClose(
    afterFrame.waapi,
    afterFrame.expected,
    2,
    "stall: one frame later WAAPI is on the model, not catching up one rAF at a time",
  );
  assert(
    afterFrame.waapi - stall.before.waapi > 20,
    `stall: WAAPI absorbed the stall (${(afterFrame.waapi - stall.before.waapi).toFixed(1)}px)`,
  );

  console.log("\n[hook] painted frames advance smoothly");
  await openHarness(page, { mode: "hook", autostart: "1", leadMs: "20" });
  await page.waitForTimeout(80);
  const viewport = await page.locator("[data-viewport]").boundingBox();
  assert(viewport, "paint: viewport is measurable");
  const cdp = await page.context().newCDPSession(page);
  const shots = [];
  for (let index = 0; index < 3; index++) {
    const started = performance.now();
    const result = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip: {
        x: viewport.x,
        y: viewport.y,
        width: viewport.width,
        height: viewport.height,
        scale: 1,
      },
    });
    const captureMs = performance.now() - started;
    const buffer = Buffer.from(result.data, "base64");
    const path = `${ARTIFACT_DIR}/paint-${index}.png`;
    fs.writeFileSync(path, buffer);
    shots.push({
      index,
      captureMs,
      marker: await markerColumn(buffer),
    });
    await page.waitForTimeout(100);
  }
  fs.writeFileSync(
    `${ARTIFACT_DIR}/paint-shots.json`,
    JSON.stringify(shots, null, 2),
  );
  console.log(" ", shots);
  assert(
    shots.every((shot) => shot.marker.score > 8),
    `paint: marker stayed visible (${shots.map((shot) => shot.marker.score).join(", ")})`,
  );
  for (let index = 1; index < shots.length; index++) {
    assert(
      shots[index].marker.x < shots[index - 1].marker.x - 4,
      `paint: marker moved left between shots ${index - 1} and ${index} (${shots[index - 1].marker.x} -> ${shots[index].marker.x})`,
    );
  }
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
  console.error(error);
} finally {
  await page.close();
  await browser.close();
}

console.log(`\n${checks - failures.length}/${checks} checks passed`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
