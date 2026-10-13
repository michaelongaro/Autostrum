import { z } from "zod";
import type {
  GuitarInstrument,
  GuitarPlaybackHandle,
  GuitarSample,
  GuitarSampleZone,
} from "~/utils/guitarSampleTypes";

const SAMPLE_ROOT = "/sounds/guitars/v1";
const zoneSchema = z.object({
  rootMidi: z.number().int().min(0).max(127),
  lowMidi: z.number().int().min(0).max(127),
  highMidi: z.number().int().min(0).max(127),
  lowVelocity: z.number().int().min(0).max(127),
  highVelocity: z.number().int().min(0).max(127),
  files: z.array(z.string().regex(/^[a-f0-9]{12}\.mp3$/)).min(1),
});
const manifestSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  source: z.string(),
  license: z.string(),
  zones: z.array(zoneSchema).min(1),
});

type BankName = "steel" | "nylon" | "electric";
type LoadedBank = {
  zones: GuitarSampleZone[];
  buffers: Map<string, AudioBuffer>;
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

function zoneDistance(zone: GuitarSampleZone, midi: number, velocity: number) {
  const keyDistance = Math.max(zone.lowMidi - midi, midi - zone.highMidi, 0);
  const velocityDistance = Math.max(
    zone.lowVelocity - velocity,
    velocity - zone.highVelocity,
    0,
  );
  return (
    keyDistance * 1000 + velocityDistance * 2 + Math.abs(zone.rootMidi - midi)
  );
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
        const bytes = await fetchAsset(`${SAMPLE_ROOT}/${bankName}/${file}`);
        bank.buffers.set(file, await context.decodeAudioData(bytes));
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
      const bank: LoadedBank = { zones: manifest.zones, buffers: new Map() };
      const essential = new Set<string>();
      // One take of the normal picking layer across the whole recorded range.
      // Other dynamics and alternate takes arrive after playback is available.
      for (let midi = 0; midi <= 127; midi++) {
        let best = bank.zones[0]!;
        for (const zone of bank.zones) {
          if (zoneDistance(zone, midi, 88) < zoneDistance(best, midi, 88))
            best = zone;
        }
        essential.add(best.files[0]!);
      }
      await loadFiles(context, name, bank, [...essential]);
      const optional = [
        ...new Set(bank.zones.flatMap((zone) => zone.files)),
      ].filter((file) => !essential.has(file));
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
  ): GuitarSample | undefined {
    if (!Number.isFinite(midi) || !Number.isFinite(velocity)) return;
    const strength = Math.max(0, Math.min(127, velocity));
    let best: GuitarSampleZone | undefined;
    for (const zone of bank.zones) {
      if (!zone.files.some((file) => bank.buffers.has(file))) continue;
      if (
        !best ||
        zoneDistance(zone, midi, strength) < zoneDistance(best, midi, strength)
      )
        best = zone;
    }
    if (!best) return;
    const available = best.files.filter((file) => bank.buffers.has(file));
    const take = advance ? (takes.get(best) ?? 0) : 0;
    const file = available[take % available.length]!;
    if (advance) takes.set(best, take + 1);
    return { buffer: bank.buffers.get(file)!, rootMidi: best.rootMidi };
  }

  return {
    name: instrumentName,
    output,
    samplesReady: bank.ready,
    getSample: (midi, velocity) => select(midi, velocity, true),
    getReferenceSample: (midi) => select(midi, 88, false),
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
