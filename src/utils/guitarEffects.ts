import type Soundfont from "soundfont-player";
import {
  normalizePalmMuteSettings,
  palmMuteProfile,
  type PalmMuteProfile,
  type PalmMuteSettings,
} from "~/utils/palmMuteAudio";

export type PlaybackStrings = (
  Soundfont.Player | AudioBufferSourceNode | undefined
)[];

export interface GuitarTransition {
  effect: "h" | "p" | "/" | "\\" | "b" | "r" | "arbitrarySlide";
  // A destination can bend/release after an incoming slide or hammer/pull.
  incomingEffect?: "h" | "p" | "/" | "\\";
  pluckBaseNote: boolean;
  transitionFromFret?: number;
  transitionToFret?: number;
}

type Point = { time: number; value: number };
type Modulator = {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  points: Point[];
  stopAt: number;
  releasing: boolean;
};
type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  instrument: Soundfont.Player;
  sampleMidi: number;
  stringIdx: number;
  sampleOffset: number;
  startTime: number;
  releaseAt: number;
  stopAt: number;
  sampleGain: number;
  ended: boolean;
  gainPoints: Point[];
  pitchPoints: Point[];
  filterPoints: Point[];
  modulators: Modulator[];
  extraNodes: AudioNode[];
  palmContactDepth?: number;
  damping?: PalmMuteProfile;
  palmTone?: {
    filter: BiquadFilterNode;
    points: Point[];
    frequencyPoints: Point[];
  }[];
  stopSource: (when: number) => void;
};

const SILENCE = 0.0001;
const RELEASE_SECONDS = 0.012;
const STOP_RELEASE_SECONDS = 0.025;
const MAX_LEGATO_SAMPLE_GAIN = 3;
const voices = new WeakMap<AudioBufferSourceNode, Voice>();
const stringVoices = new WeakMap<PlaybackStrings, Set<Voice>>();
const attackOffsets = new WeakMap<
  AudioBuffer,
  { body: number; mutedPick: number }
>();
const sampleEnergy = new WeakMap<
  AudioBuffer,
  {
    blockFrames: number;
    prefix: Float64Array;
  }
>();
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
const deadNoteHits = new WeakMap<PlaybackStrings, Uint8Array>();
const palmMuteHits = new WeakMap<PlaybackStrings, Uint8Array>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function valueAt(points: Point[], time: number) {
  let previous = points[0]!;
  for (const point of points.slice(1)) {
    if (point.time > time) {
      const fraction = clamp(
        (time - previous.time) / (point.time - previous.time),
        0,
        1,
      );
      return previous.value + (point.value - previous.value) * fraction;
    }
    previous = point;
  }
  return previous.value;
}

// Keep a small automation history so a scheduled stop can truncate an attack,
// mute decay, or pitch transition without a discontinuity (including Safari).
function holdAt(param: AudioParam, points: Point[], time: number) {
  const value = valueAt(points, time);
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(time);
  } else {
    param.cancelScheduledValues(time);
    param.linearRampToValueAtTime(value, time);
  }
  // cancelAndHoldAtTime is a no-op when the parameter has no automation yet.
  // Anchor the next ramp explicitly, or lookahead can bend a plain note early.
  param.setValueAtTime(value, time);
  const nextPoint = points.findIndex((point) => point.time >= time);
  if (nextPoint >= 0) points.splice(nextPoint);
  points.push({ time, value });
  return value;
}

function ramp(param: AudioParam, points: Point[], value: number, time: number) {
  param.linearRampToValueAtTime(value, time);
  points.push({ time, value });
}

function stopModulators(
  voice: Voice,
  time: number,
  stopAt = time + RELEASE_SECONDS,
) {
  const endTime =
    time <= voice.startTime ? time : Math.min(stopAt, time + RELEASE_SECONDS);
  for (const modulator of voice.modulators) {
    if (time >= modulator.stopAt) continue;
    const { source, gain, points } = modulator;
    holdAt(gain.gain, points, time);
    modulator.stopAt = Math.min(endTime, modulator.stopAt);
    modulator.releasing = true;
    ramp(gain.gain, points, 0, modulator.stopAt);
    source.stop(modulator.stopAt);
  }
}

function trackModulator(
  voice: Voice,
  source: AudioScheduledSourceNode,
  gain: GainNode,
  points: Point[],
  stopAt: number,
) {
  const modulator = { source, gain, points, stopAt, releasing: false };
  voice.modulators.push(modulator);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    const index = voice.modulators.indexOf(modulator);
    if (index >= 0) voice.modulators.splice(index, 1);
  };
}

