// Regression checks for the playback performance audit.
// node scripts/verifyPlaybackPerformance.mjs [baseURL] [--logic-only]
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import ts from "typescript";
import { chromium } from "playwright";

// Exercise production TS, including its real beaming dependencies.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("~/")) {
      const base = resolve("src", specifier.slice(2));
      const path = [base, base + ".ts", base + ".tsx", base + ".js"].find(
        existsSync,
      );
      if (!path) throw new Error("Unresolved import: " + specifier);
      return nextResolve(pathToFileURL(path).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.includes("/src/")) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      const path = [base + ".ts", base + ".tsx", base + ".js"].find(existsSync);
      if (path) return nextResolve(pathToFileURL(path).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      /\.[cm]?tsx?$/.test(url) &&
      !url.includes("/node_modules/")
    ) {
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          fileName: fileURLToPath(url),
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});

const {
  closestPlaybackChordPosition,
  nearestPlaybackChordIndex,
  playbackChordIndexAtPosition,
  playbackOverscanPx,
  visiblePlaybackCopies,
} = await import("../src/utils/playbackViewport.ts");
const { beamBreaksForPlaybackIndex, resolveBeamBreaks } =
  await import("../src/utils/noteLengthBeaming.ts");
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}

const widths = [16, 34, 1, 40, 34, 34, 1, 34];
let offset = 0;
const positions = widths.map((width) => {
  const start = offset;
  offset += width;
  return start;
});
const layout = {
  scrollPositions: positions,
  chordWidths: widths,
  totalWidth: offset,
  durations: [0, 0.25, 0, 0.5, 0.25, 0.25, 0, 0.25],
};
for (let position = 0; position < offset * 4; position += 0.7) {
  const candidates = Array.from({ length: 6 }, (_, repetition) =>
    positions.map((left, index) => ({
      index,
      left: left + repetition * offset,
    })),
  ).flat();
  const previous = candidates.filter((copy) => copy.left <= position).at(-1);
  check(
    playbackChordIndexAtPosition(position, positions, offset) ===
      previous.index,
    "playhead lookup across forward/backward loop boundaries",
  );
  const nearest = candidates.toSorted(
    (a, b) =>
      Math.abs(a.left - position) - Math.abs(b.left - position) ||
      a.index - b.index,
  )[0];
  const index = nearestPlaybackChordIndex(position, positions, offset);
  check(
    index === nearest.index,
    "nearest chord includes the next loop's first chord",
  );
  check(
    Math.abs(
      closestPlaybackChordPosition(index, positions, offset, position) -
        nearest.left,
    ) < 1e-8,
    "snap keeps its absolute loop coordinate",
  );
}
for (const viewportWidth of [100, 390, 1152]) {
  const overscan = playbackOverscanPx(layout);
  let center = 0;
  const journey = Array.from({ length: 600 }, (_, i) => i * 7.3);
  for (const position of [...journey, ...journey.toReversed()]) {
    if (Math.abs(position - center) >= overscan / 3) center = position;
    const copies = visiblePlaybackCopies(
      layout,
      center,
      viewportWidth,
      overscan,
    );
    let covered = Math.max(0, position - viewportWidth / 2);
    const end = position + viewportWidth / 2;
    for (const copy of copies) {
      if (copy.left + widths[copy.index] <= covered) continue;
      check(
        copy.left <= covered + 1e-8,
        "mounted copies have no viewport holes, including very short loops",
      );
      covered = Math.max(covered, copy.left + widths[copy.index]);
      if (covered >= end) break;
    }
    check(
      covered >= end,
      "visibility hysteresis covers the viewport in both directions",
    );
  }
}

function chord(noteLength = "eighth", extras = {}) {
  return {
    type: "tab",
    isFirstChord: false,
    isLastChord: false,
    data: {
      chordData: ["", "", "3", "2", "0", "", "", "", noteLength, "120", ""],
    },
    ...extras,
  };
}
const beamChords = Array.from({ length: 8 }, () => chord());
assert.deepEqual(
  beamChords.map((_, index) => beamBreaksForPlaybackIndex(beamChords, index)),
  resolveBeamBreaks(
    beamChords.map(() => ({ noteLength: "eighth", isRest: false })),
  ),
);
checks++;
let reads = 0;
const longSpan = Array.from({ length: 2000 }, () => {
  const value = chord();
  const data = value.data;
  Object.defineProperty(value, "data", {
    get() {
      reads++;
      return data;
    },
  });
  return value;
});
beamBreaksForPlaybackIndex(longSpan, 0);
const afterCompile = reads;
for (let repeat = 0; repeat < 5; repeat++)
  for (let index = 0; index < longSpan.length; index++)
    beamBreaksForPlaybackIndex(longSpan, index);
