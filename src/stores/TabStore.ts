import type { Tab } from "@prisma/client";
import type Soundfont from "soundfont-player";
import { devtools } from "zustand/middleware";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { resetTabSliderPosition } from "~/utils/tabSliderHelpers";
import { parse } from "~/utils/tunings";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";

export interface SectionProgression {
  id: string; // used to identify the section for the sorting context
  sectionId: string;
  title: string;
  repetitions: number;
  startSeconds: number;
  endSeconds: number;
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
  data: string[]; // each string is a predefined chord name
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
  type: "tab" | "strum" | "ornamental" | "loopDelaySpacer";
}

export interface PlaybackMetadata {
  location: {
    sectionIndex: number;
    sectionRepeatIndex: number;
    subSectionIndex: number;
    subSectionRepeatIndex: number;
    chordSequenceIndex?: number;
    chordSequenceRepeatIndex?: number;
    chordIndex: number;
  };
  bpm: number;
  noteLengthMultiplier: string;
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet";
  elapsedSeconds: number;
  type: "tab" | "strum" | "ornamental" | "loopDelaySpacer";
}

type InstrumentNames =
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz"
  | "acoustic_grand_piano"
  | "electric_grand_piano";

export interface AudioMetadata {
  playing: boolean;
  tabId: number;
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
  startLoopIndex: number;
  endLoopIndex: number;
  editingLoopRange: boolean;
  fullCurrentlyPlayingMetadataLength: number;
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
  customTuning?: string;
  customBpm?: string;
}
interface PlayRecordedAudio {
  audioBuffer: AudioBuffer;
  secondsElapsed: number;
}

export interface PlaybackTabChord {
  type: "tab";
  isFirstChord: boolean;
  isLastChord: boolean;
  // not my favorite approach below but it makes it easier to compare
  // bpm between tab/strummed chords
  data: {
    chordData: string[];
    bpm: number;
  };
}

export interface PlaybackStrummedChord {
  type: "strum";
  isFirstChord: boolean;
  isLastChord: boolean;
  data: PlaybackChord;
}

export interface PlaybackLoopDelaySpacerChord {
  type: "loopDelaySpacer";
  data: {
    bpm: number;
  };
}

interface PlaybackChord {
  strumIndex: number;
  chordName: string;
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
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet";
  bpm: number;
  showBpm: boolean; // only want to show bpm on first strummed chord of a strumming pattern and
  // only if it's different from the previous chord
  isRaised: boolean; // only true if this chord and strummed chord to the left are both > 5 characters. Allowing entire chord names to render w/o overlap
}

