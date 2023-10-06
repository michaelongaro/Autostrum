import extractNumber from "~/utils/extractNumber";
import type Soundfont from "soundfont-player";

interface PlayNoteWithEffects {
  note: GainNode;
  stringIdx: number;
  fret: number;
  bpm: number;
  when: number;
  effects?: string[];
  tetheredMetadata?: TetheredMetadata;
  pluckBaseNote: boolean;
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
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
      });
    }
  } else if (effects) {
    if (effects.includes("~")) {
      noteWithEffectApplied = applyVibratoEffect({
        when: 0,
        note,
        bpm,
        stringIdx,
        pluckBaseNote,
        audioContext,
        currentlyPlayingStrings,
      });
    } else if (effects.includes("x")) {
      noteWithEffectApplied = applyDeadNoteEffect({
        note,
        audioContext,
      });
    }
  }

  if (effects?.includes("PM")) {
    noteWithEffectApplied = applyPalmMute({
      note: noteWithEffectApplied ?? note,
      inlineEffects: effects,
      audioContext,
    });
  }

  // below conditions have to stop the note or reroute the note and need
  // to be reconnect()'ed to the masterVolumeGainNode
  if (
    noteWithEffectApplied &&
    (tetheredMetadata ||
      !pluckBaseNote || // don't think this is necessary anymore
      effects?.includes("PM") ||
      effects?.includes("x"))
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
}: ApplyBendEffect) {
  let source: AudioBufferSourceNode | undefined = undefined;
  let sourceGain: GainNode | undefined = undefined;

  if (!pluckBaseNote && note) {
    note.source.stop(0);

    source = audioContext.createBufferSource();
    sourceGain = audioContext.createGain();

    setTimeout(() => {
      currentlyPlayingStrings[stringIdx]?.stop();
      currentlyPlayingStrings[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer as AudioBuffer;
    source.start(0, 0.5);

    sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
    sourceGain.gain.linearRampToValueAtTime(
      1.3,
      audioContext.currentTime + when + 0.1 // maybe still need to do arbitrary stuff here?
    );
    source.connect(sourceGain);
  }

  const detuneValue = (fretToBendTo - baseFret) * 100;

  if (source && sourceGain) {
    source.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5)
    );
    return sourceGain;
  } else if (note) {
    note.source.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5)
    );
    return note;
  } else if (copiedNote) {
    copiedNote.detune.linearRampToValueAtTime(
      detuneValue,
      audioContext.currentTime +
        when +
        (60 / bpm) * (isArbitrarySlide ? 0.25 : 0.5)
    );
    // increasing gain to match level set in applyTetheredEffect()
    const copiedNoteGain = audioContext.createGain();
    copiedNoteGain.gain.value = 1.35;
    copiedNote.connect(copiedNoteGain);
    return copiedNoteGain;
  }
}

