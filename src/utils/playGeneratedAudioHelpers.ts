import extractNumber from "~/utils/extractNumber";
import type Soundfont from "soundfont-player";

/**
 * Memory management strategy for audio playback
 *
 * This file handles audio playback using the Web Audio API and Soundfont.js.
 * To prevent memory leaks from accumulating AudioBufferSourceNodes:
 *
 * 1. All AudioBufferSourceNodes are tracked via the `currentlyPlayingStrings` array
 * 2. When a note ends (via onended callback), we disconnect all nodes and null buffer references
 * 3. When manually stopping notes, we use `cleanupAudioSource()` to properly dispose resources
 * 4. Buffer references are explicitly set to null to help garbage collection
 * 5. All audio nodes are disconnected after use to break circular references
 */

interface PlayNoteWithEffects {
  note: GainNode;
  stringIdx: number;
  fret: number;
  bpm: number;
  when: number;
  effects?: string[];
  tetheredMetadata?: TetheredMetadata;
  pluckBaseNote: boolean;
  noteDurationSeconds: number;
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
}

const DEFAULT_NOTE_DURATION_SECONDS = 3;

type CurrentlyPlayingString =
  | Soundfont.Player
  | AudioBufferSourceNode
  | undefined;

function safeDisconnectNode(node?: AudioNode | null) {
  if (!node) return;
  try {
    node.disconnect();
  } catch (error) {
    // node might already be disconnected; ignore
  }
}

function safeStopScheduledSource(
  source?: AudioScheduledSourceNode | null,
  stopTime?: number,
) {
  if (!source) return;
  try {
    if (typeof stopTime === "number") {
      source.stop(stopTime);
    } else {
      source.stop();
    }
  } catch (error) {
    // source already stopped
  }
}

function cleanupAudioSource(
  source?: Soundfont.Player | AudioBufferSourceNode | null,
) {
  if (!source) return;

  // Stop the source if it's playing
  safeStopScheduledSource(source as AudioScheduledSourceNode);

  // Disconnect all nodes
  safeDisconnectNode(source as AudioNode);

  // For AudioBufferSourceNode, explicitly clear buffer reference
  if ("buffer" in source && source.buffer) {
    source.buffer = null;
  }

  // For Soundfont.Player, cleanup internal source
  const internalSource = (source as { source?: AudioBufferSourceNode }).source;
  if (internalSource) {
    safeStopScheduledSource(internalSource);
    safeDisconnectNode(internalSource);
    if (internalSource.buffer) {
      internalSource.buffer = null;
    }
  }
}

function resolveSourceNodeFromHandle(
  handle?: Soundfont.Player | AudioBufferSourceNode | GainNode,
) {
  if (!handle) return undefined;

  if ("start" in handle && "stop" in handle && "buffer" in handle) {
    return handle as AudioBufferSourceNode;
  }

  return (handle as { source?: AudioBufferSourceNode }).source;
}

function attachSourceOnEndedCleanup({
  sourceNode,
  nodesToDisconnect = [],
  currentlyPlayingStrings,
  stringIdx,
  expectedHandle,
  onEnded,
}: {
  sourceNode?: AudioScheduledSourceNode | null;
  nodesToDisconnect?: AudioNode[];
  currentlyPlayingStrings?: CurrentlyPlayingString[];
  stringIdx?: number;
  expectedHandle?: Soundfont.Player | AudioBufferSourceNode;
  onEnded?: () => void;
}) {
  if (!sourceNode) return;

  const cleanup = () => {
    nodesToDisconnect.forEach((node) => safeDisconnectNode(node));
    onEnded?.();

    if (
      typeof stringIdx === "number" &&
      currentlyPlayingStrings &&
      expectedHandle &&
      currentlyPlayingStrings[stringIdx] === expectedHandle
    ) {
      currentlyPlayingStrings[stringIdx] = undefined;
    }

    safeDisconnectNode(sourceNode);

    // Explicitly null buffer reference to help GC
    if ("buffer" in sourceNode) {
      sourceNode.buffer = null;
    }

    sourceNode.onended = null;
  };

  const previousOnEnded = sourceNode.onended;
  sourceNode.onended = (event) => {
    previousOnEnded?.call(sourceNode, event);
    cleanup();
  };
}

