// Run: node scripts/verifyGuitarEffects.mjs
// For native browser audio checks, run with --browser, then evaluate the
// expression in .git/guitar-effects-audio-checks.js in the collaborative preview.
// Add --dead-notes for focused dead-note checks and audition controls.
// Add --stops for release-envelope checks and abrupt/faded stop auditions.
// --native runs the same renders in headless Chromium, without an app/server.
// --palm-mutes checks all standard guitar pitches; optionally add
// --import-file <path> --track-id <track:staff> to check an imported muted passage.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const compiled = new Map();
function moduleUrl(filename) {
  filename = path.resolve(filename);
  if (compiled.has(filename)) return compiled.get(filename);
  let js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  js = js.replace(
    /from ["'](~\/[^"']+)["']/g,
    (_match, specifier) =>
      `from ${JSON.stringify(moduleUrl(`src/${specifier.slice(2)}.ts`))}`,
  );
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  compiled.set(filename, url);
  return url;
}

if (process.argv.includes("--browser") || process.argv.includes("--native")) {
  const url = moduleUrl("scripts/guitarEffectsAudioChecks.mjs");
  const entry = process.argv.includes("--palm-mutes")
    ? "runPalmMuteAudioChecks"
    : process.argv.includes("--combinations")
      ? "runCombinationAudioChecks"
      : process.argv.includes("--stops")
        ? "runNoteStopAudioChecks"
        : process.argv.includes("--dead-notes")
          ? "runDeadNoteAudioChecks"
          : process.argv.includes("--level-probe")
            ? "measureLegatoLevels"
            : "runAudioChecks";
  let importedPhrase;
  const importFileIndex = process.argv.indexOf("--import-file");
  if (importFileIndex >= 0) {
    assert.equal(
      entry,
      "runPalmMuteAudioChecks",
      "Use --palm-mutes with --import-file",
    );
    const importPath = process.argv[importFileIndex + 1];
    const trackId = process.argv[process.argv.indexOf("--track-id") + 1];
    assert.ok(
      importPath && /^\d+:\d+$/.test(trackId ?? ""),
      "Provide --import-file <path> --track-id <track:staff>",
    );
    await import("./lib/registerTypeScript.mjs");
    const { readGuitarProScore } =
      await import("../src/utils/guitarPro/readScore.ts");
    const { convertScore } =
      await import("../src/utils/guitarPro/convertScore.ts");
    const { parse } = await import("../src/utils/tunings.ts");
    const { tabNoteToArray } = await import("../src/utils/tabNoteHelpers.ts");
    const score = readGuitarProScore(
      new Uint8Array(fs.readFileSync(importPath)),
      path.basename(importPath),
    );
    const { document } = convertScore(
      score,
      trackId,
      path.basename(importPath),
    );
    const notes = [];
    for (const section of document.tabData) {
      for (const sub of section.data) {
        if (sub.type !== "tab") continue;
        let bpm = sub.bpm > 0 ? sub.bpm : document.bpm;
        for (const column of sub.data) {
          if (column.type === "measureLine") {
            if (column.bpmAfterLine) bpm = column.bpmAfterLine;
            continue;
          }
          if (!column.palmMute || column.chordEffects === "r") continue;
          const compiled = tabNoteToArray(column);
          compiled[9] = `${bpm}`;
          notes.push(compiled);
        }
      }
    }
    assert.ok(notes.length, "No palm-muted notes on the selected track");
    importedPhrase = {
      notes,
      tuning: parse(document.tuning),
      capo: document.capo,
    };
  }
  const expression = `import(${JSON.stringify(url)}).then(module => module.${entry}(${importedPhrase ? JSON.stringify(importedPhrase) : ""}))`;
  if (process.argv.includes("--native")) {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.route("**/*", async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (/^\/sounds\/instruments\/[a-z_]+-(ogg|mp3)\.js$/.test(pathname)) {
          await route.fulfill({
            path: path.resolve(`public${pathname}`),
            contentType: "text/javascript",
          });
        } else if (pathname === "/") {
          await route.fulfill({
            contentType: "text/html",
            body: "<!doctype html><title>Offline guitar checks</title>",
          });
        } else {
          await route.abort();
        }
      });
      await page.goto("https://guitar-effects.test/");
      const result = await page.evaluate(
        `${expression}.catch(error => ({ error: error.message }))`,
      );
      if (result.error) throw new Error(result.error);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      await browser.close();
    }
    process.exit(0);
  }
  fs.writeFileSync(".git/guitar-effects-audio-checks.js", expression);
  console.log(
    "Browser expression ready in .git/guitar-effects-audio-checks.js",
  );
  process.exit(0);
}