check(
  reads === afterCompile,
  "10,000 cached lookups never walk the 2,000-note span again",
);
const recompiled = [chord("quarter"), ...beamChords.slice(1)];
check(
  beamBreaksForPlaybackIndex(recompiled, 0).breakWithNext,
  "a recompiled sequence invalidates beam flags",
);
const boundary = [
  ...beamChords.slice(0, 3),
  chord("measureLine", { data: { chordData: ["|"] } }),
  ...beamChords.slice(3),
];
check(
  beamBreaksForPlaybackIndex(boundary, 2).breakWithNext &&
    beamBreaksForPlaybackIndex(boundary, 4).breakWithPrevious,
  "measure lines reset cached spans",
);
console.log(
  "PASS production geometry, viewport coverage, and beam cache (" +
    checks +
    " assertions)",
);
if (process.argv.includes("--logic-only")) process.exit(0);

const baseURL =
  process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
let context = await browser.newContext({
  viewport: process.argv.includes("--narrow-only")
    ? { width: 390, height: 844 }
    : { width: 1280, height: 800 },
});
await context.addCookies([
  { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
]);
let page = await context.newPage();
const errors = [];
const navigations = [];
function observePage(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = new URL(frame.url());
    navigations.push({ at: Date.now(), path: url.origin + url.pathname });
    console.log("Navigation: " + url.origin + url.pathname);
  });
  page.on("request", (request) => {
    if (!request.isNavigationRequest() || request.frame() !== page.mainFrame())
      return;
    const url = new URL(request.url());
    console.log(
      "Navigation request: " +
        url.origin +
        url.pathname +
        " (query keys: " +
        [...url.searchParams.keys()].join(",") +
        ")",
    );
  });
  page.on("console", (message) => {
    if (/Fast Refresh.*(reload|rebuild)|full reload/.test(message.text()))
      console.log(message.text().split("\n")[0]);
  });
}
observePage(page);
const results = [];
async function openFixture() {
  await page.goto(baseURL + "/dev-virtualization-harness?fixture=huge", {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForFunction(
    () =>
      window.__AUTOSTRUM_GET_TAB_STORE__?.().expandedTabData?.length === 899,
  );
  await page.evaluate(() =>
    window.__AUTOSTRUM_GET_TAB_STORE__().setShowPlaybackModal(true),
  );
  await page.waitForSelector("[data-playback-strip]");
  await page.waitForFunction(
    () =>
      window.__AUTOSTRUM_GET_TAB_STORE__().visiblePlaybackContainerWidth > 0,
  );
  await page.evaluate(
    readFileSync(
      new URL("./auditPlaybackPerformance.browser.mjs", import.meta.url),
      "utf8",
    ),
  );
}
try {
  await openFixture();

  async function measure(expression) {
    const result = await page.evaluate(expression);
    results.push(result);
    console.log(JSON.stringify(result));
    assert.ok(result.maxGapPx <= 2, "viewport coverage: " + result.label);
    return result;
  }
  if (!process.argv.includes("--narrow-only")) {
    // The original 189px-for-8px failure: assert every tiny sample, not just the
    // ending chord, which would miss jumps followed by corrections.
    const reversal = await page.evaluate(async () => {
      const a = window.__playbackAudit;
      a.store().setCurrentChordIndex(885);
      await new Promise((resolve) => setTimeout(resolve, 700));
      const start = a.position();
      a.pointer("pointerdown", 800);
      a.pointer("pointermove", 783);
      await a.nextFrame();
      await a.nextFrame();
      const samples = [a.position()];
      for (let i = 1; i <= 8; i++) {
        a.pointer("pointermove", 783 + i);
        await a.nextFrame();
        await a.nextFrame();
        samples.push(a.position());
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      a.pointer("pointerup", 791);
      return { start, samples };
    });
    assert.ok(
      Math.abs(reversal.samples[0] - reversal.start - 17) < 0.1,
      "forward tracking is 1:1",
    );
    reversal.samples.forEach((position, index) =>
      assert.ok(
        Math.abs(position - (reversal.samples[0] - index)) < 0.1,
        "backward tracking stays 1:1 at sample " + index,
      ),
    );
    results.push({
      label: "loop-end reversal",
      backwardInputPx: 8,
      backwardStripTravelPx: reversal.samples[0] - reversal.samples.at(-1),
    });

    const crossing = await page.evaluate(async () => {
      const a = __playbackAudit;
      a.store().setCurrentChordIndex(898);
      await new Promise((resolve) => setTimeout(resolve, 700));
      const start = a.position();
      a.pointer("pointerdown", 600);
      a.pointer("pointermove", 500);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const forward = a.position();
      a.pointer("pointerup", 500);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const paused = a.position();
      await a.play();
      const resumed = a.position();
      a.pointer("pointerdown", 600);
      const grab = a.position();
      a.pointer("pointermove", 800);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const backward = a.position();
      a.pointer("pointerup", 800);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        start,
        forward,
        paused,
        resumed,
        grab,
        backward,
        totalWidth: a.info().totalWidth,
      };
    });
    assert.ok(
      Math.abs(crossing.forward - crossing.start - 100) < 0.1,
      "forward drag crosses into the next loop without rebasing",
    );
    assert.ok(
      crossing.paused > crossing.totalWidth,
      "release retains the next loop coordinate",
    );
    assert.ok(
      crossing.resumed >= crossing.paused &&
        crossing.resumed - crossing.paused < 100,
      "resume keeps the scrubbed loop anchor",
    );
    assert.ok(
      Math.abs(crossing.grab - crossing.backward - 200) < 0.1 &&
        crossing.backward < crossing.totalWidth,
      "backward live grab crosses into the previous loop continuously",
    );
    results.push({
      label: "forward wrap, release, resume, backward wrap",
      ...crossing,
    });

    await page.evaluate(async () => {
      await __playbackAudit.prepare({ notes: 2000, barEvery: 0 });
      __playbackAudit.store().setCurrentChordIndex(400);
    });
    await page.waitForTimeout(700);
    const forward = await measure(
      "__playbackAudit.measure('2000 unbroken notes: forward drag',3000,{segments:[{deltaPx:-600,durationMs:2000}]})",
    );
    const backward = await measure(
      "__playbackAudit.measure('2000 unbroken notes: backward drag',3000,{segments:[{deltaPx:600,durationMs:2000}]})",
    );
    assert.ok(
      forward.mountedMax < 70 && backward.mountedMax < 70,
      "dragging mounts a bounded viewport, not the 1000px paused buffer",
    );
    assert.equal(
      forward.longTasks,
      0,
      "unbroken forward drag has no long tasks",
    );
    assert.equal(
      backward.longTasks,
      0,
      "unbroken backward drag has no long tasks",
    );

    await page.evaluate(async () => {
      await __playbackAudit.prepare({ notes: 8000, barEvery: 8 });
      __playbackAudit.store().setCurrentChordIndex(2000);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await __playbackAudit.play();
    });
    const large = await measure(
      "__playbackAudit.measure('8999 columns: normal playback',3000)",
    );
    assert.ok(
      large.mountedMax < 70,
      "large tabs keep the mounted window bounded",
    );
    await measure(
      "__playbackAudit.measure('8999 columns: backward live grab',2200,{segments:[{deltaPx:600,durationMs:1400}]})",
    );

    await page.evaluate(async () => {
      await __playbackAudit.prepare({
        notes: 800,
        barEvery: 8,
        noteLength: "sixteenth",
        bpm: 300,
        playbackSpeed: 1.5,
      });
      __playbackAudit.store().setCurrentChordIndex(700);
      await __playbackAudit.play();
    });
    await measure(
      "__playbackAudit.measure('300 BPM sixteenths 1.5x through loop wrap',8000)",
    );
    const grab = await measure(
      "__playbackAudit.measure('live playback grab',2200,{segments:[{deltaPx:-300,durationMs:1200}]})",
    );
    assert.ok(
      grab.mountedMax < 70,
      "live grab does not multiply mounted columns",
    );

    // Playwright mouse events additionally exercise native pointer capture and a
    // direction change inside the viewport (the precise probes are synthetic).
    const bounds = await page.locator("[data-playback-strip]").boundingBox();
    await page.mouse.move(bounds.x + 700, bounds.y + 130);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 500, bounds.y + 130, { steps: 20 });
    await page.mouse.move(bounds.x + 650, bounds.y + 130, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    assert.equal(
      await page
        .locator(".playbackModalGradient button[aria-label='Play/Pause']")
        .isDisabled(),
      false,
      "Play is available after a real mouse drag/reversal settles",
    );

    // Each viewport gets a fresh session. The audit's live orientation recovery
    // issue is separate from these steady-viewport performance regressions.
    await context.close();
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addCookies([
      { name: "__clerk_db_jwt", value: "dev_browser_fake_jwt", url: baseURL },
    ]);
    page = await context.newPage();
    observePage(page);
    await openFixture();
  }
  await page.evaluate(async () => {
    await __playbackAudit.prepare({
      notes: 800,
      barEvery: 8,
      noteLength: "sixteenth",
      bpm: 300,
      playbackSpeed: 1.5,
    });
    await __playbackAudit.play();
  });
  await measure("__playbackAudit.measure('390px: fast playback',5000)");
  for (let i = 1; i <= 3; i++) {
    const result = await measure(
      "__playbackAudit.measure('390px: live grab " +
        i +
        "',1800,{segments:[{deltaPx:-150,durationMs:800}]})",
    );
    assert.ok(result.mountedMax < 40, "narrow grab stays bounded");
    assert.equal(result.longTasks, 0, "narrow live grab has no long task");
    await page.evaluate(() => __playbackAudit.play());
  }
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log("PASS playback performance browser regressions");
} catch (error) {
  await page.waitForTimeout(800);
  console.log(
    "Failure URL: " + new URL(page.url()).origin + new URL(page.url()).pathname,
  );
  console.log("Runtime errors: " + JSON.stringify(errors));
  throw error;
} finally {
  const artifactDirectory = resolve(
    "node_modules/.cache/autostrum-playback-performance",
  );
  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(
    resolve(artifactDirectory, "results.json"),
    JSON.stringify({ results, errors, navigations }, null, 2),
  );
  await browser.close();
  console.log("Results: " + resolve(artifactDirectory, "results.json"));
}
