import { z } from "zod";
import type {
  GuitarInstrument,
  GuitarPlaybackHandle,
  GuitarSample,
  GuitarSampleZone,
} from "~/utils/guitarSampleTypes";

const SAMPLE_ROOT = "/sounds/guitars/v2";
const CACHE_TARGET_BYTES = 192 * 1024 * 1024;
const STANDARD_TUNING = [64, 59, 55, 50, 45, 40];
const zoneSchema = z.object({
  rootMidi: z.number().int().min(0).max(127),
  lowMidi: z.number().int().min(0).max(127),
  highMidi: z.number().int().min(0).max(127),
  lowVelocity: z.number().int().min(0).max(127),
  highVelocity: z.number().int().min(0).max(127),
  files: z.array(z.string().regex(/^[a-f0-9]{12}\.mp3$/)).min(1),
  stringIndex: z.number().int().min(0).max(5).optional(),
});
const manifestSchema = z.object({
  version: z.literal(2),
  name: z.string(),
  source: z.string(),
  license: z.string(),
  zones: z.array(zoneSchema).min(1),
});

type BankName = "steel" | "nylon" | "electric";
type LoadedBank = {
  zones: GuitarSampleZone[];
  buffers: Map<string, AudioBuffer>;
  pending: Map<string, Promise<void>>;
  essential: Set<string>;
  retained: Set<string>;
  bytes: number;
  ready?: Promise<void>;
};

const bankLoads = new WeakMap<
  BaseAudioContext,
  Map<BankName, Promise<LoadedBank>>
>();

function noteToMidi(note: string) {
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note);
  if (!match) return null;
  const pitchClasses: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return (
    (Number(match[3]) + 1) * 12 +
    pitchClasses[match[1]!.toUpperCase()]! +
    accidental
  );
}

function defaultString(midi: number) {
  for (let index = 5; index >= 0; index--) {
    const fret = midi - STANDARD_TUNING[index]!;
    if (fret >= 0 && fret <= 4) return index;
  }
  return midi < 40 ? 5 : 0;
}

function zoneDistance(
  zone: GuitarSampleZone,
  midi: number,
  velocity: number,
  stringIndex = defaultString(midi),
) {
  const keyDistance = Math.max(zone.lowMidi - midi, midi - zone.highMidi, 0);
  const velocityDistance = Math.max(
    zone.lowVelocity - velocity,
    velocity - zone.highVelocity,
    0,
  );
  return (
    keyDistance * 1000 +
    (zone.stringIndex !== undefined && zone.stringIndex !== stringIndex
      ? 2000
      : 0) +
    velocityDistance * 2 +
    Math.abs(zone.rootMidi - midi)
  );
}

function nearestZone(
  zones: GuitarSampleZone[],
  midi: number,
  velocity: number,
  stringIndex?: number,
) {
  let best = zones[0]!;
  for (const zone of zones) {
    if (
      zoneDistance(zone, midi, velocity, stringIndex) <
      zoneDistance(best, midi, velocity, stringIndex)
    )
      best = zone;
  }
  return best;
}

function touch(bank: LoadedBank, file: string) {
  const buffer = bank.buffers.get(file);
  if (buffer) {
    bank.buffers.delete(file);
    bank.buffers.set(file, buffer);
  }
  return buffer;
}

function prune(bank: LoadedBank) {
  // Keep reference coverage and the current piece; discard older string positions.
  // AudioBufferSourceNodes retain their own buffers, so playing voices stay intact.
  for (const [file, buffer] of bank.buffers) {
    if (bank.bytes <= CACHE_TARGET_BYTES) break;
    if (bank.essential.has(file) || bank.retained.has(file)) continue;
    bank.buffers.delete(file);
    bank.bytes -= buffer.length * buffer.numberOfChannels * 4;
  }
}

