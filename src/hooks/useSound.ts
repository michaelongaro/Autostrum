import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

  // const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

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

  function playNote(
    tuning: number[],
    stringIdx: number,
    fret: number,
    when = 0
  ) {
    if (!audioContext) return;

    void currentInstrument?.play(
      `${tuning[stringIdx]! + fret}`,
      audioContext.currentTime + when,
      {
        duration: 2,
        gain: 4,
      }
    );
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
          newSection.data.push(column);
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
    column: string[],
    tuning: number[],
    capo: number,
    bpm: number
  ) {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, (60 / bpm) * 1000);

      for (let stringIdx = 1; stringIdx < 7; stringIdx++) {
        // idk actually prob handle playing dead notes w/ an effect later
        if (column[stringIdx] === "" || column[stringIdx] === "x") continue;

        const adjustedStringIdx = stringIdx - 1; // adjusting for 0-indexing

        const fret = parseInt(column[stringIdx]!) + capo;

        // no effects or anything here yet, just playing the note
        playNote(tuning, adjustedStringIdx, fret, 0);
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

          const column = tabData[sectionIdx]?.data[columnIndex];
          if (
            column === undefined ||
            column[8] === "inlineEffect" ||
            columnHasNoNotes(column)
          )
            continue;

          await playNoteColumn(column, tuning, capo ?? 0, bpm);
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

  function strum(tuning: number[], up: boolean, when: number, capo?: number) {
    // tuning.forEach((_, i) =>
    //   playNote(!up ? tuning.length - i - 1 : i, 0.05 * i + when, capo ?? 0)
    // );
  }

  return {
    instrumentName,
    setInstrumentName,
    currentSectionProgressionIndex,
    setCurrentSectionProgressionIndex,
    currentColumnIndex,
    setCurrentColumnIndex,
    strum,
    playTab,
    pauseTab,
    playing,
    loadingInstrument: !currentInstrument,
  };
}
