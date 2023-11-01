import type { Tab } from "@prisma/client";
import type Soundfont from "soundfont-player";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { resetTabSliderPosition } from "~/utils/tabSliderHelpers";
import { parse } from "~/utils/tunings";

export interface SectionProgression {
  id: string; // used to identify the section for the sorting context
  sectionId: string;
  title: string;
  repetitions: number;
}

export interface Chord {
  id: string;
  name: string;
  frets: string[]; // prob should be number[] but just trying to match what ITabSection looks like
}

export interface StrummingPattern {
  id: string;
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
  strum:
    | ""
    | "v"
    | "^"
    | "s"
    | "v>"
    | "^>"
    | "s>"
    | "v.>"
    | "^.>"
    | "s.>"
    | "v>."
    | "u>."
    | "s>.";
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
  bpm: number;
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

export interface AudioMetadata {
  type: "Generated" | "Artist recording";
  playing: boolean;
  tabId: number;
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
}

export interface PreviewMetadata {
  indexOfPattern: number;
  currentChordIndex: number;
  type: "chord" | "strummingPattern";
  playing: boolean;
}

interface PlayTab {
  tabId: number;
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
}
interface PlayPreview {
  data: string[] | StrummingPattern;
  index: number; // technically only necessary for strumming pattern, not chord preview
  type: "chord" | "strummingPattern";
}
interface PlayRecordedAudio {
  audioBuffer: AudioBuffer;
  secondsElapsed: number;
}

const initialStoreState = {
  // tab data
  originalTabData: null,
  id: -1,
  createdById: null,
  createdAt: null,
  updatedAt: null,
  title: "",
  description: "",
  genreId: -1,
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 75,
  capo: 0,
  musicalKey: "",
  hasRecordedAudio: false,
  chords: [],
  strummingPatterns: [],
  tabData: [],
  numberOfLikes: 0,
  editing: false,
  sectionProgression: [],
  currentlyCopiedData: null,
  currentlyCopiedChord: null,
  fetchingFullTabData: false,

  // modals
  showAudioRecorderModal: false,
  showSectionProgressionModal: false,
  showEffectGlossaryModal: false,
  chordBeingEdited: null,
  strummingPatternBeingEdited: null,
  showingEffectGlossary: false,
  showDeleteAccountModal: false,
  showCustomTuningModal: false,
  showMobileHeaderModal: false,

  // related to sound generation/playing
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
  recordedAudioFile: null,
  shouldUpdateInS3: false,
  recordedAudioBuffer: null,
  recordedAudioBufferSourceNode: null,

  isLoadingARoute: false,
  // idk if search needs to be included here
};
interface TabState {
  // this is used to compare the current tabData to the original tabData to see if there are any
  // changes, and if so, enable the "save" button
  originalTabData: Tab | null;
  setOriginalTabData: (originalTabData: Tab | null) => void;

