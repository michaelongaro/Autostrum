// Offline preparation from original WAVs; never runs during install/build/playback.
// Download instructions and source checksums: decisions/guitar-samples.md.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PitchDetector } from "pitchy";

const execute = promisify(execFile);
const sources = path.resolve(
  process.argv[2] ?? ".git/guitar-sample-sources/v2",
);
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";
const output = path.resolve("public/sounds/guitars/v2");
const only = process.argv
  .find((arg) => arg.startsWith("--only="))
  ?.split("=")[1];
const rate = 12000;
const stringIndexes = { HighE: 0, B: 1, G: 2, D: 3, A: 4, LowE: 5 };
const pitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

async function parallel(items, action) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (next < items.length) await action(items[next++]);
    }),
  );
}

function noteMidi(note) {
  const match = /^([A-G])(s?)(-?\d+)$/.exec(note);
  if (!match) throw new Error(`Invalid source note: ${note}`);
  return (Number(match[3]) + 1) * 12 + pitches[match[1]] + (match[2] ? 1 : 0);
}

function sfzZones(text) {
  let group = {};
  const regions = [];
  for (const [, tag, body] of text
    .replace(/\/\/[^\n]*/g, "")
    .matchAll(/<(group|region)>([^<]*)/g)) {
    const fields = Object.fromEntries(
      [...body.matchAll(/(\w+)=([^\s]+)/g)].map((m) => [m[1], m[2]]),
    );
    if (tag === "group") group = fields;
    else regions.push({ ...group, ...fields });
  }
  return regions;
}

function tune(data, midi, onset) {
  const detector = PitchDetector.forFloat32Array(2048);
  detector.minVolumeDecibels = -90;
  detector.clarityThreshold = 0.8;
  const measured = [];
  for (
    let frame = Math.floor((onset + 0.12) * rate);
    frame < (onset + 0.55) * rate && frame + 2048 < data.length;
    frame += 240
  ) {
    const [hz, clarity] = detector.findPitch(
      data.subarray(frame, frame + 2048),
      rate,
    );
    if (clarity < 0.8 || hz < 50) continue;
    const pitch = 69 + 12 * Math.log2(hz / 440);
    const folded = pitch + 12 * Math.round((midi - pitch) / 12);
    if (Math.abs(folded - midi) < 0.6) measured.push(folded);
  }
  measured.sort((a, b) => a - b);
  return measured.length >= 4
    ? (midi - measured[Math.floor(measured.length / 2)]) * 100
    : 0;
}

async function analyze(recording) {
  const { stdout } = await execute(
    ffmpeg,
    [
      "-v",
      "error",
      "-i",
      recording.path,
      "-af",
      "highpass=f=30:p=2",
      "-ac",
      "1",
      "-ar",
      String(rate),
      "-f",
      "f32le",
      "pipe:1",
    ],
    { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 },
  );
  const data = new Float32Array(
    stdout.buffer.slice(
      stdout.byteOffset,
      stdout.byteOffset + stdout.byteLength,
    ),
  );
  let maximum = 0;
  for (const value of data) maximum = Math.max(maximum, Math.abs(value));
  if (maximum < 0.00001) throw new Error(`Silent sample: ${recording.path}`);
  let first = 0,
    last = data.length - 1;
  while (first < last && Math.abs(data[first]) < maximum * 0.002) first++;
  while (last > first && Math.abs(data[last]) < maximum * 0.001) last--;
  first = Math.max(0, first - Math.round(rate * 0.003));
  last = Math.min(data.length - 1, last + Math.round(rate * 0.12));
  const onset = first / rate;
  return {
    peak: maximum,
    onset,
    seconds: (last - first + 1) / rate,
    cents: tune(data, recording.rootMidi, onset),
  };
}

