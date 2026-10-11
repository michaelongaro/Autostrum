// Native OfflineAudioContext checks against the bundled, recorded guitar
// samples. Bundled into a browser expression by verifyGuitarEffects.mjs.
import {
  playNoteColumn,
  stopActivePlaybackStrings,
} from "~/utils/playGeneratedAudioHelpers";

const tuning = [64, 59, 55, 50, 45, 40];
function column(note, { pm = "", chordEffects = "", string = 0 } = {}) {
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rms(buffer, start, end) {
  const samples = buffer.getChannelData(0);
  const from = Math.floor(start * buffer.sampleRate);
  const to = Math.min(samples.length, Math.floor(end * buffer.sampleRate));
  let energy = 0;
  for (let i = from; i < to; i++) energy += samples[i] ** 2;
  return Math.sqrt(energy / Math.max(1, to - from));
}

function peak(buffer) {
  let maximum = 0;
  for (const sample of buffer.getChannelData(0))
    maximum = Math.max(maximum, Math.abs(sample));
  return maximum;
}

function centsFromExpected(buffer, start, expectedHz) {
  const samples = buffer.getChannelData(0);
  const offset = Math.floor(start * buffer.sampleRate);
  const frames = 4096;
  const minLag = Math.floor(buffer.sampleRate / (expectedHz * 1.15));
  const maxLag = Math.ceil(buffer.sampleRate / (expectedHz * 0.85));
  const correlations = [];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0,
      energyA = 0,
      energyB = 0;
    for (let i = 0; i < frames; i++) {
      const a = samples[offset + i],
        b = samples[offset + i + lag];
      correlation += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    correlations.push(correlation / Math.sqrt(energyA * energyB));
  }
  const best = correlations.indexOf(Math.max(...correlations));
  let lag = minLag + best;
  if (best > 0 && best < correlations.length - 1) {
    const before = correlations[best - 1],
      center = correlations[best],
      after = correlations[best + 1];
    lag += (0.5 * (before - after)) / (before - 2 * center + after);
  }
  return 1200 * Math.log2(buffer.sampleRate / lag / expectedHz);
}

async function loadInstrument(context, name, format) {
  const response = await fetch(`/sounds/instruments/${name}-${format}.js`);
  assert(response.ok, `Unable to fetch ${name}-${format}`);
  const script = await response.text();
  // Evaluate only the project's bundled soundfont registry, as its loader does.
  const encoded = Function(
    "MIDI",
    `${script}; return MIDI.Soundfont[${JSON.stringify(name)}];`,
  )({ Soundfont: {} });
  const buffers = {};
  for (const midi of [40, 45, 50, 55, 59, 64, 66, 67, 69, 71, 73]) {
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
    const noteName = `${pitchClasses[midi % 12]}${Math.floor(midi / 12) - 1}`;
    assert(encoded[noteName], `Missing ${noteName} in ${name}`);
    const raw = atob(encoded[noteName].split(",")[1]);
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    buffers[midi] = await context.decodeAudioData(bytes.buffer);
  }
  return { name, buffers };
}

async function render(
  instrument,
  notes,
  { bpm = 120, pauseAt, duration = 4.5 } = {},
) {
  const context = new OfflineAudioContext(
    1,
    Math.ceil(48000 * duration),
    48000,
  );
  const sources = [];
  const createBufferSource = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    const source = createBufferSource();
    sources.push(source);
    return source;
  };
  const strings = Array(6).fill(undefined);
  const scheduledNodes = [];
  const columns = notes.map((note) =>
    typeof note === "string" ? column(note) : note,
  );
  columns.forEach((currColumn, index) => {
    void playNoteColumn({
      tuning,
      capo: 0,
      bpm,
      targetStartTime: 0.2 + (index * 60) / bpm,
      thirdPrevColumn: columns[index - 3],
      secondPrevColumn: columns[index - 2],
      prevColumn: columns[index - 1],
      currColumn,
      nextColumn: columns[index + 1],
      audioContext: context,
      masterVolumeGainNode: context.destination,
      currentInstrument: instrument,
      currentlyPlayingStrings: strings,
      scheduledNodes,
    });
  });
  if (pauseAt !== undefined) stopActivePlaybackStrings(strings, pauseAt);
  const guitarSources = sources.filter((source) =>
    Object.values(instrument.buffers).includes(source.buffer),
  );
  const buffer = await context.startRendering();
  assert(
    buffer.getChannelData(0).every(Number.isFinite),
    "Rendered non-finite samples",
  );
  assert(peak(buffer) < 1, `Clipped audio: peak ${peak(buffer)}`);
  assert(
    scheduledNodes.length === 0,
    "Ended voices retained in cancellation registry",
  );
  return { buffer, guitarSourceCount: guitarSources.length };
}

function createAuditionPanel(context, renders) {
  document.getElementById("guitar-effects-audition")?.remove();
  const panel = document.createElement("section");
  panel.id = "guitar-effects-audition";
  panel.setAttribute("aria-label", "Guitar effects audition");
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
    maxWidth: "410px",
    padding: "18px",
    borderRadius: "12px",
    background: "#172323",
    color: "#f1f5f0",
    font: "14px system-ui",
    boxShadow: "0 8px 30px #0006",
  });
  const title = document.createElement("div");
  title.textContent = "Guitar effects • recorded steel-string samples";
  title.style.marginBottom = "10px";
  panel.append(title);
  let playing;
  const stop = () => {
    playing?.stop();
    playing = undefined;
  };
  for (const [name, buffer] of Object.entries(renders)) {
    const button = document.createElement("button");
    button.textContent = name;
    Object.assign(button.style, {
      padding: "6px 9px",
      margin: "3px",
      border: "1px solid #8aab9a",
      borderRadius: "5px",
      background: "#254338",
      color: "white",
      cursor: "pointer",
    });
    button.onclick = async () => {
      stop();
      await context.resume();
      playing = context.createBufferSource();
      playing.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.8;
      playing.connect(gain);
      gain.connect(context.destination);
      playing.start();
      playing.onended = () => {
        gain.disconnect();
      };
    };
    panel.append(button);
  }
  const close = document.createElement("button");
  close.textContent = "Close audition";
  close.style.display = "block";
  close.style.marginTop = "10px";
  close.onclick = () => {
    stop();
    panel.remove();
    void context.close();
  };
  panel.append(close);
  document.body.append(panel);
}