function playNoteWithEffects({
  note,
  stringIdx,
  fret,
  bpm,
  when,
  effects,
  tetheredMetadata,
  pluckBaseNote,
  noteDurationSeconds,
  audioContext,
  masterVolumeGainNode,
  currentlyPlayingStrings,
}: PlayNoteWithEffects) {
  let noteWithEffectApplied = undefined;

  if (tetheredMetadata) {
    // "arbitrary" slides (/3, 3/, etc.) and regular bends/releases
    if (
      tetheredMetadata.transitionToFret !== undefined &&
      (tetheredMetadata.effect === "b" ||
        tetheredMetadata.effect === "r" ||
        tetheredMetadata.effect === "arbitrarySlide")
    ) {
      noteWithEffectApplied = applyBendOrReleaseEffect({
        note,
        baseFret: fret,
        fretToBendTo: tetheredMetadata.transitionToFret,
        when,
        bpm,
        stringIdx,
        pluckBaseNote,
        isArbitrarySlide: tetheredMetadata.effect === "arbitrarySlide",
        audioContext,
        currentlyPlayingStrings,
        isPalmMuted: effects?.includes("PM"),
      });
    } else if (tetheredMetadata.transitionFromFret !== undefined) {
      noteWithEffectApplied = applyTetheredEffect({
        note,
        currentEffects: effects,
        currentFret: fret,
        tetheredEffect: tetheredMetadata.effect as "h" | "p" | "/" | "\\",
        tetheredFret: tetheredMetadata.transitionFromFret,
        stringIdx,
        bpm,
        when,
        tetheredMetadata,
        audioContext,
        currentlyPlayingStrings,
        isPalmMuted: effects?.includes("PM"),
      });
    }
  } else if (effects) {
    // needs to be in separate block because if the tethered note has vibrato,
    // it gets handled from applyTetheredEffect() above
    if (effects?.includes("~")) {
      noteWithEffectApplied = applyVibratoEffect({
        when: 0,
        note,
        bpm,
        stringIdx,
        pluckBaseNote,
        audioContext,
        currentlyPlayingStrings,
        noteDurationSeconds,
      });
    }
  }

  if (effects?.includes("PM")) {
    noteWithEffectApplied = applyPalmMute({
      note: noteWithEffectApplied ?? note,
      inlineEffects: effects,
      audioContext,
      isHighString: stringIdx <= 2,
      isATetheredEffect: tetheredMetadata !== undefined,
    });
  }

  // below conditions have to stop the note or reroute the note and need
  // to be reconnect()'ed to the masterVolumeGainNode
  if (
    noteWithEffectApplied &&
    (tetheredMetadata ||
      !pluckBaseNote || // don't think this is necessary anymore
      effects?.includes("PM"))
  ) {
    noteWithEffectApplied.connect(masterVolumeGainNode);
    masterVolumeGainNode.connect(audioContext.destination);
  }
}

interface ApplyBendEffect {
  note?: GainNode;
  copiedNote?: AudioBufferSourceNode;
  baseFret: number;
  fretToBendTo: number;
  when: number;
  bpm: number;
  stringIdx: number;
  pluckBaseNote?: boolean;
  isArbitrarySlide?: boolean;
  audioContext: AudioContext;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
  isPalmMuted?: boolean;
}

function applyBendOrReleaseEffect({
  note,
  copiedNote,
  baseFret,
  fretToBendTo,
  when,
  bpm,
  stringIdx,
  pluckBaseNote = true,
  isArbitrarySlide = false,
  audioContext,
  currentlyPlayingStrings,
  isPalmMuted,
}: ApplyBendEffect) {
  let source: AudioBufferSourceNode | undefined = undefined;
  let sourceGain: GainNode | undefined = undefined;

  if (!pluckBaseNote && note) {
    // @ts-expect-error TODO: fix type
    const noteSource = note.source as AudioBufferSourceNode;
    safeStopScheduledSource(noteSource);

    source = audioContext.createBufferSource();
    sourceGain = audioContext.createGain();

    setTimeout(() => {
      const existingNote = currentlyPlayingStrings[stringIdx];
      if (existingNote) {
        cleanupAudioSource(existingNote);
      }
      currentlyPlayingStrings[stringIdx] = source;
    }, when * 1000);

    source.buffer = noteSource.buffer as AudioBuffer;
    source.start(0, 0.5, isPalmMuted ? 0.45 : undefined);

    sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
    sourceGain.gain.linearRampToValueAtTime(
      1.1,
      audioContext.currentTime + when + 0.1, // maybe still need to do arbitrary stuff here?
    );
    source.connect(sourceGain);

    attachSourceOnEndedCleanup({
      sourceNode: source,
      nodesToDisconnect: sourceGain ? [sourceGain] : [],
      currentlyPlayingStrings,
      stringIdx,
      expectedHandle: source,
    });
  }

  const detuneValue = (fretToBendTo - baseFret) * 100;

  if (source && sourceGain) {
    source.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5),
    );
    return sourceGain;
  } else if (note) {
    // @ts-expect-error TODO: fix type
    note.source.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5),
    );
    return note;
  } else if (copiedNote) {
    copiedNote.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5),
    );
    // increasing gain to match level set in applyTetheredEffect()
    const copiedNoteGain = audioContext.createGain();
    copiedNoteGain.gain.value = 1.35;
    copiedNote.connect(copiedNoteGain);

    attachSourceOnEndedCleanup({
      sourceNode: copiedNote,
      nodesToDisconnect: [copiedNoteGain],
    });

    return copiedNoteGain;
  }
}

function mapStringAndFretToOscillatorFrequency(
  stringIndex: number,
  fretIndex: number,
) {
  // The difference between the maximum and minimum frequency defines the range.
  const frequencyRange = 200 - 50;

  // Normalize the string index to a range of [0, 1] with 0 being the highest string.
  const normalizedStringIndex = stringIndex / 5;

  // Normalize the fret index to a range of [0, 1].
  const normalizedFretIndex = fretIndex / 22;

  // Calculate the weighted reduction for both string and fret indices.
  // String index will have a more significant influence on the frequency.
  const weightedStringReduction = normalizedStringIndex * frequencyRange * 0.7; // 70% influence from string index.
  const weightedFretReduction = normalizedFretIndex * frequencyRange * 0.3; // 30% influence from fret index.

  // Calculate the frequency by subtracting the reductions from the max frequency.
  const maxFrequency = 200;
  const frequency =
    maxFrequency - (weightedStringReduction + weightedFretReduction);

  // Ensure the frequency is within the range [50, 200].
  return Math.max(frequency, 50);
}