function releaseVoice(voice: Voice, time: number) {
  if (voice.ended) return;
  const releaseAt = Math.max(voice.source.context.currentTime, time);
  if (releaseAt >= voice.stopAt) return;
  // Cancel queued notes before their attack. Sounding notes get a short fade
  // from their current envelope level, without extending an existing release.
  const stopAt =
    releaseAt <= voice.startTime
      ? releaseAt
      : Math.min(releaseAt + STOP_RELEASE_SECONDS, voice.stopAt);
  holdAt(voice.gain.gain, voice.gainPoints, releaseAt);
  ramp(voice.gain.gain, voice.gainPoints, 0, stopAt);
  voice.releaseAt = Math.min(releaseAt, voice.releaseAt);
  voice.stopAt = stopAt;
  voice.stopSource(stopAt);
  stopModulators(voice, releaseAt, stopAt);
}

export function stopGuitarStrings(strings: PlaybackStrings, time: number) {
  // The array contains the latest *scheduled* voice on each string. Include
  // earlier voices still sounding during the scheduler's lookahead window.
  for (const voice of stringVoices.get(strings) ?? []) {
    releaseVoice(voice, time);
  }
  for (let index = 0; index < strings.length; index++) {
    strings[index]?.stop(time);
    strings[index] = undefined;
  }
}

function getBuffer(instrument: Soundfont.Player, midi: number) {
  // soundfont-player 0.12 exposes decoded buffers keyed by MIDI number. Its
  // published Player type omits this property (and mis-types play's result).
  return (
    instrument as Soundfont.Player & {
      buffers?: Record<string, AudioBuffer>;
    }
  ).buffers?.[midi];
}

function getAttackOffset(buffer: AudioBuffer, mutedPick = false) {
  const cached = attackOffsets.get(buffer);
  if (cached !== undefined) return mutedPick ? cached.mutedPick : cached.body;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  const samples = channels[0]!;
  const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.004));
  const limit = Math.min(samples.length, Math.floor(buffer.sampleRate * 0.08));
  let peakEnergy = 0;
  let peakFrame = 0;
  const energies: { frame: number; energy: number }[] = [];
  for (let frame = 0; frame < limit; frame += windowSize) {
    let energy = 0;
    for (
      let index = frame;
      index < Math.min(frame + windowSize, limit);
      index++
    ) {
      for (const channel of channels)
        energy += channel[index]! ** 2 / channels.length;
    }
    if (energy > peakEnergy) {
      peakEnergy = energy;
      peakFrame = frame;
    }
    energies.push({ frame, energy });
  }
  // Locate the post-attack body for legato entry and dead-note resonance,
  // instead of jumping 0.1–0.5 s into every recording.
  const body = Math.min(
    (peakFrame + windowSize) / buffer.sampleRate + 0.018,
    buffer.duration * 0.2,
  );
  // Find the first meaningful attack energy, not the loudest later cycle of a
  // bass string. Retain 4 ms of pre-roll and ignore only near-silent lead-in.
  const onsetFrame =
    energies.find(({ energy }) => energy >= peakEnergy * 0.015)?.frame ?? 0;
  const offsets = {
    body,
    mutedPick: Math.max(0, onsetFrame / buffer.sampleRate - 0.004),
  };
  attackOffsets.set(buffer, offsets);
  return mutedPick ? offsets.mutedPick : offsets.body;
}

function sampleRms(buffer: AudioBuffer, start: number, end: number) {
  let energy = sampleEnergy.get(buffer);
  if (!energy) {
    const blockFrames = Math.max(1, Math.round(buffer.sampleRate * 0.01));
    const frames = buffer.getChannelData(0).length;
    const prefix = new Float64Array(Math.ceil(frames / blockFrames) + 1);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let frame = 0; frame < frames; frame++) {
        prefix[Math.floor(frame / blockFrames) + 1]! +=
          samples[frame]! ** 2 / buffer.numberOfChannels;
      }
    }
    for (let block = 1; block < prefix.length; block++) {
      prefix[block]! += prefix[block - 1]!;
    }
    energy = { blockFrames, prefix };
    sampleEnergy.set(buffer, energy);
  }
  const frames = buffer.getChannelData(0).length;
  const from = clamp(start * buffer.sampleRate, 0, frames);
  const to = clamp(end * buffer.sampleRate, from, frames);
  const integratedEnergy = (frame: number) => {
    const block = Math.min(
      Math.floor(frame / energy.blockFrames),
      energy.prefix.length - 2,
    );
    const fraction =
      (frame - block * energy.blockFrames) /
      Math.min(energy.blockFrames, frames - block * energy.blockFrames);
    return (
      energy.prefix[block]! +
      fraction * (energy.prefix[block + 1]! - energy.prefix[block]!)
    );
  };
  return Math.sqrt(
    Math.max(0, integratedEnergy(to) - integratedEnergy(from)) /
      Math.max(1, to - from),
  );
}

