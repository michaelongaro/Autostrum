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
  const from = Math.floor(start * buffer.sampleRate);
  const to = Math.min(buffer.length, Math.floor(end * buffer.sampleRate));
  let energy = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = from; i < to; i++) energy += samples[i] ** 2;
  }
  return Math.sqrt(energy / Math.max(1, (to - from) * buffer.numberOfChannels));
}

function peak(buffer) {
  let maximum = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel))
      maximum = Math.max(maximum, Math.abs(sample));
  }
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
  for (const midi of [
    36, 38, 40, 42, 45, 47, 50, 52, 55, 57, 59, 61, 64, 66, 67, 69, 71, 73,
  ]) {
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
  {
    bpm = 120,
    pauseAt,
    duration = 4.5,
    tuning: noteTuning = tuning,
    capo = 0,
    sampleRate = 48000,
    isolateString = false,
  } = {},
) {
  const context = new OfflineAudioContext(
    2,
    Math.ceil(sampleRate * duration),
    sampleRate,
  );
  const sources = [];
  const sourceStarts = [];
  const createBufferSource = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    const source = createBufferSource();
    sources.push(source);
    const start = source.start.bind(source);
    source.start = (...args) => {
      if (
        isolateString &&
        !Object.values(instrument.buffers).includes(source.buffer)
      )
        source.disconnect();
      sourceStarts.push({ source, time: args[0], offset: args[1] ?? 0 });
      start(...args);
    };
    return source;
  };
  const strings = Array(6).fill(undefined);
  const scheduledNodes = [];
  const columns = notes.map((note) =>
    typeof note === "string" ? column(note) : note,
  );
  columns.forEach((currColumn, index) => {
    void playNoteColumn({
      tuning: noteTuning,
      capo,
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
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    assert(
      buffer.getChannelData(channel).every(Number.isFinite),
      "Rendered non-finite samples",
    );
  }
  assert(peak(buffer) < 1, `Clipped audio: peak ${peak(buffer)}`);
  assert(
    scheduledNodes.length === 0,
    "Ended voices retained in cancellation registry",
  );
  return {
    buffer,
    guitarSourceCount: guitarSources.length,
    guitarStarts: sourceStarts.filter((event) =>
      guitarSources.includes(event.source),
    ),
  };
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

async function measureInstrumentLegatoLevels(instrument) {
  const results = [];
  const targets = {
    5: (await render(instrument, ["5"])).buffer,
    7: (await render(instrument, ["7"])).buffer,
  };
  for (const bpm of [60, 120, 240]) {
    for (const [effect, notes, target] of [
      ["hammer", ["5h", "7"], 7],
      ["pull", ["7p", "5"], 5],
      ["slide-up", ["5/", "7"], 7],
      ["slide-down", ["7\\", "5"], 5],
      ["hammer-pull-chain", ["5h", "7p", "5h", "7p", "5"], 5],
      ["delayed-hammer", ["5", "h", "7"], 7],
      ["delayed-pull", ["7", "p", "5"], 5],
      ["delayed-slide", ["5", "/", "7"], 7],
    ]) {
      const { buffer, guitarSourceCount, guitarStarts } = await render(
        instrument,
        notes,
        {
          bpm,
          duration: 0.2 + (notes.length * 60) / bpm + 3.2,
        },
      );
      const targetTime = 0.2 + ((notes.length - 1) * 60) / bpm;
      const targetRms = rms(buffer, targetTime + 0.2, targetTime + 0.3);
      const freshRms = rms(targets[target], 0.4, 0.5);
      results.push({
        instrument: instrument.name,
        bpm,
        effect,
        guitarSourceCount,
        targetLevelRatio: +(targetRms / freshRms).toFixed(3),
      });
      assert(
        guitarStarts.slice(1).every((event) => event.offset > 0),
        `${instrument.name}: a refreshed legato sample replayed the pick attack`,
      );
    }
  }
  return results;
}

export async function measureLegatoLevels() {
  const context = new AudioContext();
  const results = [];
  for (const name of [
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_clean",
    "electric_guitar_jazz",
  ]) {
    const instrument = await loadInstrument(context, name, "ogg");
    results.push(...(await measureInstrumentLegatoLevels(instrument)));
  }
  await context.close();
  return results;
}

function relativeDifference(bufferA, startA, bufferB, startB, seconds) {
  const samplesA = bufferA.getChannelData(0);
  const samplesB = bufferB.getChannelData(0);
  const fromA = Math.round(startA * bufferA.sampleRate);
  const fromB = Math.round(startB * bufferB.sampleRate);
  let difference = 0;
  let energy = 0;
  for (let i = 0; i < Math.round(seconds * bufferA.sampleRate); i++) {
    difference += (samplesA[fromA + i] - samplesB[fromB + i]) ** 2;
    energy += samplesA[fromA + i] ** 2;
  }
  return Math.sqrt(difference / Math.max(energy, 1e-12));
}

export async function runDeadNoteAudioChecks() {
  const decodeContext = new AudioContext();
  const results = [];
  const audition = {};
  try {
    for (const name of [
      "acoustic_guitar_nylon",
      "acoustic_guitar_steel",
      "electric_guitar_clean",
      "electric_guitar_jazz",
    ]) {
      for (const format of ["ogg", "mp3"]) {
        const instrument = await loadInstrument(decodeContext, name, format);
        const options = {
          duration: 0.65,
          sampleRate: format === "ogg" ? 48000 : 44100,
        };
        const label = `${name}-${format}`;
        const strings = [];
        for (let string = 0; string < 6; string++) {
          const { buffer } = await render(
            instrument,
            [column("x", { string })],
            options,
          );
          assert(
            rms(buffer, 0.2, 0.24) > 0.0001,
            `${label}: silent string ${string}`,
          );
          assert(rms(buffer, 0, 0.199) === 0, `${label}: early dead note`);
          assert(
            rms(buffer, 0.31, 0.6) < 0.00001,
            `${label}: dead-note ringing`,
          );
          strings.push(buffer);
        }
        const body = await render(instrument, [column("x", { string: 5 })], {
          ...options,
          isolateString: true,
        });
        const stringBodyRatio =
          rms(body.buffer, 0.2, 0.24) / rms(strings[5], 0.2, 0.24);
        assert(
          stringBodyRatio > 0.15,
          `${label}: string body is masked by contact noise`,
        );
        const samePitch = [55, 55, 55, 55, 55, 55];
        const treble = await render(instrument, [column("x")], {
          ...options,
          tuning: samePitch,
        });
        const bass = await render(instrument, [column("x", { string: 5 })], {
          ...options,
          tuning: samePitch,
        });
        const stringDifference = relativeDifference(
          treble.buffer,
          0.2,
          bass.buffer,
          0.2,
          0.08,
        );
        assert(
          stringDifference > 0.05,
          `${label}: physical strings sound identical at the same pitch`,
        );

        const retuned = await render(instrument, [column("x", { string: 5 })], {
          ...options,
          tuning: [64, 59, 55, 50, 45, 42],
        });
        const capo = await render(instrument, [column("x", { string: 5 })], {
          ...options,
          capo: 2,
        });
        assert(
          relativeDifference(retuned.buffer, 0.2, capo.buffer, 0.2, 0.08) <
            0.00001,
          `${label}: capo and tuning disagree`,
        );
        for (const midi of [36, 38]) {
          const lower = await render(instrument, [column("x", { string: 5 })], {
            ...options,
            tuning: [64, 59, 55, 50, 45, midi],
          });
          assert(
            rms(lower.buffer, 0.2, 0.24) > 0.0001,
            `${label}: silent lower tuning`,
          );
        }

        const repeated = await render(instrument, ["x", "x", "x", "x"], {
          ...options,
          bpm: 600,
        });
        const variationDifference = relativeDifference(
          repeated.buffer,
          0.2,
          repeated.buffer,
          0.3,
          0.06,
        );
        assert(
          variationDifference > 0.03,
          `${label}: repeated attacks sound identical`,
        );
        for (const pauseAt of [0.19, 0.205]) {
          const paused = await render(instrument, ["x", "x", "x"], {
            ...options,
            bpm: 600,
            pauseAt,
          });
          assert(
            rms(paused.buffer, pauseAt + 0.02, 0.6) < 0.00001,
            `${label}: dead-note audio survives pause`,
          );
        }
        const replaced = await render(instrument, ["0", "x"], {
          ...options,
          bpm: 600,
        });
        assert(
          rms(replaced.buffer, 0.41, 0.6) < 0.00001,
          `${label}: x did not choke the ringing string`,
        );
        for (const note of [column("x", { pm: "start" }), column("x.")]) {
          const short = await render(instrument, [note], options);
          assert(
            rms(short.buffer, 0.27, 0.6) < 0.00001,
            `${label}: shortened dead note rings`,
          );
        }
        let maxPeak = Math.max(...strings.map(peak));
        for (const chordEffects of [">", "v>", "^>"]) {
          const chord = column("x", { chordEffects });
          for (let index = 1; index < 7; index++) chord[index] = "x";
          const strum = await render(instrument, [chord], options);
          maxPeak = Math.max(maxPeak, peak(strum.buffer));
        }
        results.push({
          instrument: name,
          format,
          sampleRate: options.sampleRate,
          stringDifference,
          variationDifference,
          stringBodyRatio,
          maxPeak,
        });
        if (name === "acoustic_guitar_steel" && format === "ogg") {
          const sequence = await render(
            instrument,
            Array.from({ length: 6 }, (_, index) =>
              column("x", { string: 5 - index }),
            ),
            { duration: 3.4 },
          );
          audition["Dead notes: low E → high E"] = sequence.buffer;
          audition["Dead notes: repeated attacks"] = repeated.buffer;
        }
      }
    }
    window.__deadNoteAudioChecks = { results, audition };
    createAuditionPanel(decodeContext, audition);
    return { configurations: results.length, results };
  } catch (error) {
    await decodeContext.close();
    throw error;
  }
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
        hammerPull.guitarStarts.slice(1).every((event) => event.offset > 0),
        `${name}-${format}: legato replayed the pick attack`,
      );
      assert(
        slide.guitarStarts.slice(1).every((event) => event.offset > 0),
        `${name}-${format}: slide replayed the pick attack`,
      );
      assert(
        bendRelease.guitarSourceCount === 1,
        `${name}-${format}: release restarted the sample`,
      );
      const legatoLevels = await measureInstrumentLegatoLevels(instrument);
      for (const level of legatoLevels) {
        assert(
          level.targetLevelRatio >= 0.75 && level.targetLevelRatio <= 1.15,
          `${name}-${format}: ${level.effect} at ${level.bpm} BPM has target level ratio ${level.targetLevelRatio}`,
        );
      }
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
        minLegatoLevelRatio: Math.min(
          ...legatoLevels.map((level) => level.targetLevelRatio),
        ),
        maxLegatoLevelRatio: Math.max(
          ...legatoLevels.map((level) => level.targetLevelRatio),
        ),
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
        checks: 11 + legatoLevels.length,
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
  return {
    passed: results.reduce((total, result) => total + result.checks, 0),
    results,
  };
}