interface PlayDeadNote {
  stringIdx: number;
  fret: number;
  accented: boolean;
  palmMuted: boolean;
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
}

function playDeadNote({
  stringIdx,
  fret,
  accented,
  palmMuted,
  audioContext,
  masterVolumeGainNode,
  currentlyPlayingStrings,
}: PlayDeadNote) {
  // stopping any note on string that is currently playing
  const existingNote = currentlyPlayingStrings[stringIdx];
  if (existingNote) {
    cleanupAudioSource(existingNote);
    currentlyPlayingStrings[stringIdx] = undefined;
  }

  const frequency = mapStringAndFretToOscillatorFrequency(
    stringIdx,
    fret === 0 ? 1 : fret,
  );

  // Create an OscillatorNode to simulate the slap sound
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // Create a GainNode to control the volume
  const gainNode = audioContext.createGain();

  // had to crank these values down by a ton since they were so prominent
  let gainTarget = 0.00875;

  if (accented) gainTarget = 0.0125;
  if (palmMuted) gainTarget = 0.005;

  if (accented && palmMuted) gainTarget = 0.01;

  // Dynamic Gain Compensation
  switch (stringIdx) {
    case 5: // Low E
      gainTarget *= 1.7;
      break;
    case 4: // A
      gainTarget *= 1.6;
      break;
    case 3: // D
      gainTarget *= 1.5;
      break;
    case 2: // G
      gainTarget *= 0.8;
      break;
    case 1: // B
      gainTarget *= 0.7;
      break;
    case 0: // High E
      gainTarget *= 0.6;
      break;
  }

  gainNode.gain.setValueAtTime(gainTarget, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + 0.1,
  );

  // Create a BiquadFilterNode for a low-pass filter
  const highpassFilter = audioContext.createBiquadFilter();
  highpassFilter.type = "highpass";
  highpassFilter.frequency.value = 100; // TODO: still have to play around with this value

  // Create a BiquadFilterNode for boosting the mid frequencies
  const midBoost = audioContext.createBiquadFilter();
  midBoost.type = "peaking";
  midBoost.frequency.value = 1200; // Frequency to boost
  midBoost.gain.value = 1; // Amount of boost in dB
  midBoost.Q.value = 1; // Quality factor

  // Connect the oscillator and noise to the gainNode
  oscillator.connect(highpassFilter);
  highpassFilter.connect(midBoost);
  midBoost.connect(gainNode);

  attachSourceOnEndedCleanup({
    sourceNode: oscillator,
    nodesToDisconnect: [highpassFilter, midBoost, gainNode],
  });

  // // Connect the gainNode to the audioContext's destination
  gainNode.connect(masterVolumeGainNode);
  masterVolumeGainNode.connect(audioContext.destination);

  // Start the oscillator and noise now
  oscillator.start(audioContext.currentTime);

  // Stop the oscillator and noise shortly afterward to simulate a short, percussive sound
  oscillator.stop(audioContext.currentTime + 0.1);
}

interface PlaySlapSound {
  accented: boolean;
  stacatto?: boolean;
  palmMuted: boolean;
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
}

function playSlapSound({
  accented,
  stacatto,
  palmMuted,
  audioContext,
  masterVolumeGainNode,
  currentlyPlayingStrings,
}: PlaySlapSound) {
  // stopping all notes currently playing
  for (let i = 0; i < currentlyPlayingStrings.length; i++) {
    const currentlyPlayingString = currentlyPlayingStrings[i];
    if (currentlyPlayingString) {
      cleanupAudioSource(currentlyPlayingString);
      currentlyPlayingStrings[i] = undefined;
    }
  }

  // Create an OscillatorNode to simulate the slap sound
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 100;

  // Create a buffer for noise
  const noiseBuffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * 0.2,
    audioContext.sampleRate,
  );
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < output.length; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  // Create buffer source for noise
  const noise = audioContext.createBufferSource();
  noise.buffer = noiseBuffer;

  // Create a GainNode to control the volume
  const gainNode = audioContext.createGain();

  let gainTarget = 0.25;

  if (accented) gainTarget = 0.45;
  if (palmMuted) gainTarget = 0.1;

  if (accented && palmMuted) gainTarget = 0.3;

  const duration = stacatto || palmMuted ? 0.1 : 0.25;

  // was too quiet for my liking, so increasing gain specifically for shorter duration slaps
  if (stacatto || palmMuted) {
    gainTarget *= 1.25;
  }

  gainNode.gain.setValueAtTime(gainTarget, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration,
  );

  // Create a BiquadFilterNode for a low-pass filter
  const lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 2200; // TODO: still have to play around with this value

  // Create a BiquadFilterNode for boosting the mid frequencies
  const midBoost = audioContext.createBiquadFilter();
  midBoost.type = "peaking";
  midBoost.frequency.value = 800; // Frequency to boost
  midBoost.gain.value = 8; // Amount of boost in dB
  midBoost.Q.value = 1; // Quality factor

  // Create a GainNode for the noise volume
  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.2, audioContext.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration,
  );

  // Connect the oscillator and noise to the gainNode
  oscillator.connect(lowPassFilter);
  noise.connect(noiseGain);
  noiseGain.connect(lowPassFilter);
  lowPassFilter.connect(midBoost);
  midBoost.connect(gainNode);

  attachSourceOnEndedCleanup({
    sourceNode: oscillator,
    nodesToDisconnect: [lowPassFilter, midBoost, gainNode],
  });

  attachSourceOnEndedCleanup({
    sourceNode: noise,
    nodesToDisconnect: [noiseGain],
  });

  // // Connect the gainNode to the audioContext's destination
  gainNode.connect(masterVolumeGainNode);
  masterVolumeGainNode.connect(audioContext.destination);

  // Start the oscillator and noise now
  oscillator.start(audioContext.currentTime);
  noise.start(audioContext.currentTime);

  // Stop the oscillator and noise shortly afterward to simulate a short, percussive sound
  oscillator.stop(audioContext.currentTime + duration);
  noise.stop(audioContext.currentTime + duration);
}