const {
  playNoteColumn,
  stopActivePlaybackStrings,
  stopAllScheduledPlaybackNodes,
} = await import(moduleUrl("src/utils/playGeneratedAudioHelpers.ts"));
const { buildPlaybackTimeline } = await import(
  moduleUrl("src/utils/playbackScheduler.ts")
);
const { parsePalmMuteSettings, normalizePalmMuteSettings, palmMuteProfile } =
  await import(moduleUrl("src/utils/palmMuteAudio.ts"));

class Param {
  value = 0;
  events = [];
  add(kind, value, time) {
    assert.ok(Number.isFinite(value));
    assert.ok(
      Number.isFinite(time) && time >= 0,
      `Invalid audio time: ${time}`,
    );
    this.events.push({ kind, value, time });
  }
  setValueAtTime(value, time) {
    this.add("set", value, time);
  }
  linearRampToValueAtTime(value, time) {
    this.add("linear", value, time);
  }
  exponentialRampToValueAtTime(value, time) {
    assert.ok(value > 0);
    this.add("exponential", value, time);
  }
  setTargetAtTime(value, time) {
    this.add("target", value, time);
  }
  cancelAndHoldAtTime(time) {
    let previous = { time: 0, value: this.value };
    let value = previous.value;
    for (const event of this.events) {
      if (event.time > time) {
        const fraction = (time - previous.time) / (event.time - previous.time);
        value =
          event.kind === "linear"
            ? previous.value + (event.value - previous.value) * fraction
            : previous.value;
        break;
      }
      previous = event;
      value = event.value;
    }
    this.events = this.events.filter((event) => event.time < time);
    this.add("linear", value, time);
  }
  cancelScheduledValues(time) {
    this.events = this.events.filter((event) => event.time < time);
  }
}

class Node {
  connections = [];
  constructor(context, kind) {
    this.context = context;
    this.kind = kind;
    for (const name of ["gain", "frequency", "detune", "Q", "offset"])
      this[name] = new Param();
  }
  connect(node) {
    this.connections.push(node);
  }
  disconnect() {
    this.connections = [];
  }
  start(time, offset = 0) {
    assert.ok(time >= 0 && Number.isFinite(time));
    this.startedAt = time;
    this.sampleOffset = offset;
  }
  stop(time) {
    assert.ok(time >= 0 && Number.isFinite(time));
    this.stoppedAt = time;
  }
}

function setup({
  duration = 4,
  name = "acoustic_guitar_steel",
  currentTime = 0,
  decay = true,
  decaySeconds = duration,
} = {}) {
  const nodes = [];
  const context = {
    currentTime,
    sampleRate: 48000,
    createBuffer(channels, frames, sampleRate) {
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++)
        samples[i] = decay
          ? Math.sin(i * 0.08) * Math.exp(-i / sampleRate / decaySeconds)
          : 0.25;
      return {
        numberOfChannels: channels,
        duration: frames / sampleRate,
        sampleRate,
        getChannelData: () => samples,
      };
    },
  };
  for (const [method, kind] of Object.entries({
    createBufferSource: "sample",
    createGain: "gain",
    createBiquadFilter: "filter",
    createOscillator: "oscillator",
    createConstantSource: "constant",
  }))
    context[method] = () => {
      const node = new Node(context, kind);
      nodes.push(node);
      return node;
    };
  context.destination = new Node(context, "destination");
  const buffer = context.createBuffer(
    1,
    duration * context.sampleRate,
    context.sampleRate,
  );
  const instrument = {
    name,
    buffers: Object.fromEntries(
      Array.from({ length: 128 }, (_, midi) => [midi, buffer]),
    ),
  };
  return {
    context,
    instrument,
    buffer,
    nodes,
    strings: Array(6).fill(undefined),
    scheduled: [],
  };
}

function column(
  note = "",
  { string = 0, chordEffects = "", pm = "", palmMuteSettings } = {},
) {
  const col = [
    pm,
    "",
    "",
    "",
    "",
    "",
    "",
    chordEffects,
    "quarter",
    "120",
    "auto",
  ];
  col[string + 1] = note;
  if (palmMuteSettings) col[11] = JSON.stringify(palmMuteSettings);
  return col;
}