export async function runAudioChecks() {
  const decodeContext = new AudioContext();
  const results = [];
  const audition = {};
  for (const name of [
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_clean",
    "electric_guitar_jazz",
  ]) {
    for (const format of ["ogg", "mp3"]) {
      const instrument = await loadInstrument(decodeContext, name, format);
      const dry = await render(instrument, ["5"]);
      const accent = await render(instrument, ["5>"]);
      const muted = await render(instrument, [column("5", { pm: "start" })]);
      const short = await render(instrument, ["5."], { bpm: 240 });
      const hammerPull = await render(instrument, ["5h", "7p", "5"]);
      const slide = await render(instrument, ["5/", "7"]);
      const bendRelease = await render(instrument, ["5b", "7", "r"]);
      const vibrato = await render(instrument, ["5b~", "7"]);
      const handVibrato = await render(instrument, ["5~"]);
      const percussion = await render(instrument, [
        "x",
        column("", { chordEffects: "s" }),
      ]);
      const pause = await render(instrument, ["5~", "7~", "9"], {
        pauseAt: 0.4,
      });
      const beforeStart = rms(vibrato.buffer, 0, 0.19);
      const dryRms = rms(dry.buffer, 0.25, 0.35);
      const accentRatio = rms(accent.buffer, 0.25, 0.35) / dryRms;
      const mutedTail = rms(muted.buffer, 0.6, 0.7);
      const vibratoOffsets = Array.from({ length: 20 }, (_, index) => {
        const time = 0.5 + index * 0.025;
        return (
          centsFromExpected(handVibrato.buffer, time, 440) -
          centsFromExpected(dry.buffer, time, 440)
        );
      });
      const vibratoRange =
        Math.max(...vibratoOffsets) - Math.min(...vibratoOffsets);
      const pitchErrors = [
        centsFromExpected(hammerPull.buffer, 0.27, 440),
        centsFromExpected(hammerPull.buffer, 0.79, 440 * 2 ** (2 / 12)),
        centsFromExpected(hammerPull.buffer, 1.29, 440),
        centsFromExpected(slide.buffer, 0.94, 440 * 2 ** (2 / 12)),
        centsFromExpected(bendRelease.buffer, 0.6, 440 * 2 ** (2 / 12)),
        centsFromExpected(bendRelease.buffer, 1.6, 440),
      ];
      assert(dryRms > 0.0001, `${name}-${format}: no guitar signal`);
      assert(
        beforeStart === 0,
        `${name}-${format}: vibrato sounds before scheduled note`,
      );
      assert(
        Math.abs(accentRatio - 1.22) < 0.01,
        `${name}-${format}: unbalanced accent`,
      );
      assert(
        mutedTail < dryRms * 0.001,
        `${name}-${format}: palm mute sustains too long`,
      );
      assert(
        rms(short.buffer, 0.4, 0.5) < 0.00001,
        `${name}-${format}: staccato sustains too long`,
      );
      assert(
        rms(pause.buffer, 0.45, 2) < 0.00001,
        `${name}-${format}: scheduled audio survives pause`,
      );
      assert(
        hammerPull.guitarSourceCount === 1,
        `${name}-${format}: legato restarted the sample`,
      );
      assert(
        slide.guitarSourceCount === 1,
        `${name}-${format}: slide restarted the sample`,
      );
      assert(
        bendRelease.guitarSourceCount === 1,
        `${name}-${format}: release restarted the sample`,
      );
      assert(
        pitchErrors.every((error) => Math.abs(error) < 18),
        `${name}-${format}: incorrect pitch ${pitchErrors}`,
      );
      assert(
        vibratoRange > 15 && vibratoRange < 55,
        `${name}-${format}: unrealistic vibrato range ${vibratoRange}`,
      );
      results.push({
        instrument: name,
        format,
        accentRatio: +accentRatio.toFixed(3),
        maxPitchErrorCents: +Math.max(...pitchErrors.map(Math.abs)).toFixed(2),
        palmMuteTailRms: +mutedTail.toFixed(7),
        vibratoRangeCents: +vibratoRange.toFixed(2),
        maxPeak: +Math.max(
          ...[
            dry,
            accent,
            muted,
            short,
            hammerPull,
            slide,
            bendRelease,
            vibrato,
            percussion,
          ].map((result) => peak(result.buffer)),
        ).toFixed(3),
        checks: 11,
      });
      if (name === "acoustic_guitar_steel" && format === "ogg") {
        Object.assign(audition, {
          "Plain pluck": dry.buffer,
          "Hammer / pull": hammerPull.buffer,
          Slide: slide.buffer,
          "Bend / release": bendRelease.buffer,
          "Bend + vibrato": vibrato.buffer,
          Vibrato: handVibrato.buffer,
          "Palm mute": muted.buffer,
          "Dead note / slap": percussion.buffer,
        });
      }
    }
  }
  createAuditionPanel(decodeContext, audition);
  window.__guitarEffectsAudioChecks = { results, audition };
  return { passed: results.length * 11, results };
}