interface ApplyPalmMute {
  note: GainNode | AudioBufferSourceNode;
  inlineEffects?: string[];
  audioContext: AudioContext;
  isHighString: boolean;
  isATetheredEffect?: boolean;
}

function applyPalmMute({
  note,
  inlineEffects,
  audioContext,
  isHighString,
  isATetheredEffect,
}: ApplyPalmMute) {
  const lowPassFilter = audioContext.createBiquadFilter();
  const bassBoost = audioContext.createBiquadFilter();
  const gainNode = audioContext.createGain();

  // Adjust lowPassFilter based on whether it's a high or low string
  if (isHighString) {
    lowPassFilter.frequency.value = 500;
  } else {
    lowPassFilter.frequency.value = 1000;
  }
  lowPassFilter.type = "lowpass";
  lowPassFilter.Q.value = 5;

  // Adjust bassBoost based on whether it's a high or low string
  if (isHighString) {
    bassBoost.gain.value = 10;
  } else {
    bassBoost.gain.value = 20;
  }
  bassBoost.type = "peaking";
  bassBoost.frequency.value = 120;
  bassBoost.Q.value = 10;

  let gainValue = inlineEffects?.includes(">") ? 100 : 70;

  if (isATetheredEffect) {
    gainValue = inlineEffects?.includes(">") ? 1 : 0.7;
  }

  gainNode.gain.value = gainValue;

  note.connect(lowPassFilter);
  lowPassFilter.connect(bassBoost);
  bassBoost.connect(gainNode);

  const sourceNode = resolveSourceNodeFromHandle(note);
  attachSourceOnEndedCleanup({
    sourceNode,
    nodesToDisconnect: [lowPassFilter, bassBoost, gainNode],
  });

  return gainNode;
}

interface ApplyTetheredEffect {
  note: GainNode;
  currentFret: number;
  currentEffects?: string[];
  tetheredFret: number;
  tetheredEffect: "h" | "p" | "/" | "\\";
  stringIdx: number;
  bpm: number;
  when: number;
  tetheredMetadata: TetheredMetadata; // idk maybe want to refactor the props to try and go through this as much as possible?
  audioContext: AudioContext;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
  isPalmMuted?: boolean;
}

function applyTetheredEffect({
  note,
  currentFret,
  currentEffects,
  tetheredFret,
  tetheredEffect,
  stringIdx,
  bpm,
  when,
  tetheredMetadata,
  audioContext,
  currentlyPlayingStrings,
  isPalmMuted,
}: ApplyTetheredEffect) {
  // immediately stop current note because we don't ever want to hear the pluck on
  // a tethered note
  // @ts-expect-error note has a source property from Soundfont.Player
  const noteSource = note.source as AudioBufferSourceNode;
  safeStopScheduledSource(noteSource);

  const source = audioContext.createBufferSource();
  const sourceGain = audioContext.createGain();

  setTimeout(() => {
    const existingNote = currentlyPlayingStrings[stringIdx];
    if (existingNote) {
      cleanupAudioSource(existingNote);
    }
    currentlyPlayingStrings[stringIdx] = source;
  }, when * 1000);

  source.buffer = noteSource.buffer as AudioBuffer;
  // immediately start detune at the value of the tetheredFret
  source.detune.setValueAtTime(
    (tetheredFret - currentFret) * 100,
    audioContext.currentTime + when,
  );
  source.start(
    audioContext.currentTime + when,
    tetheredEffect === "p" ? 0 : tetheredEffect === "h" ? 0.1 : 0.2,
    isPalmMuted ? 0.45 : undefined,
  );

  sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
  sourceGain.gain.linearRampToValueAtTime(
    tetheredEffect === "p" ? 1 : tetheredEffect === "h" ? 1.1 : 1.3,
    audioContext.currentTime + when + 0.05,
  );
  source.connect(sourceGain);

  attachSourceOnEndedCleanup({
    sourceNode: source,
    nodesToDisconnect: [sourceGain],
    currentlyPlayingStrings,
    stringIdx,
    expectedHandle: source,
  });

  let durationOfTransition = (60 / bpm) * 0.25;
  if (tetheredEffect === "h" || tetheredEffect === "p") {
    durationOfTransition = 0; // hammer-ons and pull-offs are instantaneous
  }

  // immediately ramping from tetheredFret to currentFret with a duration defined by durationOfTransition
  source.detune.linearRampToValueAtTime(
    0.001, // smallest viable value
    audioContext.currentTime + when + durationOfTransition,
  );

  // if there is a currentEffect, we need to apply it to the note after the last ramp is finished
  if (currentEffects) {
    if (currentEffects.includes("~")) {
      applyVibratoEffect({
        copiedNote: source,
        when: when + durationOfTransition,
        stringIdx,
        bpm,
        audioContext,
        currentlyPlayingStrings,
        noteDurationSeconds: isPalmMuted ? 0.45 : undefined,
      });
    } else if (
      currentEffects.includes("b") &&
      tetheredMetadata.transitionToFret
    ) {
      applyBendOrReleaseEffect({
        copiedNote: source,
        baseFret: currentFret,
        fretToBendTo: tetheredMetadata.transitionToFret,
        when: when + durationOfTransition,
        stringIdx,
        bpm,
        audioContext,
        currentlyPlayingStrings,
      });
    }
  }

  return sourceGain;
}