function phrase(
  env,
  notes,
  {
    startTime = 0.2,
    bpm = 120,
    capo = 0,
    tuning = [64, 59, 55, 50, 45, 40],
    playbackSpeed = 1,
  } = {},
) {
  const columns = notes.map((note) => {
    const col = typeof note === "string" ? column(note) : [...note];
    if (col.length > 0) col[9] = String(bpm);
    return col;
  });
  const timeline = buildPlaybackTimeline({
    compiledChords: columns,
    fromChordIndex: 0,
    adjChordCount: columns.length,
    playbackSpeed,
    startTime,
  });
  timeline.forEach((entry) => {
    if (entry.startTime === null) return;
    void playNoteColumn({
      tuning,
      capo,
      bpm: entry.effectiveBpm,
      targetStartTime: entry.startTime,
      thirdPrevColumn: entry.thirdPrevColumn,
      secondPrevColumn: entry.secondPrevColumn,
      prevColumn: entry.prevColumn,
      currColumn: entry.currColumn,
      nextColumn: entry.nextColumn,
      audioContext: env.context,
      masterVolumeGainNode: env.context.destination,
      currentInstrument: env.instrument,
      currentlyPlayingStrings: env.strings,
      scheduledNodes: env.scheduled,
    });
  });
}

// Column completion timers should not keep this scheduling-only check alive.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, ms) => realSetTimeout(callback, ms).unref();
const sampleNodes = (env) =>
  env.nodes.filter((node) => node.buffer === env.buffer);
const finalPitch = (node) => node.detune.events.at(-1).value;
const tests = [];
function test(name, check) {
  check();
  tests.push(name);
}

test("Hammer-ons/pull-offs retain one sample and land exactly on pitch", () => {
  const env = setup();
  phrase(env, ["5h", "7p", "5"]);
  assert.equal(sampleNodes(env).length, 1);
  assert.equal(finalPitch(sampleNodes(env)[0]), 0);
  assert.equal(env.scheduled.length, 1);
});
test("Delayed legato markers retain the ringing string", () => {
  const env = setup();
  phrase(env, ["5", "h", "7", "p", "5"]);
  assert.equal(sampleNodes(env).length, 1);
});
test("Slides, bends, and releases stay on the original voice", () => {
  const env = setup();
  phrase(env, ["3/", "5b", "7", "r", "5b", "7r"]);
  assert.equal(sampleNodes(env).length, 1);
  assert.equal(finalPitch(sampleNodes(env)[0]), 200);
});

test("Measure lines preserve tethered pitch, timing, and the original attack", () => {
  const phrases = [
    ["7/", "9"],
    ["7/", "12"],
    ["9\\", "7"],
    ["7h", "9"],
    ["9p", "7"],
    ["7", "/", "9"],
    ["9", "\\", "7"],
    ["7", "h", "9"],
    ["9", "p", "7"],
    ["7b", "10", "r"],
    ["7b", "10r"],
    ["7b", "r", "7b"],
    ["5/", "7b", "10", "r"],
  ];
  const snapshot = (env) =>
    sampleNodes(env).map((node) => ({
      pitch: node.detune.events,
      startedAt: node.startedAt,
      stoppedAt: node.stoppedAt,
      sampleOffset: node.sampleOffset,
    }));

  for (const notes of phrases) {
    for (const capo of [0, 3]) {
      const expected = setup();
      phrase(expected, notes, { capo });
      assert.equal(sampleNodes(expected).length, 1, notes.join(" "));
      for (let index = 1; index < notes.length; index++) {
        for (const lineCount of [1, 2]) {
          const withLines = notes.toSpliced(
            index,
            0,
            ...Array.from({ length: lineCount }, () => []),
          );
          const actual = setup();
          phrase(actual, withLines, { capo });
          assert.deepEqual(
            snapshot(actual),
            snapshot(expected),
            `${notes.join(" ")}: ${lineCount} measure line(s) at ${index}, capo ${capo}`,
          );
        }
      }
    }
  }
});

