import type Soundfont from "soundfont-player";
import { v4 as uuid } from "uuid";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Tab } from "@prisma/client";

export interface SectionProgression {
  id: string; // used to identify the section for the sorting context
  sectionId: string;
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
  id: string; // used to identify for keys in .map()
  strummingPattern: StrummingPattern;
  bpm: number;
  repetitions: number;
  data: string[];
}

export interface ChordSection {
  id: string; // used to identify for keys in .map()
  type: "chord";
  repetitions: number;
  data: ChordSequence[];
}

export interface TabSection {
  id: string; // used to identify for keys in .map()
  type: "tab";
  bpm: number;
  repetitions: number;
  data: string[][];
}

export interface Section {
  id: string; // used to identify the section incase there are multiple sections with the same title
  title: string;
  data: (TabSection | ChordSection)[];
}

interface CopiedData {
  type: "section" | "tab" | "chord" | "chordSequence";
  data: Section | TabSection | ChordSection | ChordSequence;
}

export interface Metadata {
  location: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex?: number;
    chordIndex: number;
  };
  bpm: number;
  noteLengthMultiplier: string;
  elapsedSeconds: number;
}

type InstrumentNames =
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

interface AudioMetadata {
  type: "Generated" | "Artist recorded";
  playing: boolean;
  tabId: number;
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
}

interface PreviewMetadata {
  indexOfPattern: number;
  currentChordIndex: number;
  type: "chord" | "strummingPattern";
  playing: boolean;
}

function modifyPalmMuteDashes(
  tab: Section[],
  setTabData: (tabData: Section[]) => void,
  sectionIndex: number,
  subSectionIndex: number,
  startColumnIndex: number,
  prevValue: string,
  pairNodeValue?: string
) {
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

        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
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
        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
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
}

function modifyStrummingPatternPalmMuteDashes(
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
) {
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

        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
      } else if (
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute ===
        (pairNodeValue === "" || pairNodeValue === "end" ? "start" : "end")
      ) {
        finishedModification = true;
      } else {
        newStrummingPattern.value.strums[currentColumnIndex]!.palmMute = "-";
        pairNodeValue === "start" ? currentColumnIndex++ : currentColumnIndex--;
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
}