const initialStoreState = {
  // tab data
  originalTabData: null,
  id: -1,
  createdById: null,
  createdAt: null,
  updatedAt: null,
  title: "",
  artistId: null,
  artistName: undefined,
  artistIsVerified: false,
  description: null,
  genre: "",
  tuning: "e2 a2 d3 g3 b3 e4",
  bpm: 75,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
  strummingPatterns: [],
  tabData: [],
  averageRating: 0.0,
  ratingsCount: 0,
  bookmarkCount: 0,
  editing: false,
  sectionProgression: [],
  currentlyCopiedData: null,
  currentlyCopiedChord: null,
  fetchingFullTabData: false,

  countInTimer: {
    showing: false,
    forSectionContainer: null,
  },

  // modals
  showAudioRecorderModal: false,
  showSectionProgressionModal: false,
  showEffectGlossaryDialog: false,
  chordBeingEdited: null,
  strummingPatternBeingEdited: null,
  showingEffectGlossary: false,
  showDeleteAccountModal: false,
  showCustomTuningModal: false,
  mobileHeaderModal: {
    showing: false,
    zIndex: 48,
  },

  // playback
  playbackModalViewingState: "Practice" as const,

  // related to sound generation/playing
  currentlyPlayingMetadata: null,
  playbackMetadata: null,
  playbackSpeed: 1 as const,
  loopDelay: 0,
  currentChordIndex: 0,
  audioMetadata: {
    type: "Generated",
    tabId: -1,
    playing: false,
    location: null,
    startLoopIndex: 0,
    endLoopIndex: -1,
    editingLoopRange: false,
    fullCurrentlyPlayingMetadataLength: -1,
  },
  previewMetadata: {
    indexOfPattern: -1,
    currentChordIndex: 0,
    type: "chord" as const,
    playing: false,
  },

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
  createdByUserId: string | null;
  setCreatedByUserId: (createdByUserId: string | null) => void;
  createdAt: Date | null;
  setCreatedAt: (createdAt: Date | null) => void;
  updatedAt: Date | null;
  setUpdatedAt: (updatedAt: Date | null) => void;
  title: string;
  setTitle: (title: string) => void;

  artistId: number | null;
  setArtistId: (artistId: number | null) => void;
  artistName: string | undefined;
  setArtistName: (artist: string | undefined) => void;
  artistIsVerified: boolean | undefined;
  setArtistIsVerified: (artistIsVerified: boolean | undefined) => void;

  description: string | null;
  setDescription: (description: string | null) => void;
  genre: string;
  setGenre: (genre: string) => void;
  tuning: string;
  setTuning: (tuning: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  capo: number;
  setCapo: (capo: number) => void;
  key: string | null;
  setKey: (key: string | null) => void;
  difficulty: number;
  setDifficulty: (difficulty: number) => void;
  chords: Chord[];
  setChords: (chords: Chord[]) => void;
  strummingPatterns: StrummingPattern[];
  setStrummingPatterns: (strummingPatterns: StrummingPattern[]) => void;
  tabData: Section[];
  setTabData: (tabData: Section[]) => void;

  ratingsCount: number;
  setRatingsCount: (ratingsCount: number) => void;
  averageRating: number;
  setAverageRating: (averageRating: number) => void;
  bookmarkCount: number;
  setBookmarkCount: (bookmarkCount: number) => void;

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
  atomicallyUpdateAudioMetadata: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;

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
    } | null,
  ) => void;
  countInTimer: {
    showing: boolean;
    forSectionContainer: number | null;
  };
  setCountInTimer: (countInTimer: {
    showing: boolean;
    forSectionContainer: number | null;
  }) => void;
  countInBuffer: AudioBuffer | null;
  setCountInBuffer: (countInBuffer: AudioBuffer | null) => void;

  expandedTabData:
    | (
        | PlaybackTabChord
        | PlaybackStrummedChord
        | PlaybackLoopDelaySpacerChord
      )[]
    | null;
  setExpandedTabData: (
    expandedTabData:
      | (
          | PlaybackTabChord
          | PlaybackStrummedChord
          | PlaybackLoopDelaySpacerChord
        )[]
      | null,
  ) => void;

  playbackMetadata: PlaybackMetadata[] | null;
  setPlaybackMetadata: (playbackMetadata: PlaybackMetadata[] | null) => void;

  // modals
  showAudioRecorderModal: boolean;
  setShowAudioRecorderModal: (showAudioRecorderModal: boolean) => void;
  showSectionProgressionModal: boolean;
  setShowSectionProgressionModal: (
    showSectionProgressionModal: boolean,
  ) => void;
  showEffectGlossaryDialog: boolean;
  setShowEffectGlossaryDialog: (showEffectGlossaryDialog: boolean) => void;
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: (showDeleteAccountModal: boolean) => void;
  showCustomTuningModal: boolean;
  setShowCustomTuningModal: (showCustomTuningModal: boolean) => void;
  mobileHeaderModal: {
    showing: boolean;
    zIndex: number;
  };
  setMobileHeaderModal: (mobileHeaderModal: {
    showing: boolean;
    zIndex: number;
  }) => void;

  // below are also used to determine if respective modal should be showing
  chordBeingEdited: {
    index: number;
    value: Chord;
  } | null;
  setChordBeingEdited: (
    chordBeingEdited: {
      index: number;
      value: Chord;
    } | null,
  ) => void;
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPattern;
  } | null;
  setStrummingPatternBeingEdited: (
    strummingPatternBeingEdited: {
      index: number;
      value: StrummingPattern;
    } | null,
  ) => void;
  showPlaybackModal: boolean;
  setShowPlaybackModal: (showPlaybackModal: boolean) => void;
  visiblePlaybackContainerWidth: number;
  setVisiblePlaybackContainerWidth: (
    visiblePlaybackContainerWidth: number,
  ) => void;
  playbackModalViewingState:
    | "Practice"
    | "Section progression"
    | "Chords"
    | "Strumming patterns";
  setPlaybackModalViewingState: (
    playbackModalViewingState:
      | "Practice"
      | "Section progression"
      | "Chords"
      | "Strumming patterns",
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
    currentlyPlayingMetadata: Metadata[] | null,
  ) => void;
  currentInstrumentName:
    | "acoustic_guitar_nylon"
    | "acoustic_guitar_steel"
    | "electric_guitar_clean"
    | "electric_guitar_jazz"
    | "acoustic_grand_piano"
    | "electric_grand_piano";
  setCurrentInstrumentName: (
    currentInstrumentName:
      | "acoustic_guitar_nylon"
      | "acoustic_guitar_steel"
      | "electric_guitar_clean"
      | "electric_guitar_jazz"
      | "acoustic_grand_piano"
      | "electric_grand_piano",
  ) => void;
  looping: boolean;
  setLooping: (looping: boolean) => void;
  loopDelay: number;
  setLoopDelay: (loopDelay: number) => void;
  playbackSpeed: 1 | 0.25 | 0.5 | 0.75 | 1.25 | 1.5;
  setPlaybackSpeed: (speed: 1 | 0.25 | 0.5 | 0.75 | 1.25 | 1.5) => void;
  currentChordIndex: number;
  setCurrentChordIndex: (currentChordIndex: number) => void;
  audioMetadata: AudioMetadata;
  setAudioMetadata: (audioMetadata: AudioMetadata) => void;
  instruments: Record<InstrumentNames, Soundfont.Player>;
  setInstruments: (
    instruments: Record<InstrumentNames, Soundfont.Player>,
  ) => void;
  currentInstrument: Soundfont.Player | null;
  setCurrentInstrument: (currentInstrument: Soundfont.Player | null) => void;
  previewMetadata: PreviewMetadata;
  setPreviewMetadata: (previewMetadata: PreviewMetadata) => void;
  breakOnNextPreviewChord: boolean;
  setBreakOnNextPreviewChord: (breakOnNextPreviewChord: boolean) => void;

  // playing/pausing sound functions
  playTab: ({ location, tabId }: PlayTab) => Promise<void>;
  playPreview: ({ data, index, type }: PlayPreview) => Promise<void>;
  playRecordedAudio: ({
    audioBuffer,
    secondsElapsed,
  }: PlayRecordedAudio) => void;
  pauseAudio: (
    resetToStart?: boolean,
    resetCurrentlyPlayingMetadata?: boolean,
  ) => void;

  isLoadingARoute: boolean;
  setIsLoadingARoute: (isLoadingARoute: boolean) => void;
  viewportLabel:
    | "mobile"
    | "mobileNarrowLandscape"
    | "mobileLandscape"
    | "mobileLarge"
    | "tablet"
    | "desktop";
  setViewportLabel: (
    viewportLabel:
      | "mobile"
      | "mobileNarrowLandscape"
      | "mobileLandscape"
      | "mobileLarge"
      | "tablet"
      | "desktop",
  ) => void;

  // reset
  resetStoreToInitValues: () => void;
}