interface ApplyVibratoEffect {
  note?: GainNode;
  copiedNote?: AudioBufferSourceNode;
  when: number; // offset to start the effect
  bpm: number;
  stringIdx: number;
  pluckBaseNote?: boolean;
  audioContext: AudioContext;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
  noteDurationSeconds?: number;
}

function applyVibratoEffect({
  note,
  copiedNote,
  when,
  bpm,
  stringIdx,
  pluckBaseNote = true,
  audioContext,
  currentlyPlayingStrings,
  noteDurationSeconds,
}: ApplyVibratoEffect) {
  let source: AudioBufferSourceNode | undefined = undefined;
  let sourceGain: GainNode | undefined = undefined;

  if (!pluckBaseNote && note) {
    // @ts-expect-error TODO: fix type
    const noteSource = note.source as AudioBufferSourceNode;
    safeStopScheduledSource(noteSource);

    source = audioContext.createBufferSource();
    sourceGain = audioContext.createGain();

    setTimeout(() => {
      const existingNote = currentlyPlayingStrings[stringIdx];
      if (existingNote) {
        cleanupAudioSource(existingNote);
      }
      currentlyPlayingStrings[stringIdx] = source;
    }, when * 1000);

    source.buffer = noteSource.buffer as AudioBuffer;
    source.start(0, 0.5);
    attachSourceOnEndedCleanup({
      sourceNode: source,
      nodesToDisconnect: sourceGain ? [sourceGain] : [],
      currentlyPlayingStrings,
      stringIdx,
      expectedHandle: source,
    });

    sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
    sourceGain.gain.exponentialRampToValueAtTime(
      1.3,
      audioContext.currentTime + when + 0.1,
    );
    source.connect(sourceGain);
  }

  // Create a modulation oscillator
  const vibratoOscillator = audioContext.createOscillator();
  vibratoOscillator.type = "sine";
  vibratoOscillator.frequency.value = calculateRelativeVibratoFrequency(bpm); // Speed of vibrato

  // Create a gain node to control the depth of the vibrato
  const vibratoDepth = audioContext.createGain();
  vibratoDepth.gain.value = 25; // Depth of vibrato in cents

  // Connect the modulation oscillator to the gain
  vibratoOscillator.connect(vibratoDepth);

  const oscillatorDelay = (60 / bpm) * 0.15;
  const vibratoStartTime = audioContext.currentTime + when + oscillatorDelay;
  vibratoOscillator.start(vibratoStartTime);
  const vibratoStopTime =
    vibratoStartTime + (noteDurationSeconds ?? DEFAULT_NOTE_DURATION_SECONDS);
  safeStopScheduledSource(vibratoOscillator, vibratoStopTime);

  attachSourceOnEndedCleanup({
    sourceNode: vibratoOscillator,
    nodesToDisconnect: [vibratoDepth],
  });

  const targetSourceNode =
    source ?? copiedNote ?? resolveSourceNodeFromHandle(note);

  attachSourceOnEndedCleanup({
    sourceNode: targetSourceNode,
    onEnded: () => safeStopScheduledSource(vibratoOscillator),
  });

  if (source && sourceGain) {
    vibratoDepth.connect(source.detune);
    return sourceGain;
  } else if (note) {
    // @ts-expect-error TODO: fix type
    vibratoDepth.connect(note.source.detune);
    return note;
  } else if (copiedNote) {
    vibratoDepth.connect(copiedNote.detune);
    // increasing gain to match level set in applyTetheredEffect
    const copiedNoteGain = audioContext.createGain();
    copiedNoteGain.gain.value = 1.35;
    copiedNote.connect(copiedNoteGain);
    return copiedNoteGain;
  }
}

interface PlayNote {
  tuning: number[];
  stringIdx: number;
  fret: number;
  bpm: number;
  when: number;
  effects: string[];
  tetheredMetadata?: TetheredMetadata;
  pluckBaseNote: boolean;
  audioContext: AudioContext;
  currentInstrument: Soundfont.Player | null;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
  acousticSteelOverrideForPreview?: Soundfont.Player;
}