const initialStoreState = {
  // tab data
  originalTabData: null,
  id: -1,
  createdById: "",
  createdAt: null,
  updatedAt: null,
  title: "",
  description: "",
  genreId: -1,
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 75,
  capo: 0,
  hasRecordedAudio: false,
  chords: [],
  strummingPatterns: [],
  tabData: [],
  numberOfLikes: 0,
  editing: false,
  sectionProgression: [],
  currentlyCopiedData: null,
  currentlyCopiedChord: null,

  // modals
  showAudioRecorderModal: false,
  showSectionProgressionModal: false,
  showEffectGlossaryModal: false,
  chordBeingEdited: null,
  strummingPatternBeingEdited: null,
  showingEffectGlossary: false,

  // useSound
  breakOnNextChord: false,
  currentlyPlayingMetadata: null,
  playbackSpeed: 1,
  currentChordIndex: 0,
  audioMetadata: {
    type: "Generated",
    tabId: -1,
    playing: false,
    location: null,
  },
  previewMetadata: {
    indexOfPattern: -1,
    currentChordIndex: 0,
    type: "chord",
    playing: false,
  },
  breakOnNextPreviewChord: false,
  recordedAudioFile: null,
  shouldUpdateInS3: false,
  recordedAudioBuffer: null,
  recordedAudioBufferSourceNode: null,

  // idk if search needs to be included here
};
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
  updatedAt: Date | null;
  setUpdatedAt: (updatedAt: Date | null) => void;
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
  hasRecordedAudio: boolean;
  setHasRecordedAudio: (hasRecordedAudio: boolean) => void;
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
  currentlyCopiedData: CopiedData | null;
  setCurrentlyCopiedData: (currentlyCopiedData: CopiedData | null) => void;
  currentlyCopiedChord: string[] | null;
  setCurrentlyCopiedChord: (currentlyCopiedChord: string[] | null) => void;

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
  showAudioRecorderModal: boolean;
  setShowAudioRecorderModal: (showAudioRecorderModal: boolean) => void;
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

  // useSound related
  audioContext: AudioContext | null;
  setAudioContext: (audioContext: AudioContext | null) => void;
  breakOnNextChord: boolean;
  setBreakOnNextChord: (breakOnNextChord: boolean) => void;
  masterVolumeGainNode: GainNode | null;
  setMasterVolumeGainNode: (masterVolumeGainNode: GainNode | null) => void;
  showingAudioControls: boolean;
  setShowingAudioControls: (showingAudioControls: boolean) => void;
  // TODO: might be a good idea to add below as a prop under audioMetadata
  currentlyPlayingMetadata: Metadata[] | null;
  setCurrentlyPlayingMetadata: (
    currentlyPlayingMetadata: Metadata[] | null
  ) => void;
  currentInstrumentName:
    | "acoustic_guitar_nylon"
    | "acoustic_guitar_steel"
    | "electric_guitar_clean"
    | "electric_guitar_jazz";
  setCurrentInstrumentName: (
    currentInstrumentName:
      | "acoustic_guitar_nylon"
      | "acoustic_guitar_steel"
      | "electric_guitar_clean"
      | "electric_guitar_jazz"
  ) => void;
  playbackSpeed: 1 | 0.25 | 0.5 | 0.75 | 1.25 | 1.5;
  setPlaybackSpeed: (speed: 1 | 0.25 | 0.5 | 0.75 | 1.25 | 1.5) => void;
  currentChordIndex: number;
  setCurrentChordIndex: (currentChordIndex: number) => void;
  audioMetadata: AudioMetadata;
  setAudioMetadata: (audioMetadata: AudioMetadata) => void;
  instruments: {
    [currentInstrumentName in InstrumentNames]: Soundfont.Player;
  };
  setInstruments: (instruments: {
    [currentInstrumentName in InstrumentNames]: Soundfont.Player;
  }) => void;
  currentInstrument: Soundfont.Player | null;
  setCurrentInstrument: (currentInstrument: Soundfont.Player | null) => void;
  previewMetadata: PreviewMetadata;
  setPreviewMetadata: (previewMetadata: PreviewMetadata) => void;
  breakOnNextPreviewChord: boolean;
  setBreakOnNextPreviewChord: (breakOnNextPreviewChord: boolean) => void;
  recordedAudioFile: Blob | null;
  setRecordedAudioFile: (recordedAudioFile: Blob | null) => void;
  shouldUpdateInS3: boolean;
  setShouldUpdateInS3: (shouldUpdateInS3: boolean) => void;
  recordedAudioBuffer: AudioBuffer | null;
  setRecordedAudioBuffer: (recordedAudioBuffer: AudioBuffer | null) => void;
  recordedAudioBufferSourceNode: AudioBufferSourceNode | null;
  setRecordedAudioBufferSourceNode: (
    recordedAudioBufferSourceNode: AudioBufferSourceNode | null
  ) => void;

  // related to search
  searchResultsCount: number;
  setSearchResultsCount: (searchResultsCount: number) => void;

  // reset
  resetStoreToInitValues: () => void;
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
    updatedAt: null,
    setUpdatedAt: (updatedAt) => set({ updatedAt }),
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
    hasRecordedAudio: false,
    setHasRecordedAudio: (hasRecordedAudio) => set({ hasRecordedAudio }),
    chords: [],
    setChords: (chords) => set({ chords }),
    strummingPatterns: [],
    setStrummingPatterns: (strummingPatterns) => set({ strummingPatterns }),
    tabData: [],
    setTabData: (tabData) => set({ tabData }),
    numberOfLikes: 0,
    setNumberOfLikes: (numberOfLikes) => set({ numberOfLikes }),
    editing: false,
    setEditing: (editing) => set({ editing }),
    sectionProgression: [],
    setSectionProgression: (sectionProgression) => set({ sectionProgression }),
    currentlyCopiedData: null,
    setCurrentlyCopiedData: (currentlyCopiedData) =>
      set({ currentlyCopiedData }),
    currentlyCopiedChord: null,
    setCurrentlyCopiedChord: (currentlyCopiedChord) =>
      set({ currentlyCopiedChord }),

    // used in <TabSection />
    modifyPalmMuteDashes,
    modifyStrummingPatternPalmMuteDashes,

    // useSound related
    audioContext: null,
    setAudioContext: (audioContext) => set({ audioContext }),
    breakOnNextChord: false,
    setBreakOnNextChord: (breakOnNextChord) => set({ breakOnNextChord }),
    masterVolumeGainNode: null,
    setMasterVolumeGainNode: (masterVolumeGainNode) =>
      set({ masterVolumeGainNode }),
    showingAudioControls: false,
    setShowingAudioControls: (showingAudioControls) =>
      set({ showingAudioControls }),
    currentlyPlayingMetadata: null,
    setCurrentlyPlayingMetadata: (currentlyPlayingMetadata) =>
      set({ currentlyPlayingMetadata }),
    currentInstrumentName: "acoustic_guitar_steel",
    setCurrentInstrumentName: (currentInstrumentName) =>
      set({ currentInstrumentName }),
    playbackSpeed: 1,
    setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
    currentChordIndex: 0,
    setCurrentChordIndex: (currentChordIndex) => set({ currentChordIndex }),
    audioMetadata: {
      type: "Generated",
      tabId: -1,
      playing: false,
      location: null,
    },
    setAudioMetadata: (audioMetadata) => set({ audioMetadata }),
    // @ts-expect-error fix this type later
    instruments: {},
    setInstruments: (instruments) => set({ instruments }),
    currentInstrument: null,
    setCurrentInstrument: (currentInstrument) => set({ currentInstrument }),
    previewMetadata: {
      indexOfPattern: -1,
      currentChordIndex: 0,
      type: "chord",
      playing: false,
    },
    setPreviewMetadata: (previewMetadata) => set({ previewMetadata }),
    breakOnNextPreviewChord: false,
    setBreakOnNextPreviewChord: (breakOnNextPreviewChord) =>
      set({ breakOnNextPreviewChord }),
    recordedAudioFile: null,
    setRecordedAudioFile: (recordedAudioFile) => set({ recordedAudioFile }),
    shouldUpdateInS3: false,
    setShouldUpdateInS3: (shouldUpdateInS3) => set({ shouldUpdateInS3 }),
    recordedAudioBuffer: null,
    setRecordedAudioBuffer: (recordedAudioBuffer) =>
      set({ recordedAudioBuffer }),
    recordedAudioBufferSourceNode: null,
    setRecordedAudioBufferSourceNode: (recordedAudioBufferSourceNode) =>
      set({ recordedAudioBufferSourceNode }),

    // modals
    showAudioRecorderModal: false,
    setShowAudioRecorderModal: (showAudioRecorderModal) =>
      set({ showAudioRecorderModal }),
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

    // reset (investigate what exactly the ts error is saying)
    resetStoreToInitValues: () => set(initialStoreState),
  }))
);
