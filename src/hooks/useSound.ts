import { useEffect, useRef } from "react";
import Soundfont from "soundfont-player";
import { parse } from "~/utils/tunings";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import type {
  SectionProgression,
  Section,
  StrummingPattern,
  Chord,
} from "../stores/TabStore";
import extractNumber from "~/utils/extractNumber";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import resetAudioSliderPosition from "~/utils/resetAudioSliderPosition";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";

export default function useSound() {
  const {
    audioContext,
    setAudioContext,
    breakOnNextChord,
    setBreakOnNextChord,
    masterVolumeGainNode,
    setMasterVolumeGainNode,
    setCurrentlyPlayingMetadata,
    currentInstrumentName,
    currentChordIndex,
    setCurrentChordIndex,
    audioMetadata,
    setAudioMetadata,
    instruments,
    setInstruments,
    currentInstrument,
    setCurrentInstrument,
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
      currentInstrumentName: state.currentInstrumentName,
      currentChordIndex: state.currentChordIndex,
      setCurrentChordIndex: state.setCurrentChordIndex,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      instruments: state.instruments,
      setInstruments: state.setInstruments,
      currentInstrument: state.currentInstrument,
      setCurrentInstrument: state.setCurrentInstrument,
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

  // not entirely sure if this caching solution is necessary since the actual
  // soundfont file would be cached by the browser anyway, but it doesn't hurt
  // to leave it
  useEffect(() => {
    const fetchInstrument = () => {
      if (!audioContext) return;

      // Check if the instrument is already in cache
      if (instruments[currentInstrumentName]) {
        setCurrentInstrument(instruments[currentInstrumentName]);
        return;
      }

      setCurrentInstrument(null);
      // If not in cache, fetch it
      // @ts-expect-error this isn't supported in safari yet, so we have regular fallback below
      if (window.requestIdleCallback) {
        requestIdleCallback(
          () => {
            void Soundfont.instrument(audioContext, currentInstrumentName, {
              soundfont: "MusyngKite",
              format: "ogg",
            }).then((player) => {
              player.connect(masterVolumeGainNode);

              // Update the cache
              const updatedInstruments = {
                ...instruments,
                [currentInstrumentName]: player,
              };
              setInstruments(updatedInstruments);
              setCurrentInstrument(player);
            });
          },
          {
            timeout: currentInstrument ? 0 : 1500,
          }
        );
      } else {
        setTimeout(
          () => {
            void Soundfont.instrument(audioContext, currentInstrumentName, {
              soundfont: "MusyngKite",
              format: "ogg",
            }).then((player) => {
              player.connect(masterVolumeGainNode);

              // Update the cache
              const updatedInstruments = {
                ...instruments,
                [currentInstrumentName]: player,
              };
              setInstruments(updatedInstruments);
              setCurrentInstrument(player);
            });
          },
          currentInstrument ? 0 : 1500
        );
      }
    };

    void fetchInstrument();
  }, [
    masterVolumeGainNode, // hopefully this doesn't cause way more rerenders than we want since it's in tabStore now
    audioContext,
    currentInstrumentName,
    instruments,
    currentInstrument,
    setCurrentInstrument,
    setInstruments,
  ]);

  interface PlayNoteWithEffects {
    note: GainNode;
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    effects?: string[];
    prevTetheredNote?: {
      note: number;
      effect: string;
    };
    slideToFret?: number;
  }

  function playNoteWithEffects({
    note,
    stringIdx,
    fret,
    bpm,
    when,
    effects,
    prevTetheredNote,
    slideToFret,
  }: PlayNoteWithEffects) {
    if (!audioContext || !masterVolumeGainNode) return;

    // TODO: split these effects into separate files for better organization

    let noteWithEffectApplied = undefined;

    if (prevTetheredNote || slideToFret) {
      if (slideToFret) {
        // effectively: these "arbitrary" slides (/3, 3/, etc.) are just
        // played as a bend
        noteWithEffectApplied = applyBendEffect({
          note,
          baseFret: fret,
          fretToBendTo: slideToFret,
          stringIdx,
          when,
          bpm,
        });
      } else if (prevTetheredNote) {
        noteWithEffectApplied = applyTetheredEffect({
          note,
          currentEffects: effects,
          currentFret: fret,
          tetheredEffect: prevTetheredNote.effect as "h" | "p" | "/" | "\\",
          tetheredFret: prevTetheredNote.note,
          stringIdx,
          bpm,
          when,
        });
      }
    } else if (effects) {
      // if note was tethered and also has an inline effect, it is handled
      // within applyTetheredEffect() above

      if (effects.includes("~")) {
        noteWithEffectApplied = applyVibratoEffect({
          when: 0,
          note,
          bpm,
        });
      } else if (effects.includes("b")) {
        noteWithEffectApplied = applyBendEffect({
          note,
          stringIdx,
          when,
          bpm,
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

    // ~ and b effects are applied to the note itself, so we don't need to
    // connect() them again to the master volume gain node and audioContext.destination
    if (
      noteWithEffectApplied &&
      (effects?.includes("PM") || prevTetheredNote || effects?.includes("x"))
    ) {
      noteWithEffectApplied.connect(masterVolumeGainNode);
      masterVolumeGainNode.connect(audioContext.destination);
    }
  }

  interface ApplyBendEffect {
    note?: GainNode;
    baseFret?: number;
    fretToBendTo?: number;
    copiedNote?: AudioBufferSourceNode;
    stringIdx: number;
    when: number;
    bpm: number;
  }

  function applyBendEffect({
    note,
    baseFret,
    fretToBendTo,
    copiedNote,
    stringIdx,
    when,
    bpm,
  }: ApplyBendEffect) {
    if (!audioContext) return;

    let detuneValue = 0;

    if (fretToBendTo !== undefined && baseFret !== undefined) {
      detuneValue = (fretToBendTo - baseFret) * 100;
    } else {
      detuneValue = stringIdx > 1 ? 100 : -100;
    }

    if (note) {
      note.source.detune.linearRampToValueAtTime(
        detuneValue,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      return note;
    } else if (copiedNote) {
      copiedNote.detune.linearRampToValueAtTime(
        detuneValue,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      // increasing gain to match level set in applyTetheredEffect=
      const copiedNoteGain = audioContext.createGain();
      copiedNoteGain.gain.value = 1.5; // TODO: prob needs to be dynamic based on prevEffect being "p" or not
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
  }: ApplyTetheredEffect) {
    if (!audioContext) return;

    // immediately stop current note because we don't ever want to hear the pluck on
    // a tethered note
    note.source.stop(0);

    const source = audioContext.createBufferSource();

    setTimeout(() => {
      currentNoteArrayRef.current[stringIdx]?.stop();
      currentNoteArrayRef.current[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer as AudioBuffer;
    source.start(0, tetheredEffect === "p" ? 0.25 : 0.85);

    // TODO: really more than anything want to get rid of the little static "pop" right at the
    // very beginning of the sound, I don't know if it's maybe the original note being .stop()'d
    // above, or where it's coming from, but it is the biggest thing that makes this sound
    // "fake" to me

    const sourceGain = audioContext.createGain();
    sourceGain.gain.exponentialRampToValueAtTime(
      tetheredEffect === "p" ? 0.75 : 1.5,
      audioContext.currentTime + when + 0.15
    );
    source.connect(sourceGain);

    // immediately ramping from tetheredFret to currentFret with a duration defined by tetheredEffect
    source.detune.setValueAtTime((tetheredFret - currentFret) * 100, 0);

    // 1 feels too long, but fits the "structure" of how the tab is played better
    let durationOfTransition = (60 / bpm) * 0.15;
    if (tetheredEffect === "h" || tetheredEffect === "p") {
      durationOfTransition = 0; // hammer-ons and pull-offs should be instantaneous
    }

    source.detune.linearRampToValueAtTime(
      0.001, // smallest viable value
      audioContext.currentTime + when + durationOfTransition
    );

    // if there is a currentEffect, we need to apply it to the note after the last ramp is finished
    if (currentEffects) {
      if (currentEffects.includes("~")) {
        applyVibratoEffect({
          copiedNote: source, // will be increasing gain w/in this function to match level set above
          when: when + durationOfTransition,
          bpm,
        });
      } else if (currentEffects.includes("b")) {
        applyBendEffect({
          copiedNote: source, // will be increasing gain w/in this function to match level set above
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
  }

  function applyVibratoEffect({
    note,
    copiedNote,
    when,
    bpm,
  }: ApplyVibratoEffect) {
    if (!audioContext) return;

    // Create a modulation oscillator
    const vibratoOscillator = audioContext.createOscillator();
    vibratoOscillator.type = "sine";
    vibratoOscillator.frequency.value = calculateRelativeVibratoFrequency(bpm); // Speed of vibrato

    // Create a gain node to control the depth of the vibrato
    const vibratoDepth = audioContext.createGain();
    vibratoDepth.gain.value = 25; // Depth of vibrato in cents

    // Connect the modulation oscillator to the gain
    vibratoOscillator.connect(vibratoDepth);

    vibratoOscillator.start(audioContext.currentTime + when);

    if (note) {
      vibratoDepth.connect(note.source.detune);
      return note;
    } else if (copiedNote) {
      vibratoDepth.connect(copiedNote.detune);
      // increasing gain to match level set in applyTetheredEffect
      const copiedNoteGain = audioContext.createGain();
      copiedNoteGain.gain.value = 1.5; // TODO: prob needs to be dynamic based on prevEffect being "p" or not
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
    prevTetheredNote?: {
      note: number;
      effect: string;
    };
    slideToFret?: number;
  }

  function playNote({
    tuning,
    stringIdx,
    fret,
    bpm,
    when,
    effects,
    prevTetheredNote,
    slideToFret,
  }: PlayNote) {
    if (!audioContext) return;

    let duration = 3;
    let gain = 1;

    if (effects.includes(">")) {
      gain = 1.5;
    }

    if (slideToFret) {
      duration = 1;
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

    if (note && (slideToFret || prevTetheredNote || effects.length > 0)) {
      playNoteWithEffects({
        note: note as unknown as GainNode,
        stringIdx,
        fret,
        bpm,
        when,
        effects,
        prevTetheredNote,
        slideToFret,
      });
    }

    // this same process is done inside of applyTetheredEffect() with the copy
    // AudioBufferSourceNode that is made
    if (!prevTetheredNote) {
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

  function playNoteColumn(
    currColumn: string[],
    tuning: number[],
    capo: number,
    bpm: number,
    prevColumn?: string[],
    secondPrevColumn?: string[],
    nextColumn?: string[]
  ) {
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

      const allInlineEffects = /[hp\/\\\\~>.bx]/g;
      const tetherEffects = /^[hp\/\\\\]$/;

      for (let index = 1; index < 7; index++) {
        // 1-6 is actually starting with "high e" normally, so reverse it if you want
        // to start with "low e" aka downwards strum
        const stringIdx = currColumn[7]?.includes("v") ? 7 - index : index;

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
          currNote === "/" ||
          currNote === "\\" ||
          currNote === "h" ||
          currNote === "p"
        )
          continue;

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        let fret = 0;

        // pre-note arbitrary slide up
        if (currNote?.[0] === "/" && nextNote === "") {
          let baseFret = extractNumber(currNote);

          if (baseFret <= 2) {
            baseFret = 0;
          } else {
            baseFret -= 2;
          }

          fret = baseFret + capo;
        }
        // pre-note arbitrary slide down
        else if (currNote?.[0] === "\\" && nextNote === "") {
          let baseFret = extractNumber(currNote);

          if (baseFret >= 20) {
            baseFret = 22;
          } else {
            baseFret += 2;
          }

          fret = baseFret + capo;
        } else {
          fret = extractNumber(currNote!) + capo;
        }

        let prevNoteAndEffect = undefined;
        let slideToFret = undefined;

        // not 100% confident that completely barring unless [7] === "" is best
        // I think it was mainly for v/^ cases timing wise...
        // note, tetheredEffect, note extended syntax case
        if (
          secondPrevNote &&
          (prevNote === "/" ||
            prevNote === "\\" ||
            prevNote === "h" ||
            prevNote === "p")
        ) {
          prevNoteAndEffect = {
            note: extractNumber(secondPrevNote) + capo,
            effect: prevNote,
          };
        }

        // pre-note arbitrary slide up/down
        else if (currNote?.[0] === "/" || currNote?.[0] === "\\") {
          slideToFret = extractNumber(currNote);
        }

        // post-note arbitrary slide up
        else if (currNote?.at(-1) === "/" && nextNote === "") {
          let baseFret = extractNumber(currNote);

          if (baseFret >= 20) {
            baseFret = 22;
          } else {
            baseFret += 2;
          }

          slideToFret = baseFret + capo;
        }
        // post-note arbitrary slide down
        else if (currNote?.at(-1) === "\\" && nextNote === "") {
          let baseFret = extractNumber(currNote);

          if (baseFret <= 2) {
            baseFret = 0;
          } else {
            baseFret -= 2;
          }

          slideToFret = baseFret + capo;
        } else if (prevNote && prevNoteHadTetherEffect) {
          prevNoteAndEffect = {
            note: extractNumber(prevNote) + capo,
            effect: prevNote.at(-1)!,
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

        // as a note, I don't know if it messes anything up, but prob keep hp/\ out of effects array

        playNote({
          tuning,
          stringIdx: adjustedStringIdx,
          fret,
          bpm,
          // want raw index instead of adjusted index since we only care about
          // how "far" into the chord the note is, also want to start multiplier
          // based on first non-empty string to be as accurate as possible to how
          // it would sound if it was played on a real guitar.
          when:
            chordDelayMultiplier *
            Math.abs(indexOfFirstNonEmptyString - stringIdx),
          effects,
          prevTetheredNote: prevNoteAndEffect,
          slideToFret,
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

      const secondPrevColumn = compiledChords[chordIndex - 2];
      const prevColumn = compiledChords[chordIndex - 1];
      const column = compiledChords[chordIndex];
      const nextColumn = compiledChords[chordIndex + 1];

      if (column === undefined) continue;

      // alteredBpm = bpm for chord * (1 / noteLengthMultiplier)
      const alteredBpm = Number(column[8]) * (1 / Number(column[9]));

      await playNoteColumn(
        column,
        tuning,
        0,
        alteredBpm,
        prevColumn,
        secondPrevColumn,
        nextColumn
      );

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
    console.log("called playRecordedAudio");
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

    if (audioMetadata.playing || previewMetadata.playing || resetToStart) {
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

      const secondPrevColumn = compiledChords[chordIndex - 2];
      const prevColumn = compiledChords[chordIndex - 1];
      const column = compiledChords[chordIndex];
      const nextColumn = compiledChords[chordIndex + 1];

      if (column === undefined) continue;

      // alteredBpm = bpm for chord * (1 / noteLengthMultiplier) * playbackSpeedMultiplier
      const alteredBpm =
        Number(column[8]) * (1 / Number(column[9])) * playbackSpeed;

      if (chordIndex !== compiledChords.length - 1) {
        await playNoteColumn(
          column,
          tuning,
          capo ?? 0,
          alteredBpm,
          prevColumn,
          secondPrevColumn,
          nextColumn
        );
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