// if you ever come across a situation where you need the current value of tabData
// and can't for w/e reason use it in the component itself, you can try this convention below:
// although it will prob need to be much more generic given you are updating nested objects (immer?)
//        increase: (by) => set((state) => ({ bears: state.bears + by })),

export const useTabStore = createWithEqualityFn<TabState>()(
  devtools(
    (set, get) => ({
      // used in <Tab />
      originalTabData: null,
      setOriginalTabData: (originalTabData) => set({ originalTabData }),
      id: -1,
      setId: (id) => set({ id }),
      createdByUserId: null,
      setCreatedByUserId: (createdByUserId) => set({ createdByUserId }),
      createdAt: null,
      setCreatedAt: (createdAt) => set({ createdAt }),
      updatedAt: null,
      setUpdatedAt: (updatedAt) => set({ updatedAt }),
      title: "",
      setTitle: (title) => set({ title }),

      artistId: null,
      setArtistId: (artistId) => set({ artistId }),
      artistName: undefined,
      setArtistName: (artistName) => set({ artistName }),
      artistIsVerified: false,
      setArtistIsVerified: (artistIsVerified) => set({ artistIsVerified }),

      description: null,
      setDescription: (description) => set({ description }),
      genre: "",
      setGenre: (genre) => set({ genre }),
      tuning: "e2 a2 d3 g3 b3 e4",
      setTuning: (tuning) => set({ tuning }),
      bpm: 75,
      setBpm: (bpm) => set({ bpm }),
      capo: 0,
      setCapo: (capo) => set({ capo }),
      key: null,
      setKey: (key) => set({ key }),
      difficulty: 1,
      setDifficulty: (difficulty) => set({ difficulty }),
      chords: [],
      setChords: (chords) => set({ chords }),
      strummingPatterns: [],
      setStrummingPatterns: (strummingPatterns) => set({ strummingPatterns }),
      tabData: [],
      setTabData: (tabData) => set({ tabData }),
      ratingsCount: 0,
      setRatingsCount: (ratingsCount) => set({ ratingsCount }),
      averageRating: 0.0,
      setAverageRating: (averageRating) => set({ averageRating }),
      bookmarkCount: 0,
      setBookmarkCount: (bookmarkCount) => set({ bookmarkCount }),
      editing: false,
      setEditing: (editing) => set({ editing }),
      sectionProgression: [],
      setSectionProgression: (sectionProgression) =>
        set({ sectionProgression }),
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
      countInTimer: {
        showing: false,
        forSectionContainer: null,
      },
      setCountInTimer: (countInTimer) => set({ countInTimer }),
      countInBuffer: null,
      setCountInBuffer: (countInBuffer) => set({ countInBuffer }),

      getStringifiedTabData: () => {
        const {
          title,
          description,
          genre,
          tuning,
          bpm,
          capo,
          chords,
          strummingPatterns,
          tabData,
          sectionProgression,
        } = get();
        return JSON.stringify({
          title,
          description,
          genre,
          tuning,
          bpm,
          capo,
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
      atomicallyUpdateAudioMetadata: (newFields: Partial<AudioMetadata>) => {
        const { audioMetadata } = get();

        set({
          audioMetadata: {
            ...audioMetadata,
            ...newFields,
          },
        });
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

      playbackMetadata: null,
      setPlaybackMetadata: (playbackMetadata) => set({ playbackMetadata }),
      visiblePlaybackContainerWidth: 0,
      setVisiblePlaybackContainerWidth: (visiblePlaybackContainerWidth) =>
        set({ visiblePlaybackContainerWidth }),

      currentInstrumentName: "acoustic_guitar_steel",
      setCurrentInstrumentName: (currentInstrumentName) =>
        set({ currentInstrumentName }),
      looping: false,
      setLooping: (looping) => set({ looping }),
      loopDelay: 0,
      setLoopDelay: (loopDelay) => set({ loopDelay }),
      playbackSpeed: 1,
      setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
      currentChordIndex: 0,
      setCurrentChordIndex: (currentChordIndex) => set({ currentChordIndex }),
      audioMetadata: {
        type: "Generated",
        tabId: -1,
        playing: false,
        location: null,
        startLoopIndex: 0,
        endLoopIndex: -1,
        editingLoopRange: false,
        fullCurrentlyPlayingMetadataLength: -1,
      },
      setAudioMetadata: (audioMetadata) => set({ audioMetadata }),
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

      // playing/pausing sound functions
      playTab: async ({ location, tabId }: PlayTab) => {
        const {
          audioMetadata,
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
          visiblePlaybackContainerWidth,
          setPlaybackMetadata,
          loopDelay,
        } = get();

        if (!audioContext || !masterVolumeGainNode || !currentInstrument)
          return;

        const currentlyPlayingStrings: (
          | Soundfont.Player
          | AudioBufferSourceNode
          | undefined
        )[] = [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ];

        set({
          audioMetadata: {
            ...audioMetadata,
            tabId,
            location,
            playing: true,
          },
        });

        const sectionProgression =
          rawSectionProgression.length > 0
            ? rawSectionProgression
            : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now
        const tuning = parse(tuningNotes);

        // want to show entire tab while editing loop range
        const adjStartLoopIndex = audioMetadata.editingLoopRange
          ? 0
          : audioMetadata.startLoopIndex;
        const adjEndLoopIndex = audioMetadata.editingLoopRange
          ? -1
          : audioMetadata.endLoopIndex;

        const compiledChords = location
          ? compileSpecificChordGrouping({
              tabData,
              location,
              chords,
              baselineBpm,
              playbackSpeed,
              setCurrentlyPlayingMetadata,
              startLoopIndex: adjStartLoopIndex,
              endLoopIndex: adjEndLoopIndex,
            })
          : compileFullTab({
              tabData,
              sectionProgression,
              chords,
              baselineBpm,
              playbackSpeed,
              setCurrentlyPlayingMetadata,
              startLoopIndex: adjStartLoopIndex,
              endLoopIndex: adjEndLoopIndex,
              loopDelay,
            });

        const sanitizedSectionProgression =
          sectionProgression.length > 0
            ? sectionProgression
            : generateDefaultSectionProgression(tabData); // I think you could get by without doing this, but leave it for now

        // TODO: add support for specific sections
        const expandedTabData = expandFullTab({
          tabData,
          location: audioMetadata.location,
          sectionProgression: sanitizedSectionProgression,
          chords,
          baselineBpm,
          playbackSpeed,
          setPlaybackMetadata,
          startLoopIndex: adjStartLoopIndex,
          endLoopIndex: adjEndLoopIndex,
          loopDelay,
          visiblePlaybackContainerWidth,
        });

        // note: technically you could have similar duplication logic in regular compilationHelper
        // function, however I think it's cleaner to just augment the loop range with the % operator
        // to achieve the same effect
        const repeatCount = compiledChords.length * expandedTabData.loopCounter;

        for (
          let chordIndex = currentChordIndex;
          chordIndex < repeatCount;
          chordIndex++
        ) {
          const adjustedChordIndex = chordIndex % compiledChords.length;
          const currColumn = compiledChords[adjustedChordIndex];

          // Proceed only if the current column is defined and not ornamental (has length > 0)
          if (currColumn && currColumn.length > 0) {
            // Update the current chord index in the state
            set({
              currentChordIndex: chordIndex,
            });

            const thirdPrevColumn = compiledChords[adjustedChordIndex - 3];
            const secondPrevColumn = compiledChords[adjustedChordIndex - 2];
            const prevColumn = compiledChords[adjustedChordIndex - 1];
            const nextColumn = compiledChords[adjustedChordIndex + 1];

            // Calculate the altered BPM using the provided formula
            const baseBpm = Number(currColumn[8]);
            const noteLengthMultiplier = Number(currColumn[9]);
            const alteredBpm =
              baseBpm * (1 / noteLengthMultiplier) * playbackSpeed;

            // Play the current chord
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

          // Retrieve the latest state values within the loop
          const { audioMetadata, breakOnNextChord, looping } = get();

          // Handle the condition to break the loop early
          if (breakOnNextChord) {
            set({
              breakOnNextChord: false,
            });
            return;
          }

          // TODO: probably want to have reset of slider to beginning at the very first
          // loop delay spacer chord (if there is one).

          // If the current chord is the last in the compiledChords sequence
          if (
            adjustedChordIndex === compiledChords.length - 1 &&
            looping &&
            audioMetadata.playing
          ) {
            // Reset the slider position for UI consistency
            resetTabSliderPosition();
          }

          // Handle the end of the entire repeat sequence
          if (
            chordIndex === repeatCount - 1 &&
            looping &&
            audioMetadata.playing
          ) {
            // Reset the current chord index to 0 to start over
            set({
              currentChordIndex: 0,
            });

            // Reset chordIndex to -1 so that after the loop's increment, it becomes 0
            chordIndex = -1;
          } else if (chordIndex === repeatCount - 1) {
            // If not looping, stop the playback
            set({
              audioMetadata: {
                ...audioMetadata,
                playing: false,
              },
            });
          }
        }
      },

      playPreview: async ({
        data,
        index,
        type,
        customTuning,
        customBpm,
      }: PlayPreview) => {
        const {
          capo,
          tuning,
          previewMetadata,
          currentInstrument,
          audioContext,
          masterVolumeGainNode,
          instruments,
        } = get();

        if (!audioContext || !masterVolumeGainNode || !currentInstrument)
          return;

        const currentlyPlayingStrings: (
          | Soundfont.Player
          | AudioBufferSourceNode
          | undefined
        )[] = [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ];

        const compiledChords =
          type === "chord"
            ? [["", ...(data as string[]), "v", customBpm ?? "58", "1"]]
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
          // Calculate the altered BPM using the provided formula
          const baseBpm = Number(currColumn[8]);
          const noteLengthMultiplier = Number(currColumn[9]);
          const alteredBpm = baseBpm * (1 / noteLengthMultiplier);

          await playNoteColumn({
            tuning: parse(
              type === "chord" ? (customTuning ?? tuning) : "e2 a2 d3 g3 b3 e4",
            ),
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
            acousticSteelOverrideForPreview: instruments.acoustic_guitar_steel,
            forTuningPreview: customBpm !== undefined,
          });

          const { breakOnNextPreviewChord } = get();

          if (breakOnNextPreviewChord) {
            set({
              breakOnNextPreviewChord: false,
            });
            return;
          }

          if (chordIndex === compiledChords.length - 1) {
            if (type === "strummingPattern") {
              chordIndex = -1;
            }

            set({
              previewMetadata: {
                ...previewMetadata,
                indexOfPattern: -1,
                currentChordIndex: 0,
                playing: type === "strummingPattern",
              },
            });
          }
        }
      },

      pauseAudio: (resetToStart, resetCurrentlyPlayingMetadata) => {
        const { audioMetadata, previewMetadata, currentInstrument } = get();

        if (
          !audioMetadata.playing &&
          !previewMetadata.playing &&
          resetToStart
        ) {
          if (resetCurrentlyPlayingMetadata) {
            set({
              currentlyPlayingMetadata: null,
            });
          }

          resetTabSliderPosition();
          set({
            currentChordIndex: 0,
          });
          return;
        }

        if (audioMetadata.playing) {
          if (resetCurrentlyPlayingMetadata) {
            set({
              currentlyPlayingMetadata: null,
            });
          }

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

      expandedTabData: null,
      setExpandedTabData: (expandedTabData) => set({ expandedTabData }),

      // modals
      showAudioRecorderModal: false,
      setShowAudioRecorderModal: (showAudioRecorderModal) =>
        set({ showAudioRecorderModal }),
      showSectionProgressionModal: false,
      setShowSectionProgressionModal: (showSectionProgressionModal) =>
        set({ showSectionProgressionModal }),
      showEffectGlossaryDialog: false,
      setShowEffectGlossaryDialog: (showEffectGlossaryDialog) =>
        set({ showEffectGlossaryDialog }),
      showDeleteAccountModal: false,
      setShowDeleteAccountModal: (showDeleteAccountModal) =>
        set({ showDeleteAccountModal }),
      showCustomTuningModal: false,
      setShowCustomTuningModal: (showCustomTuningModal) =>
        set({ showCustomTuningModal }),
      mobileHeaderModal: {
        showing: false,
        zIndex: 48,
      },
      setMobileHeaderModal: (mobileHeaderModal) => set({ mobileHeaderModal }),

      // below are also used to determine if respective modal should be showing
      chordBeingEdited: null,
      setChordBeingEdited: (chordBeingEdited) => set({ chordBeingEdited }),
      strummingPatternBeingEdited: null,
      setStrummingPatternBeingEdited: (strummingPatternBeingEdited) =>
        set({ strummingPatternBeingEdited }),
      showPlaybackModal: false,
      setShowPlaybackModal: (showPlaybackModal) => set({ showPlaybackModal }),
      playbackModalViewingState: "Practice",
      setPlaybackModalViewingState: (playbackModalViewingState) =>
        set({ playbackModalViewingState }),

      isLoadingARoute: false,
      setIsLoadingARoute: (isLoadingARoute) => set({ isLoadingARoute }),
      viewportLabel: "mobile",
      setViewportLabel: (viewportLabel) => set({ viewportLabel }),

      // reset
      resetStoreToInitValues: () => set(initialStoreState),
    }),
    shallow,
  ),
);
