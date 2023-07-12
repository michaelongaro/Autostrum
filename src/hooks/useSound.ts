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

  const currentNoteArrayRef = useRef<
    (Soundfont.Player | AudioBufferSourceNode | undefined)[]
  >([undefined, undefined, undefined, undefined, undefined, undefined]);

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
    prevTetheredNote?: {
      note: number;
      effect: string;
    };
  }

  function playNoteWithEffects({
    note,
    stringIdx,
    fret,
    bpm,
    when,
    isPalmMuted,
    inlineEffect,
    prevTetheredNote,
  }: PlayNoteWithEffects) {
    if (!audioContext) return;

    // once you ahve all the effects then also pass through the audioContext to this function
    // and onto them so that these functions can be exported into a /utils/ file

    let noteWithEffectApplied = undefined;

    if (prevTetheredNote) {
      noteWithEffectApplied = applyTetheredEffect({
        note,
        currentEffect: inlineEffect,
        currentFret: fret,
        tetheredEffect: prevTetheredNote.effect as "h" | "p" | "/" | "\\",
        tetheredFret: prevTetheredNote.note,
        stringIdx,
        bpm,
        when,
      });
    } else {
      // we have to reroute connect()'ing the note to these effects when there is a tetheredEffect
      // since we have to do the hacky "copy" of the note within the applyTetheredEffect function

      if (inlineEffect === "~") {
        noteWithEffectApplied = applyVibratoEffect({
          when: 0,
          note,
          bpm,
        });
      } else if (inlineEffect === "b") {
        noteWithEffectApplied = applyBendEffect({
          note,
          stringIdx,
          when,
          bpm,
        });
      } else if (inlineEffect === "x") {
        noteWithEffectApplied = applyDeadNoteEffect(note, stringIdx, fret);
      }
    }

    if (isPalmMuted) {
      noteWithEffectApplied = applyPalmMute(
        noteWithEffectApplied ?? note,
        inlineEffect
      );
    }

    if (noteWithEffectApplied) {
      noteWithEffectApplied.connect(audioContext.destination);
    }
  }

  interface ApplyBendEffect {
    note?: GainNode;
    copiedNote?: AudioBufferSourceNode;
    stringIdx: number;
    when: number;
    bpm: number;
  }

  function applyBendEffect({
    note,
    copiedNote,
    stringIdx,
    when,
    bpm,
  }: ApplyBendEffect) {
    if (!audioContext) return;

    if (note) {
      note.source.detune.linearRampToValueAtTime(
        stringIdx > 1 ? 100 : -100,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      return note;
    } else if (copiedNote) {
      copiedNote.detune.linearRampToValueAtTime(
        stringIdx > 1 ? 100 : -100,
        audioContext.currentTime + when + (60 / bpm) * 0.5 // maybe * 0.5 or something
      );
      // increasing gain to match level set in applyTetheredEffect=
      const copiedNoteGain = audioContext.createGain();
      copiedNoteGain.gain.value = 1.5;
      copiedNote.connect(copiedNoteGain);
      return copiedNoteGain;
    }
  }

  function playSlapSound(accented: boolean) {
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

    // TODO: Adjust gain based on string index for more volume on lower strings
    gainNode.gain.setValueAtTime(
      accented ? 0.6 : 0.4,
      audioContext.currentTime
    );
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

  function applyPalmMute(
    note: GainNode | AudioBufferSourceNode,
    inlineEffect?: string
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
    let gainValue = 0.75;

    if (inlineEffect === ">") {
      gainValue = 0.85;
    } else if (inlineEffect === ".") {
      gainValue = 0.8;
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
    currentEffect?: string;
    tetheredEffect: "h" | "p" | "/" | "\\";
    tetheredFret: number;
    stringIdx: number;
    bpm: number;
    when: number;
  }

  function applyTetheredEffect({
    note,
    currentFret,
    currentEffect,
    tetheredEffect,
    tetheredFret,
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
      if (currentNoteArrayRef.current[stringIdx]) {
        currentNoteArrayRef.current[stringIdx]?.stop();
      }

      currentNoteArrayRef.current[stringIdx] = source;
    }, when * 1000);

    source.buffer = note.source.buffer;
    source.start(0, 0.75, 2); // maybe can go closer to 0.5s to get rid of the pluck sound

    const sourceGain = audioContext.createGain();
    sourceGain.gain.exponentialRampToValueAtTime(
      1.5, // tangent: but it really feels like to me that the actual sample files are *not* all the same
      // volume. But it is honestly a bit random so I'm not sure how we would approach "fixing" it.
      audioContext.currentTime + when + 0.05 // for whatever reason was very noticible if gain was set immediately
    );
    source.connect(sourceGain);

    // immediately ramping from tetheredFret to currentFret with a duration defined by tetheredEffect
    source.detune.setValueAtTime((tetheredFret - currentFret) * 100, 0);

    let durationOfTransition = (60 / bpm) * 0.1; // was 0.2
    if (tetheredEffect === "h" || tetheredEffect === "p") {
      durationOfTransition = (60 / bpm) * 0.025; // 0.05
    }

    source.detune.linearRampToValueAtTime(
      0.001, // doesn't like it if it is exactly 0
      audioContext.currentTime + when + durationOfTransition // don't think we need the (60 / bpm) here
    );

    // if there is a currentEffect, we need to apply it to the note after the last ramp is finished
    if (currentEffect) {
      if (currentEffect === "~") {
        applyVibratoEffect({
          copiedNote: source, // will be increasing gain w/in this function to match level set above
          when: when + durationOfTransition,
          bpm,
        });
      } else if (currentEffect === "b") {
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

    // maybe still have dynamic gain based on fret/ (stringIdx + fret)/ or even actually just the midi number
    // if it still sounds uneven

    // Create a modulation oscillator
    const vibratoOscillator = audioContext.createOscillator();
    vibratoOscillator.type = "sine";
    vibratoOscillator.frequency.value = calculateRelativeVibratoFrequency(bpm); // Speed of vibrato

    // Create a gain node to control the depth of the vibrato
    const vibratoDepth = audioContext.createGain();
    vibratoDepth.gain.value = 40; // Depth of vibrato in cents

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
      copiedNoteGain.gain.value = 1.5;
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
  }

  function playNote({
    tuning,
    stringIdx,
    fret,
    bpm,
    when,
    effects,
    prevTetheredNote,
  }: PlayNote) {
    if (!audioContext) return;

    let duration = 2;
    let gain = 1;

    const isPalmMuted = effects.includes("PM");
    const inlineEffect = effects.at(-1) !== "PM" ? effects.at(-1) : undefined;

    if (inlineEffect === ">") {
      gain = 1.75;
      duration = 2.25;
    } else if (inlineEffect === ".") {
      gain = 1.15;
      duration = 0.25;
    }
    // dead note and palm mute effects require us to basically hijack the note by almost muting it
    // and then creating a copy of it with a delay node, and adjusting the volume/effect from there
    else if (inlineEffect === "x") {
      // pretty sure leaving PM out of this is fine because it is at the end
      // of the filter connect chain so every note before should have it's gain to w/e value it is supposed
      // to be at already coming into applyPalmMute()
      gain = 0.01;
    }

    if (isPalmMuted) {
      duration = 0.45;
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

    if (note && (prevTetheredNote || inlineEffect || isPalmMuted)) {
      playNoteWithEffects({
        note: note as unknown as GainNode,
        stringIdx,
        fret,
        bpm,
        when,
        inlineEffect,
        isPalmMuted,
        prevTetheredNote,
      });
    }

    // will do this same process inside of applyTetheredEffect() with the copy AudioBufferSourceNode
    // that is made
    if (!prevTetheredNote) {
      setTimeout(() => {
        if (currentNoteArrayRef.current[stringIdx]) {
          currentNoteArrayRef.current[stringIdx]?.stop();
        }

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

  function calculateRelativeVibratoFrequency(bpm: number) {
    // Ensure that the input number is positive
    const distance = Math.abs(bpm - 400);

    // Calculate the scale factor between 0 and 1.
    // When bpm: number is 400, scaleFactor will be 0.
    // When bpm: number is 0, scaleFactor will be 1.
    const scaleFactor = Math.min(distance / 400, 1);

    // Scale the number between 4 (when scaleFactor is 0)
    // and 6 (when scaleFactor is 1).
    return 4 + scaleFactor * (6 - 4);
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
    prevColumn?: string[]
  ) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, (60 / bpm) * 1000);

      // as of right now I am barring ">" to be added to the column effects. It does make
      // some sense to allow it in there with "v/^/s" to match the ux of the strumming
      // pattern editor but I don't think it is a priority right now.

      // thinking it's better to group "s" in main if statement here
      // because I don't think you want to be super aggresive on deleting the prev
      // notes if they exist in column ux wise if someone were to add an "s" to [7]
      // while editing
      if (columnHasNoNotes(currColumn) || currColumn[7] === "s") {
        if (currColumn[7] === "s") {
          playSlapSound(currColumn[7].includes(">"));
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

        if (currColumn[stringIdx] === "") continue;

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret =
          currColumn[stringIdx] === "x"
            ? 0
            : parseInt(currColumn[stringIdx]!) + capo;

        const prevNoteAndEffect =
          currColumn[7] === "" && prevColumn && prevNoteHadTetherEffect
            ? {
                note: parseInt(prevColumn[stringIdx]!) + capo,
                effect: prevNote.at(-1)!,
              }
            : undefined;

        playNote({
          tuning,
          stringIdx: adjustedStringIdx,
          fret,
          bpm,
          // want raw index instead of adjusted index since we only care about
          // how "far" into the chord the note is
          when: chordDelayMultiplier * (index - 1),
          effects: [
            ...(currColumn[0] !== "" ? ["PM"] : []),
            ...(currNoteEffect && !currNoteHasTetherEffect
              ? [currNoteEffect]
              : []),
          ],
          prevTetheredNote: prevNoteAndEffect,
        });
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
          const column = tabData[sectionIdx]?.data[columnIndex];
          if (column === undefined) continue;

          await playNoteColumn(column, tuning, capo ?? 0, bpm, prevColumn);
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
