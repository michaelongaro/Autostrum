// Bundle with esbuild and evaluate in the collaborative preview. Instructions
// are in decisions/guitar-samples.md. Uses the actual sampler and audio engine.
import { loadGuitarSamplePlayer } from "../src/utils/guitarSampleRuntime";
import {
  playNoteColumn,
  stopActivePlaybackStrings,
} from "../src/utils/playGeneratedAudioHelpers";
import { PitchDetector } from "pitchy";
import { prepareGuitarColumns } from "../src/utils/prepareGuitarPlayback";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function peak(buffer) {
  let maximum = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel))
      maximum = Math.max(maximum, Math.abs(sample));
  }
  return maximum;
}

function rms(buffer, start, end) {
  const samples = buffer.getChannelData(0);
  let energy = 0;
  const from = Math.floor(start * buffer.sampleRate);
  const to = Math.min(samples.length, Math.floor(end * buffer.sampleRate));
  for (let i = from; i < to; i++) energy += samples[i] ** 2;
  return Math.sqrt(energy / Math.max(1, to - from));
}

function pitchError(buffer, midi, start) {
  const length = 4096;
  const detector = PitchDetector.forFloat32Array(length);
  detector.minVolumeDecibels = -80;
  detector.clarityThreshold = 0.8;
  const errors = [];
  for (let time = start; time < start + 0.2; time += 0.025) {
    const frame = Math.floor(time * buffer.sampleRate);
    const window = buffer.getChannelData(0).slice(frame, frame + length);
    if (window.length < length) continue;
    const [hz, clarity] = detector.findPitch(window, buffer.sampleRate);
    if (clarity < 0.8 || hz <= 0) continue;
    const detected = 69 + 12 * Math.log2(hz / 440);
    // A guitar's second partial occasionally wins pitch detection.
    const folded = detected + 12 * Math.round((midi - detected) / 12);
    errors.push((folded - midi) * 100);
  }
  errors.sort((a, b) => a - b);
  return errors.length ? errors[Math.floor(errors.length / 2)] : null;
}

const tuning = [64, 59, 55, 50, 45, 40];
async function loadLegacyInstrument(context, name) {
  const response = await fetch(`/sounds/instruments/${name}-mp3.js`);
  assert(response.ok, `Legacy comparison could not load ${name}`);
  const script = await response.text();
  const encoded = Function(
    "MIDI",
    `${script}; return MIDI.Soundfont[${JSON.stringify(name)}];`,
  )({ Soundfont: {} });
  const pitchClasses = [
    "C",
    "Db",
    "D",
    "Eb",
    "E",
    "F",
    "Gb",
    "G",
    "Ab",
    "A",
    "Bb",
    "B",
  ];
  const buffers = {};
  for (const midi of [40, 45, 47, 50, 52, 55, 56, 59, 64, 69, 71]) {
    const note = `${pitchClasses[midi % 12]}${Math.floor(midi / 12) - 1}`;
    const raw = atob(encoded[note].split(",")[1]);
    const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
    buffers[midi] = await context.decodeAudioData(bytes.buffer);
  }
  return { name, buffers };
}
function column(note, { string = 0, pm = "", chord = "" } = {}) {
  const result = [pm, "", "", "", "", "", "", chord, "quarter", "120", "auto"];
  result[string + 1] = note;
  return result;
}

async function render(instrument, columns, pauseAt) {
  await prepareGuitarColumns(instrument, columns, tuning, 0);
  const context = new OfflineAudioContext(1, 48000 * 4, 48000);
  const strings = Array(6).fill(undefined);
  const sources = [];
  const create = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    const source = create();
    sources.push(source);
    return source;
  };
  // The decoded bank is independent of the destination/context. This render
  // intentionally bypasses the instrument's live output bus for dry analysis.
  const dry = { ...instrument, output: undefined };
  for (let index = 0; index < columns.length; index++) {
    await playNoteColumn({
      tuning,
      capo: 0,
      bpm: 120,
      targetStartTime: 0.2 + index * 0.5,
      prevColumn: columns[index - 1],
      secondPrevColumn: columns[index - 2],
      thirdPrevColumn: columns[index - 3],
      currColumn: columns[index],
      nextColumn: columns[index + 1],
      audioContext: context,
      masterVolumeGainNode: context.destination,
      currentInstrument: dry,
      currentlyPlayingStrings: strings,
      scheduledNodes: [],
    });
  }
  if (pauseAt !== undefined) stopActivePlaybackStrings(strings, pauseAt);
  return { buffer: await context.startRendering(), sources };
}