async function fetchAsset(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(
        `Guitar sample request failed (${response.status}): ${url}`,
      );
    return await response.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

async function loadFiles(
  context: BaseAudioContext,
  bankName: BankName,
  bank: LoadedBank,
  files: string[],
) {
  let next = 0;
  // Bound decoding and requests: mobile Safari otherwise gets a large burst of
  // audio allocations. No network or decoding occurs in the playback scheduler.
  await Promise.all(
    Array.from({ length: Math.min(4, files.length) }, async () => {
      while (next < files.length) {
        const file = files[next++]!;
        if (touch(bank, file)) continue;
        let pending = bank.pending.get(file);
        if (!pending) {
          pending = (async () => {
            const bytes = await fetchAsset(
              `${SAMPLE_ROOT}/${bankName}/${file}`,
            );
            const buffer = await context.decodeAudioData(bytes);
            bank.buffers.set(file, buffer);
            bank.bytes += buffer.length * buffer.numberOfChannels * 4;
            prune(bank);
          })().finally(() => bank.pending.delete(file));
          bank.pending.set(file, pending);
        }
        await pending;
      }
    }),
  );
}

async function loadBank(context: BaseAudioContext, name: BankName) {
  let cache = bankLoads.get(context);
  if (!cache) {
    cache = new Map();
    bankLoads.set(context, cache);
  }
  let pending = cache.get(name);
  if (!pending) {
    pending = (async () => {
      const bytes = await fetchAsset(`${SAMPLE_ROOT}/${name}/manifest.json`);
      const manifest = manifestSchema.parse(
        JSON.parse(new TextDecoder().decode(bytes)),
      );
      const bank: LoadedBank = {
        zones: manifest.zones,
        buffers: new Map(),
        pending: new Map(),
        essential: new Set(),
        retained: new Set(),
        bytes: 0,
      };
      const essential = new Set<string>();
      const referenceFiles = new Set<string>();
      // One take of the normal picking layer across the whole recorded range.
      // Other dynamics and alternate takes arrive after playback is available.
      for (let midi = 0; midi <= 127; midi++) {
        const best = nearestZone(bank.zones, midi, 88);
        essential.add(best.files[0]!);
        for (const velocity of [32, 64, 88, 124]) {
          for (const file of nearestZone(bank.zones, midi, velocity).files)
            referenceFiles.add(file);
        }
      }
      bank.essential = essential;
      await loadFiles(context, name, bank, [...essential]);
      // Only first-position/reference dynamics, not every recording of each string.
      const optional = [...referenceFiles].filter(
        (file) => !essential.has(file),
      );
      bank.ready = loadFiles(context, name, bank, optional).catch(
        (error: unknown) => {
          console.warn(
            `Additional ${name} guitar dynamics unavailable; using loaded recordings.`,
            error,
          );
        },
      );
      return bank;
    })().catch((error: unknown) => {
      cache.delete(name);
      throw error;
    });
    cache.set(name, pending);
  }
  return await pending;
}

function createOutput(
  context: BaseAudioContext,
  destination: AudioNode,
  jazz: boolean,
) {
  const lowCut = context.createBiquadFilter();
  lowCut.type = "highpass";
  lowCut.frequency.value = 45;
  lowCut.Q.value = Math.SQRT1_2;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = jazz ? 3200 : context.sampleRate * 0.45;
  tone.Q.value = Math.SQRT1_2;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 3;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;
  lowCut.connect(tone);
  tone.connect(limiter);
  limiter.connect(destination);
  return lowCut;
}

export async function loadGuitarSamplePlayer(
  context: BaseAudioContext,
  instrumentName: string,
  destination: AudioNode,
): Promise<GuitarInstrument> {
  const name: BankName =
    instrumentName === "acoustic_guitar_steel"
      ? "steel"
      : instrumentName === "acoustic_guitar_nylon"
        ? "nylon"
        : "electric";
  const bank = await loadBank(context, name);
  const output = createOutput(
    context,
    destination,
    instrumentName === "electric_guitar_jazz",
  );
  const takes = new Map<GuitarSampleZone, number>();
  const active = new Set<GuitarPlaybackHandle>();

  function select(
    midi: number,
    velocity: number,
    advance: boolean,
    stringIndex?: number,
  ): GuitarSample | undefined {
    if (!Number.isFinite(midi) || !Number.isFinite(velocity)) return;
    const strength = Math.max(0, Math.min(127, velocity));
    let best: GuitarSampleZone | undefined;
    for (const zone of bank.zones) {
      if (!zone.files.some((file) => bank.buffers.has(file))) continue;
      if (
        !best ||
        zoneDistance(zone, midi, strength, stringIndex) <
          zoneDistance(best, midi, strength, stringIndex)
      )
        best = zone;
    }
    if (!best) return;
    const available = best.files.filter((file) => bank.buffers.has(file));
    const take = advance ? (takes.get(best) ?? 0) : 0;
    const file = available[take % available.length]!;
    if (advance) takes.set(best, take + 1);
    return {
      buffer: touch(bank, file)!,
      rootMidi: best.rootMidi,
      stringIndex: best.stringIndex,
    };
  }

  return {
    name: instrumentName,
    output,
    samplesReady: bank.ready,
    async prepareSamples(notes) {
      await bank.ready;
      const files = new Set<string>();
      for (const { midi, stringIndex } of notes) {
        if (
          !Number.isFinite(midi) ||
          !Number.isInteger(stringIndex) ||
          stringIndex < 0 ||
          stringIndex > 5
        )
          continue;
        for (const velocity of [32, 64, 88, 124]) {
          for (const file of nearestZone(
            bank.zones,
            midi,
            velocity,
            stringIndex,
          ).files)
            files.add(file);
        }
      }
      bank.retained = files;
      try {
        await loadFiles(context, name, bank, [...files]);
      } catch (error) {
        console.warn(
          `Some ${name} string recordings unavailable; using loaded samples.`,
          error,
        );
      }
      prune(bank);
    },
    getSample: (midi, velocity, stringIndex) =>
      select(midi, velocity, true, stringIndex),
    getReferenceSample: (midi, stringIndex) =>
      select(midi, 88, false, stringIndex),
    play(note, when = context.currentTime, options = {}) {
      const midi = noteToMidi(note);
      const sample = midi === null ? undefined : select(midi, 88, true);
      if (!sample || midi === null)
        return {
          stop() {
            /* No voice was started. */
          },
        };
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = sample.buffer;
      source.detune.value = (midi - sample.rootMidi) * 100;
      const start = Math.max(context.currentTime, when);
      const level = Math.max(0, options.gain ?? 0.9);
      const attack = Math.max(0.001, options.attack ?? 0.003);
      const release = Math.max(0.006, options.release ?? 0.025);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level, start + attack);
      source.connect(gain);
      gain.connect(output);
      let stoppedAt = Infinity;
      let ended = false;
      const handle: GuitarPlaybackHandle = {
        source,
        stop(when = context.currentTime) {
          if (ended) return;
          const time = Math.min(stoppedAt, Math.max(context.currentTime, when));
          if (time >= stoppedAt) return;
          stoppedAt = time;
          gain.gain.cancelScheduledValues(time);
          const currentLevel =
            level * Math.max(0, Math.min(1, (time - start) / attack));
          gain.gain.setValueAtTime(currentLevel, time);
          gain.gain.linearRampToValueAtTime(0, time + release);
          source.stop(time + release);
        },
      };
      active.add(handle);
      source.onended = () => {
        ended = true;
        active.delete(handle);
        source.disconnect();
        gain.disconnect();
      };
      source.start(start);
      if (options.duration !== undefined)
        handle.stop(start + Math.max(attack, options.duration));
      return handle;
    },
    stop(when = context.currentTime) {
      for (const handle of active) handle.stop(when);
    },
  };
}
