import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Tab } from "@prisma/client";

export interface SectionProgression {
  id: string; // used to identify the section for the sorting context
  title: string;
  repetitions: number;
}

export interface Chord {
  name: string;
  frets: string[]; // prob should be number[] but just trying to match what ITabSection looks like
}

export interface StrummingPattern {
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet";
  strums: Strum[];
}

export interface Strum {
  palmMute: "" | "-" | "start" | "end";
  strum: "" | "v" | "^" | "s" | "v>" | "^>" | "s>";
}

export interface ChordSequence {
  strummingPattern: StrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[];
}

export interface ChordSection {
  type: "chord";
  repetitions: number;
  data: ChordSequence[];
}

export interface TabSection {
  type: "tab";
  bpm: number;
  repetitions: number;
  data: string[][];
}

export interface Section {
  title: string;
  data: (TabSection | ChordSection)[];
}

interface CopiedData {
  type: "section" | "tab" | "chord" | "chordSequence";
  data: Section | TabSection | ChordSection | ChordSequence;
}

interface TabState {
  // not sure if this will hurt us later on, but I would like to avoid making all of these optional
  // and instead just set them to default-ish values

  // this is used to compare the current tabData to the original tabData to see if there are any
  // changes, and if so, enable the "save" button
  originalTabData: Tab | null;
  setOriginalTabData: (originalTabData: Tab | null) => void;

  // used in <Tab />
  id: number;
  setId: (id: number) => void;
  createdById: string;
  setCreatedById: (createdById: string) => void;
  createdAt: Date | null;
  setCreatedAt: (createdAt: Date | null) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  genreId: number;
  setGenreId: (genre: number) => void;
  tuning: string;
  setTuning: (tuning: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  timeSignature: string;
  setTimeSignature: (timeSignature: string) => void;
  capo: number;
  setCapo: (capo: number) => void;
  chords: Chord[];
  setChords: (chords: Chord[]) => void;
  strummingPatterns: StrummingPattern[];
  setStrummingPatterns: (strummingPatterns: StrummingPattern[]) => void;
  tabData: Section[];
  setTabData: (tabData: Section[]) => void;
  numberOfLikes: number;
  setNumberOfLikes: (numberOfLikes: number) => void;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  sectionProgression: SectionProgression[];
  setSectionProgression: (sectionProgresstion: SectionProgression[]) => void;
  showingEffectGlossary: boolean;
  setShowingEffectGlossary: (showingEffectGlossary: boolean) => void;

  currentlyCopiedData: CopiedData | null;
  setCurrentlyCopiedData: (currentlyCopiedData: CopiedData | null) => void;

  // used in <TabSection />
  modifyPalmMuteDashes: (
    tab: Section[],
    setTabData: (tabData: Section[]) => void,
    sectionIndex: number,
    subSectionIndex: number,
    startColumnIndex: number,
    prevValue: string,
    pairNodeValue?: string
  ) => void;

  // used in <StrummingPatternModal />
  modifyStrummingPatternPalmMuteDashes: (
    strummingPatternBeingEdited: {
      index: number;
      value: StrummingPattern;
    },
    setStrummingPatternBeingEdited: (
      strummingPatternBeingEdited: {
        index: number;
        value: StrummingPattern;
      } | null
    ) => void,
    startColumnIndex: number,
    prevValue: string,
    pairNodeValue?: string
  ) => void;

  // modals
  showSectionProgressionModal: boolean;
  setShowSectionProgressionModal: (
    showSectionProgressionModal: boolean
  ) => void;
  showEffectGlossaryModal: boolean;
  setShowEffectGlossaryModal: (showEffectGlossaryModal: boolean) => void;

  // below are also used to determine if respective modal should be showing
  chordBeingEdited: {
    index: number;
    value: Chord;
  } | null;
  setChordBeingEdited: (
    chordBeingEdited: {
      index: number;
      value: Chord;
    } | null
  ) => void;
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  } | null;
  setStrummingPatternBeingEdited: (
    strummingPatternBeingEdited: {
      index: number;
      value: StrummingPattern;
    } | null
  ) => void;

  // related to search
  searchResultsCount: number;
  setSearchResultsCount: (searchResultsCount: number) => void;
}

// if you ever come across a situation where you need the current value of tabData
// and can't for w/e reason use it in the component itself, you can try this convention below:
// although it will prob need to be much more generic given you are updating nested objects (immer?)
//        increase: (by) => set((state) => ({ bears: state.bears + by })),