test("Tethers across measure lines still stop at empty beats and rests", () => {
  for (const gap of [column(), column("", { chordEffects: "r" })]) {
    const env = setup();
    phrase(env, ["7h", [], gap, [], "9"]);
    const samples = sampleNodes(env);
    assert.equal(samples.length, 2);
    assert.equal(samples[1].sampleOffset, 0, "the destination is plucked");
    assert.deepEqual(samples[1].detune.events, []);
    assert.equal(samples[1].startedAt, 1.2, "the gap keeps its full duration");
  }
});
test("Vibrato starts after the scheduled note, independent of note subdivision", () => {
  const env = setup({ currentTime: 10 });
  phrase(env, ["5~"], { startTime: 11 });
  const oscillator = env.nodes.find((node) => node.kind === "oscillator");
  assert.ok(oscillator.startedAt >= 11.075);
  assert.ok(oscillator.stoppedAt <= 14.213);
  assert.equal(oscillator.frequency.events[0].value, 4.8);
});
test("Bend plus vibrato starts modulation after arrival at the target", () => {
  const env = setup();
  phrase(env, ["5b~", "7"]);
  const oscillator = env.nodes.find((node) => node.kind === "oscillator");
  assert.ok(oscillator.startedAt > 0.54);
  assert.equal(sampleNodes(env).length, 1);
});
test("Nylon vibrato is symmetric; steel vibrato only bends upward", () => {
  for (const name of ["acoustic_guitar_nylon", "acoustic_guitar_steel"]) {
    const env = setup({ name });
    phrase(env, ["5~"]);
    assert.equal(
      env.nodes.filter((node) => node.kind === "constant").length,
      name.endsWith("nylon") ? 0 : 1,
    );
  }
});
test("Open strings remain unmodulated with or without a capo", () => {
  for (const capo of [0, 3]) {
    const env = setup();
    phrase(env, ["0~"], { capo });
    assert.equal(
      env.nodes.filter((node) => node.kind === "oscillator").length,
      0,
    );
  }
});
test("Vibrato on an entry slide starts after reaching the fretted target", () => {
  const env = setup();
  phrase(env, ["/2~"]);
  const oscillator = env.nodes.find((node) => node.kind === "oscillator");
  assert.ok(oscillator.startedAt >= 0.425);
});
test("Missing/exhausted legato voices use the target sample beyond its attack", () => {
  const env = setup({ duration: 0.3 });
  phrase(env, ["5h", "7"]);
  assert.equal(sampleNodes(env).length, 2);
  const target = sampleNodes(env)[1];
  assert.ok(target.sampleOffset > 0 && target.sampleOffset < 0.1);
  assert.equal(finalPitch(target), 0);
});
test("Palm mute uses one bounded signal path and decays before the next beat", () => {
  const env = setup();
  phrase(env, [column("5>", { pm: "start" })]);
  assert.equal(sampleNodes(env)[0].connections.length, 1);
  for (const node of env.nodes.filter((node) => node.kind === "gain"))
    assert.ok(node.gain.events.every((event) => event.value <= 3.4));
  assert.ok(sampleNodes(env)[0].stoppedAt < 0.5);
});
test("Palm mutes retain delayed sample attacks without shifting ordinary picks", () => {
  const env = setup();
  const samples = env.buffer.getChannelData(0);
  samples.fill(0);
  samples.fill(
    0.25,
    0.064 * env.context.sampleRate,
    0.068 * env.context.sampleRate,
  );
  phrase(env, [column("5", { pm: "start" }), "5"], { bpm: 960 });
  const [muted, plain] = sampleNodes(env);
  assert.ok(muted.sampleOffset >= 0.05 && muted.sampleOffset < 0.064);
  assert.equal(plain.sampleOffset, 0);
  assert.equal(muted.startedAt, 0.2);
  assert.ok(muted.stoppedAt < 0.55);
});

