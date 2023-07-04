import { useState, useEffect, useRef } from "react";
import Soundfont from "soundfont-player";
import { parse } from "react-guitar-tunings";
import type { SectionProgression } from "../stores/TabStore";
import type { ITabSection } from "~/components/Tab/Tab";

type InstrumentNames =
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean";

export default function useSound() {
  const [showingAudioControls, setShowingAudioControls] = useState(false);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const breakOnNextNote = useRef(false);

  useEffect(() => {
    const newAudioContext = new AudioContext();
    setAudioContext(newAudioContext);
    // return () => { not even entirely sure if this is necessary since it will only be unmounted when
    // leaving the whole site
    //   void audioContext.close();
    // };
  }, []);

  const [instrumentName, setInstrumentName] = useState<
    "acoustic_guitar_nylon" | "acoustic_guitar_steel" | "electric_guitar_clean"
  >("acoustic_guitar_steel");

  const currentNoteArrayRef = useRef<(Soundfont.Player | undefined)[]>([
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  ]);

  const [currentSectionProgressionIndex, setCurrentSectionProgressionIndex] =
    useState(0);
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [instruments, setInstruments] = useState<{
    [instrumentName in InstrumentNames]: Soundfont.Player;
  }>({}); // ignore for now or chatgpt for typeerror

  const [currentInstrument, setCurrentInstrument] =
    useState<Soundfont.Player | null>(null);

  useEffect(() => {
    const fetchInstrument = async () => {
      if (!audioContext) return;

      // Check if the instrument is already in cache
      if (instruments[instrumentName]) {
        setCurrentInstrument(instruments[instrumentName]);
        return;
      }

      setCurrentInstrument(null);

      // If not in cache, fetch it
      const guitarObj = await Soundfont.instrument(
        audioContext,
        instrumentName,
        {
          soundfont: "MusyngKite",
          format: "ogg",
        }
      );

      // Update the cache
      const updatedInstruments = {
        ...instruments,
        [instrumentName]: guitarObj,
      };
      setInstruments(updatedInstruments);

      // Set the current instrument
      setCurrentInstrument(guitarObj);
    };

    void fetchInstrument();
  }, [audioContext, instrumentName, instruments]);

  interface PlayNoteWithEffects {
    note: GainNode;
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    isPalmMuted: boolean;
    inlineEffect?: string;
  }

  function playNoteWithEffects({
    note,
    stringIdx,
    fret,
    bpm,
    when,
    inlineEffect,
    isPalmMuted,
  }: PlayNoteWithEffects) {
    if (!audioContext) return;

    // once you ahve all the effects then also pass through the audioContext to this function
    // and onto them so that these functions can be exported into a /utils/ file

    let noteWithEffectApplied = undefined;

    if (
      inlineEffect === "~" ||
      inlineEffect === "h" ||
      inlineEffect === "p" ||
      inlineEffect === "/" ||
      inlineEffect === "\\"
    ) {
      noteWithEffectApplied = applyTetheredEffect(
        note as unknown as GainNode,
        inlineEffect as "h" | "p" | "/" | "\\",
        when
      );
    }

    // when you get to bends: EADG get pitch lowered (bent towards the floor)
    // and BE get pitch raised (bent towards the ceiling) just due to standard convention.

    if (inlineEffect === "~") {
      // not 100% on this type conversion, be wary as it might cause weird side effects
      noteWithEffectApplied = applyVibratoEffect(
        note as unknown as GainNode,
        bpm
      );
    }

    if (inlineEffect === "x") {
      noteWithEffectApplied = applyDeadNoteEffect(
        note as unknown as GainNode,
        stringIdx,
        fret
      );
    }

    if (inlineEffect === "b") {
      noteWithEffectApplied = applyBendEffect(
        note as unknown as GainNode,
        stringIdx,
        when,
        bpm
      );
    }

    if (isPalmMuted) {
      noteWithEffectApplied = applyPalmMute(
        noteWithEffectApplied ?? (note as unknown as GainNode),
        inlineEffect
      );
    }

    if (noteWithEffectApplied) {
      noteWithEffectApplied.connect(audioContext.destination);
    }
  }

  // bend effect
  function applyBendEffect(
    note: GainNode,
    stringIdx: number,
    when: number,
    bpm: number
  ) {
    if (!audioContext) return;

    // Create a gain node to control the depth of the bend
    const modulatorGain = audioContext.createGain();
    modulatorGain.gain.value = 0.0006; // Depth of bend

    // Create a delay node
    const delay = audioContext.createDelay();
    delay.delayTime.value = 0;

    const delayGain = audioContext.createGain();
    delayGain.gain.value = 90; // brings up to almost regular gain

    // Determine the direction of the bend based on string index
    const bendDirection = stringIdx === 0 || stringIdx === 1 ? 1 : -1;

    // Initial delay time
    delay.delayTime.setValueAtTime(0, audioContext.currentTime);

    // Schedule the change in delay time to create a pitch bend effect
    delay.delayTime.linearRampToValueAtTime(
      bendDirection * 0.01 * modulatorGain.gain.value,
      audioContext.currentTime + when + 60 / bpm
    );

    // Connect the gain node to the delay time parameter of the delay node
    modulatorGain.connect(delay.delayTime);

    // Connect the input to the delay and connect the delay to the context destination
    note.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(modulatorGain);

    return delayGain;
  }

  function playSlapSound() {
    if (!audioContext) return;

    // TODO: will most likely need a way to
    // okay maybe go back to adding slap as a chord effect tbh... but play it inline with regular
    // note(s), don't even bother adjusting gain or whatever at start

    // Create an OscillatorNode to simulate the slap sound
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";

    // Adjust frequency based on the string index
    oscillator.frequency.value = 90;

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

    // Adjust gain based on string index for more volume on lower strings
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.25
    );

    // Create a BiquadFilterNode for a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 1200;

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
    gainNode.connect(audioContext.destination);

    // Start the oscillator and noise now
    oscillator.start(audioContext.currentTime);
    noise.start(audioContext.currentTime);

    // Stop the oscillator and noise shortly afterward to simulate a short, percussive sound
    oscillator.stop(audioContext.currentTime + 0.25);
    noise.stop(audioContext.currentTime + 0.25);

    // return gainNode;
  }

  function applyDeadNoteEffect(
    note: GainNode,
    stringIdx: number,
    fret: number
  ) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 400; // Lower this value to cut more high frequencies

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 200; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 25; // Amount of boost in dB
    bassBoost.Q.value = 50; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    gainNode.gain.value = 50; // Reduce gain to simulate the quieter sound of palm muting

    // Connect the note to the filter, and the filter to the gain node
    note.connect(lowPassFilter);
    lowPassFilter.connect(bassBoost);
    bassBoost.connect(gainNode);

    return gainNode;
  }

  function applyPalmMute(note: GainNode, inlineEffect?: string) {
    if (!audioContext) return;

    // Create a BiquadFilterNode to act as a low-pass filter
    const lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = "lowpass";
    lowPassFilter.frequency.value = 2000; // Lower this value to cut more high frequencies

    // Create a BiquadFilterNode to boost the bass frequencies
    const bassBoost = audioContext.createBiquadFilter();
    bassBoost.type = "peaking";
    bassBoost.frequency.value = 120; // Frequency to boost - around 120Hz is a typical bass frequency
    bassBoost.gain.value = 20; // Amount of boost in dB
    bassBoost.Q.value = 50; // Quality factor - lower values make the boost range broader

    // Create a GainNode to reduce volume
    const gainNode = audioContext.createGain();

    // if inlineEffect has already had it's gain boosted to it's normal level,
    // then only reduce it by a tiny amount. Otherwise we need to increase the gain since
    // we are setting the original note to a gain of 0.01
    let gainValue = 0.85;

    if (inlineEffect === undefined) {
      gainValue = 75;
    }
    if (inlineEffect === ">") {
      gainValue = 85;
    } else if (inlineEffect === ".") {
      gainValue = 80;
    }

    gainNode.gain.value = gainValue; // Reduce gain to simulate the quieter sound of palm muting

    // Connect the note to the filter, and the filter to the gain node
    note.connect(lowPassFilter);
    lowPassFilter.connect(bassBoost);
    bassBoost.connect(gainNode);

    return gainNode;
  }

  function applyTetheredEffect(
    note: GainNode,
    effect: "h" | "p" | "/" | "\\",
    when: number
  ) {
    if (!audioContext) return;
    // "accurate" slides btw will most likely require notes[] ref to fade them out as you are fading the next note in

    const delay = audioContext.createDelay();
    delay.delayTime.value = 0;

    const delayGain = audioContext.createGain();
    delayGain.gain.setValueAtTime(0.0001, 0);

    // play around with these numbers, still not accurate slides so don't worry too much about those
    let delayMultiplierBasedOnEffect = 1.35;

    if (effect === "h") {
      delayMultiplierBasedOnEffect = 1.15;
    } else if (effect === "p") {
      delayMultiplierBasedOnEffect = 1.1;
    }

    // hmm double check that pull offs are happening on the right note, felt like the tiny
    // "pluck" was more on the base note rather than the tethered note

    delayGain.gain.exponentialRampToValueAtTime(
      100,
      audioContext.currentTime + when * delayMultiplierBasedOnEffect
    );

    note.connect(delay);
    delay.connect(delayGain);

    return delayGain;
  }

  function applyVibratoEffect(
    input: GainNode,
    bpm: number // maybe should be noteIdx (like stringIdx + fret to get total "value")
  ) {
    if (!audioContext) return;

    // if anything, maybe have the modulatorGain.gain.value = 0.0006; be slightly higher for lower notes
    // and slightly lower for higher notes, not sure exactly why that is but it is noticible
    // ask chatgpt why this pheonmenon might be

    // Create a modulation oscillator
    const modulator = audioContext.createOscillator();
    modulator.type = "sine";
    modulator.frequency.value = 3; // Speed of vibrato

    // find out clear answer as to why you are doing the below method with a modulatorGain
    // rather than modifying the builtin modulator.detune

    // Create a gain node to control the depth of the vibrato
    const modulatorGain = audioContext.createGain();
    modulatorGain.gain.value = 0.0006; // Depth of vibrato

    // Create a delay node
    const delay = audioContext.createDelay();
    delay.delayTime.value = 0;

    const delayGain = audioContext.createGain();
    delayGain.gain.value = 90; // brings up to almost regular gain

    // Connect the modulation oscillator to the gain
    modulator.connect(modulatorGain);

    // Connect the gain node to the delay time parameter of the delay node
    modulatorGain.connect(delay.delayTime);

    // Connect the input to the delay and connect the delay to the context destination
    input.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(modulatorGain);

    // Start the modulation oscillator
    modulator.start();

    return delayGain;
  }

  interface PlayNote {
    tuning: number[];
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    effects: string[];
  }

  function playNote({ tuning, stringIdx, fret, bpm, when, effects }: PlayNote) {
    if (!audioContext) return;

    let duration = 2;
    let gain = 1;

    const isPalmMuted = effects.includes("PM");
    const inlineEffect = effects.at(-1) !== "PM" ? effects.at(-1) : undefined;

    // maybe play around with the cents value (changing the note number by some amount of cents to get more accurate sound?)
    // it's already pretty good tbf

    if (inlineEffect === ">") {
      gain = 1.75;
      duration = 2.25;
    } else if (inlineEffect === ".") {
      gain = 1.15;
      duration = 0.25;
    }
    // all other effects require us to basically hijack the note by almost muting it
    // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
    else if (inlineEffect !== undefined || isPalmMuted) {
      gain = 0.01;
    }

    if (isPalmMuted) {
      duration = 0.5;
    }

    if (inlineEffect === "x") {
      duration = 0.35; // play around with this value
    }

    // looks like the actual instrument() can take in a gain value, but not sure if it
    // would update while playing (defaults to 1 btw);

    const note = currentInstrument?.play(
      `${tuning[stringIdx]! + fret}`,
      audioContext.currentTime + when,
      {
        duration,
        gain,
      }
    );

    if (note && (inlineEffect || isPalmMuted)) {
      playNoteWithEffects({
        note: note as unknown as GainNode,
        stringIdx,
        fret,
        bpm,
        when,
        inlineEffect,
        isPalmMuted,
      });
    }

    // tethered meaning effect is relevant to 2 notes
    const hasATetheredEffect = effects?.some((str) =>
      ["h", "p", "/", "\\"].some((char) => str.includes(char))
    );

    setTimeout(() => {
      if (currentNoteArrayRef.current[stringIdx]) {
        currentNoteArrayRef.current[stringIdx]?.stop();
      }

      currentNoteArrayRef.current[stringIdx] = note;

      // stops previous note on same string if it exists when this note is played
      // since we have to do trickery with hp/\ and start them a bit earlier, we don't
      // directly want to use the "when" that we get from params, instead just do
      // default (bpm / 60) * 1000 to get the time in seconds that the note should start
    }, (hasATetheredEffect ? 60 / bpm : when) * 1000);
  }

  function columnHasNoNotes(column: string[]) {
    for (let i = 1; i < 7; i++) {
      if (column[i] !== "") return false;
    }

    return true;
  }

  function removeMeasureLinesFromTabData(tabData: ITabSection[]) {
    const newTabData: ITabSection[] = [];

    for (const section of tabData) {
      const newSection: ITabSection = {
        ...section,
        data: [],
      };
      for (const column of section.data) {
        if (column[8] !== "measureLine") {
          // don't need the "note" value of [8] since it's implied
          // although is useful for the chord strumming sections! Think about it
          newSection.data.push(column.slice(0, 8));
        }
      }
      newTabData.push(newSection);
    }

    return newTabData;
  }

  function generateDefaultSectionProgression(tabData: ITabSection[]) {
    const sectionProgression: SectionProgression[] = [];

    for (let i = 0; i < tabData.length; i++) {
      sectionProgression.push({
        id: `${i}`,
        title: tabData[i]?.title ?? "",
        repetitions: 1,
      });
    }

    return sectionProgression;
  }

  function calculateRelativeChordDelayMultiplier(bpm: number) {
    // Ensure that the input number is positive
    const distance = Math.abs(bpm - 400);

    // Calculate the scale factor between 0 and 1.
    // When bpm: number is 400, scaleFactor will be 0.
    // When bpm: number is 0, scaleFactor will be 1.
    const scaleFactor = Math.min(distance / 400, 1);

    // Scale the number between 0.01 (when scaleFactor is 0)
    // and 0.05 (when scaleFactor is 1).
    return 0.01 + scaleFactor * (0.05 - 0.01);
  }

  function playNoteColumn(
    currColumn: string[],
    tuning: number[],
    capo: number,
    bpm: number,
    prevColumn?: string[],
    nextColumn?: string[]
  ) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, (60 / bpm) * 1000);

      if (columnHasNoNotes(currColumn)) {
        if (currColumn[7] === "s") {
          playSlapSound();
          // TODO: technically I think the sound will bleed into the next note at high bpms
        }
        return;
      }

      let chordDelayMultiplier = 0;

      if (currColumn[7] === "v" || currColumn[7] === "^") {
        chordDelayMultiplier = calculateRelativeChordDelayMultiplier(bpm);
      }

      const allInlineEffects = /^[hp\/\\\\~>.bx]$/;
      const tetherEffects = /^[hp\/\\\\]$/;

      for (let index = 1; index < 7; index++) {
        // 1-6 is actually starting with "high e" normally, so reverse it if you want
        // to start with "low e" aka downwards strum
        const stringIdx = currColumn[7] === "v" ? 7 - index : index;

        const prevNote = prevColumn?.[stringIdx];
        const currNote = currColumn[stringIdx];

        const prevNoteHadTetherEffect =
          prevNote && tetherEffects.test(prevNote.at(-1)!);
        const currNoteHasTetherEffect =
          currNote && tetherEffects.test(currNote.at(-1)!);

        const currNoteEffect =
          currNote && allInlineEffects.test(currNote.at(-1)!)
            ? currNote.at(-1)!
            : undefined;

        if (
          currColumn[stringIdx] === "" ||
          (prevNoteHadTetherEffect && !currNoteHasTetherEffect) // skipping tethered note that was played last iteration
        )
          continue;

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret =
          currColumn[stringIdx] === "x"
            ? 0
            : parseInt(currColumn[stringIdx]!) + capo;

        if (!prevNoteHadTetherEffect) {
          playNote({
            tuning,
            stringIdx: adjustedStringIdx,
            fret,
            bpm,
            // want raw index instead of adjusted index since we only care about how far into the chord it is
            when: chordDelayMultiplier * (index - 1),
            effects: [
              ...(currColumn[0] !== "" ? ["PM"] : []),
              ...(currNoteEffect && !currNoteHasTetherEffect
                ? [currNoteEffect]
                : []),
            ],
          });
        }

        // kinda hacky: need to play the paired note for hp/\ effects since you can't schedule a sound
        // to be played in the past, and we have to cut off the first part to make it sound as close as
        // possible to the actual effect.
        if (
          nextColumn &&
          currNoteEffect &&
          currNoteHasTetherEffect &&
          (nextColumn[stringIdx] !== undefined || nextColumn[stringIdx] !== "") // there is a tethered note to play for this effect
        ) {
          const pairedNote = parseInt(nextColumn[stringIdx]!);
          const pairedFret = pairedNote + capo;

          playNote({
            tuning,
            stringIdx: adjustedStringIdx,
            fret: pairedFret,
            bpm,
            // want raw index instead of adjusted index since we only care about how far into the chord it is
            when: chordDelayMultiplier * (index - 1) + (60 / bpm) * 0.85,
            effects:
              nextColumn[0] !== "" ? ["PM", currNoteEffect] : [currNoteEffect],
          });
        }
      }
    });
  }

  async function playTab(
    rawTabData: ITabSection[], // obv change to proper type
    rawSectionProgression: SectionProgression[],
    tuningNotes: string,
    bpm: number,
    capo?: number
  ) {
    await audioContext?.resume();

    const tabData = removeMeasureLinesFromTabData(rawTabData);
    const sectionProgression =
      rawSectionProgression.length > 0
        ? rawSectionProgression
        : generateDefaultSectionProgression(tabData);
    const tuning = parse(tuningNotes);
    // would ininitialize with the currentSection and currentColumn store values in below loops
    // to start at the right place in the tab

    // need function that will take in a sectionIndex + sectionProgression and will return the
    // sectionProgression index to start at and also the repeatIndex to start at
    // const [sectionIdx, repeatIdx] = getStartingSectionAndRepeatIndexes(sectionProgression, targetSectionIdx);

    const repeatIndex = 0; // just for now

    setPlaying(true);

    // might need to ++ section/column idx at end of respective loops to be correct, just gotta test it out

    for (
      // let sectionIdx = currentSectionProgressionIndex; use this once you have logic to reset all values to 0
      // after finishing a tab playthrough
      let sectionIdx = 0;
      sectionIdx < sectionProgression.length;
      sectionIdx++
    ) {
      setCurrentSectionProgressionIndex(sectionIdx); //  + 1?

      const repetitions = sectionProgression[sectionIdx]?.repetitions || 1;
      for (let repeatIdx = repeatIndex; repeatIdx < repetitions; repeatIdx++) {
        const sectionColumnLength = tabData[sectionIdx]?.data.length || 1;

        for (
          // let columnIndex = currentColumnIndex; use this once you have logic to reset all values to 0
          // after finishing a tab playthrough
          let columnIndex = 0;
          columnIndex < sectionColumnLength;
          columnIndex++
        ) {
          setCurrentColumnIndex(columnIndex); // + 1?

          if (breakOnNextNote.current) {
            breakOnNextNote.current = false;
            break;
          }

          const prevColumn = tabData[sectionIdx]?.data[columnIndex - 1];
          const nextColumn = tabData[sectionIdx]?.data[columnIndex + 1];
          const column = tabData[sectionIdx]?.data[columnIndex];
          if (column === undefined) continue;

          await playNoteColumn(
            column,
            tuning,
            capo ?? 0,
            bpm,
            prevColumn,
            nextColumn
          );
        }
      }
    }

    setTimeout(() => {
      setPlaying(false);
      currentInstrument?.stop();
    }, 1500);
  }

  async function pauseTab() {
    setPlaying(false);
    currentInstrument?.stop();
    breakOnNextNote.current = true;

    await audioContext?.suspend();
  }

  // function playChord()
  // could actually probably use this for regular strumming a chord and for the "chord preview" sound!
  // meaning you would have to directly export this function to use in the chord preview component

  return {
    showingAudioControls,
    setShowingAudioControls,
    instrumentName,
    setInstrumentName,
    currentSectionProgressionIndex,
    setCurrentSectionProgressionIndex,
    currentColumnIndex,
    setCurrentColumnIndex,
    playTab,
    pauseTab,
    playing,
    loadingInstrument: !currentInstrument,
  };
}
