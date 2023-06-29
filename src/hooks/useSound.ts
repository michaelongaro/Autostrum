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
  // chatgpt vibrato effect snippet

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
    [
      Soundfont.Player | undefined,
      Soundfont.Player | undefined,
      Soundfont.Player | undefined,
      Soundfont.Player | undefined,
      Soundfont.Player | undefined,
      Soundfont.Player | undefined
    ]
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

  interface PlayNote {
    tuning: number[];
    stringIdx: number;
    fret: number;
    when: number;
    effects?: string[];
  }

  function playNote({ tuning, stringIdx, fret, when, effects }: PlayNote) {
    if (!audioContext) return;

    // attack: increases from zero to a peak value.
    // decay: decreases from the peak to the sustain level.
    // sustain: remains at the sustain level.
    // release: falls from the sustain level to zero.

    // Defaults:
    //   gain: 1,
    //   attack: 0.01,
    //   decay: 0.1,
    //   sustain: 0.9,
    //   release: 0.3,

    // looks like the actual instrument() can take in a gain value, but not sure if it
    // would update while playing (defaults to 1 btw);

    // duration does in fact just cut off the note after the delay, instead of playing full note
    // in specified time frame which is good.

    // > means gain to 1.5 and maybe duration up a tiny bit?
    // . means duration to 0.5 or 0.25 maybe gain 1.15
    //

    const player = currentInstrument?.play(
      `${tuning[stringIdx]! + fret}`,
      audioContext.currentTime + when,
      {
        duration: 2,
        gain: 1,

        // attack: 0.15, // seems a little off to change attack to be slower since we actually
        // want no delay, just like starting from the decay (if hp or sustain for /\)
      }
    );

    setTimeout(() => {
      if (currentNoteArrayRef.current[stringIdx]) {
        currentNoteArrayRef.current[stringIdx]?.stop();
      }

      currentNoteArrayRef.current[stringIdx] = player;
    }, audioContext.currentTime + when);
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
    prevColumn?: string[]
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

        const inlineEffects: string[] = [];

        // get previous column effect if available
        if (prevColumn) {
          const prevColumnEffect = prevColumn[stringIdx]?.at(-1);
          if (prevColumnEffect && /^[hp\/\\\\~]$/.test(prevColumnEffect))
            inlineEffects.push(prevColumnEffect);
        }
        if (column[stringIdx]?.at(-1) === "~") inlineEffects.push("~");

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret = parseInt(column[stringIdx]!) + capo;

        playNote({
          tuning,
          stringIdx: adjustedStringIdx,
          fret,
          when: chordDelayMultiplier * adjustedStringIdx,
          effects: [...inlineEffects, ...effects],
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