  // used in <Tab />
  id: number;
  setId: (id: number) => void;
  createdById: string | null;
  setCreatedById: (createdById: string | null) => void;
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
  musicalKey: string;
  setMusicalKey: (musicalKey: string) => void;
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
  getStringifiedTabData: () => string;
  resetAudioAndMetadataOnRouteChange: () => void;
  getTabData: () => Section[];
  isProgramaticallyScrolling: boolean;
  setIsProgramaticallyScrolling: (isProgramaticallyScrolling: boolean) => void;
  preventFramerLayoutShift: boolean;
  setPreventFramerLayoutShift: (preventFramerLayoutShift: boolean) => void;
  fetchingFullTabData: boolean;
  setFetchingFullTabData: (fetchingFullTabData: boolean) => void;
  chordPulse: {
    location: {
      sectionIndex: number;
      subSectionIndex: number;
      chordIndex: number;
    };
    type: "copy" | "paste";
  } | null;
  setChordPulse: (
    chordPulse: {
      location: {
        sectionIndex: number;
        subSectionIndex: number;
        chordIndex: number;
      };
      type: "copy" | "paste";
    } | null
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
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: (showDeleteAccountModal: boolean) => void;
  showCustomTuningModal: boolean;
  setShowCustomTuningModal: (showCustomTuningModal: boolean) => void;
  showMobileHeaderModal: boolean;
  setShowMobileHeaderModal: (showMobileHeaderModal: boolean) => void;

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

  // related to sound generation/playing
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
  looping: boolean;
  setLooping: (looping: boolean) => void;
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

  // playing/pausing sound functions
  playTab: ({ location, tabId }: PlayTab) => Promise<void>;
  playPreview: ({ data, index, type }: PlayPreview) => Promise<void>;
  playRecordedAudio: ({
    audioBuffer,
    secondsElapsed,
  }: PlayRecordedAudio) => void;
  pauseAudio: (resetToStart?: boolean) => void;

  // related to search
  searchResultsCount: number;
  setSearchResultsCount: (searchResultsCount: number) => void;

  isLoadingARoute: boolean;
  setIsLoadingARoute: (isLoadingARoute: boolean) => void;

  // reset
  resetStoreToInitValues: () => void;
}

// if you ever come across a situation where you need the current value of tabData
// and can't for w/e reason use it in the component itself, you can try this convention below:
// although it will prob need to be much more generic given you are updating nested objects (immer?)
//        increase: (by) => set((state) => ({ bears: state.bears + by })),

export const useTabStore = create<TabState>()(
  devtools((set, get) => ({
    // used in <Tab />
    originalTabData: null,
    setOriginalTabData: (originalTabData) => set({ originalTabData }),
    id: -1,
    setId: (id) => set({ id }),
    createdById: null,
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
    musicalKey: "",
    setMusicalKey: (musicalKey) => set({ musicalKey }),
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
    fetchingFullTabData: false,
    setFetchingFullTabData: (fetchingFullTabData) =>
      set({ fetchingFullTabData }),
    chordPulse: null,
    setChordPulse: (chordPulse) => set({ chordPulse }),

    getStringifiedTabData: () => {
      const {
        title,
        description,
        genreId,
        tuning,
        bpm,
        timeSignature,
        capo,
        musicalKey,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
      } = get();
      return JSON.stringify({
        title,
        description,
        genreId,
        tuning,
        bpm,
        timeSignature,
        capo,
        musicalKey,
        chords,
        strummingPatterns,
        tabData,
        sectionProgression,
      });
    },

    resetAudioAndMetadataOnRouteChange: () => {
      const { audioMetadata, pauseAudio } = get();

      // radix slider thumb position gets out of whack if
      // this isn't there
      resetTabSliderPosition();

      pauseAudio(true);

      set({
        audioMetadata: {
          ...audioMetadata,
          location: null,
          playing: false,
        },
        currentChordIndex: 0,
      });
    },

    getTabData: () => {
      return structuredClone(get().tabData);
    },

    // related to sound generation/playing
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
    looping: false,
    setLooping: (looping) => set({ looping }),
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
    isProgramaticallyScrolling: false,
    setIsProgramaticallyScrolling: (isProgramaticallyScrolling) =>
      set({ isProgramaticallyScrolling }),
    preventFramerLayoutShift: false,
    setPreventFramerLayoutShift: (preventFramerLayoutShift) =>
      set({ preventFramerLayoutShift }),

    // playing/pausing sound functions
    playTab: async ({ location, tabId }: PlayTab) => {
      const {
        tabData,
        sectionProgression: rawSectionProgression,
        tuning: tuningNotes,
        bpm: baselineBpm,
        capo,
        chords,
        playbackSpeed,
        currentChordIndex,
        currentInstrument,
        audioContext,
        masterVolumeGainNode,
        setCurrentlyPlayingMetadata,
      } = get();

      if (!audioContext || !masterVolumeGainNode || !currentInstrument) return;

      const currentlyPlayingStrings: (
        | Soundfont.Player
        | AudioBufferSourceNode
        | undefined
      )[] = [undefined, undefined, undefined, undefined, undefined, undefined];

      set({
        audioMetadata: {
          tabId,
          location,
          playing: true,
          type: "Generated",
        },
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
        let chordIndex = currentChordIndex;
        chordIndex < compiledChords.length;
        chordIndex++
      ) {
        set({
          currentChordIndex: chordIndex,
        });

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
            audioContext,
            masterVolumeGainNode,
            currentInstrument,
            currentlyPlayingStrings,
          });
        }

        // need to get up to date values within loop here since they may have changed
        // since the loop started/last iteration
        const { audioMetadata, breakOnNextChord, looping } = get();

        if (breakOnNextChord) {
          set({
            breakOnNextChord: false,
          });
          return;
        }

        // not 100% on moving this back to the top, but trying it out right now
        if (chordIndex === compiledChords.length - 1) {
          // if looping, reset the chordIndex to -1 so loop will start over
          if (looping && audioMetadata.playing) {
            resetTabSliderPosition();

            chordIndex = -1;
            set({
              currentChordIndex: 0,
            });
          } else {
            set({
              audioMetadata: {
                ...audioMetadata,
                playing: false,
              },
              currentChordIndex: 0,
            });
          }
        }
      }
    },

    playPreview: async ({ data, index, type }: PlayPreview) => {
      const {
        tuning: tuningNotes,
        capo,
        previewMetadata,
        currentInstrument,
        audioContext,
        masterVolumeGainNode,
      } = get();

      if (!audioContext || !masterVolumeGainNode || !currentInstrument) return;

      const currentlyPlayingStrings: (
        | Soundfont.Player
        | AudioBufferSourceNode
        | undefined
      )[] = [undefined, undefined, undefined, undefined, undefined, undefined];

      const tuning = parse(tuningNotes);

      const compiledChords =
        type === "chord"
          ? [["", ...(data as string[]), "v", "58", "1"]]
          : compileStrummingPatternPreview({
              strummingPattern: data as StrummingPattern,
            });

      for (
        let chordIndex = previewMetadata.currentChordIndex;
        chordIndex < compiledChords.length;
        chordIndex++
      ) {
        set({
          previewMetadata: {
            playing: true,
            indexOfPattern: index,
            currentChordIndex: chordIndex,
            type,
          },
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
          capo: type === "chord" ? capo : 0,
          bpm: alteredBpm,
          secondPrevColumn,
          prevColumn,
          currColumn,
          nextColumn,
          audioContext,
          masterVolumeGainNode,
          currentInstrument,
          currentlyPlayingStrings,
        });

        const { breakOnNextPreviewChord } = get();

        if (breakOnNextPreviewChord) {
          set({
            breakOnNextPreviewChord: false,
          });
          return;
        }

        if (chordIndex === compiledChords.length - 1) {
          set({
            previewMetadata: {
              ...previewMetadata,
              indexOfPattern: -1,
              currentChordIndex: 0,
              playing: false,
            },
          });
        }
      }
    },

    playRecordedAudio: ({ audioBuffer, secondsElapsed }) => {
      const {
        audioMetadata,
        previewMetadata,
        audioContext,
        masterVolumeGainNode,
        pauseAudio,
      } = get();

      if (!audioContext || !masterVolumeGainNode) return;

      if (audioMetadata.playing || previewMetadata.playing) {
        pauseAudio();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      set({
        audioMetadata: {
          ...audioMetadata,
          playing: true,
          type: "Artist recording",
        },
        recordedAudioBufferSourceNode: source,
      });

      source.connect(masterVolumeGainNode);
      source.start(0, secondsElapsed);

      source.onended = () => {
        const { audioMetadata, looping } = get();

        if (!looping) {
          set({
            audioMetadata: {
              ...audioMetadata,
              playing: false,
            },
          });
        }
      };
    },

    pauseAudio: (resetToStart) => {
      const {
        audioMetadata,
        previewMetadata,
        currentInstrument,
        recordedAudioBufferSourceNode,
      } = get();

      if (!audioMetadata.playing && !previewMetadata.playing && resetToStart) {
        resetTabSliderPosition();
        set({
          currentChordIndex: 0,
        });
        return;
      }

      if (audioMetadata.playing && audioMetadata.type === "Artist recording") {
        recordedAudioBufferSourceNode?.stop();

        set({
          audioMetadata: {
            ...audioMetadata,
            playing: false,
          },
        });

        if (resetToStart) {
          resetTabSliderPosition();
        }
      } else if (audioMetadata.playing && audioMetadata.type === "Generated") {
        set({
          audioMetadata: {
            ...audioMetadata,
            playing: false,
          },
          breakOnNextChord: true,
        });

        if (resetToStart) {
          resetTabSliderPosition();
          set({
            currentChordIndex: 0,
          });
        }
      } else if (previewMetadata.playing) {
        set({
          previewMetadata: {
            ...previewMetadata,
            currentChordIndex: 0,
            playing: false,
          },
          breakOnNextPreviewChord: true,
        });

        if (resetToStart) {
          resetTabSliderPosition();
          set({
            currentChordIndex: 0,
          });
        }
      }

      currentInstrument?.stop();
    },

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
    showDeleteAccountModal: false,
    setShowDeleteAccountModal: (showDeleteAccountModal) =>
      set({ showDeleteAccountModal }),
    showCustomTuningModal: false,
    setShowCustomTuningModal: (showCustomTuningModal) =>
      set({ showCustomTuningModal }),
    showMobileHeaderModal: false,
    setShowMobileHeaderModal: (showMobileHeaderModal) =>
      set({ showMobileHeaderModal }),

    // below are also used to determine if respective modal should be showing
    chordBeingEdited: null,
    setChordBeingEdited: (chordBeingEdited) => set({ chordBeingEdited }),
    strummingPatternBeingEdited: null,
    setStrummingPatternBeingEdited: (strummingPatternBeingEdited) =>
      set({ strummingPatternBeingEdited }),

    // search
    searchResultsCount: 0,
    setSearchResultsCount: (searchResultsCount) => set({ searchResultsCount }),

    isLoadingARoute: false,
    setIsLoadingARoute: (isLoadingARoute) => set({ isLoadingARoute }),

    // reset (investigate what exactly the ts error is saying)
    resetStoreToInitValues: () => set(initialStoreState),
  }))
);
