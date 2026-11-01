// Deterministic scheduler/metronome regression checks, without a server or DB.
// Run: node scripts/verifyPlaybackSpeedChanges.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadTypeScript(path, dependencies, globals = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports;
}

const { createPlaybackMetronome } = loadTypeScript(
  "src/utils/playbackMetronome.ts",
  {},
);

function close(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-7,
    `${message}: ${actual} != ${expected}`,
  );
}

function fakeAudioContext() {
  const clicks = [];
  const param = {
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
  return {
    currentTime: 0,
    clicks,
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
    createOscillator() {
      const source = {
        frequency: {},
        connect() {},
        disconnect() {},
        start(when) {
          this.when = when;
          clicks.push(this);
        },
        stop(when = thisContext.currentTime) {
          this.stopTime = when;
        },
      };
      const thisContext = this;
      return source;
    },
  };
}

function column(index, bpm = 120, length = "quarter") {
  return ["", String(index), "", "", "", "", "", "", length, String(bpm)];
}

async function verifyScheduler({
  columns,
  changes,
  looping = false,
  loops = 1,
  stopAt = 40,
  startIndex = 0,
  loopDelay = 0,
}) {
  const audioContext = fakeAudioContext();
  const timers = [];
  const notes = [];
  const updates = [];
  const state = {
    breakOnNextChord: false,
    looping,
    showPlaybackModal: looping,
    audioMetadata: { playing: true },
    currentChordIndex: startIndex,
    playbackMetronomeEnabled: true,
    requestedPlaybackSpeed: 1,
    playbackSpeed: 1,
  };
  let stoppedStrings = 0;
  const scheduler = loadTypeScript(
    "src/utils/playbackScheduler.ts",
    {
      "~/stores/TabStore": {
        noteLengthMultipliers: { quarter: 1, eighth: 0.5 },
      },
      "~/utils/playGeneratedAudioHelpers": {
        playNoteColumn: (note) =>
          notes.push({ ...note, queuedAt: audioContext.currentTime }),
        stopActivePlaybackStrings: () => stoppedStrings++,
      },
      "~/utils/playbackMetronome": { createPlaybackMetronome },
    },
    {
      setTimeout: (callback, delay) =>
        timers.push({ callback, at: audioContext.currentTime + delay / 1000 }),
    },
  );
  let finished = false;
  let error;
  const running = scheduler
    .runPlaybackScheduler({
      compiledChords: columns,
      adjChordCount: columns.length * loops,
      startChordIndex: startIndex,
      playbackStartTime: 0.03,
      playbackSpeed: 1,
      loopDelayChordCount: loopDelay,
      tuning: [],
      capo: 0,
      audioContext,
      masterVolumeGainNode: {},
      currentInstrument: null,
      currentlyPlayingStrings: [],
      scheduledNodes: [],
      playbackSessionId: 1,
      editing: !looping,
      isSessionValid: () => audioContext.currentTime < stopAt,
      getState: () => state,
      setState(partial) {
        updates.push({ ...partial, time: audioContext.currentTime });
        Object.assign(state, partial);
      },
      resetAudioRangeToStart() {},
      clearBreakOnNextChord() {
        state.breakOnNextChord = false;
      },
    })
    .catch((caught) => {
      error = caught;
    })
    .finally(() => {
      finished = true;
    });

  let nextChange = 0;
  for (let step = 0; step < 20000 && !finished; step++) {
    await Promise.resolve();
    if (!timers.length) continue;
    timers.sort((a, b) => a.at - b.at);
    const timer = timers.shift();
    while (changes[nextChange] && changes[nextChange].time <= timer.at) {
      state.requestedPlaybackSpeed = changes[nextChange++].speed;
    }
    audioContext.currentTime = timer.at;
    timer.callback();
    await Promise.resolve();
  }
  assert.ok(
    finished,
    "scheduler terminates or responds to session cancellation",
  );
  await running;
  if (error) throw error;
  assert.equal(
    stoppedStrings,
    0,
    "tempo changes never stop sounding guitar strings",
  );
  assert.ok(
    !updates
      .slice(0, -1)
      .some((update) => update.audioMetadata?.playing === false),
    "no pause during a speed change",
  );
  for (let index = 1; index < notes.length; index++) {
    const previous = notes[index - 1];
    close(
      notes[index].targetStartTime,
      previous.targetStartTime + 60 / previous.bpm,
      "note attacks stay contiguous",
    );
  }
  for (const update of updates.filter(
    (entry) => entry.playbackSpeed !== undefined,
  )) {
    const note = notes.find(
      (entry) =>
        Math.abs(entry.targetStartTime - update.playbackStartedAtAudioTime) <
        1e-7,
    );
    assert.ok(note, "the visual clock is anchored to an actual note boundary");
    close(
      (Number(note.currColumn[9]) /
        (note.currColumn[8] === "eighth" ? 0.5 : 1)) *
        update.playbackSpeed,
      note.bpm,
      "visual and audible tempo agree",
    );
  }
  if (looping) {
    // Independently integrate quarter-note phase across the heard note
    // durations, including tempo changes and the seconds-based loop spacer.
    const expectedClicks = [];
    let beatsToNextClick = 0;
    const lastMusicalBpm = Number(columns[columns.length - loopDelay - 1][9]);
    for (const note of notes) {
      const columnIndex = columns.indexOf(note.currColumn);
      const baseBpm = Number(note.currColumn[9]);
      const multiplier = note.currColumn[8] === "eighth" ? 0.5 : 1;
      const speed = (note.bpm * multiplier) / baseBpm;
      const beatBpm =
        columnIndex >= columns.length - loopDelay
          ? lastMusicalBpm * speed
          : baseBpm * speed;
      const secondsPerBeat = 60 / beatBpm;
      const beatsInEntry = 60 / note.bpm / secondsPerBeat;
      let beat = beatsToNextClick;
      while (beat < beatsInEntry - 1e-8) {
        const when = note.targetStartTime + beat * secondsPerBeat;
        if (when < audioContext.currentTime) expectedClicks.push(when);
        beat += 1;
      }
      beatsToNextClick = beat - beatsInEntry;
      if (Math.abs(beatsToNextClick) < 1e-8) beatsToNextClick = 0;
    }
    const heardClicks = audioContext.clicks.filter(
      (click) =>
        click.when <= click.stopTime && click.when < audioContext.currentTime,
    );
    assert.equal(
      heardClicks.length,
      expectedClicks.length,
      "no missing or duplicate beats across tempo/loop changes",
    );
    heardClicks.forEach((click, index) =>
      close(
        click.when,
        expectedClicks[index],
        "metronome phase stays aligned to the notes",
      ),
    );
  }
  return { notes, updates, state };
}

const fullTab = await verifyScheduler({
  columns: Array.from({ length: 20 }, (_, index) => column(index)),
  changes: [
    { time: 0.2, speed: 0.5 },
    { time: 0.3, speed: 1.5 },
    { time: 3, speed: 0.75 },
  ],
});
assert.equal(fullTab.notes.length, 20, "no dropped or replayed notes");
assert.equal(
  fullTab.state.audioMetadata.playing,
  false,
  "a nonlooping tab still ends",
);
assert.ok(
  fullTab.notes.some((note) => note.bpm === 180),
  "speed increases apply",
);
assert.ok(
  fullTab.notes.some((note) => note.bpm === 90),
  "speed decreases apply",
);
assert.ok(
  fullTab.notes.slice(0, 4).every((note) => note.bpm === 120),
  "already buffered notes retain their original timing",
);

const resume = await verifyScheduler({
  columns: Array.from({ length: 18 }, (_, index) => column(index)),
  startIndex: 4,
  changes: [{ time: 0.1, speed: 0.25 }],
});
assert.equal(
  resume.notes[0].currColumn[1],
  "4",
  "resume keeps the selected position",
);
assert.equal(resume.notes.length, 14);

const loop = await verifyScheduler({
  columns: [column(0, 120, "eighth"), column(1, 90), column(2, 60)],
  loopDelay: 1,
  loops: 3,
  looping: true,
  stopAt: 25,
  changes: [
    { time: 0.1, speed: 1.5 },
    { time: 3, speed: 0.25 },
    { time: 6, speed: 1 },
  ],
});
assert.ok(
  loop.notes.length > 9,
  "playback continues through artificial and real loop boundaries",
);
assert.ok(
  loop.state.audioMetadata.playing,
  "speed edits keep a looping tab playing",
);

const shortLoop = await verifyScheduler({
  columns: [column(0)],
  looping: true,
  stopAt: 8,
  changes: [
    { time: 0.1, speed: 0.25 },
    { time: 0.2, speed: 0.5 },
    { time: 3.1, speed: 1.5 },
  ],
});
assert.ok(
  shortLoop.notes.some((note) => note.bpm === 60),
  "a fully buffered short loop applies the latest request on its next cycle",
);

const ghostColumns = await verifyScheduler({
  columns: [[], ...Array.from({ length: 10 }, (_, index) => column(index)), []],
  changes: [{ time: 0.1, speed: 1.5 }],
});
assert.equal(
  ghostColumns.notes.length,
  10,
  "zero-duration entries do not drop or repeat notes",
);

// A click already in the 150 ms metronome buffer must move with the note
// timeline, while an audible click must finish uninterrupted.
const context = fakeAudioContext();
const timeline = [{ startTime: 0, duration: 0.5, metronomeBpm: 120 }];
const metronome = createPlaybackMetronome({
  audioContext: context,
  destination: {},
  timeline,
  repeatTimeline: timeline,
});
metronome.schedule(true, true);
context.currentTime = 0.4;
metronome.schedule(true, true);
const queuedClick = context.clicks.find((click) => click.when === 0.5);
assert.ok(queuedClick);
metronome.changeSpeed(0.45, 2);
assert.equal(queuedClick.stopTime, 0.4, "cancel the queued old-tempo click");
metronome.schedule(true, true);
assert.ok(
  context.clicks.some((click) => Math.abs(click.when - 0.55) < 1e-7),
  "reschedule that beat at the new tempo",
);
close(context.clicks[0].stopTime, 0.05, "the sounding click is not truncated");
context.currentTime = 1.41;
metronome.schedule(true, true);
assert.ok(
  context.clicks.some((click) => Math.abs(click.when - 1.55) < 1e-7),
  "repeat clicks use the new cycle duration",
);
metronome.stop();

console.log(
  "PASS: live speed changes, rapid edits, resume, loops, audio/visual anchors, and metronome retiming",
);