function legatoSampleGain(
  voice: Voice,
  midi: number,
  time: number,
  predictPitch = false,
) {
  const target = getBuffer(voice.instrument, midi);
  if (!target) return 1;
  const consumed = consumedSampleSeconds(voice, time);
  const rate = 2 ** ((midi - voice.sampleMidi) / 12);
  // Compare the destination recording's body with the *remaining* body of
  // this voice. A ringing sample has already lost energy before the gesture;
  // multiplying its previous gain cannot restore the destination's level.
  const desired = sampleRms(target, 0.2, 0.3);
  const remaining = sampleRms(
    voice.source.buffer!,
    predictPitch
      ? consumed + 0.2 * rate
      : consumedSampleSeconds(voice, time + 0.2),
    predictPitch
      ? consumed + 0.3 * rate
      : consumedSampleSeconds(voice, time + 0.3),
  );
  return desired > SILENCE ? desired / Math.max(remaining, SILENCE) : 1;
}

function consumedSampleSeconds(voice: Voice, time: number) {
  let consumed = voice.sampleOffset;
  let previous = voice.pitchPoints[0]!;
  for (const point of voice.pitchPoints.slice(1)) {
    const endTime = Math.min(time, point.time);
    if (endTime > previous.time) {
      // Trapezoidal integration over the small pitch-curve segments is enough
      // to detect exhausted samples before scheduling another legato gesture.
      const endPitch = valueAt([previous, point], endTime);
      consumed +=
        (endTime - previous.time) *
        (2 ** (previous.value / 1200) + 2 ** (endPitch / 1200)) *
        0.5;
    }
    if (point.time >= time) return consumed;
    previous = point;
  }
  return (
    consumed + Math.max(0, time - previous.time) * 2 ** (previous.value / 1200)
  );
}

interface SampleArgs {
  instrument: Soundfont.Player;
  midi: number;
  stringIdx: number;
  startTime: number;
  audioContext: BaseAudioContext;
  destination: AudioNode;
  strings: PlaybackStrings;
  scheduledNodes?: { stop(when?: number): void }[];
  legato?: boolean;
  mutedPick?: boolean;
  palmMuteDepth?: number;
}

function createVoice({
  instrument,
  midi,
  stringIdx,
  startTime,
  audioContext,
  destination,
  strings,
  scheduledNodes,
  legato,
  mutedPick,
}: SampleArgs) {
  const buffer = getBuffer(instrument, midi);
  if (!buffer) return;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.Q.value = Math.SQRT1_2;
  filter.frequency.value = audioContext.sampleRate * 0.45;
  gain.gain.value = 0;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  const voice: Voice = {
    source,
    gain,
    filter,
    instrument,
    sampleMidi: midi,
    stringIdx,
    sampleOffset: legato
      ? getAttackOffset(buffer)
      : mutedPick
        ? getAttackOffset(buffer, true)
        : 0,
    startTime,
    releaseAt: Infinity,
    stopAt: Infinity,
    sampleGain: 1,
    ended: false,
    gainPoints: [{ time: startTime, value: 0 }],
    pitchPoints: [{ time: startTime, value: 0 }],
    filterPoints: [{ time: startTime, value: filter.frequency.value }],
    modulators: [],
    extraNodes: [],
    stopSource: source.stop.bind(source),
  };
  source.stop = (when = audioContext.currentTime) => releaseVoice(voice, when);
  voices.set(source, voice);
  let activeVoices = stringVoices.get(strings);
  if (!activeVoices) {
    activeVoices = new Set();
    stringVoices.set(strings, activeVoices);
  }
  activeVoices.add(voice);
  strings[stringIdx]?.stop(startTime);
  strings[stringIdx] = source;
  scheduledNodes?.push(source);
  source.onended = () => {
    voice.ended = true;
    stopModulators(voice, audioContext.currentTime);
    for (const modulator of voice.modulators) {
      modulator.source.disconnect();
      modulator.gain.disconnect();
    }
    for (const node of [source, filter, gain, ...voice.extraNodes])
      node.disconnect();
    activeVoices.delete(voice);
    if (strings[stringIdx] === source) strings[stringIdx] = undefined;
    const scheduledIndex = scheduledNodes?.indexOf(source) ?? -1;
    if (scheduledIndex >= 0) scheduledNodes?.splice(scheduledIndex, 1);
  };
  source.start(startTime, voice.sampleOffset);
  return voice;
}

function transitionPitch(
  voice: Voice,
  targetMidi: number,
  time: number,
  duration: number,
  slide: boolean,
) {
  const startingCents = holdAt(voice.source.detune, voice.pitchPoints, time);
  const targetCents = (targetMidi - voice.sampleMidi) * 100;
  for (let index = 1; index <= 24; index++) {
    const progress = index / 24;
    const eased = progress * progress * (3 - 2 * progress);
    // Small fret crossings distinguish a fretted slide from a string bend.
    const fretTexture = slide
      ? 7 *
        Math.sin(Math.PI * progress) *
        Math.sin(
          ((2 * Math.PI * Math.abs(targetCents - startingCents)) / 100) * eased,
        )
      : 0;
    ramp(
      voice.source.detune,
      voice.pitchPoints,
      startingCents + (targetCents - startingCents) * eased + fretTexture,
      time + duration * progress,
    );
  }
}

