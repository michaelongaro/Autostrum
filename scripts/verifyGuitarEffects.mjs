// Run: node scripts/verifyGuitarEffects.mjs
// For native browser audio checks, run with --browser, then evaluate the
// expression in .git/guitar-effects-audio-checks.js in the collaborative preview.
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

if (process.argv.includes("--browser")) {
  const url = moduleUrl("scripts/guitarEffectsAudioChecks.mjs");
  fs.writeFileSync(
    ".git/guitar-effects-audio-checks.js",
    `import(${JSON.stringify(url)}).then(module => module.runAudioChecks())`,
  );
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
    this.events = this.events.filter((event) => event.time < time);
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
} = {}) {
  const nodes = [];
  const context = {
    currentTime,
    sampleRate: 48000,
    createBuffer(channels, frames, sampleRate) {
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++)
        samples[i] = Math.sin(i * 0.08) * Math.exp(-i / frames);
      return {
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

function column(note = "", { string = 0, chordEffects = "", pm = "" } = {}) {
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
  return col;
}

function phrase(env, notes, { startTime = 0.2, bpm = 120, capo = 0 } = {}) {
  const columns = notes.map((note) =>
    typeof note === "string" ? column(note) : note,
  );
  columns.forEach((currColumn, index) => {
    void playNoteColumn({
      tuning: [64, 59, 55, 50, 45, 40],
      capo,
      bpm,
      targetStartTime: startTime + (index * 60) / bpm,
      thirdPrevColumn: columns[index - 3],
      secondPrevColumn: columns[index - 2],
      prevColumn: columns[index - 1],
      currColumn,
      nextColumn: columns[index + 1],
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
    assert.ok(node.gain.events.every((event) => event.value <= 1.1));
  assert.ok(sampleNodes(env)[0].stoppedAt < 0.5);
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
  const env = setup();
  phrase(env, ["5>h", "7>p", "5>h", "7>"]);
  for (const node of env.nodes.filter((node) => node.kind === "gain"))
    assert.ok(node.gain.events.every((event) => event.value <= 1.1));
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
  assert.ok(Math.abs(sampleNodes(env)[0].stoppedAt - 0.712) < 0.0001);
  assert.ok(env.strings.every((node) => node === undefined));
});
test("Pause cancels both sounding and future voices without timer ownership races", () => {
  const env = setup();
  phrase(env, ["5~", "7~", "9"]);
  stopActivePlaybackStrings(env.strings, 0.4);
  stopAllScheduledPlaybackNodes(env.scheduled, 0.4);
  for (const node of sampleNodes(env)) assert.ok(node.stoppedAt <= 0.412001);
  assert.ok(env.strings.every((node) => node === undefined));
  for (const node of env.nodes.filter((node) => node.kind === "oscillator"))
    assert.ok(node.stoppedAt <= 0.412001);
});
test("Ended voices disconnect and leave the cancellation registry", () => {
  const env = setup();
  phrase(env, ["5h", "7"]);
  sampleNodes(env)[0].onended();
  assert.equal(env.scheduled.length, 0);
  assert.ok(env.strings.every((node) => node === undefined));
  assert.equal(sampleNodes(env)[0].connections.length, 0);
});
globalThis.setTimeout = realSetTimeout;
console.log(`Passed ${tests.length} guitar effect scheduling checks.`);
for (const name of tests) console.log(`  ${name}`);
