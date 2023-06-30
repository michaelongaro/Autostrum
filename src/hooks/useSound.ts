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

  interface CurrentNoteArrayRef {
    note: Soundfont.Player | undefined;
    vibratoEffect: {
      disconnect: () => void;
    } | null;
    vibratoTimeout: NodeJS.Timeout | null;
  }

  // how to specify length of array in typescript
  const currentNoteArrayRef = useRef<CurrentNoteArrayRef[]>([
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
    {
      note: undefined,
      vibratoEffect: null,
      vibratoTimeout: null,
    },
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

  const createVibratoEffect = (
    context: AudioContext,
    input: GainNode,
    bpm: number
  ) => {
    // not 100% convinced that bpm really plays a super big factor in how we want to configure
    // the vibrato, not extremely convincing

    // if anything, maybe have the modulatorGain.gain.value = 0.0006; be slightly higher for lower notes
    // and slightly lower for higher notes, not sure exactly why that is but it is noticible
    // ask chatgpt why this pheonmenon might be

    // Create a modulation oscillator
    const modulator = context.createOscillator();
    modulator.type = "sine";
    modulator.frequency.value = 3; // Speed of vibrato

    // Create a gain node to control the depth of the vibrato
    const modulatorGain = context.createGain();
    modulatorGain.gain.value = 0.0006; // Depth of vibrato

    // Create a delay node
    const delay = context.createDelay();
    delay.delayTime.value = 0;

    const delayGain = context.createGain();
    delayGain.gain.value = 90; // brings up to almost regular gain

    // Connect the modulation oscillator to the gain
    modulator.connect(modulatorGain);

    // Connect the gain node to the delay time parameter of the delay node
    modulatorGain.connect(delay.delayTime);

    // Connect the input to the delay and connect the delay to the context destination
    input.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(modulatorGain);
    delayGain.connect(context.destination);

    // Start the modulation oscillator
    modulator.start();

    const disconnect = () => {
      // Disconnect the vibrato effect
      modulatorGain.disconnect();
      delay.disconnect();
      modulator.stop();
    };

    return { disconnect };
  };

  interface PlayNote {
    tuning: number[];
    stringIdx: number;
    fret: number;
    bpm: number;
    when: number;
    inlineModifier?: boolean;
    effects?: string[];
  }

  function playNote({
    tuning,
    stringIdx,
    fret,
    bpm,
    when,
    inlineModifier,
    effects,
  }: PlayNote) {
    if (!audioContext) return;

    let duration = 2;
    let gain = 1;

    // maybe play around with the cents value (changing the note number by some amount of cents to get more accurate sound?)
    // it's already pretty good tbf

    if (
      effects?.includes("~") ||
      effects?.includes("h") ||
      effects?.includes("p") ||
      effects?.includes("/") ||
      effects?.includes("\\")
    ) {
      gain = 0.01;
    }

    if (effects?.includes(">")) {
      gain = 1.5;
      duration = 2.25;
    }

    if (effects?.includes(".")) {
      gain = 1.15;
      duration = 0.5;
    }

    // looks like the actual instrument() can take in a gain value, but not sure if it
    // would update while playing (defaults to 1 btw);

    const player = currentInstrument?.play(
      `${tuning[stringIdx]! + fret}`,
      audioContext.currentTime + when,
      {
        duration,
        gain,
      }
    );

    // immediately set volume to zero, after tiny delay bring gain back to normal.
    if (player && inlineModifier) {
      const delay = audioContext.createDelay();
      delay.delayTime.value = 0;

      const delayGain = audioContext.createGain();
      delayGain.gain.setValueAtTime(0.0001, 0);

      delayGain.gain.exponentialRampToValueAtTime(
        100,
        audioContext.currentTime +
          when * (effects?.includes("h") || effects?.includes("p") ? 1.25 : 1.5)
      );

      player.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(audioContext.destination);
    }
    // "accurate" slides btw will most likely require notes[] ref to fade them out as you are fading the next note in

    // vibrato handling
    if (effects?.includes("~")) {
      if (currentNoteArrayRef.current[stringIdx]?.vibratoTimeout) {
        currentNoteArrayRef.current[stringIdx]?.vibratoEffect?.disconnect(); // will be overwriting below, no need to set to null
        clearTimeout(currentNoteArrayRef.current[stringIdx]!.vibratoTimeout!);
      }

      player?.connect(audioContext.destination);

      // not 100% on this type conversion, be wary as it might cause weird side effects
      const vibratoEffect = createVibratoEffect(
        audioContext,
        player as unknown as GainNode,
        bpm
      );

      currentNoteArrayRef.current[stringIdx]!.vibratoEffect = vibratoEffect;

      currentNoteArrayRef.current[stringIdx]!.vibratoTimeout = setTimeout(
        () => {
          currentNoteArrayRef.current[stringIdx]?.vibratoEffect?.disconnect();
        },
        audioContext.currentTime + when + duration * 1000
      );
    }

    setTimeout(() => {
      if (currentNoteArrayRef.current[stringIdx]) {
        currentNoteArrayRef.current[stringIdx]?.note?.stop();
      }

      currentNoteArrayRef.current[stringIdx]!.note = player;
    }, audioContext.currentTime + when * (inlineModifier ? 1000 : 1));
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
          newSection.data.push(column.slice(0, 8)); // don't need the "note" value of [8] since it's implied
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

  function playNoteColumn(
    rawColumn: string[],
    rawTuning: number[],
    capo: number,
    bpm: number,
    prevColumn?: string[],
    nextColumn?: string[]
  ) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, (60 / bpm) * 1000);

      if (columnHasNoNotes(rawColumn)) return;

      const column = [...rawColumn];
      const tuning = [...rawTuning];
      let chordDelayMultiplier = 0;
      const effects: string[] = [];

      // get all chord effects
      if (column[7]?.includes("v") || column[7]?.includes("^")) {
        const relativeDelayMultiplier = (bpm / 400) * 0.05;
        chordDelayMultiplier =
          relativeDelayMultiplier < 0.01 ? 0.01 : relativeDelayMultiplier;
      }

      const chordEffects = column[7];
      if (chordEffects) {
        chordEffects
          .split("")
          .filter((effect) => effect !== "v" && effect !== "^")
          .map((effect) => {
            effects.push(effect);
          });
      }

      // not intuitive but 1-6 is actually starting with "high e" normally, so reverse it if you want
      // to start with "low e" aka downwards strum
      if (column[7]?.includes("v")) {
        column.reverse();
        tuning.reverse();
      }

      for (let stringIdx = 1; stringIdx < 7; stringIdx++) {
        // idk actually prob handle playing dead notes w/ an effect later
        if (column[stringIdx] === "") continue;

        let prevColumnEffect = "";
        let currInlineEffect = "";
        let nextColumnEffect = ""; // neeeeeed better names for these

        // TODO: chatGPT to simplify and reduce redundancy

        const prevColEffect = prevColumn?.[stringIdx]?.at(-1);
        const currColEffect = column[stringIdx]?.at(-1);
        const nextColEffect = nextColumn?.[stringIdx]?.at(-1);

        if (prevColEffect && /^[hp\/\\\\~]$/.test(prevColEffect))
          prevColumnEffect = prevColEffect;
        if (currColEffect && /^[hp\/\\\\~]$/.test(currColEffect))
          // yeah I know naming still sucks
          nextColumnEffect = currColEffect;
        if (currColEffect === "~") currInlineEffect = "~";

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret = parseInt(column[stringIdx]!) + capo;

        if (!prevColumnEffect || prevColumnEffect === "~") {
          // want to not include hp/\, only ~

          playNote({
            tuning,
            stringIdx: adjustedStringIdx,
            fret,
            bpm,
            when: chordDelayMultiplier * adjustedStringIdx,
            effects: [currInlineEffect, ...effects],
          });
        }

        // kinda hacky: need to play the paired note for hp/\ since the earliest these
        // can be played is "instantly" on regular time it would be played, and we have to cut off the
        // first part to make it sound as close as possible to the actual effect.
        if (
          nextColumnEffect &&
          currInlineEffect !== "~" &&
          nextColumn?.[stringIdx] !== undefined
        ) {
          const pairedNote = parseInt(nextColumn[stringIdx]!);
          const pairedFret = pairedNote + capo;

          playNote({
            tuning,
            stringIdx: adjustedStringIdx,
            fret: pairedFret,
            bpm,
            when: chordDelayMultiplier * adjustedStringIdx + (60 / bpm) * 0.75, // why why why is it being played so early
            inlineModifier: true,
            effects: [nextColumnEffect, ...effects],
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