test("Staccato duration follows note spacing, including legato notes", () => {
  for (const bpm of [60, 240]) {
    const env = setup();
    phrase(env, ["5h", "7."], { bpm });
    assert.equal(sampleNodes(env).length, 1);
    assert.ok(sampleNodes(env)[0].stoppedAt <= 0.2 + 60 / bpm + 0.233);
  }
});
test("Accents cannot compound into increasing gain across a legato chain", () => {
  const env = setup({ decay: false });
  phrase(env, ["5>h", "7>p", "5>h", "7>"]);
  for (const node of env.nodes.filter((node) => node.kind === "gain"))
    assert.ok(node.gain.events.every((event) => event.value <= 1.1));
});
test("Legato levels do not progressively attenuate across repeated transitions", () => {
  for (const [effect, expected] of [
    ["h", 0.765],
    ["p", 0.855],
    ["/", 0.828],
    ["\\", 0.828],
  ]) {
    const env = setup({ decay: false });
    phrase(env, [`5${effect}`, `7${effect}`, `5${effect}`, "7"]);
    const gain = env.nodes.find((node) => node.kind === "gain");
    const finalLevel = gain.gain.events
      .filter((event) => event.value > 0.001)
      .at(-1).value;
    assert.ok(
      Math.abs(finalLevel - expected) < 0.000001,
      `${effect}: final level ${finalLevel}, expected ${expected}`,
    );
  }
});
test("A prior accent does not change the level of an unaccented destination", () => {
  const env = setup({ decay: false });
  phrase(env, ["5>h", "7p", "5"]);
  const gain = env.nodes.find((node) => node.kind === "gain");
  const finalLevel = gain.gain.events
    .filter((event) => event.value > 0.001)
    .at(-1).value;
  assert.ok(Math.abs(finalLevel - 0.855) < 0.000001);
});
test("Recorded decay is compensated without restarting an audible sample", () => {
  const env = setup({ decaySeconds: 1 });
  phrase(env, ["5h", "7"]);
  assert.equal(sampleNodes(env).length, 1);
  const gain = env.nodes.find((node) => node.kind === "gain");
  const finalLevel = gain.gain.events
    .filter((event) => event.value > 0.001)
    .at(-1).value;
  assert.ok(finalLevel > 0.9 && finalLevel <= 3.294);
});
test("A faded sample refreshes after the pick attack with bounded gain", () => {
  const env = setup({ decaySeconds: 0.15 });
  phrase(env, ["5h", "7"], { bpm: 60 });
  assert.equal(sampleNodes(env).length, 2);
  assert.ok(sampleNodes(env)[1].sampleOffset > 0);
  assert.ok(Math.abs(sampleNodes(env)[0].stoppedAt - 1.225) < 0.000001);
  for (const gain of env.nodes.filter((node) => node.kind === "gain"))
    assert.ok(gain.gain.events.every((event) => event.value <= 3.294));
});
test("Dead notes and slaps use a sample plus noise without a tone oscillator", () => {
  const env = setup();
  phrase(env, ["x>", column("", { chordEffects: "s>." })]);
  assert.equal(sampleNodes(env).length, 2);
  assert.equal(
    env.nodes.filter((node) => node.kind === "oscillator").length,
    0,
  );
  assert.equal(env.nodes.filter((node) => node.kind === "sample").length, 4);
});
test("Dead notes select the retuned and capo-adjusted string sample", () => {
  const env = setup();
  const retuned = env.context.createBuffer(1, 48000, 48000);
  env.instrument.buffers[42] = retuned;
  phrase(env, [column("x", { string: 5 })], {
    tuning: [64, 59, 55, 50, 45, 38],
    capo: 4,
  });
  const source = env.nodes.find((node) => node.buffer === retuned);
  assert.ok(source);
  assert.equal(source.detune.events.length, 0);
});

test("Repeated dead notes vary contact without transposing or delaying the string", () => {
  const env = setup();
  phrase(env, ["x", "x", "x", "x"]);
  const noise = env.nodes.filter(
    (node) => node.kind === "sample" && node.buffer !== env.buffer,
  );
  assert.equal(new Set(noise.map((node) => node.sampleOffset)).size, 4);
  for (const [index, source] of sampleNodes(env).entries()) {
    assert.equal(source.detune.events.length, 0);
    assert.equal(source.startedAt, 0.2 + index * 0.5);
    assert.ok(source.stoppedAt < source.startedAt + 0.1);
  }
});

test("Pause cancels dead-note noise and body, including future scheduled hits", () => {
  const env = setup();
  phrase(env, ["x", "x", "x"]);
  stopActivePlaybackStrings(env.strings, 0.21);
  stopAllScheduledPlaybackNodes(env.scheduled, 0.21);
  for (const node of env.nodes.filter((node) => node.kind === "sample"))
    assert.ok(node.stoppedAt <= 0.235001);
  assert.ok(env.strings.every((node) => node === undefined));
});

test("Muted strings occupy their correct position in a strum", () => {
  const env = setup();
  const chord = column("5", { chordEffects: "v" });
  chord[6] = "x";
  phrase(env, [chord]);
  assert.ok(sampleNodes(env)[1].startedAt > sampleNodes(env)[0].startedAt);
});
test("Entry slides and upper-fret bends include capo in their target", () => {
  for (const note of ["/5", "20b"]) {
    const env = setup();
    phrase(env, [note], { capo: 3 });
    assert.equal(finalPitch(sampleNodes(env)[0]), 200);
  }
});
test("A rest stops voices at its audio timestamp during lookahead", () => {
  const env = setup();
  phrase(env, ["5~", column("", { chordEffects: "r" })]);
  assert.ok(Math.abs(sampleNodes(env)[0].stoppedAt - 0.725) < 0.0001);
  assert.ok(env.strings.every((node) => node === undefined));
});
test("Pause cancels both sounding and future voices without timer ownership races", () => {
  const env = setup();
  phrase(env, ["5~", "7~", "9"]);
  stopActivePlaybackStrings(env.strings, 0.4);
  stopAllScheduledPlaybackNodes(env.scheduled, 0.4);
  for (const node of sampleNodes(env)) assert.ok(node.stoppedAt <= 0.425001);
  assert.ok(env.strings.every((node) => node === undefined));
  for (const node of env.nodes.filter((node) => node.kind === "oscillator"))
    assert.ok(node.stoppedAt <= 0.412001);
});
test("Interrupted notes reach exactly zero before the source stops", () => {
  const env = setup();
  phrase(env, ["5"]);
  stopActivePlaybackStrings(env.strings, 0.4);
  const gain = env.nodes.find((node) => node.kind === "gain");
  const end = gain.gain.events.at(-1);
  assert.equal(end.kind, "linear");
  assert.equal(end.value, 0);
  assert.ok(Math.abs(end.time - 0.425) < 0.000001);
  assert.equal(sampleNodes(env)[0].stoppedAt, end.time);
});