async function prepare({ bank, name, source, prefix, sfz }) {
  const directory = path.join(sources, bank, prefix ?? "");
  const destination = path.join(output, bank);
  await fs.mkdir(destination, { recursive: true });
  const zones = [];
  const recordings = new Map();
  if (bank !== "electric") {
    for (const filename of (await fs.readdir(directory)).sort()) {
      const match =
        /^INSGuitar(?:Steel|Nylon)_String(LowE|A|D|G|B|HighE)_Vel(\d+)(?:Finger|Pick)?_([A-G]s?-?\d+)_01\.wav$/.exec(
          filename,
        );
      if (!match) continue;
      const rootMidi = noteMidi(match[3]);
      const layer = Number(match[2]);
      const zone = {
        rootMidi,
        lowMidi: rootMidi,
        highMidi: rootMidi,
        stringIndex: stringIndexes[match[1]],
        lowVelocity: [0, 0, 56, 101][layer],
        highVelocity: [0, 55, 100, 127][layer],
        files: [filename],
      };
      zones.push(zone);
      recordings.set(filename, {
        path: path.join(directory, filename),
        rootMidi,
        normal: layer === 2,
      });
    }
    const expected = bank === "steel" ? 375 : 348;
    if (zones.length !== expected)
      throw new Error(
        `${bank}: expected ${expected} source recordings, found ${zones.length}`,
      );
  } else {
    const grouped = new Map();
    for (const region of sfzZones(
      await fs.readFile(path.join(directory, sfz), "utf8"),
    )) {
      // Dedicated string-contact/release samples are not pitched note regions.
      if (!region.sample.startsWith("notes\\")) continue;
      const rootMidi = Number(region.pitch_keycenter ?? region.key ?? 60);
      const lowMidi = Number(region.lokey ?? region.key),
        highMidi = Number(region.hikey ?? region.key);
      const lowVelocity = Number(region.lovel ?? 0),
        highVelocity = Number(region.hivel ?? 127);
      if (
        ![rootMidi, lowMidi, highMidi, lowVelocity, highVelocity].every(
          Number.isFinite,
        )
      )
        throw new Error(`Invalid Emilyguitar region: ${region.sample}`);
      const id = `${rootMidi}:${lowMidi}:${highMidi}:${lowVelocity}:${highVelocity}`;
      let zone = grouped.get(id);
      if (!zone) {
        zone = {
          rootMidi,
          lowMidi,
          highMidi,
          lowVelocity,
          highVelocity,
          files: [],
        };
        grouped.set(id, zone);
      }
      const filename = region.sample.replaceAll("\\", "/");
      zone.files.push(filename);
      recordings.set(filename, {
        path: path.join(directory, filename),
        rootMidi,
        normal: lowVelocity === 81,
      });
    }
    zones.push(...grouped.values());
    if (
      recordings.size !== 216 ||
      zones.length !== 72 ||
      zones.some((zone) => zone.files.length !== 3)
    )
      throw new Error("Unexpected Emilyguitar mapping");
  }

  console.log(`${bank}: analyzing ${recordings.size} WAV recordings`);
  await parallel([...recordings.values()], async (recording) => {
    Object.assign(recording, await analyze(recording));
  });
  const normalPeaks = [...recordings.values()]
    .filter((recording) => recording.normal)
    .map((recording) => recording.peak)
    .sort((a, b) => a - b);
  const largest = Math.max(
    ...[...recordings.values()].map((recording) => recording.peak),
  );
  // One collection gain retains actual dynamics and differences between notes/takes.
  const gain = Math.min(
    0.23 / normalPeaks[Math.floor(normalPeaks.length * 0.9)],
    0.65 / largest,
  );
  const filenames = new Map();
  let encoded = 0;
  await parallel([...recordings.entries()], async ([filename, recording]) => {
    const temporary = path.join(
      destination,
      `encode-${createHash("sha256").update(filename).digest("hex").slice(0, 16)}.mp3`,
    );
    const tuneRate = 2 ** (recording.cents / 1200);
    const duration = recording.seconds / tuneRate;
    await execute(ffmpeg, [
      "-v",
      "error",
      "-y",
      "-ss",
      String(recording.onset),
      "-i",
      recording.path,
      "-t",
      String(recording.seconds),
      "-af",
      `highpass=f=30:p=2,aresample=44100,asetrate=${44100 * tuneRate},aresample=44100,volume=${gain},afade=t=in:d=0.001,afade=t=out:st=${Math.max(0, duration - 0.06)}:d=0.06`,
      "-ac",
      "1",
      "-ar",
      "44100",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      "-map_metadata",
      "-1",
      temporary,
    ]);
    const bytes = await fs.readFile(temporary);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
    const hashed = `${hash}.mp3`;
    await fs.rename(temporary, path.join(destination, hashed));
    filenames.set(filename, hashed);
    if (++encoded % 75 === 0)
      console.log(`${bank}: ${encoded}/${recordings.size} encoded`);
  });
  for (const zone of zones)
    zone.files = zone.files.map((filename) => filenames.get(filename));
  const manifest = { version: 2, name, source, license: "CC0-1.0", zones };
  await fs.writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const referenced = new Set(filenames.values());
  for (const filename of await fs.readdir(destination)) {
    if (/^[a-f0-9]{12}\.mp3$/.test(filename) && !referenced.has(filename))
      await fs.unlink(path.join(destination, filename));
  }
  await fs.copyFile(
    path.join(directory, sfz),
    path.join(destination, "source.sfz"),
  );
  await fs.copyFile(
    path.join(directory, "LICENSE"),
    path.join(destination, "LICENSE.txt"),
  );
  if (bank === "electric")
    await fs.copyFile(
      path.join(directory, "readme.txt"),
      path.join(destination, "README-source.txt"),
    );
  console.log(
    `${bank}: complete; ${zones.length} zones, ${recordings.size} takes, gain ${gain.toFixed(3)}, longest ${Math.max(...[...recordings.values()].map((recording) => recording.seconds)).toFixed(2)}s`,
  );
}

const banks = [
  {
    bank: "steel",
    name: "Meta Steel Guitar",
    source: "https://github.com/facebookincubator/Meta-open-sound",
    sfz: "meta-steel-guitar.sfz",
  },
  {
    bank: "nylon",
    name: "Meta Nylon Guitar",
    source: "https://github.com/facebookincubator/Meta-open-sound",
    sfz: "meta-nylon-guitar.sfz",
  },
  {
    bank: "electric",
    name: "Karoryfer Emilyguitar",
    source: "https://github.com/sfzinstruments/karoryfer.emilyguitar",
    prefix: "Emilyguitar",
    sfz: "emily_clean.sfz",
  },
];
for (const bank of banks) if (!only || only === bank.bank) await prepare(bank);