function shapeEnvelope(
  voice: Voice,
  time: number,
  duration: number,
  level: number,
  palmMuted: boolean,
  attack: number,
  damping = 6,
) {
  holdAt(voice.gain.gain, voice.gainPoints, time);
  ramp(voice.gain.gain, voice.gainPoints, level, time + attack);
  if (palmMuted) {
    for (let index = 1; index <= 12; index++) {
      const progress = index / 12;
      ramp(
        voice.gain.gain,
        voice.gainPoints,
        Math.max(SILENCE, level * Math.exp(-damping * progress)),
        time + attack + (duration - attack) * progress,
      );
    }
  } else {
    ramp(voice.gain.gain, voice.gainPoints, level, time + duration);
  }
  ramp(voice.gain.gain, voice.gainPoints, 0, time + duration + RELEASE_SECONDS);
  voice.releaseAt = time + duration;
  voice.stopAt = voice.releaseAt + RELEASE_SECONDS;
  voice.stopSource(voice.stopAt);
}

function instrumentName(voice: Voice) {
  return (
    (voice.instrument as Soundfont.Player & { name?: string }).name ??
    "acoustic_guitar_steel"
  );
}

function shapePalmEnvelope(
  voice: Voice,
  time: number,
  profile: PalmMuteProfile,
  level: number,
  attack: number,
  deadline = Infinity,
) {
  const releaseAt = Math.min(time + attack + profile.duration, deadline);
  holdAt(voice.gain.gain, voice.gainPoints, time);
  ramp(
    voice.gain.gain,
    voice.gainPoints,
    level,
    Math.min(time + attack, releaseAt),
  );
  // Fixed intervals and a physical decay constant: rhythmic subdivision and
  // playback speed never stretch this curve. Explicit staccato can gate it.
  for (
    let elapsed = 0.008;
    time + attack + elapsed < releaseAt;
    elapsed += 0.008
  ) {
    ramp(
      voice.gain.gain,
      voice.gainPoints,
      level * Math.exp(-elapsed / profile.decay),
      time + attack + elapsed,
    );
  }
  ramp(
    voice.gain.gain,
    voice.gainPoints,
    level * Math.exp(-Math.max(0, releaseAt - time - attack) / profile.decay),
    releaseAt,
  );
  ramp(voice.gain.gain, voice.gainPoints, 0, releaseAt + RELEASE_SECONDS);
  voice.releaseAt = releaseAt;
  voice.stopAt = releaseAt + RELEASE_SECONDS;
  voice.stopSource(voice.stopAt);
  voice.damping = profile;
}

function ensurePalmTone(voice: Voice) {
  if (voice.palmTone) return voice.palmTone;
  const context = voice.source.context;
  const filters = [context.createBiquadFilter(), context.createBiquadFilter()];
  voice.filter.disconnect();
  voice.filter.connect(filters[0]!);
  filters[0]!.connect(filters[1]!);
  filters[1]!.connect(voice.gain);
  voice.palmTone = filters.map((filter) => {
    filter.type = "highshelf";
    filter.gain.value = 0;
    voice.extraNodes.push(filter);
    return {
      filter,
      points: [{ time: voice.startTime, value: 0 }],
      frequencyPoints: [
        { time: voice.startTime, value: filter.frequency.value },
      ],
    };
  });
  return voice.palmTone;
}

function shapePalmTone(
  voice: Voice,
  time: number,
  profile: PalmMuteProfile,
  picked: boolean,
) {
  const context = voice.source.context;
  const nyquist = context.sampleRate * 0.45;
  const tone = ensurePalmTone(voice);
  const cutoff = voice.filter.frequency;
  const from = holdAt(cutoff, voice.filterPoints, time);
  if (picked) {
    cutoff.setValueAtTime(Math.min(nyquist, profile.attackCutoff), time);
    voice.filterPoints[voice.filterPoints.length - 1]!.value = Math.min(
      nyquist,
      profile.attackCutoff,
    );
  }
  const start = picked ? Math.min(nyquist, profile.attackCutoff) : from;
  const end = Math.min(
    nyquist,
    picked ? profile.bodyCutoff : Math.min(start, profile.bodyCutoff),
  );
  for (let index = 1; index <= 24; index++) {
    const elapsed = index * 0.008;
    const blend = 1 - Math.exp(-elapsed / (profile.decay * 1.3));
    ramp(
      cutoff,
      voice.filterPoints,
      start * (end / start) ** blend,
      time + elapsed,
    );
  }
  // Two shelving stages model separate upper-harmonic and pick-band losses.
  // The fundamental remains in the one serial path; no dry branch or noise.
  tone.forEach((band, index) => {
    const frequency = Math.min(
      nyquist,
      index === 0 ? profile.overtoneHz : profile.pickHz,
    );
    holdAt(band.filter.frequency, band.frequencyPoints, time);
    ramp(
      band.filter.frequency,
      band.frequencyPoints,
      frequency,
      time + (picked ? 0 : 0.008),
    );
    const initial = holdAt(band.filter.gain, band.points, time);
    const loss = index === 0 ? profile.overtoneLoss : profile.pickLoss;
    const target = Math.min(initial, -loss);
    for (let point = 1; point <= 24; point++) {
      const elapsed = point * 0.008;
      const decay = profile.decay * (index === 0 ? 2.4 : 0.65);
      ramp(
        band.filter.gain,
        band.points,
        initial + (target - initial) * (1 - Math.exp(-elapsed / decay)),
        time + elapsed,
      );
    }
  });
}