interface PlaySlapSound {
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

function playSlapSound({
  accented,
  palmMuted,
  audioContext,
  masterVolumeGainNode,
  currentlyPlayingStrings,
}: PlaySlapSound) {
  // stopping all notes currently playing
  for (
    let stringIdx = 0;
    stringIdx < currentlyPlayingStrings.length;
    stringIdx++
  ) {
    currentlyPlayingStrings[stringIdx]?.stop();
  }

  // Create an OscillatorNode to simulate the slap sound
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 100;

  // Create a buffer for noise
  const noiseBuffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * 0.2,
    audioContext.sampleRate
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

  gainNode.gain.setValueAtTime(gainTarget, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.25
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
    audioContext.currentTime + 0.25
  );

  // Connect the oscillator and noise to the gainNode
  oscillator.connect(lowPassFilter);
  noise.connect(noiseGain);
  noiseGain.connect(lowPassFilter);
  lowPassFilter.connect(midBoost);
  midBoost.connect(gainNode);

  // // Connect the gainNode to the audioContext's destination
  gainNode.connect(masterVolumeGainNode);
  masterVolumeGainNode.connect(audioContext.destination);

  // Start the oscillator and noise now
  oscillator.start(audioContext.currentTime);
  noise.start(audioContext.currentTime);

  // Stop the oscillator and noise shortly afterward to simulate a short, percussive sound
  oscillator.stop(audioContext.currentTime + 0.25);
  noise.stop(audioContext.currentTime + 0.25);
}

interface ApplyDeadNoteEffect {
  note: GainNode;
  audioContext: AudioContext;
}

function applyDeadNoteEffect({ note, audioContext }: ApplyDeadNoteEffect) {
  // Create a BiquadFilterNode to act as a low-pass filter
  const lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 700; // Lower this value to cut more high frequencies
  lowPassFilter.Q.value = 0.25; // Quality factor - lower values make the boost range broader

  // Create a BiquadFilterNode to boost the bass frequencies
  const bassBoost = audioContext.createBiquadFilter();
  bassBoost.type = "peaking";
  bassBoost.frequency.value = 120; // Frequency to boost - around 120Hz is a typical bass frequency
  bassBoost.gain.value = 20; // Amount of boost in dB
  bassBoost.Q.value = 10; // Quality factor - lower values make the boost range broader

  // Create a GainNode to reduce volume
  const gainNode = audioContext.createGain();

  gainNode.gain.value = 20; // Reduce gain to simulate the quieter sound of a dead note

  // Connect the note to the filter, and the filter to the gain node
  note.connect(lowPassFilter);
  lowPassFilter.connect(bassBoost);
  bassBoost.connect(gainNode);

  return gainNode;
}

interface ApplyPalmMute {
  note: GainNode | AudioBufferSourceNode;
  inlineEffects?: string[];
  audioContext: AudioContext;
}

function applyPalmMute({ note, inlineEffects, audioContext }: ApplyPalmMute) {
  // Create a BiquadFilterNode to act as a low-pass filter
  const lowPassFilter = audioContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 700; // Lower this value to cut more high frequencies was 2000
  lowPassFilter.Q.value = 0.25; // Quality factor - lower values make the boost range broader

  // Create a BiquadFilterNode to boost the bass frequencies
  const bassBoost = audioContext.createBiquadFilter();
  bassBoost.type = "peaking";
  bassBoost.frequency.value = 120; // Frequency to boost - around 120Hz is a typical bass frequency
  bassBoost.gain.value = 20; // Amount of boost in dB
  bassBoost.Q.value = 10; // Quality factor - lower values make the boost range broader

  // Create a GainNode to reduce volume
  const gainNode = audioContext.createGain();

  // palm muting is a little quieter than normal notes, can think of this as 70% of normal volume
  let gainValue = 70;

  if (inlineEffects?.includes(">")) {
    gainValue = 85;
  }

  gainNode.gain.value = gainValue;

  // Connect the note to the filter, filter to the bass boost, and the bass boost to the gain node
  note.connect(lowPassFilter);
  lowPassFilter.connect(bassBoost);
  bassBoost.connect(gainNode);

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
}: ApplyTetheredEffect) {
  // immediately stop current note because we don't ever want to hear the pluck on
  // a tethered note
  note.source.stop(0);

  const source = audioContext.createBufferSource();
  const sourceGain = audioContext.createGain();

  setTimeout(() => {
    currentlyPlayingStrings[stringIdx]?.stop();
    currentlyPlayingStrings[stringIdx] = source;
  }, when * 1000);

  source.buffer = note.source.buffer as AudioBuffer;
  // immediately start detune at the value of the tetheredFret
  source.detune.setValueAtTime(
    (tetheredFret - currentFret) * 100,
    audioContext.currentTime + when
  );
  source.start(
    audioContext.currentTime + when,
    tetheredEffect === "p" ? 0 : 0.2
  );

  sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
  sourceGain.gain.linearRampToValueAtTime(
    tetheredEffect === "p" ? 1 : 1.3,
    audioContext.currentTime + when + 0.1
  );
  source.connect(sourceGain);

  let durationOfTransition = (60 / bpm) * 0.2;
  if (tetheredEffect === "h" || tetheredEffect === "p") {
    durationOfTransition = 0; // hammer-ons and pull-offs are instantaneous
  }

  // immediately ramping from tetheredFret to currentFret with a duration defined by durationOfTransition
  source.detune.linearRampToValueAtTime(
    0.001, // smallest viable value
    audioContext.currentTime + when + durationOfTransition
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
}: ApplyVibratoEffect) {
  let source: AudioBufferSourceNode | undefined = undefined;
  let sourceGain: GainNode | undefined = undefined;

  if (!pluckBaseNote && note) {
    note.source.stop(0);
    source = audioContext.createBufferSource();
    sourceGain = audioContext.createGain();

    setTimeout(() => {
      currentlyPlayingStrings[stringIdx]?.stop();
      currentlyPlayingStrings[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer as AudioBuffer;
    source.start(0, 0.5);

    sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
    sourceGain.gain.exponentialRampToValueAtTime(
      1.3,
      audioContext.currentTime + when + 0.1
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
  vibratoOscillator.start(audioContext.currentTime + when + oscillatorDelay);

  if (source && sourceGain) {
    vibratoDepth.connect(source.detune);
    return sourceGain;
  } else if (note) {
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
}: PlayNote) {
  let duration = 3;
  let gain = 1;

  if (effects.includes(">")) {
    gain = 1.8;
  }

  // dead note and palm mute effects require us to basically hijack the note by almost muting it
  // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
  // ^ TODO: wouldn't be too surprised if we can try to refactor by using the "source" prop like in
  // tethered effects
  if (effects.includes("PM")) {
    gain = 0.01;
    duration = 0.45;
    // I think ideally sustain should be changed, not duration
    // but it seemed like changing sustain value didn't have intended effect..
  }
  if (effects.includes("x")) {
    gain = 0.01;
    duration = 0.35; // play around with this value
  }

  if (effects.includes(".")) {
    // technically stacatto doesn't mean that the note should be played any louder
    // than normal, so omitting any gain definition here
    duration = 0.25;
  }

  const note = currentInstrument?.play(
    `${tuning[stringIdx]! + fret}`,
    audioContext.currentTime + when,
    {
      duration,
      gain,
      // TODO: might be fun/more accurate to change sustain value instead of duration for some effects
    }
  );

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
      currentlyPlayingStrings[stringIdx]?.stop();
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
  // Ensure that the input number is positive
  const distance = Math.abs(bpm > 400 ? 400 : bpm - 400);

  // Calculate the scale factor between 0 and 1.
  // When bpm: number is 400, scaleFactor will be 0.
  // When bpm: number is 0, scaleFactor will be 1.
  const scaleFactor = Math.min(distance / 400, 1);

  // Scale the number between 2 (when scaleFactor is 0)
  // and 4 (when scaleFactor is 1).
  return 3 + scaleFactor * (5 - 3);
}

function calculateRelativeChordDelayMultiplier(
  bpm: number,
  strumChordQuickly: boolean
) {
  const distance = Math.abs(bpm > 400 ? 400 : bpm - 400);
  const scaleFactor = Math.min(distance / 400, 1);

  const accentedMultiplier = strumChordQuickly ? 0.3 : 1;
  return (0.01 + scaleFactor * 0.06) * accentedMultiplier;
}

function getIndexOfFirstNonEmptyString(column: string[], isAnUpstrum: boolean) {
  for (let index = 1; index < 7; index++) {
    const i = isAnUpstrum ? index : 7 - index;
    if (column[i] !== "") {
      return i;
    }
  }

  return 1;
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
}: PlayNoteColumn) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, (60 / bpm) * 1000);

    // thinking it's better to group "s" in main if statement here
    // because I don't think you want to be super aggresive on deleting the prev
    // notes if they exist in column ux wise if someone were to add an "s" to [7]
    // while editing
    if (columnHasNoNotes(currColumn) || currColumn[7]?.includes("s")) {
      if (currColumn[7]?.includes("s")) {
        playSlapSound({
          accented: currColumn[7].includes(">"),
          palmMuted: currColumn[0] !== "",
          audioContext,
          masterVolumeGainNode,
          currentlyPlayingStrings,
        });
      }
      return;
    }

    let chordDelayMultiplier = 0;

    if (currColumn[7]?.includes("v") || currColumn[7]?.includes("^")) {
      chordDelayMultiplier = calculateRelativeChordDelayMultiplier(
        bpm,
        currColumn[7]?.includes(">") || currColumn[7]?.includes(".")
      );
    }

    const indexOfFirstNonEmptyString = getIndexOfFirstNonEmptyString(
      currColumn,
      currColumn[7]?.includes("^") || false
    );

    const allInlineEffects = /[hp\/\\\\br~>.x]/g;
    const tetherEffects = /^[hp\/\\\\]$/;
    const onlyHasFretNumber = /^[0-9]+$/;
    const containsNumber = /\d/;

    for (let index = 1; index < 7; index++) {
      // 1-6 is actually starting with "high e" normally, so reverse it if you want
      // to start with "low e" aka downwards strum
      const stringIdx = currColumn[7]?.includes("v") ? 7 - index : index;

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

      const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

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
            prevNote?.includes("b") ? prevNote : secondPrevNote!
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
          if (prevNote && prevNote.includes("b")) {
            transitionToFret = extractNumber(prevNote) + capo; // release back to original note
          } else if (secondPrevNote && secondPrevNote.includes("b")) {
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
        if (currNote?.[0] === "/") {
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
      if (currColumn[7]?.includes(">")) {
        effects.push(">");
      }
      if (currColumn[7]?.includes(".")) {
        effects.push(".");
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
        // ^ want raw index instead of adjusted index since we only care about
        // how "far" into the chord the note is, also want to start multiplier
        // based on first non-empty string for the timing to be as accurate as possible
        when:
          chordDelayMultiplier *
          Math.abs(indexOfFirstNonEmptyString - stringIdx),
        effects,
        tetheredMetadata,
        pluckBaseNote,
        audioContext,
        currentInstrument,
        masterVolumeGainNode,
        currentlyPlayingStrings,
      });
    }
  });
}

export { playNoteColumn };
