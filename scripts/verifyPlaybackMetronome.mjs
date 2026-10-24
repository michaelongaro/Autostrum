// Run: node scripts/verifyPlaybackMetronome.mjs (Node 22.15+).
// Loads production timing code; no browser, database, or audio device required.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("~/")) {
      const base = resolve("src", specifier.slice(2));
      const path = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`].find(
        existsSync,
      );
      if (!path) throw new Error(`Unresolved test import: ${specifier}`);
      return nextResolve(pathToFileURL(path).href, context);
    }
    if (specifier.startsWith(".") && context.parentURL?.includes("/src/")) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      const path = [`${base}.ts`, `${base}.tsx`, `${base}.js`].find(existsSync);
      if (path) return nextResolve(pathToFileURL(path).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (
      url.startsWith("file:") &&
      /\.tsx?$/.test(url) &&
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

const { buildPlaybackTimeline } =
  await import("../src/utils/playbackScheduler.ts");
const { buildMetronomeTimeline, createPlaybackMetronome } =
  await import("../src/utils/playbackMetronome.ts");
const { createTabStore } = await import("../src/stores/TabStore.ts");
const note = (length = "quarter", bpm = 120) => [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "r",
  length,
  String(bpm),
];
const build = (compiledChords, options = {}) =>
  buildPlaybackTimeline({
    compiledChords,
    fromChordIndex: 0,
    adjChordCount: compiledChords.length,
    playbackSpeed: 1,
    startTime: 0,
    ...options,
  });
const times = (timeline) => buildMetronomeTimeline(timeline).clickTimes;
const rounded = (values) =>
  values.map((value) => Math.round(value * 1e8) / 1e8);

function fakeAudio() {
  const sources = [];
  const destination = {};
  const audioContext = {
    currentTime: 0,
    createOscillator() {
      const source = {
        frequency: {},
        connect() {},
        disconnect() {},
        start(when) {
          this.when = when;
        },
        stop(when) {
          if (when === undefined) this.cancelled = true;
        },
      };
      sources.push(source);
      return source;
    },
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect(target) {
          assert.equal(target, destination);
        },
        disconnect() {},
      };
    },
  };
  return { audioContext, destination, sources };
}

test("rests, mixed note lengths, and measure markers share one quarter-note pulse", () => {
  assert.deepEqual(
    times(
      build([
        note("eighth"),
        [],
        note("eighth"),
        note("half"),
        note("quarter dotted"),
      ]),
    ),
    [0, 0.5, 1, 1.5, 2],
  );
  assert.deepEqual(
    times(build([note("whole double-dotted")])),
    [0, 0.5, 1, 1.5, 2, 2.5, 3],
  );
});

test("tempo changes preserve the fractional beat, rather than clicking on every section boundary", () => {
  assert.deepEqual(
    times(build([note("eighth"), [], note("half", 60), note()])),
    [0, 0.75, 1.75, 2.5],
  );
});

test("playback speed scales beats independently of the note attack rate", () => {
  assert.deepEqual(
    times(build([note("half")], { playbackSpeed: 0.5 })),
    [0, 1],
  );
  assert.deepEqual(
    times(build([note("half")], { playbackSpeed: 2 })),
    [0, 0.25],
  );
});

test("seconds-based loop spacers retain the last musical BPM, including when resuming inside the delay", () => {
  const columns = [note("half"), [], note("quarter", 60), note("quarter", 60)];
  const options = { loopDelayChordCount: 2 };
  const timeline = build(columns, options);
  assert.deepEqual(times(timeline), [0, 0.5, 1, 1.5, 2, 2.5]);
  assert.equal(timeline.at(-1).duration, 1);
  assert.equal(timeline.at(-1).metronomeBpm, 120);
  assert.deepEqual(
    times(build(columns, { ...options, fromChordIndex: 2, startTime: 10 })),
    [10, 10.5, 11, 11.5],
  );
});

test("invalid BPMs and empty columns do not poison subsequent beats", () => {
  assert.deepEqual(
    times(build([[], note("quarter", "bad"), note("quarter", 0), note(), []])),
    [0],
  );
  assert.deepEqual(times(build([])), []);
});

test("resume anchors the pulse to the selected note", () => {
  assert.deepEqual(
    times(
      build([note("eighth"), note("half")], {
        fromChordIndex: 1,
        startTime: 10,
      }),
    ),
    [10, 10.5],
  );
});

test("uneven loops stay continuous across many wraps without adding boundary clicks", () => {
  const audio = fakeAudio();
  const columns = [note("eighth"), note("eighth"), note("eighth")];
  const metronome = createPlaybackMetronome({
    ...audio,
    timeline: build(columns, { startTime: 0.03 }),
    repeatTimeline: build(columns),
  });
  for (let poll = 0; poll < 500; poll++) {
    audio.audioContext.currentTime = poll / 100;
    metronome.schedule(true, true);
  }
  assert.deepEqual(
    rounded(audio.sources.map((source) => source.when)),
    Array.from({ length: 11 }, (_, index) => 0.03 + index * 0.5),
  );
  metronome.stop();
  assert.ok(audio.sources.every((source) => source.cancelled));
});

test("next-loop clicks are scheduled before the note scheduler wraps", () => {
  const audio = fakeAudio();
  const columns = [note()];
  const metronome = createPlaybackMetronome({
    ...audio,
    timeline: build(columns, { startTime: 1 }),
    repeatTimeline: build(columns),
  });
  audio.audioContext.currentTime = 1.4;
  metronome.schedule(true, true);
  assert.deepEqual(
    audio.sources.map((source) => source.when),
    [1.5],
  );
});

test("disabled playback is silent; enabling joins the running beat; disabling cancels future clicks", () => {
  const audio = fakeAudio();
  const timeline = build([note("whole")], { startTime: 1 });
  const metronome = createPlaybackMetronome({
    ...audio,
    timeline,
    repeatTimeline: [],
  });
  audio.audioContext.currentTime = 1.1;
  metronome.schedule(false, false);
  assert.equal(audio.sources.length, 0);
  audio.audioContext.currentTime = 1.4;
  metronome.schedule(true, false);
  assert.deepEqual(
    audio.sources.map((source) => source.when),
    [1.5],
  );
  metronome.schedule(false, false);
  assert.ok(audio.sources[0].cancelled);
  metronome.stop();
  audio.audioContext.currentTime = 1.9;
  metronome.schedule(true, false);
  assert.equal(audio.sources.length, 1);
});

test("delayed polls skip stale clicks instead of producing a burst", () => {
  const audio = fakeAudio();
  const metronome = createPlaybackMetronome({
    ...audio,
    timeline: build([note("whole")], { startTime: 1 }),
    repeatTimeline: [],
  });
  audio.audioContext.currentTime = 2.4;
  metronome.schedule(true, false);
  assert.deepEqual(
    audio.sources.map((source) => source.when),
    [2.5],
  );
});

test("quick off/on restores a cancelled future beat without changing its phase", () => {
  const audio = fakeAudio();
  const columns = [note("sixteenth")];
  const metronome = createPlaybackMetronome({
    ...audio,
    timeline: build(columns, { startTime: 1 }),
    repeatTimeline: build(columns),
  });
  audio.audioContext.currentTime = 1.4;
  metronome.schedule(true, true);
  audio.audioContext.currentTime = 1.48;
  metronome.schedule(true, true);
  audio.audioContext.currentTime = 1.49;
  metronome.schedule(false, true);
  assert.ok(audio.sources[0].cancelled);
  metronome.schedule(true, true);
  assert.deepEqual(
    audio.sources.map((source) => source.when),
    [1.5, 1.5],
  );
  assert.equal(audio.sources[1].cancelled, undefined);
});

test("each store defaults off, and route reset clears the experiment preference", () => {
  const store = createTabStore();
  assert.equal(store.getState().playbackMetronomeEnabled, false);
  store.getState().setPlaybackMetronomeEnabled(true);
  assert.equal(store.getState().playbackMetronomeEnabled, true);
  store.getState().resetStoreToInitValues();
  assert.equal(store.getState().playbackMetronomeEnabled, false);
});