test("Stopping during an attack preserves its level without cancelAndHoldAtTime", () => {
  const env = setup();
  phrase(env, ["5"]);
  const gain = env.nodes.find((node) => node.kind === "gain");
  gain.gain.cancelAndHoldAtTime = undefined;
  env.context.currentTime = 0.201;
  stopActivePlaybackStrings(env.strings, env.context.currentTime);
  const held = gain.gain.events.at(-2);
  assert.ok(Math.abs(held.value - 0.3) < 0.000001);
  assert.equal(held.time, 0.201);
  assert.equal(gain.gain.events.at(-1).value, 0);
});

test("Pause cancels queued attacks and percussion noise before they can start", () => {
  for (const note of ["5~", "x", column("", { chordEffects: "s" })]) {
    const env = setup();
    phrase(env, [note]);
    stopAllScheduledPlaybackNodes(env.scheduled, 0.19);
    for (const source of env.nodes.filter(
      (node) => node.startedAt !== undefined,
    ))
      assert.ok(source.stoppedAt < source.startedAt);
  }
});

test("Repeated pauses preserve an earlier fade deadline", () => {
  const env = setup();
  phrase(env, ["5"]);
  stopAllScheduledPlaybackNodes(env.scheduled, 0.4);
  const source = sampleNodes(env)[0];
  const deadline = source.stoppedAt;
  env.context.currentTime = 0.41;
  stopAllScheduledPlaybackNodes(env.scheduled, 0.41);
  assert.equal(source.stoppedAt, deadline);
  const gain = env.nodes.find((node) => node.kind === "gain");
  const events = gain.gain.events.length;
  env.context.currentTime = 0.5;
  stopAllScheduledPlaybackNodes(env.scheduled, 0.5);
  assert.equal(source.stoppedAt, deadline);
  assert.equal(gain.gain.events.length, events);
});

test("Pause during a natural release cannot lengthen the note", () => {
  const env = setup();
  phrase(env, ["5."]);
  const source = sampleNodes(env)[0];
  const deadline = source.stoppedAt;
  env.context.currentTime = deadline - 0.005;
  stopActivePlaybackStrings(env.strings, env.context.currentTime);
  assert.equal(source.stoppedAt, deadline);
});