function releasePalmTone(voice: Voice, time: number) {
  // Damping has already removed energy from these partials. Lifting the hand
  // stops further loss; opening a filter here would resurrect the unmuted
  // recording's overtones. A fresh pick gets its own unfiltered voice.
  holdAt(voice.filter.frequency, voice.filterPoints, time);
  for (const band of voice.palmTone ?? []) {
    holdAt(band.filter.gain, band.points, time);
  }
}

function retunePalmTone(voice: Voice, time: number, profile: PalmMuteProfile) {
  const ratio =
    profile.bodyCutoff / (voice.damping?.bodyCutoff ?? profile.bodyCutoff);
  const future = voice.filterPoints.filter(
    (point) => point.time > time + 0.008,
  );
  const cutoff = holdAt(voice.filter.frequency, voice.filterPoints, time);
  const limit = voice.source.context.sampleRate * 0.45;
  ramp(
    voice.filter.frequency,
    voice.filterPoints,
    Math.min(limit, cutoff * ratio),
    time + 0.008,
  );
  for (const point of future) {
    ramp(
      voice.filter.frequency,
      voice.filterPoints,
      Math.min(limit, point.value * ratio),
      point.time,
    );
  }
  voice.palmTone?.forEach((band, index) => {
    holdAt(band.filter.frequency, band.frequencyPoints, time);
    ramp(
      band.filter.frequency,
      band.frequencyPoints,
      Math.min(limit, index === 0 ? profile.overtoneHz : profile.pickHz),
      time + 0.008,
    );
  });
}

/** Apply the planted hand before any pluck/strum, including empty columns. */
export function applyPalmMuteContact(
  strings: PlaybackStrings,
  time: number,
  settings?: PalmMuteSettings,
) {
  const contact = settings ? normalizePalmMuteSettings(settings) : undefined;
  for (const voice of stringVoices.get(strings) ?? []) {
    if (voice.ended || voice.startTime >= time || voice.releaseAt <= time)
      continue;
    const covered = contact?.strings.includes(voice.stringIdx);
    if (contact && covered && voice.palmContactDepth !== contact.depth) {
      const midi = voice.sampleMidi + valueAt(voice.pitchPoints, time) / 100;
      const profile = palmMuteProfile(
        instrumentName(voice),
        midi,
        voice.stringIdx,
        contact.depth,
      );
      const level = valueAt(voice.gainPoints, time);
      shapePalmEnvelope(voice, time, profile, level, 0, voice.releaseAt);
      shapePalmTone(voice, time, profile, false);
      voice.palmContactDepth = contact.depth;
    } else if (!covered && voice.palmContactDepth !== undefined) {
      // Removing contact preserves the energy already lost. Hold the remaining
      // level; the recording's own decay and the existing stop still apply.
      const level = holdAt(voice.gain.gain, voice.gainPoints, time);
      ramp(voice.gain.gain, voice.gainPoints, level, voice.releaseAt);
      ramp(voice.gain.gain, voice.gainPoints, 0, voice.stopAt);
      releasePalmTone(voice, time);
      voice.palmContactDepth = undefined;
    }
  }
}