function playNote({
  tuning,
  stringIdx,
  fret,
  bpm,
  when,
  effects,
  tetheredMetadata,
  pluckBaseNote,
  audioContext,
  currentInstrument,
  masterVolumeGainNode,
  currentlyPlayingStrings,
  acousticSteelOverrideForPreview,
}: PlayNote) {
  let duration = 3;
  let gain = 1;

  if (effects.includes(">")) {
    gain = 1.5;
  }

  // palm mute require us to basically hijack the note by almost muting it
  // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
  // ^ TODO: wouldn't be too surprised if we can try to refactor by using the "source" prop like in
  // tethered effects
  if (effects.includes("PM")) {
    gain = 0.01;
    duration = 0.45;
    // I think ideally sustain should be changed, not duration
    // but it seemed like changing sustain value didn't have intended effect..
  }

  if (effects.includes(".")) {
    // technically stacatto doesn't mean that the note should be played any louder
    // than normal, so omitting any gain definition here
    duration = 0.25;
  }

  // not sure exactly why this is needed right now, but bends/arbitrary slides were
  // way too loud when being plucked
  if (
    pluckBaseNote &&
    (effects.includes("b") || tetheredMetadata?.effect === "arbitrarySlide")
  ) {
    gain *= 0.6;
  }

  const instrumentToUse = acousticSteelOverrideForPreview || currentInstrument;

  const note = instrumentToUse?.play(
    `${tuning[stringIdx]! + fret}`,
    audioContext.currentTime + when,
    {
      duration,
      gain,
      // slightly slower (smoother) attack for strums
      //    -can maybe also use this for tetherd effects too, didn't realize it actually works!
      attack: effects.includes("v") || effects.includes("^") ? 0.0125 : 0.01,
      // TODO: might be fun/more accurate to change sustain value instead of duration for some effects
    },
  );

  if (note) {
    const sourceNode = resolveSourceNodeFromHandle(note as unknown as GainNode);
    attachSourceOnEndedCleanup({
      sourceNode,
      currentlyPlayingStrings,
      stringIdx,
      expectedHandle: note,
    });
  }

  if (note && (tetheredMetadata || effects.length > 0)) {
    playNoteWithEffects({
      note: note as unknown as GainNode,
      stringIdx,
      fret,
      bpm,
      when,
      effects,
      tetheredMetadata,
      pluckBaseNote,
      noteDurationSeconds: duration,
      audioContext,
      masterVolumeGainNode,
      currentlyPlayingStrings,
    });
  }

  // I believe we needed this maybe as a timing workaround where hp/\ effects were
  // getting .stop()'d just as they were being played, so they got handled in applyTetheredEffect()?
  if (
    pluckBaseNote &&
    (!tetheredMetadata ||
      tetheredMetadata.effect === "b" ||
      tetheredMetadata.effect === "r")
  ) {
    setTimeout(() => {
      const existingNote = currentlyPlayingStrings[stringIdx];
      if (existingNote) {
        cleanupAudioSource(existingNote);
      }
      currentlyPlayingStrings[stringIdx] = note;
    }, when * 1000);
  }
}

function columnHasNoNotes(column: string[]) {
  for (let i = 1; i < 7; i++) {
    if (column[i] !== "") return false;
  }

  return true;
}

function calculateRelativeVibratoFrequency(bpm: number) {
  const distance = Math.abs((bpm > 400 ? 400 : bpm) - 400);
  const scaleFactor = Math.min(distance / 400, 1);

  // result will be between 3 and 5
  return 3 + scaleFactor * 2;
}

function calculateRelativeChordDelayMultiplier(
  bpm: number,
  strumChordQuickly: boolean,
) {
  // Clamp BPM between 0 and 400
  const clampedBpm = Math.max(0, Math.min(400, bpm));

  // Linearly map 0 BPM to 0.05 seconds and 400 BPM to 0.0075 seconds
  const mappedValue = 0.05 + (clampedBpm / 400) * (0.0075 - 0.05);

  return strumChordQuickly ? mappedValue * 0.75 : mappedValue;
}

interface TetheredMetadata {
  effect: "h" | "p" | "/" | "\\" | "b" | "r" | "arbitrarySlide";
  pluckBaseNote: boolean; // used conditionally for b/r when they are not preceded by a tethered effect
  transitionFromFret?: number; // used for hp/\ effects and pre-note arbitrary slides
  transitionToFret?: number; // used for br effects and post-note arbitrary slides
}

interface PlayNoteColumn {
  tuning: number[];
  capo: number;
  bpm: number;
  thirdPrevColumn?: string[];
  secondPrevColumn?: string[];
  prevColumn?: string[];
  currColumn: string[];
  nextColumn?: string[];
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentInstrument: Soundfont.Player | null;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
  acousticSteelOverrideForPreview?: Soundfont.Player;
  forTuningPreview?: boolean;
}

