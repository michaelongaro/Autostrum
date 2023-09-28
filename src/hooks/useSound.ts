import { useEffect, useRef } from "react";
import type Soundfont from "soundfont-player";
import { shallow } from "zustand/shallow";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import extractNumber from "~/utils/extractNumber";
import resetAudioSliderPosition from "~/utils/resetAudioSliderPosition";
import { parse } from "~/utils/tunings";
import type {
  Chord,
  Section,
  SectionProgression,
  StrummingPattern,
} from "../stores/TabStore";

export default function useSound() {
  const {
    audioContext,
    setAudioContext,
    breakOnNextChord,
    setBreakOnNextChord,
    masterVolumeGainNode,
    setMasterVolumeGainNode,
    setCurrentlyPlayingMetadata,
    currentChordIndex,
    setCurrentChordIndex,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
    breakOnNextPreviewChord,
    setBreakOnNextPreviewChord,
    previewMetadata,
    setPreviewMetadata,
    recordedAudioBufferSourceNode,
    setRecordedAudioBufferSourceNode,
    setShowingAudioControls,
  } = useTabStore(
    (state) => ({
      audioContext: state.audioContext,
      setAudioContext: state.setAudioContext,
      breakOnNextChord: state.breakOnNextChord,
      setBreakOnNextChord: state.setBreakOnNextChord,
      masterVolumeGainNode: state.masterVolumeGainNode,
      setMasterVolumeGainNode: state.setMasterVolumeGainNode,
      setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      setCurrentChordIndex: state.setCurrentChordIndex,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      currentInstrument: state.currentInstrument,
      breakOnNextPreviewChord: state.breakOnNextPreviewChord,
      setBreakOnNextPreviewChord: state.setBreakOnNextPreviewChord,
      previewMetadata: state.previewMetadata,
      setPreviewMetadata: state.setPreviewMetadata,
      recordedAudioBufferSourceNode: state.recordedAudioBufferSourceNode,
      setRecordedAudioBufferSourceNode: state.setRecordedAudioBufferSourceNode,
      setShowingAudioControls: state.setShowingAudioControls,
    }),
    shallow
  );

  const looping = useGetLocalStorageValues().looping;

  useEffect(() => {
    return () => {
      breakOnNextChordRef.current = true;
      breakOnNextPreviewChordRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (audioContext && masterVolumeGainNode) return;

    const newAudioContext = new AudioContext();

    const newMasterVolumeGainNode = newAudioContext.createGain();

    newMasterVolumeGainNode.connect(newAudioContext.destination);

    setAudioContext(newAudioContext);
    setMasterVolumeGainNode(newMasterVolumeGainNode);
  }, [
    audioContext,
    masterVolumeGainNode,
    setAudioContext,
    setMasterVolumeGainNode,
  ]);

  // Doesn't feel great to be using refs here, but it's the only way I can think of to
  // get current values of these vars within the async for loop in playTab()
  const breakOnNextChordRef = useRef(breakOnNextChord);
  const audioMetadataRef = useRef(audioMetadata);
  const loopingRef = useRef(looping);
  const currentChordIndexRef = useRef(currentChordIndex);

  const breakOnNextPreviewChordRef = useRef(breakOnNextPreviewChord);
  const previewMetadataRef = useRef(previewMetadata);

  useEffect(() => {
    breakOnNextChordRef.current = breakOnNextChord;
  }, [breakOnNextChord]);

  useEffect(() => {
    audioMetadataRef.current = audioMetadata;
  }, [audioMetadata]);

  useEffect(() => {
    loopingRef.current = looping;
    if (recordedAudioBufferSourceNode) {
      recordedAudioBufferSourceNode.loop = looping;
    }
  }, [looping, recordedAudioBufferSourceNode]);

  useEffect(() => {
    currentChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex]);

  useEffect(() => {
    breakOnNextPreviewChordRef.current = breakOnNextPreviewChord;
  }, [breakOnNextPreviewChord]);

  useEffect(() => {
    previewMetadataRef.current = previewMetadata;
  }, [previewMetadata]);

  const currentNoteArrayRef = useRef<
    (Soundfont.Player | AudioBufferSourceNode | undefined)[]
  >([undefined, undefined, undefined, undefined, undefined, undefined]);

  interface PlayNoteWithEffects {
    note: GainNode;
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    effects?: string[];
    tetheredMetadata?: TetheredMetadata;
    pluckBaseNote: boolean;
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
  }: PlayNoteWithEffects) {
    if (!audioContext || !masterVolumeGainNode) return;

    // TODO: split these effects into separate files for better organization

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
        });
      } else if (effects.includes("x")) {
        noteWithEffectApplied = applyDeadNoteEffect(note);
      }
    }

    if (effects?.includes("PM")) {
      noteWithEffectApplied = applyPalmMute(
        noteWithEffectApplied ?? note,
        effects
      );
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
  }: ApplyBendEffect) {
    if (!audioContext) return;

    let source: AudioBufferSourceNode | undefined = undefined;
    let sourceGain: GainNode | undefined = undefined;

    if (!pluckBaseNote && note) {
      note.source.stop(0);

      source = audioContext.createBufferSource();
      sourceGain = audioContext.createGain();

      setTimeout(() => {
        currentNoteArrayRef.current[stringIdx]?.stop();
        currentNoteArrayRef.current[stringIdx] = source;
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
  }

  function playSlapSound({ accented, palmMuted }: PlaySlapSound) {
    if (!audioContext || !masterVolumeGainNode) return;

    // stopping all notes currently playing
    for (
      let stringIdx = 0;
      stringIdx < currentNoteArrayRef.current.length;
      stringIdx++
    ) {
      currentNoteArrayRef.current[stringIdx]?.stop();
    }

    // Create an OscillatorNode to simulate the slap sound
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 90; // changing this doesn't reflect as you would expect (not linear in terms of volume/pitch)

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

  function applyDeadNoteEffect(note: GainNode) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 350; // Lower this value to cut more high frequencies

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 200; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 25; // Amount of boost in dB
    bassBoost.Q.value = 50; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    gainNode.gain.value = 40; // Reduce gain to simulate the quieter sound of a dead note

    // Connect the note to the filter, and the filter to the gain node
    note.connect(lowPassFilter);
    lowPassFilter.connect(bassBoost);
    bassBoost.connect(gainNode);

    return gainNode;
  }

  function applyPalmMute(
    note: GainNode | AudioBufferSourceNode,
    inlineEffects?: string[]
  ) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 800; // Lower this value to cut more high frequencies was 2000
    lowPassFilter.Q.value = 0.5; // Quality factor - lower values make the boost range broader

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 120; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 20; // Amount of boost in dB
    bassBoost.Q.value = 10; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    // palm muting is a little quieter than normal notes
    let gainValue = 40;

    if (inlineEffects?.includes(">")) {
      gainValue = 75;
    } else if (inlineEffects?.includes(".")) {
      gainValue = 45;
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
  }: ApplyTetheredEffect) {
    if (!audioContext) return;

    // immediately stop current note because we don't ever want to hear the pluck on
    // a tethered note
    note.source.stop(0);

    const source = audioContext.createBufferSource();
    const sourceGain = audioContext.createGain();

    setTimeout(() => {
      currentNoteArrayRef.current[stringIdx]?.stop();
      currentNoteArrayRef.current[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer as AudioBuffer;
    // immediately start detune at the value of the tetheredFret
    source.detune.setValueAtTime(
      (tetheredFret - currentFret) * 100,
      audioContext.currentTime + when
    );
    source.start(
      audioContext.currentTime + when,
      tetheredEffect === "p" ? 0.1 : 0.2
    );

    sourceGain.gain.setValueAtTime(0.01, audioContext.currentTime + when);
    sourceGain.gain.linearRampToValueAtTime(
      tetheredEffect === "p" ? 1.1 : 1.3,
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
  }

  function applyVibratoEffect({
    note,
    copiedNote,
    when,
    bpm,
    stringIdx,
    pluckBaseNote = true,
  }: ApplyVibratoEffect) {
    if (!audioContext) return;

    let source: AudioBufferSourceNode | undefined = undefined;
    let sourceGain: GainNode | undefined = undefined;

    if (!pluckBaseNote && note) {
      note.source.stop(0);
      source = audioContext.createBufferSource();
      sourceGain = audioContext.createGain();

      setTimeout(() => {
        currentNoteArrayRef.current[stringIdx]?.stop();
        currentNoteArrayRef.current[stringIdx] = source;
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
  }: PlayNote) {
    if (!audioContext) return;

    let duration = 3;
    let gain = 1;

    if (effects.includes(">")) {
      gain = 1.5;
    }

    // dead note and palm mute effects require us to basically hijack the note by almost muting it
    // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
    // ^ TODO: wouldn't be too surprised if we can try to refactor by using the "source" prop like in
    // tethered effects
    if (effects.includes("PM")) {
      gain = 0.01;
      // duration = 0.45; I think ideally sustain should be changed, not duration
      // but it seemed like changing sustain value didn't have intended effect..
    }
    if (effects.includes("x")) {
      gain = 0.01;
      duration = 0.35; // play around with this value
    }

    if (effects.includes(".")) {
      gain = 1.1; // in my head stacatto = high action => should be a bit louder than normal, but not 100% sure
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
        currentNoteArrayRef.current[stringIdx]?.stop();
        currentNoteArrayRef.current[stringIdx] = note;
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
    const distance = Math.abs(bpm - 400);

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
    accented: boolean
  ) {
    // Ensure that the input number is positive
    const distance = Math.abs(bpm - 400);

    // Calculate the scale factor between 0 and 1.
    // When bpm: number is 400, scaleFactor will be 0.
    // When bpm: number is 0, scaleFactor will be 1.
    const scaleFactor = Math.min(distance / 400, 1);

    // Scale the number between 0.01 (when scaleFactor is 0)
    // and 0.05 (when scaleFactor is 1).

    const accentedMultiplier = accented ? 0.5 : 1;
    return (0.01 + scaleFactor * (0.05 - 0.01)) * accentedMultiplier;
  }

  function getIndexOfFirstNonEmptyString(
    column: string[],
    isAnUpstrum: boolean
  ) {
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
          });
          // TODO: technically I think the sound will bleed into the next note at high bpms
        }
        return;
      }

      let chordDelayMultiplier = 0;

      if (currColumn[7]?.includes("v") || currColumn[7]?.includes("^")) {
        chordDelayMultiplier = calculateRelativeChordDelayMultiplier(
          bpm,
          currColumn[7]?.includes(">")
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
      // const containsFretNumberAndEffect = /^[0-9]+[hp\/\\\\br~>.]$/;

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

        const currNoteEffects = currNote
          ? currNote.match(allInlineEffects)
          : [];

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
        });
      }
    });
  }

  interface PlayPreview {
    data: string[] | StrummingPattern;
    index: number; // technically only necessary for strumming pattern, not chord preview
    type: "chord" | "strummingPattern";
  }

  async function playPreview({ data, index, type }: PlayPreview) {
    if (audioMetadata.playing || previewMetadata.playing) {
      pauseAudio();
    }

    const tuning = parse("e2 a2 d3 g3 b3 e4");

    const compiledChords =
      type === "chord"
        ? [["", ...(data as string[]), "v", "60", "1"]]
        : compileStrummingPatternPreview({
            strummingPattern: data as StrummingPattern,
          });

    for (
      let chordIndex = previewMetadataRef.current.currentChordIndex;
      chordIndex < compiledChords.length;
      chordIndex++
    ) {
      setPreviewMetadata({
        playing: true,
        indexOfPattern: index,
        currentChordIndex: chordIndex,
        type,
      });
      // ^^ doing this here because didn't update in time with one that was above

      // prob don't need anything but currColumn since you can't have any fancy effects
      // in the previews...

      const secondPrevColumn = compiledChords[chordIndex - 2];
      const prevColumn = compiledChords[chordIndex - 1];
      const currColumn = compiledChords[chordIndex];
      const nextColumn = compiledChords[chordIndex + 1];

      if (currColumn === undefined) continue;

      // alteredBpm = bpm for chord * (1 / noteLengthMultiplier)
      const alteredBpm = Number(currColumn[8]) * (1 / Number(currColumn[9]));

      await playNoteColumn({
        tuning,
        capo: 0,
        bpm: alteredBpm,
        secondPrevColumn,
        prevColumn,
        currColumn,
        nextColumn,
      });

      if (breakOnNextPreviewChordRef.current) {
        setBreakOnNextPreviewChord(false);
        return;
      }

      if (chordIndex === compiledChords.length - 1) {
        setPreviewMetadata({
          ...previewMetadataRef.current,
          indexOfPattern: -1,
          currentChordIndex: 0,
          playing: false,
        });
      }
    }
  }

  interface PlayRecordedAudio {
    audioBuffer: AudioBuffer;
    secondsElapsed: number;
  }

  function playRecordedAudio({
    audioBuffer,
    secondsElapsed,
  }: PlayRecordedAudio) {
    if (!audioContext || !masterVolumeGainNode) return;

    if (audioMetadata.playing || previewMetadata.playing) {
      pauseAudio();
    }

    setAudioMetadata({
      ...audioMetadataRef.current,
      playing: true,
      type: "Artist recording",
    });

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    setRecordedAudioBufferSourceNode(source);

    // const gainNode = audioContext.createGain();
    // gainNode.gain.value = masterVolumeGainNode?.gain.value ?? 1;

    // source.connect(gainNode);
    // gainNode.connect(audioContext.destination);
    source.connect(masterVolumeGainNode);
    source.loop = loopingRef.current;

    // idk maybe the defaults are sane already...
    // if (loopingRef.current) {
    //   source.loopStart = 0;
    //   source.loopEnd = audioBuffer.duration;
    // }

    source.start(0, secondsElapsed);

    // source.disconnect prob use just to be safe w/ memory stuff
  }

  interface PlayTab {
    tabData: Section[];
    rawSectionProgression: SectionProgression[];
    tuningNotes: string;
    baselineBpm: number;
    capo?: number;
    chords: Chord[];
    playbackSpeed: number;
    tabId?: number;
    location?: {
      sectionIndex: number;
      subSectionIndex?: number;
      chordSequenceIndex?: number;
    };
    resetToStart?: boolean;
  }

  async function playTab({
    tabData,
    rawSectionProgression,
    tuningNotes,
    baselineBpm,
    chords,
    capo = 0,
    playbackSpeed,
    tabId,
    location,
    resetToStart,
  }: PlayTab) {
    setShowingAudioControls(true);

    if (
      audioMetadataRef.current.playing ||
      previewMetadataRef.current.playing ||
      resetToStart
    ) {
      pauseAudio(resetToStart);
    }

    setAudioMetadata({
      ...audioMetadataRef.current,
      tabId: tabId !== undefined ? tabId : -1,
      location: location ?? audioMetadataRef.current.location,
      playing: true,
      type: "Generated",
    });

    const sectionProgression =
      rawSectionProgression.length > 0
        ? rawSectionProgression
        : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now
    const tuning = parse(tuningNotes);

    const compiledChords = location
      ? compileSpecificChordGrouping({
          tabData,
          location,
          chords,
          baselineBpm,
          playbackSpeed,
          setCurrentlyPlayingMetadata,
        })
      : compileFullTab({
          tabData,
          sectionProgression,
          chords,
          baselineBpm,
          playbackSpeed,
          setCurrentlyPlayingMetadata,
        });

    for (
      let chordIndex = currentChordIndexRef.current;
      chordIndex < compiledChords.length;
      chordIndex++
    ) {
      setCurrentChordIndex(chordIndex);

      const thirdPrevColumn = compiledChords[chordIndex - 3];
      const secondPrevColumn = compiledChords[chordIndex - 2];
      const prevColumn = compiledChords[chordIndex - 1];
      const currColumn = compiledChords[chordIndex];
      const nextColumn = compiledChords[chordIndex + 1];

      if (currColumn === undefined) continue;

      // alteredBpm = bpm for chord * (1 / noteLengthMultiplier) * playbackSpeedMultiplier
      const alteredBpm =
        Number(currColumn[8]) * (1 / Number(currColumn[9])) * playbackSpeed;

      if (chordIndex !== compiledChords.length - 1) {
        await playNoteColumn({
          tuning,
          capo: capo ?? 0,
          bpm: alteredBpm,
          thirdPrevColumn,
          secondPrevColumn,
          prevColumn,
          currColumn,
          nextColumn,
        });
      }

      if (breakOnNextChordRef.current) {
        setBreakOnNextChord(false);
        return;
      }

      // not 100% on moving this back to the top, but trying it out right now
      if (chordIndex === compiledChords.length - 1) {
        // if looping, reset the chordIndex to -1 so loop will start over
        if (loopingRef.current && audioMetadataRef.current.playing) {
          resetAudioSliderPosition();

          chordIndex = -1;
          setCurrentChordIndex(0);
        } else {
          setAudioMetadata({
            ...audioMetadataRef.current,
            playing: false,
          });
          setCurrentChordIndex(0);
        }
      }
    }
  }

  // I think we made a mistake trying to make this function too generic to handle
  // pausing of whatever audio was playing, the intention was to reduce the amount
  // of conditional logic on the frontend components but I think it added unnecessary,
  // hard to follow complexity
  function pauseAudio(resetToStart?: boolean) {
    if (!audioMetadata.playing && !previewMetadata.playing) {
      resetAudioSliderPosition();

      setCurrentChordIndex(0);
      currentChordIndexRef.current = 0; // need these to happen instantly, can't wait for update effect to run

      return;
    }

    if (audioMetadata.playing && audioMetadata.type === "Artist recording") {
      recordedAudioBufferSourceNode?.stop();

      setAudioMetadata({
        ...audioMetadataRef.current,
        playing: false,
      });

      if (resetToStart) {
        resetAudioSliderPosition();
      }
    } else if (audioMetadata.playing && audioMetadata.type === "Generated") {
      setBreakOnNextChord(true);
      breakOnNextChordRef.current = true; // need these to happen instantly, can't wait for update effect to run
      setAudioMetadata({
        ...audioMetadataRef.current,
        playing: false,
      });

      if (resetToStart) {
        resetAudioSliderPosition();
        setCurrentChordIndex(0);
        currentChordIndexRef.current = 0; // need these to happen instantly, can't wait for update effect to run
      }
    } else if (previewMetadata.playing) {
      setBreakOnNextPreviewChord(true);
      breakOnNextPreviewChordRef.current = true; // need these to happen instantly, can't wait for update effect to run

      setPreviewMetadata({
        ...previewMetadataRef.current,
        currentChordIndex: 0,
        playing: false,
      });
      previewMetadataRef.current.currentChordIndex = 0; // need these to happen instantly, can't wait for update effect to run

      if (resetToStart) {
        resetAudioSliderPosition();
        setCurrentChordIndex(0);
        currentChordIndexRef.current = 0; // need these to happen instantly, can't wait for update effect to run
      }
    }

    for (let i = 0; i < currentNoteArrayRef.current.length; i++) {
      currentNoteArrayRef.current[i]?.stop();
    }

    currentInstrument?.stop();
  }

  return {
    playTab,
    pauseAudio,
    playRecordedAudio,
    playPreview,
  };
}