function applyVibrato(voice: Voice, time: number, interval: number) {
  const startTime = time + clamp(interval * 0.14, 0.075, 0.18);
  if (startTime >= voice.releaseAt - 0.025) return;
  const context = voice.source.context;
  const nylon =
    (voice.instrument as Soundfont.Player & { name?: string }).name ===
    "acoustic_guitar_nylon";
  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(4.8, startTime);
  oscillator.frequency.linearRampToValueAtTime(5.3, startTime + 0.6);
  const depth = context.createGain();
  const depthPoints = [{ time: startTime, value: 0 }];
  depth.gain.setValueAtTime(0, startTime);
  ramp(depth.gain, depthPoints, nylon ? 18 : 23, startTime + 0.12);
  oscillator.connect(depth);
  depth.connect(voice.source.detune);
  oscillator.start(startTime);
  oscillator.stop(voice.releaseAt + RELEASE_SECONDS);
  trackModulator(voice, oscillator, depth, depthPoints, voice.stopAt);
  if (!nylon) {
    // Fretted steel/electric vibrato bends up and returns to pitch. Classical
    // nylon vibrato is shallower and can move to either side of the note.
    const bias = context.createConstantSource();
    const biasDepth = context.createGain();
    const biasPoints = [{ time: startTime, value: 0 }];
    bias.offset.value = 1;
    biasDepth.gain.setValueAtTime(0, startTime);
    ramp(biasDepth.gain, biasPoints, 23, startTime + 0.12);
    bias.connect(biasDepth);
    biasDepth.connect(voice.source.detune);
    bias.start(startTime);
    bias.stop(voice.releaseAt + RELEASE_SECONDS);
    trackModulator(voice, bias, biasDepth, biasPoints, voice.stopAt);
  }
}