test("Ended voices disconnect and leave the cancellation registry", () => {
  const env = setup();
  phrase(env, ["5h", "7"]);
  sampleNodes(env)[0].onended();
  assert.equal(env.scheduled.length, 0);
  assert.ok(env.strings.every((node) => node === undefined));
  assert.equal(sampleNodes(env)[0].connections.length, 0);
});
test("An incoming hammer-on does not erase the destination bend's hold", () => {
  const env = setup();
  phrase(env, ["3h", "5b~", "7"], { bpm: 480 });
  const source = sampleNodes(env)[0];
  assert.equal(sampleNodes(env).length, 1);
  const arrival = source.detune.events.find((event) => event.value === 200);
  const bendStart = source.detune.events.find(
    (event) => event.time > arrival.time && event.value > 200,
  );
  assert.ok(bendStart.time > arrival.time + 0.0075);
  assert.equal(finalPitch(source), 400);
});
test("A slide into a bend retains the slower bend gesture", () => {
  const env = setup();
  phrase(env, ["3/", "5b", "7"]);
  const end = sampleNodes(env)[0].detune.events.at(-1);
  assert.ok(Math.abs(end.time - 1.125) < 0.000001);
});
test("Rapid legato vibrato keeps one hand motion instead of restarting its delay", () => {
  const env = setup();
  phrase(env, ["5~h", "7~p", "5~h", "7~"], { bpm: 960 });
  const oscillators = env.nodes.filter((node) => node.kind === "oscillator");
  assert.equal(oscillators.length, 1);
  assert.ok(oscillators[0].startedAt < 0.3);
  assert.equal(oscillators[0].stoppedAt, sampleNodes(env)[0].stoppedAt);
});
test("Later transitions cannot resurrect a canceled vibrato oscillator", () => {
  const env = setup();
  phrase(env, ["5~h", "7p", "5h", "7"], { bpm: 960 });
  const oscillator = env.nodes.find((node) => node.kind === "oscillator");
  assert.ok(oscillator.stoppedAt <= 0.274501);
});
test("Palm-mute changes preserve the earlier cutoff during lookahead", () => {
  const env = setup();
  phrase(env, [column("5h", { pm: "start" }), "7"], { bpm: 1200 });
  assert.equal(sampleNodes(env).length, 1);
  const cutoff = env.nodes.find((node) => node.kind === "filter").frequency;
  const held = cutoff.events.find((event) => event.time === 0.25);
  assert.ok(held && held.value < cutoff.events[1].value);
  assert.ok(
    cutoff.events
      .filter((event) => event.time >= 0.25)
      .every((event) => event.value <= held.value * 1.13),
  );
});
test("Palm damping is independent of subdivision and practice playback speed", () => {
  const reference = setup();
  phrase(reference, [column("0", { pm: "start" })]);
  const fast = setup();
  phrase(fast, [column("0", { pm: "start" })], {
    bpm: 960,
    playbackSpeed: 1.5,
  });
  const parameters = (env) =>
    env.nodes
      .filter((node) => ["gain", "filter"].includes(node.kind))
      .map((node) => ({
        gain: node.gain.events,
        frequency: node.frequency.events,
      }));
  assert.deepEqual(parameters(fast), parameters(reference));
  assert.equal(
    sampleNodes(fast)[0].stoppedAt,
    sampleNodes(reference)[0].stoppedAt,
  );
});

test("Palm onset detection preserves a quiet pick before a later energy peak", () => {
  const env = setup();
  const data = env.buffer.getChannelData(0);
  data.fill(0);
  data.fill(0.06, 768, 960);
  data.fill(0.25, 3072, 3264);
  phrase(env, [column("0", { pm: "start" })]);
  assert.ok(sampleNodes(env)[0].sampleOffset <= 0.012001);
});

test("A planted palm damps earlier strings even on an empty column", () => {
  const env = setup();
  phrase(env, [column("0", { string: 5 }), column("", { pm: "start" })], {
    bpm: 480,
  });
  const source = sampleNodes(env)[0];
  assert.equal(sampleNodes(env).length, 1);
  assert.ok(source.stoppedAt < 0.67);
  assert.ok(source.stoppedAt > 0.325);
  assert.equal(source.connections.length, 1);
  const shelves = env.nodes.filter((node) => node.type === "highshelf");
  assert.equal(shelves.length, 2);
  assert.ok(shelves.every((node) => node.gain.events.at(-1).value < -10));
});

test("Selective contact leaves uncovered ringing strings and new plucks open", () => {
  const env = setup();
  phrase(
    env,
    [
      column("0", { string: 5 }),
      column("0", {
        pm: "start",
        palmMuteSettings: { strings: [0] },
      }),
    ],
    { bpm: 480 },
  );
  assert.ok(sampleNodes(env)[0].stoppedAt > 3);
  assert.ok(sampleNodes(env)[1].stoppedAt < 0.7);
  const opposite = setup();
  phrase(
    opposite,
    [
      column("0", { string: 5 }),
      column("0", {
        pm: "start",
        palmMuteSettings: { strings: [5] },
      }),
    ],
    { bpm: 480 },
  );
  assert.ok(sampleNodes(opposite)[0].stoppedAt < 0.7);
  assert.ok(sampleNodes(opposite)[1].stoppedAt > 3);
});

test("Removing palm contact cannot replenish the lost string energy", () => {
  const env = setup();
  phrase(env, [column("0", { pm: "start" }), column("")], { bpm: 480 });
  const gain = env.nodes.find((node) => node.kind === "gain").gain;
  const held = gain.events.find(
    (event) => event.time === 0.325 && event.kind === "set",
  );
  assert.ok(held.value > 0 && held.value < 0.1);
  assert.ok(
    gain.events
      .filter((event) => event.time >= 0.325)
      .every((event) => event.value <= held.value),
  );
  for (const band of env.nodes.filter((node) => node.type === "highshelf")) {
    const heldBand = band.gain.events.find(
      (event) => event.time === 0.325 && event.kind === "set",
    );
    assert.ok(heldBand.value < 0);
    assert.ok(
      band.gain.events
        .filter((event) => event.time >= 0.325)
        .every((event) => event.value <= heldBand.value),
    );
  }
});

