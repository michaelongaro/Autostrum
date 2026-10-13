// Offline asset preparation; never runs during install, build, or playback.
// See decisions/guitar-samples.md for source downloads and licenses.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { PitchDetector } from "pitchy";

const sources = path.resolve(process.argv[2] ?? ".git/guitar-sample-sources");
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const output = path.resolve("public/sounds/guitars/v1");
const only = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.split("=")[1];
const rate = 12000;

function decode(file, highPass = 60) {
  const bytes = execFileSync(
    ffmpeg,
    [
      "-v",
      "error",
      "-i",
      file,
      "-af",
      `highpass=f=${highPass}:p=2,highpass=f=${highPass}:p=2`,
      "-ac",
      "1",
      "-ar",
      String(rate),
      "-f",
      "f32le",
      "pipe:1",
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  return new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}

function peak(data, from = 0, to = data.length) {
  let value = 0;
  for (let i = from; i < to; i++) value = Math.max(value, Math.abs(data[i]));
  return value;
}

function tuningCorrection(data, midi, start, description) {
  const detector = PitchDetector.forFloat32Array(2048);
  detector.minVolumeDecibels = -100;
  detector.clarityThreshold = 0.75;
  const pitches = [];
  for (
    let frame = Math.floor((start + 0.12) * rate);
    frame < (start + 0.5) * rate && frame + 2048 < data.length;
    frame += 240
  ) {
    const [hz, clarity] = detector.findPitch(
      data.subarray(frame, frame + 2048),
      rate,
    );
    if (clarity < 0.75 || hz < 50) continue;
    const detected = 69 + 12 * Math.log2(hz / 440);
    // A bright electric take can have a dominant third/fifth partial. Choose
    // the fundamental compatible with the source's known SFZ/note mapping.
    const candidates = [1, 3, 5].map((harmonic) => {
      const fundamental = detected - 12 * Math.log2(harmonic);
      return fundamental + 12 * Math.round((midi - fundamental) / 12);
    });
    const folded = candidates.sort(
      (a, b) => Math.abs(a - midi) - Math.abs(b - midi),
    )[0];
    if (Math.abs(folded - midi) < 0.6) pitches.push(folded);
  }
  pitches.sort((a, b) => a - b);
  if (!pitches.length)
    throw new Error(`Cannot tune ${description}, MIDI ${midi}`);
  return (midi - pitches[Math.floor(pitches.length / 2)]) * 100;
}

async function encode(
  bank,
  file,
  start,
  duration,
  targetPeak,
  tuneCents = 0,
  highPass = 45,
) {
  const data = decode(file, highPass);
  const from = Math.floor(start * rate);
  const to = Math.min(data.length, Math.floor((start + duration) * rate));
  const maximum = peak(data, from, to);
  if (maximum < 0.00001) throw new Error(`Silent sample: ${file} at ${start}`);
  // Trim only pre-attack silence. Keep the pick transient and the natural decay.
  let onset = from;
  while (onset < to && Math.abs(data[onset]) < maximum * 0.005) onset++;
  onset = Math.max(from, onset - Math.round(rate * 0.002));
  const seconds = Math.min(8, (to - onset) / rate);
  if (seconds < 0.3) throw new Error(`Short sample: ${file} at ${start}`);
  const gain = targetPeak / maximum;
  const temporary = path.join(sources, "encoded.mp3");
  const tuneRate = 2 ** (tuneCents / 1200);
  const tunedDuration = seconds / tuneRate;
  const args = [
    "-v",
    "error",
    "-y",
    "-ss",
    String(onset / rate),
    "-i",
    file,
    "-t",
    String(seconds),
    "-ar",
    "44100",
    "-af",
    `highpass=f=${highPass}:p=2,highpass=f=${highPass}:p=2,aresample=44100,asetrate=${44100 * tuneRate},aresample=44100,volume=${gain},afade=t=in:d=0.001,afade=t=out:st=${Math.max(0, tunedDuration - 0.06)}:d=0.06`,
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    "-map_metadata",
    "-1",
    temporary,
  ];
  execFileSync(ffmpeg, args, { maxBuffer: 4 * 1024 * 1024 });
  const bytes = await fs.readFile(temporary);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const filename = `${hash}.mp3`;
  await fs.writeFile(path.join(output, bank, filename), bytes);
  return filename;
}

function sfzZones(text) {
  let global = {},
    group = {};
  const zones = [];
  for (const [, tag, body] of text
    .replace(/\/\/[^\n]*/g, "")
    .matchAll(/<(global|group|region)>([^<]*)/g)) {
    const fields = Object.fromEntries(
      [...body.matchAll(/(\w+)=([^\s]+)/g)].map((m) => [m[1], m[2]]),
    );
    if (tag === "global") global = fields;
    else if (tag === "group") group = fields;
    else zones.push({ ...global, ...group, ...fields });
  }
  return zones;
}

async function saveManifest(bank, manifest) {
  const directory = path.join(output, bank);
  await fs.writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const referenced = new Set(manifest.zones.flatMap((zone) => zone.files));
  // Only remove obsolete content-hashed files generated in this bank. Source
  // archives, license texts, and unrelated files are preserved.
  for (const filename of await fs.readdir(directory)) {
    if (/^[a-f0-9]{12}\.mp3$/.test(filename) && !referenced.has(filename)) {
      await fs.unlink(path.join(directory, filename));
    }
  }
}

async function prepareSfz({ bank, directory, sfz, source, license, name }) {
  const dir = path.join(sources, directory);
  await fs.mkdir(path.join(output, bank), { recursive: true });
  const text = await fs.readFile(path.join(dir, sfz), "utf8");
  const grouped = new Map();
  for (const region of sfzZones(text)) {
    const root = Number(region.pitch_keycenter ?? region.key);
    const low = Number(region.lokey ?? region.key);
    const high = Number(region.hikey ?? region.key);
    const lowVelocity = Number(region.lovel ?? 0);
    const highVelocity = Number(region.hivel ?? 127);
    if (![root, low, high].every(Number.isFinite))
      throw new Error(`Invalid SFZ region in ${sfz}`);
    const id = `${root}:${low}:${high}:${lowVelocity}:${highVelocity}`;
    let zone = grouped.get(id);
    if (!zone) {
      zone = {
        rootMidi: root,
        lowMidi: low,
        highMidi: high,
        lowVelocity,
        highVelocity,
        files: [],
      };
      grouped.set(id, zone);
    }
    // Two real takes retain variation while keeping the download/memory bounded.
    if (zone.files.length >= 2) continue;
    const file = path.join(dir, region.sample);
    const highPass = Math.max(45, 440 * 2 ** ((root - 69) / 12) * 0.35);
    const data = decode(file, highPass);
    const seconds = data.length / rate;
    const threshold = peak(data) * 0.005;
    let onset = 0;
    while (onset < data.length && Math.abs(data[onset]) < threshold) onset++;
    const cents = tuningCorrection(data, root, onset / rate, file);
    zone.files.push(
      await encode(
        bank,
        file,
        0,
        seconds,
        lowVelocity > 0 ? 0.24 : 0.18,
        cents,
        highPass,
      ),
    );
  }
  const manifest = {
    version: 1,
    name,
    source,
    license,
    zones: [...grouped.values()],
  };
  await saveManifest(bank, manifest);
  await fs.copyFile(path.join(dir, sfz), path.join(output, bank, "source.sfz"));
  await fs.copyFile(
    path.join(dir, bank === "steel" ? "readme.txt" : "README.txt"),
    path.join(output, bank, "README-source.txt"),
  );
  await fs.copyFile(
    path.join(dir, bank === "steel" ? "gpl.txt" : "LICENSE.txt"),
    path.join(output, bank, "LICENSE.txt"),
  );
  console.log(
    `${bank}: ${manifest.zones.length} zones, ${manifest.zones.reduce((n, z) => n + z.files.length, 0)} recordings`,
  );
}

// Iowa's AIFFs contain ascending chromatic scales. Locate each note by pitch,
// require a stable run, then recover its attack from the preceding quiet gap.
export function locateScale(file, first, last) {
  const data = decode(
    file,
    Math.max(60, 440 * 2 ** ((first - 69) / 12) * 0.35),
  );
  const detector = PitchDetector.forFloat32Array(2048);
  detector.minVolumeDecibels = -100;
  detector.clarityThreshold = 0.75;
  const window = new Float32Array(2048);
  const starts = [];
  let expected = first,
    streak = 0,
    stableFrame = 0;
  const minimum = peak(data) * 0.012;
  for (
    let frame = 0;
    frame + window.length < data.length && expected <= last;
    frame += 240
  ) {
    window.set(data.subarray(frame, frame + window.length));
    const [hz, clarity] = detector.findPitch(window, rate);
    const detected = 69 + 12 * Math.log2(hz / 440);
    const midi = detected + 12 * Math.round((expected - detected) / 12);
    if (
      hz > 50 &&
      clarity > 0.75 &&
      Math.abs(midi - expected) < 0.6 &&
      peak(window) > minimum
    ) {
      if (streak++ === 0) stableFrame = frame;
      if (streak < 3) continue;
      // Find the last quiet 10 ms block before stable pitch appears.
      const localPeak = peak(data, stableFrame, stableFrame + 2048);
      let onset = Math.max(0, stableFrame - 0.25 * rate);
      for (
        let j = Math.max(0, stableFrame - 0.8 * rate);
        j < stableFrame;
        j += 120
      ) {
        if (peak(data, j, j + 120) < localPeak * 0.035) onset = j + 120;
      }
      starts.push(onset / rate);
      if (process.argv.includes("--probe"))
        console.log({
          expected,
          stable: stableFrame / rate,
          onset: onset / rate,
          midi,
        });
      expected++;
      streak = 0;
      frame += rate * 0.6;
    } else streak = 0;
  }
  if (starts.length !== last - first + 1)
    throw new Error(
      `Cannot split ${file}: found ${starts.length}, expected ${last - first + 1}`,
    );
  return { data, starts };
}

async function prepareNylon() {
  const bank = "nylon";
  await fs.mkdir(path.join(output, bank), { recursive: true });
  const zones = [];
  // Use the lowest positions on the appropriate string, then the treble string.
  const scales = [
    ["sulE.E2B2", 40, 47, 40, 44],
    ["sulA.A2B2", 45, 47, 45, 47],
    ["sulA.C3B3", 48, 59, 48, 49],
    ["sulD.D3B3", 50, 59, 50, 54],
    ["sulG.G3B3", 55, 59, 55, 58],
    ["sulB.B3", 59, 59, 59, 59],
    ["sulB.C4B4", 60, 71, 60, 63],
    ["sul_E.E4B4", 64, 71, 64, 71],
    ["sul_E.C5B5", 72, 83, 72, 83],
  ];
  const dynamics = [
    ["pp", 0, 55, 0.12],
    ["mf", 56, 100, 0.18],
    ["ff", 101, 127, 0.24],
  ];
  for (const [dynamic, lowVelocity, highVelocity, target] of dynamics) {
    for (let [scale, first, last, low, high] of scales) {
      if (dynamic === "ff" && scale === "sul_E.C5B5") {
        scale = "sul_E.C5Bb5";
        last = high = 82;
      }
      const file = path.join(
        sources,
        "1644stereo",
        `Guitar.${dynamic}.${scale}.aif`,
      );
      const { data, starts } = locateScale(file, first, last);
      for (let midi = low; midi <= high; midi++) {
        const start = starts[midi - first];
        const end = starts[midi - first + 1] ?? data.length / rate;
        const cents = tuningCorrection(data, midi, start, file);
        const filename = await encode(
          bank,
          file,
          start,
          Math.max(0.3, end - start - 0.1),
          target,
          cents,
          Math.max(45, 440 * 2 ** ((midi - 69) / 12) * 0.35),
        );
        zones.push({
          rootMidi: midi,
          lowMidi: midi,
          highMidi: midi,
          lowVelocity,
          highVelocity,
          files: [filename],
        });
      }
      console.log(`nylon: ${dynamic} ${scale}`);
    }
  }
  const manifest = {
    version: 1,
    name: "Raimundo 118 classical guitar",
    source: "https://theremin.music.uiowa.edu/MISguitar.html",
    license: "University of Iowa MIS: any projects, without restrictions",
    zones,
  };
  await saveManifest(bank, manifest);
}

if (!only || only === "steel")
  await prepareSfz({
    bank: "steel",
    directory: "FSS-SteelStringGuitar-SFZ-20200521",
    sfz: "FSS-SteelStringGuitar-20200521.sfz",
    name: "Seagull steel-string acoustic",
    source: "https://freepats.zenvoid.org/Guitar/steel-acoustic-guitar.html",
    license: "GPL-3.0-or-later WITH FreePats composition exception",
  });
if (!only || only === "electric")
  await prepareSfz({
    bank: "electric",
    directory: "EGuitarFSBS-clean SFZ+FLAC-20260807",
    sfz: "EGuitarFSBS-clean bridge 20260807.sfz",
    name: "Fender clean electric",
    source:
      "https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html",
    license: "CC0-1.0",
  });
if (!only || only === "nylon") await prepareNylon();