function playNoteColumn({
  tuning,
  capo,
  bpm,
  thirdPrevColumn,
  secondPrevColumn,
  prevColumn,
  currColumn,
  nextColumn,
  audioContext,
  masterVolumeGainNode,
  currentInstrument,
  currentlyPlayingStrings,
  acousticSteelOverrideForPreview,
  forTuningPreview,
}: PlayNoteColumn) {
  return new Promise<void>((resolve) => {
    setTimeout(
      () => {
        resolve();
      },
      (60 / bpm) * 1000,
    );

    // thinking it's better to group "r" and "s" in main if statement here
    // because I don't think you want to be super aggresive on deleting the prev
    // notes if they exist in column ux wise if someone were to add an "s" to [7]
    // while editing
    if (
      columnHasNoNotes(currColumn) ||
      currColumn[7]?.includes("s") ||
      currColumn[7] === "r"
    ) {
      if (currColumn[7]?.includes("s")) {
        playSlapSound({
          accented: currColumn[7].includes(">"),
          stacatto: currColumn[7].includes("."),
          palmMuted: currColumn[0] !== "",
          audioContext,
          masterVolumeGainNode,
          currentlyPlayingStrings,
        });
      } else if (currColumn[7] === "r") {
        // stopping all notes currently playing
        for (let i = 0; i < currentlyPlayingStrings.length; i++) {
          const currentlyPlayingString = currentlyPlayingStrings[i];
          if (currentlyPlayingString) {
            cleanupAudioSource(currentlyPlayingString);
            currentlyPlayingStrings[i] = undefined;
          }
        }
      }
      return;
    }

    let notesPlayedSoFar = 0;
    let chordDelayMultiplier = 0;

    // TODO: allow just > and or . to be present + provide handling for these cases
    if (currColumn[7]?.includes("v") || currColumn[7]?.includes("^")) {
      chordDelayMultiplier = forTuningPreview
        ? 0.35
        : calculateRelativeChordDelayMultiplier(
            bpm,
            currColumn[7]?.includes(">") || currColumn[7]?.includes("."),
          );
    }

    const allInlineEffects = /[hp\/\\\\br~>.x]/g;
    const tetherEffects = /^[hp\/\\\\]$/;
    const onlyHasFretNumber = /^[0-9]+$/;
    const containsNumber = /\d/;

    for (let index = 1; index < 7; index++) {
      // 1-6 is actually starting with "high e" normally, so reverse it if you want
      // to start with "low e" aka downwards strum
      const stringIdx = currColumn[7]?.includes("v") ? 7 - index : index;
      const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

      if (currColumn[stringIdx] === "x") {
        playDeadNote({
          stringIdx: adjustedStringIdx,
          fret: capo === 0 ? 1 : capo,
          accented: currColumn[7]?.includes(">") || false,
          palmMuted: currColumn[0] !== "",
          audioContext,
          masterVolumeGainNode,
          currentlyPlayingStrings,
        });

        continue;
      }

      const thirdPrevNote = thirdPrevColumn?.[stringIdx];
      const secondPrevNote = secondPrevColumn?.[stringIdx];
      const prevNote = prevColumn?.[stringIdx];
      const currNote = currColumn[stringIdx];
      const nextNote = nextColumn?.[stringIdx];

      const prevNoteHadTetherEffect =
        prevNote && tetherEffects.test(prevNote.at(-1) || "");
      const currNoteHasTetherEffect =
        currNote && tetherEffects.test(currNote.at(-1) || "");

      const currNoteEffects = currNote ? currNote.match(allInlineEffects) : [];

      if (
        currNote === "" ||
        // skipping effects because next note is the one that actually gets played
        // in a "3 {effect} 5" scenario
        currNote === "h" ||
        currNote === "p" ||
        currNote === "/" ||
        currNote === "\\" ||
        // don't want to pluck note that is the target frequency of the bend
        (prevNote?.includes("b") && onlyHasFretNumber.test(currNote || "")) ||
        // don't want to play a "release" effect if there is no bend to release
        // from w/in last 2 columns
        (currNote === "r" &&
          !prevNote?.includes("b") &&
          !secondPrevNote?.includes("b"))
      )
        continue;

      let fret = 0;

      let tetheredMetadata: TetheredMetadata | undefined = undefined;

      let transitionFromFret = undefined;
      let transitionToFret = undefined;
      let pluckBaseNote = true;
      let effect:
        | "h"
        | "p"
        | "/"
        | "\\"
        | "b"
        | "r"
        | "arbitrarySlide"
        | undefined = undefined;

      // handling bends and releases (assigning transitionToFret)
      if (currNote && (currNote.includes("b") || currNote.includes("r"))) {
        // baseFret = the first note of the bend/release pair, targetNote being the second
        let baseFret = 0;

        // need to find our baseFret of the release, which is the targetFret of the bend.
        if (currNote === "r") {
          baseFret = extractNumber(
            prevNote?.includes("b") ? prevNote : secondPrevNote!,
          );
        } else {
          baseFret = extractNumber(currNote);
          // ^ might be scuffed in a "3b   5r" scenario, but deal with the implications of that when you get to them
        }

        if (currNote.includes("b")) {
          if (nextNote && containsNumber.test(nextNote)) {
            transitionToFret = extractNumber(nextNote) + capo; // bend to specific fret
          } else {
            if (baseFret >= 20) {
              transitionToFret = 22;
            } else {
              transitionToFret = baseFret + capo + 2; // non-specified generic: one semitone up
            }
          }
        } else {
          if (prevNote?.includes("b")) {
            transitionToFret = extractNumber(prevNote) + capo; // release back to original note
          } else if (secondPrevNote?.includes("b")) {
            transitionToFret = extractNumber(secondPrevNote) + capo; // release back to original note
          } else {
            if (baseFret <= 2) {
              transitionToFret = 0;
            } else {
              transitionToFret = baseFret + capo - 2; // non-specified generic: one semitone down
            }
          }
        }

        // used to determine whether or not to pluck the base note of the bend,
        // since in a continuous 3b 4r 3b 4r... it would be implied that it is a continuous
        // bend -> release -> bend. but if the baseFret is different, then we need to pluck
        // to maintain realism.
        let baseNoteOfLastBend: number | undefined;

        if (currNote.includes("b")) {
          if (secondPrevNote?.includes("b")) {
            baseNoteOfLastBend = extractNumber(secondPrevNote);
          } else if (thirdPrevNote?.includes("b")) {
            baseNoteOfLastBend = extractNumber(thirdPrevNote);
          }
        }

        effect = currNote.includes("b") ? "b" : "r";
        pluckBaseNote =
          currNote.includes("b") &&
          (!prevNote?.includes("r") ||
            extractNumber(currNote) !== baseNoteOfLastBend);
      }

      // handling bends and releases (assigning fret)
      if (currNote && (currNote.includes("b") || currNote.includes("r"))) {
        // baseFret = the first note of the bend/release pair, targetNote being the second
        let baseFret = 0;

        // need to find our baseFret of the release, which is the targetFret of the bend.
        if (currNote === "r") {
          if (prevNote?.includes("b") && containsNumber.test(currNote)) {
            baseFret = extractNumber(currNote);
          } else if (secondPrevNote?.includes("b")) {
            if (prevNote && containsNumber.test(prevNote)) {
              baseFret = extractNumber(prevNote);
            } else {
              let tempBaseFret = extractNumber(currNote);

              if (tempBaseFret >= 20) {
                tempBaseFret = 22;
              } else {
                tempBaseFret += 2;
              }

              baseFret = tempBaseFret;
            }
          } else if (prevNote) {
            let tempBaseFret = extractNumber(prevNote);

            if (tempBaseFret >= 20) {
              tempBaseFret = 22;
            } else {
              tempBaseFret += 2;
            }

            baseFret = tempBaseFret;
          }
        } else {
          baseFret = extractNumber(currNote);
          // ^ might be scuffed in a "3b   5r" scenario, but deal with the implications of that when you get to them
        }

        fret = baseFret + capo;
      } else {
        fret = extractNumber(currNote!) + capo;
      }

      if (
        secondPrevNote &&
        (prevNote === "/" ||
          prevNote === "\\" ||
          prevNote === "h" ||
          prevNote === "p")
      ) {
        transitionFromFret = extractNumber(secondPrevNote) + capo;
        effect = prevNote;
      }

      // pre-note arbitrary slide up/down
      else if (currNote?.[0] === "/" || currNote?.[0] === "\\") {
        if (currNote.startsWith("/")) {
          let baseFret = extractNumber(currNote);

          if (baseFret <= 2) {
            baseFret = 0;
          } else {
            baseFret -= 2;
          }

          fret = baseFret + capo;
        } else {
          let baseFret = extractNumber(currNote);

          if (baseFret >= 20) {
            baseFret = 22;
          } else {
            baseFret += 2;
          }

          fret = baseFret + capo;
        }

        transitionToFret = extractNumber(currNote);
        effect = "arbitrarySlide";
      }

      // post-note arbitrary slide up
      else if (currNote?.at(-1) === "/" && nextNote === "") {
        let baseFret = extractNumber(currNote);

        if (baseFret >= 20) {
          baseFret = 22;
        } else {
          baseFret += 2;
        }

        transitionToFret = baseFret + capo;
        effect = "arbitrarySlide";
      }
      // post-note arbitrary slide down
      else if (currNote?.at(-1) === "\\" && nextNote === "") {
        let baseFret = extractNumber(currNote);

        if (baseFret <= 2) {
          baseFret = 0;
        } else {
          baseFret -= 2;
        }

        transitionToFret = baseFret + capo;
        effect = "arbitrarySlide";
      }

      // handling hp/\ tethered effects
      else if (prevNote && prevNoteHadTetherEffect) {
        transitionFromFret = extractNumber(prevNote) + capo;
        effect = prevNote.at(-1)! as "h" | "p" | "/" | "\\";
      }

      if (effect) {
        tetheredMetadata = {
          effect,
          pluckBaseNote,
          transitionFromFret,
          transitionToFret,
        };
      }

      const effects = [...(currColumn[0] !== "" ? ["PM"] : [])];

      if (currNoteEffects && !currNoteHasTetherEffect) {
        currNoteEffects.forEach((effect) => {
          effects.push(effect);
        });
      }

      if (currColumn[7] !== "") {
        const separatedEffects = currColumn[7]!.split("");
        separatedEffects.forEach((effect) => {
          effects.push(effect);
        });
      }

      // this feels hacky, but it needs to be in separate state from tetheredMetadata for standalone
      // fret + ~ scenario.
      if (!currNote?.includes("b") && !currNote?.includes("r")) {
        pluckBaseNote =
          currNote?.includes("~") && prevNote?.includes("b") ? false : true;
      }

      playNote({
        tuning,
        stringIdx: adjustedStringIdx,
        fret,
        bpm,
        when: chordDelayMultiplier * notesPlayedSoFar,
        // ^ makes sure that the proper delay is applied to each note in a chord
        // regardless of the number/spacing of notes in the chord
        effects,
        tetheredMetadata,
        pluckBaseNote,
        audioContext,
        currentInstrument,
        masterVolumeGainNode,
        currentlyPlayingStrings,
        acousticSteelOverrideForPreview,
      });

      notesPlayedSoFar++;
    }
  });
}

export { playNoteColumn };