export const useTabStore = create<TabState>()(
  devtools((set) => ({
    // used in <Tab />
    originalTabData: null,
    setOriginalTabData: (originalTabData) => set({ originalTabData }),
    id: -1,
    setId: (id) => set({ id }),
    createdById: "",
    setCreatedById: (createdById) => set({ createdById }),
    createdAt: null,
    setCreatedAt: (createdAt) => set({ createdAt }),
    title: "",
    setTitle: (title) => set({ title }),
    description: "",
    setDescription: (description) => set({ description }),
    genreId: -1,
    setGenreId: (genreId) => set({ genreId }),
    tuning: "e2 a2 d3 g3 b3 e4",
    setTuning: (tuning) => set({ tuning }),
    bpm: 75,
    setBpm: (bpm) => set({ bpm }),
    timeSignature: "",
    setTimeSignature: (timeSignature) => set({ timeSignature }),
    capo: 0,
    setCapo: (capo) => set({ capo }),
    chords: [],
    setChords: (chords) => set({ chords }),
    strummingPatterns: [],
    setStrummingPatterns: (strummingPatterns) => set({ strummingPatterns }),
    tabData: [
      {
        title: "",
        data: [],
      },
    ], // temporary, should just be an empty array
    setTabData: (tabData) => set({ tabData }),
    numberOfLikes: 0,
    setNumberOfLikes: (numberOfLikes) => set({ numberOfLikes }),
    editing: true, // temporary, should be false
    setEditing: (editing) => set({ editing }),
    sectionProgression: [],
    setSectionProgression: (sectionProgression) => set({ sectionProgression }),
    showingEffectGlossary: false,
    setShowingEffectGlossary: (showingEffectGlossary) =>
      set({ showingEffectGlossary }),

    currentlyCopiedData: null,
    setCurrentlyCopiedData: (currentlyCopiedData) =>
      set({ currentlyCopiedData }),

    // used in <TabSection />

    modifyPalmMuteDashes: (
      tab,
      setTabData,
      sectionIndex,
      subSectionIndex,
      startColumnIndex,
      prevValue,
      pairNodeValue
    ) => {
      // technically could just use tabData/setter from the store right?
      let finishedModification = false;
      const newTabData = [...tab];
      let currentColumnIndex = startColumnIndex;

      while (!finishedModification) {
        // should prob extract to a variable so we can type check it and avoid the
        // long chain being repeated over and over below

        // start/end node already defined, meaning we just clicked on an empty node to be the other pair node
        if (pairNodeValue !== undefined) {
          if (currentColumnIndex === startColumnIndex) {
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              startColumnIndex
            ]![0] = pairNodeValue === "" ? "end" : pairNodeValue;

            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          } else if (
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              currentColumnIndex
            ]![0] ===
            (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
          ) {
            finishedModification = true;
          } else {
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              currentColumnIndex
            ]![0] = "-";
            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          }
        }
        // pair already defined, meaning we just removed either the start/end node and need to remove dashes
        // in between until we hit the other node
        else {
          if (
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              currentColumnIndex
            ]?.[0] === (prevValue === "start" ? "end" : "start")
          ) {
            finishedModification = true;
          } else {
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              currentColumnIndex
            ]![0] = "";
            prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
          }
        }
      }

      setTabData(newTabData);
    },

    modifyStrummingPatternPalmMuteDashes: (
      strummingPatternBeingEdited,
      setStrummingPatternBeingEdited,
      startColumnIndex,
      prevValue,
      pairNodeValue
    ) => {
      // technically could just use tabData/setter from the store right?
      let finishedModification = false;
      const newStrummingPattern = { ...strummingPatternBeingEdited };
      let currentColumnIndex = startColumnIndex;

      while (!finishedModification) {
        // start/end node already defined, meaning we just clicked on an empty node to be the other pair node
        if (pairNodeValue !== undefined) {
          if (currentColumnIndex === startColumnIndex) {
            newStrummingPattern.value.strums[startColumnIndex]!.palmMute =
              pairNodeValue === ""
                ? "end"
                : (pairNodeValue as "start" | "end" | "-" | "");

            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          } else if (
            newStrummingPattern.value.strums[currentColumnIndex]!.palmMute ===
            (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
          ) {
            finishedModification = true;
          } else {
            newStrummingPattern.value.strums[currentColumnIndex]!.palmMute =
              "-";
            pairNodeValue === "start"
              ? currentColumnIndex++
              : currentColumnIndex--;
          }
        }
        // pair already defined, meaning we just removed either the start/end node and need to remove dashes
        // in between until we hit the other node
        else {
          if (
            newStrummingPattern.value.strums[currentColumnIndex]!.palmMute ===
            (prevValue === "start" ? "end" : "start")
          ) {
            finishedModification = true;
          } else {
            newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "";
            prevValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
          }
        }
      }

      setStrummingPatternBeingEdited(newStrummingPattern);
    },

    // modals
    showSectionProgressionModal: false,
    setShowSectionProgressionModal: (showSectionProgressionModal) =>
      set({ showSectionProgressionModal }),
    showEffectGlossaryModal: false,
    setShowEffectGlossaryModal: (showEffectGlossaryModal) =>
      set({ showEffectGlossaryModal }),

    // below are also used to determine if respective modal should be showing
    chordBeingEdited: null,
    setChordBeingEdited: (chordBeingEdited) => set({ chordBeingEdited }),
    strummingPatternBeingEdited: null,
    setStrummingPatternBeingEdited: (strummingPatternBeingEdited) =>
      set({ strummingPatternBeingEdited }),

    // search
    searchResultsCount: 0,
    setSearchResultsCount: (searchResultsCount) => set({ searchResultsCount }),
  }))
);