export function playGuitarNote(
  args: SampleArgs & {
    fret: number;
    fretted?: boolean;
    bpm: number;
    effects: string[];
    transition?: GuitarTransition;
    pluckBaseNote: boolean;
  },
) {
  const { midi, fret, bpm, effects, transition, strings, stringIdx } = args;
  const time = Math.max(args.audioContext.currentTime, args.startTime);
  const interval = 60 / bpm;
  const palmMuted = effects.includes("PM");
  const depth = normalizePalmMuteSettings({ depth: args.palmMuteDepth }).depth;
  const incomingEffect = transition?.incomingEffect ?? transition?.effect;
  const legato =
    transition?.transitionFromFret !== undefined || !args.pluckBaseNote;
  const previous = strings[stringIdx];
  let voice = previous
    ? voices.get(previous as AudioBufferSourceNode)
    : undefined;
  const previousDamping = voice?.damping;
  let reuse =
    legato &&
    voice &&
    !voice.ended &&
    voice.instrument === args.instrument &&
    voice.startTime <= time &&
    voice.releaseAt > time &&
    consumedSampleSeconds(voice, time) < voice.source.buffer!.duration - 0.02;
  const tetheredLegato = transition?.transitionFromFret !== undefined;
  if (
    reuse &&
    voice &&
    tetheredLegato &&
    !palmMuted &&
    !voice.damping &&
    legatoSampleGain(voice, midi, time, true) > MAX_LEGATO_SAMPLE_GAIN
  ) {
    // A nearly silent tail would need an excessive boost. Refresh from the
    // destination's post-attack body and crossfade the old voice instead.
    reuse = false;
  }
  if (!reuse) {
    // A slide/bend cannot excite an already damped-away string. Hammer-ons
    // and pull-offs can add a quiet body attack, without replaying a pick.
    if (
      legato &&
      (palmMuted || voice?.damping) &&
      incomingEffect !== "h" &&
      incomingEffect !== "p"
    )
      return;
    voice = createVoice({
      ...args,
      startTime: time,
      legato,
      mutedPick: palmMuted,
    });
  }
  if (!voice) return;
  const vibrato = effects.includes("~") && (args.fretted ?? fret > 0);
  // Keep the hand's phase and depth through a connected phrase. Restarting
  // the delayed onset on each fast note can suppress vibrato altogether.
  const continueVibrato =
    reuse &&
    vibrato &&
    voice.modulators.some(
      (modulator) => !modulator.releasing && modulator.stopAt > time,
    );
  if (!continueVibrato) stopModulators(voice, time);

  let transitionEnd = time;
  if (transition?.transitionFromFret !== undefined) {
    const slide = incomingEffect === "/" || incomingEffect === "\\";
    const duration = slide ? clamp(interval * 0.3, 0.025, 0.16) : 0.006;
    if (!reuse) {
      const initialCents = (transition.transitionFromFret - fret) * 100;
      voice.source.detune.setValueAtTime(initialCents, time);
      voice.pitchPoints = [{ time, value: initialCents }];
    }
    transitionPitch(voice, midi, time, duration, slide);
    transitionEnd += duration;
  } else if (
    legato &&
    reuse &&
    transition?.effect !== "r" &&
    transition?.effect !== "b"
  ) {
    transitionPitch(voice, midi, time, 0.006, false);
  }

  if (transition?.transitionToFret !== undefined) {
    const slide = transition.effect === "arbitrarySlide";
    const duration = clamp(
      interval * (slide ? 0.3 : 0.5),
      0.025,
      slide ? 0.16 : 0.34,
    );
    const pitchStart =
      transitionEnd +
      (transition.effect === "b" ? Math.min(0.025, interval * 0.06) : 0);
    transitionPitch(
      voice,
      midi + transition.transitionToFret - fret,
      pitchStart,
      duration,
      slide,
    );
    transitionEnd = pitchStart + duration;
  }

  let duration = 3;
  if (effects.includes("."))
    duration = Math.min(duration, clamp(interval * 0.45, 0.035, 0.22));
  const accent = effects.includes(">") ? 1.22 : 1;
  if (tetheredLegato && !palmMuted && !voice.damping) {
    voice.sampleGain = clamp(
      legatoSampleGain(voice, midi, time),
      0.25,
      MAX_LEGATO_SAMPLE_GAIN,
    );
  }
  const legatoLevel =
    incomingEffect === "h" ? 0.85 : incomingEffect === "p" ? 0.95 : 0.92;
  // Each articulation starts from the same musical level. Sample-decay
  // compensation is absolute, so neither attenuation nor accents compound.
  const level = 0.9 * (legato ? legatoLevel : 1) * accent * voice.sampleGain;
  const dampedLegato =
    legato && (palmMuted || Boolean(previousDamping) || Boolean(voice.damping));
  if (palmMuted || dampedLegato) {
    let hits = palmMuteHits.get(strings);
    if (!hits) {
      hits = new Uint8Array(6);
      palmMuteHits.set(strings, hits);
    }
    const hit = hits[stringIdx]!;
    if (!legato) hits[stringIdx] = (hit + 1) % 4;
    const profile = palmMuteProfile(
      instrumentName(voice),
      midi,
      stringIdx,
      palmMuted ? depth : (previousDamping?.depth ?? depth),
      legato ? 0 : hit,
      accent > 1,
    );
    const deadline = effects.includes(".") ? time + duration : Infinity;
    if (!legato) {
      shapePalmEnvelope(
        voice,
        time,
        profile,
        level * profile.level,
        profile.attack,
        deadline,
      );
      shapePalmTone(voice, time, profile, true);
    } else if (incomingEffect === "h" || incomingEffect === "p") {
      const remaining = reuse ? valueAt(voice.gainPoints, time) : 0;
      const excitation =
        level * (incomingEffect === "h" ? 0.16 : 0.21) * profile.level;
      // A bounded finger excitation, not normal picked-note RMS compensation.
      if (reuse) retunePalmTone(voice, time, profile);
      if (palmMuted) {
        shapePalmEnvelope(
          voice,
          time,
          profile,
          Math.min(level, remaining + excitation),
          0.006,
          deadline,
        );
        if (!reuse) shapePalmTone(voice, time, profile, false);
      } else {
        // Finger excitation after the hand lifts may ring naturally, at its
        // bounded level, rather than inheriting a fresh palm decay.
        shapeEnvelope(
          voice,
          time,
          duration,
          Math.min(level, remaining + excitation),
          false,
          0.006,
        );
        voice.damping = profile;
      }
    } else {
      // Sliding/holding/releasing a bend preserves the remaining decay and
      // deadline. Retune its tone without opening the attack bands again.
      retunePalmTone(voice, time, profile);
      if (deadline < voice.releaseAt) {
        holdAt(voice.gain.gain, voice.gainPoints, deadline);
        ramp(voice.gain.gain, voice.gainPoints, 0, deadline + RELEASE_SECONDS);
        voice.releaseAt = deadline;
        voice.stopAt = deadline + RELEASE_SECONDS;
        voice.stopSource(voice.stopAt);
      }
      voice.damping = profile;
    }
    voice.palmContactDepth = palmMuted ? depth : undefined;
    if (!palmMuted) releasePalmTone(voice, time);
  } else {
    shapeEnvelope(voice, time, duration, level, false, legato ? 0.006 : 0.003);
    releasePalmTone(voice, time);
  }
  if (continueVibrato) {
    for (const modulator of voice.modulators) {
      if (modulator.releasing || modulator.stopAt <= time) continue;
      modulator.stopAt = voice.stopAt;
      modulator.source.stop(modulator.stopAt);
    }
  } else if (vibrato) {
    applyVibrato(voice, transitionEnd, interval);
  }
  return voice.source;
}