test("Repeated palm picks vary their pressure and tone without pitch/onset jitter", () => {
  const env = setup();
  phrase(
    env,
    Array.from({ length: 5 }, () => column("0", { pm: "-" })),
  );
  const sources = sampleNodes(env);
  const gains = env.nodes
    .filter((node) => node.kind === "gain")
    .map((node) => node.gain.events);
  assert.notEqual(gains[0][2].value, gains[1][2].value);
  assert.equal(gains[0][2].value, gains[4][2].value);
  sources.forEach((source, index) => {
    assert.equal(source.startedAt, 0.2 + index * 0.5);
    assert.equal(source.sampleOffset, sources[0].sampleOffset);
    assert.equal(source.detune.events.length, 0);
  });
});

test("Palm profiles retain string identity, instrument color, depth and accent brightness", () => {
  const profile = (name, string, depth, accent = false) =>
    palmMuteProfile(name, 52, string, depth, 0, accent);
  const steel = profile("acoustic_guitar_steel", 5, 0.55);
  assert.notEqual(steel.decay, profile("acoustic_guitar_steel", 0, 0.55).decay);
  assert.notEqual(steel.decay, profile("acoustic_guitar_nylon", 5, 0.55).decay);
  assert.ok(profile("acoustic_guitar_steel", 5, 0).duration > steel.duration);
  assert.ok(profile("acoustic_guitar_steel", 5, 1).duration < steel.duration);
  assert.ok(
    profile("acoustic_guitar_steel", 5, 0.55, true).attackCutoff >
      steel.attackCutoff,
  );
});

test("Muted slides retain their energy envelope and cannot revive an expired string", () => {
  const env = setup();
  const reference = setup();
  phrase(reference, [column("0/", { pm: "start" })], { bpm: 480 });
  phrase(env, [column("0/", { pm: "start" }), column("2", { pm: "end" })], {
    bpm: 480,
  });
  assert.equal(sampleNodes(env).length, 1);
  assert.deepEqual(
    env.nodes.find((node) => node.kind === "gain").gain.events,
    reference.nodes.find((node) => node.kind === "gain").gain.events,
  );
  assert.equal(
    sampleNodes(env)[0].stoppedAt,
    sampleNodes(reference)[0].stoppedAt,
  );
  const expired = setup();
  phrase(expired, [column("0/", { pm: "start" }), column("2", { pm: "end" })]);
  assert.equal(sampleNodes(expired).length, 1);
});

test("Muted hammer-ons add bounded finger energy while retaining a live sample", () => {
  const env = setup();
  phrase(env, [column("0h", { pm: "start" }), column("2", { pm: "end" })], {
    bpm: 480,
  });
  assert.equal(sampleNodes(env).length, 1);
  const gain = env.nodes.find((node) => node.kind === "gain").gain;
  const attack = gain.events.find(
    (event) => event.kind === "linear" && Math.abs(event.time - 0.331) < 1e-6,
  );
  const pickedPeak = Math.max(
    ...gain.events
      .filter((event) => event.time < 0.325)
      .map((event) => event.value),
  );
  assert.ok(attack.value > 0.1 && attack.value < pickedPeak * 0.4);
});

test("Staccato and pause still gate fixed-rate palm damping, including the hold fallback", () => {
  for (const fallback of [false, true]) {
    const env = setup();
    if (fallback) {
      const create = env.context.createGain;
      env.context.createGain = () => {
        const node = create();
        node.gain.cancelAndHoldAtTime = undefined;
        return node;
      };
    }
    phrase(env, [column("0.", { pm: "start" })], { bpm: 960 });
    assert.ok(sampleNodes(env)[0].stoppedAt <= 0.247001);
    stopActivePlaybackStrings(env.strings, 0.21);
    assert.ok(sampleNodes(env)[0].stoppedAt <= 0.235001);
  }
});

test("Compiled palm metadata validates masks and safely falls back for legacy/malformed data", () => {
  assert.equal(parsePalmMuteSettings("{bad"), undefined);
  assert.equal(parsePalmMuteSettings('{"strings":"all"}'), undefined);
  assert.deepEqual(normalizePalmMuteSettings(), {
    depth: 0.55,
    strings: [0, 1, 2, 3, 4, 5],
  });
  assert.deepEqual(
    parsePalmMuteSettings('{"depth":2,"strings":[5,0,5,-1,9]}'),
    { depth: 1, strings: [5, 0] },
  );
});

globalThis.setTimeout = realSetTimeout;
console.log(`Passed ${tests.length} guitar effect scheduling checks.`);
for (const name of tests) console.log(`  ${name}`);