export async function runGuitarSampleChecks(
  names = [
    "acoustic_guitar_steel",
    "acoustic_guitar_nylon",
    "electric_guitar_clean",
    "electric_guitar_jazz",
  ],
) {
  const context = new AudioContext();
  const results = [];
  const auditions = [];
  for (const name of names) {
    window.guitarSampleCheckStatus = {
      state: "running",
      stage: `${name}: loading`,
    };
    const started = performance.now();
    const instrument = await loadGuitarSamplePlayer(
      context,
      name,
      context.destination,
    );
    await instrument.samplesReady;
    if (name.startsWith("acoustic")) {
      await instrument.prepareSamples(
        [0, 1, 2, 3].map((stringIndex) => ({ midi: 64, stringIndex })),
      );
      const positions = [0, 1, 2, 3].map((stringIndex) =>
        instrument.getSample(64, 88, stringIndex),
      );
      assert(
        positions.every((sample, index) => sample.stringIndex === index),
        `${name}: incorrect string mapping`,
      );
      assert(
        new Set(positions.map((sample) => sample.buffer)).size === 4,
        `${name}: strings reuse the same recording`,
      );
    }
    window.guitarSampleCheckStatus = {
      state: "running",
      stage: `${name}: rendering`,
    };
    if (name === "acoustic_guitar_nylon") {
      assert(
        instrument.getSample(64, 30).buffer !==
          instrument.getSample(64, 120).buffer,
        "Nylon velocities use the same recording",
      );
    }
    if (name.startsWith("electric")) {
      const takes = Array.from(
        { length: 4 },
        () => instrument.getSample(64, 88).buffer,
      );
      assert(
        new Set(takes.slice(0, 3)).size === 3 && takes[0] === takes[3],
        "Electric repeated notes do not cycle through three real takes",
      );
    }
    for (let midi = 28; midi <= 92; midi++) {
      assert(
        instrument.getSample(midi, 88)?.buffer,
        `${name}: missing MIDI ${midi}`,
      );
    }
    const errors = [];
    for (const midi of [36, 40, 45, 50, 55, 59, 64, 69, 76, 83]) {
      const sample = instrument.getReferenceSample(midi);
      const offline = new OfflineAudioContext(1, 48000, 48000);
      const source = offline.createBufferSource();
      source.buffer = sample.buffer;
      source.detune.value = (midi - sample.rootMidi) * 100;
      source.connect(offline.destination);
      source.start();
      const audio = await offline.startRendering();
      assert(peak(audio) > 0.01, `${name}: silent MIDI ${midi}`);
      const cents = pitchError(audio, midi, 0.12);
      assert(
        cents !== null && Math.abs(cents) < 18,
        `${name}: MIDI ${midi} is ${cents} cents out of tune`,
      );
      errors.push({ midi, cents: +cents.toFixed(1) });
    }
    const hammer = await render(instrument, [
      column("5h"),
      column("7p"),
      column("5"),
    ]);
    const slide = await render(instrument, [column("5/"), column("7")]);
    const bend = await render(instrument, [
      column("5b"),
      column("7"),
      column("r"),
    ]);
    const muted = await render(instrument, [column("5", { pm: "start" })]);
    const pause = await render(
      instrument,
      [column("5~"), column("7~"), column("9")],
      0.4,
    );
    assert(rms(muted.buffer, 0.6, 0.8) < 0.00001, `${name}: palm mute tail`);
    assert(rms(pause.buffer, 0.45, 3) < 0.00001, `${name}: pause leaves audio`);
    for (const [label, audio, midi, time] of [
      ["hammer", hammer, 71, 0.78],
      ["slide", slide, 71, 0.95],
      ["bend", bend, 71, 0.6],
      ["release", bend, 69, 1.6],
    ]) {
      const cents = pitchError(audio.buffer, midi, time);
      assert(
        cents !== null && Math.abs(cents) < 22,
        `${name}: ${label} pitch error ${cents}`,
      );
    }
    const chord = await render(instrument, [
      ["", "0", "0", "1", "2", "2", "0", "v", "quarter", "120", "auto"],
    ]);
    assert(peak(chord.buffer) < 0.95, `${name}: six-string chord clips`);
    const accented = await render(instrument, [
      ["", "0", "0", "1", "2", "2", "0", "v>", "quarter", "120", "auto"],
    ]);
    assert(
      peak(accented.buffer) < 0.95,
      `${name}: accented six-string chord clips`,
    );
    const legacy = await loadLegacyInstrument(context, name);
    const before = await render(legacy, [
      ["", "0", "0", "1", "2", "2", "0", "v", "quarter", "120", "auto"],
    ]);
    auditions.push({
      name,
      before: before.buffer,
      after: chord.buffer,
      phrase: hammer.buffer,
    });
    results.push({
      name,
      loadMs: Math.round(performance.now() - started),
      pitchErrors: errors,
      chordPeak: +peak(chord.buffer).toFixed(3),
      accentPeak: +peak(accented.buffer).toFixed(3),
      effects: "passed",
    });
  }
  // Auditions are explicit clicks so the check never starts audible playback.
  document.getElementById("guitar-samples-audition")?.remove();
  const panel = document.createElement("section");
  panel.id = "guitar-samples-audition";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "9999",
    padding: "16px",
    borderRadius: "12px",
    background: "#172323",
    color: "white",
    maxWidth: "370px",
    font: "14px system-ui",
  });
  const title = document.createElement("p");
  title.textContent = "New guitar samples — audition";
  panel.append(title);
  let playing;
  for (const audition of auditions) {
    for (const kind of ["before", "after", "phrase"]) {
      const button = document.createElement("button");
      button.textContent = `${audition.name.replaceAll("_", " ")} • ${kind}`;
      Object.assign(button.style, {
        display: "block",
        padding: "6px",
        margin: "5px 0",
        background: "#254338",
        color: "white",
        border: "1px solid #8aab9a",
        borderRadius: "5px",
      });
      button.onclick = async () => {
        playing?.stop();
        await context.resume();
        const source = context.createBufferSource();
        playing = source;
        source.buffer = audition[kind];
        const gain = context.createGain();
        // Match body RMS for a fair timbre comparison, with safe peak headroom.
        gain.gain.value = Math.min(
          0.055 / rms(audition[kind], 0.35, 0.65),
          0.8 / peak(audition[kind]),
        );
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      };
      panel.append(button);
    }
  }
  const close = document.createElement("button");
  close.textContent = "Close audition";
  close.onclick = () => {
    playing?.stop();
    panel.remove();
    void context.close();
  };
  panel.append(close);
  document.body.append(panel);
  return results;
}