function getNoiseBuffer(context: BaseAudioContext) {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.2),
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let seed = 12345;
    for (let index = 0; index < samples.length; index++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      samples[index] = seed / 0x80000000 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

function deadNoteProfile(
  midi: number,
  stringIdx: number,
  strings: PlaybackStrings,
) {
  const index = clamp(stringIdx, 0, 5);
  let hits = deadNoteHits.get(strings);
  if (!hits) {
    hits = new Uint8Array(6);
    deadNoteHits.set(strings, hits);
  }
  const hit = hits[index]!;
  hits[index] = (hit + 1) % 4;

  // Playback indexes run from high E to low E. Keep physical-string color
  // independent of pitch so alternate tunings do not change string identity.
  const treble = 1 - index / 5;
  const fundamental = 440 * 2 ** ((midi - 69) / 12);
  const variation = [1, 0.965, 1.025, 0.985][hit]!;
  const contactColor = clamp((fundamental / 165) ** 0.18, 0.75, 1.4);
  return {
    duration: 0.075 - treble * 0.012,
    attack: (0.002 - treble * 0.0005) * variation,
    level: 0.32 - treble * 0.04,
    // Retain a faint, short-lived string body instead of removing the bass
    // strings' first several partials with a fixed 650 Hz high-pass.
    sampleHighpass: clamp(fundamental * 1.4, 50, 1600),
    sampleLowpass: clamp(fundamental * (5 + treble) * variation, 650, 5500),
    sampleLowpassEnd: clamp(fundamental * 2.7, 280, 3500),
    noiseHighpass: (600 + treble * 650) * contactColor * variation,
    noiseLowpass: (2800 + treble * 1600) * contactColor * variation,
    noiseLevel: 0.055 + treble * 0.005,
    // Different slices decorrelate simultaneous strings and repeated hits.
    // A bounded round robin is reproducible and never detunes the note.
    noiseOffset: (index * 0.017 + hit * 0.029) % 0.12,
  };
}

export function playGuitarPercussion(
  args: SampleArgs & {
    kind: "dead" | "slap";
    accented: boolean;
    palmMuted: boolean;
    staccato?: boolean;
  },
) {
  const time = Math.max(args.audioContext.currentTime, args.startTime);
  if (args.kind === "slap") stopGuitarStrings(args.strings, time);
  // Dead-note contact comes from the noise path. Start its recorded string
  // body after the normal pluck so sample padding cannot swallow the decay.
  const voice = createVoice({
    ...args,
    startTime: time,
    legato: args.kind === "dead",
  });
  if (!voice) return;
  const dead =
    args.kind === "dead"
      ? deadNoteProfile(args.midi, args.stringIdx, args.strings)
      : undefined;
  const duration = dead
    ? dead.duration * (args.palmMuted ? 0.6 : args.staccato ? 0.72 : 1)
    : args.palmMuted || args.staccato
      ? 0.065
      : 0.13;
  const level = (dead?.level ?? 0.75) * (args.accented ? 1.22 : 1);
  const attack = dead?.attack ?? 0.002;
  voice.filter.frequency.setValueAtTime(dead?.sampleLowpass ?? 1100, time);
  if (dead) {
    voice.filter.frequency.exponentialRampToValueAtTime(
      dead.sampleLowpassEnd,
      time + Math.min(duration * 0.55, 0.03),
    );
  }
  const sampleHighpass = args.audioContext.createBiquadFilter();
  sampleHighpass.type = "highpass";
  sampleHighpass.frequency.value = dead?.sampleHighpass ?? 65;
  if (dead) sampleHighpass.Q.value = Math.SQRT1_2;
  voice.source.disconnect();
  voice.source.connect(sampleHighpass);
  sampleHighpass.connect(voice.filter);
  voice.extraNodes.push(sampleHighpass);
  shapeEnvelope(voice, time, duration, level, true, attack);

  // The recorded sample supplies the string/body sound. A shorter, broader
  // contact transient keeps dead notes percussive without a tone oscillator.
  const noise = args.audioContext.createBufferSource();
  noise.buffer = getNoiseBuffer(args.audioContext);
  const noiseGain = args.audioContext.createGain();
  const highpass = args.audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = dead?.noiseHighpass ?? 500;
  const lowpass = args.audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = Math.min(
    dead?.noiseLowpass ?? 2800,
    args.audioContext.sampleRate * 0.45,
  );
  if (dead) {
    highpass.Q.value = Math.SQRT1_2;
    lowpass.Q.value = Math.SQRT1_2;
  }
  const noiseDuration = dead ? Math.min(duration * 0.65, 0.035) : duration;
  const noisePoints = [{ time, value: 0 }];
  noiseGain.gain.setValueAtTime(0, time);
  const noiseLevel =
    (dead?.noiseLevel ?? 0.09) *
    (args.accented ? 1.22 : 1) *
    (args.palmMuted ? 0.7 : 1);
  ramp(noiseGain.gain, noisePoints, noiseLevel, time + attack);
  for (let index = 1; index <= 12; index++) {
    const progress = index / 12;
    ramp(
      noiseGain.gain,
      noisePoints,
      noiseLevel * (SILENCE / noiseLevel) ** progress,
      time + attack + (noiseDuration * 0.8 - attack) * progress,
    );
  }
  ramp(noiseGain.gain, noisePoints, 0, time + noiseDuration);
  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(noiseGain);
  noiseGain.connect(args.destination);
  noise.start(time, dead?.noiseOffset ?? 0);
  noise.stop(time + noiseDuration);
  trackModulator(voice, noise, noiseGain, noisePoints, time + noiseDuration);
  voice.extraNodes.push(highpass, lowpass);
  return voice.source;
}
