import type { Tab } from "~/generated/browser";
import type Soundfont from "soundfont-player";
import { devtools } from "zustand/middleware";
import { create, useStore } from "zustand";
import { createContext, useCallback, useContext } from "react";
import { immer } from "zustand/middleware/immer";
import {
  playNoteColumn,
  stopActivePlaybackStrings,
  stopAllScheduledPlaybackNodes,
} from "~/utils/playGeneratedAudioHelpers";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { resetAudioRangeToStart } from "~/utils/audioRangeHelpers";
import { DEFAULT_TUNING, normalizeTuningValue, parse } from "~/utils/tunings";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import {
  PLAYBACK_START_EPSILON_SECONDS,
  runPlaybackScheduler,
} from "~/utils/playbackScheduler";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";
import {
  isAudioPageHidden,
  createAudioContextController,
  type AudioLifecycleEvent,
} from "~/utils/audioContextRecovery";
import {
  clampPlaybackSpeed,
  type PlaybackSpeed,
} from "~/utils/playbackSpeedControls";
import { setHoveredChordLocationValue } from "~/utils/hoveredChordLocation";
import { useShallow } from "zustand/shallow";
import { isMobileOnly } from "react-device-detect";
import type { Draft } from "immer";
import isEqual from "lodash.isequal";
import { createEditorHistory } from "~/utils/createEditorHistory";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import {
  getInitialDraftLoopRange,
  mapLoopRelativeChordIndexToFullTabIndex,
} from "~/utils/loopRangeHelpers";

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
  color: string; // hex color from CHORD_COLORS palette
  frets: string[]; // prob should be number[] but just trying to match what ITabSection looks like
}

export interface StrummingPattern {
  id: string;
  baseNoteLength: "whole" | "half" | "quarter" | "eighth" | "sixteenth";
  strums: Strum[];
}

export interface Strum {
  palmMute: "" | "-" | "start" | "end";
  strum: string; // effects are v, ^, v~, ^~, >, s, ., r
  noteLength: FullNoteLengths;
  /**
   * When true (default), inter-string strum spread is derived from BPM +
   * normal vs arpeggiated curves. When false, `strumSpreadSeconds` is used.
   */
  strumSpreadAuto?: boolean;
  /** Total strum spread across sounded strings, in seconds. */
  strumSpreadSeconds?: number | null;
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

export interface TabNote {
  type: "note";
  palmMute: "" | "-" | "start" | "end";
  firstString: string; // low E
  secondString: string; // A
  thirdString: string; // D
  fourthString: string; // G
  fifthString: string; // B
  sixthString: string; // high E
  chordEffects: string; // v, ^, v~, ^~, s, >, ., r
  noteLength: FullNoteLengths;
  /**
   * When true (default), inter-string strum spread is derived from BPM +
   * normal vs arpeggiated curves. When false, `strumSpreadSeconds` is used.
   */
  strumSpreadAuto?: boolean;
  /** Total strum spread across sounded strings, in seconds. */
  strumSpreadSeconds?: number | null;
  id: string;
}

export interface TabMeasureLine {
  type: "measureLine";
  /**
   * Whether this measure line is inside a palm mute section.
   * Shows a connecting line above the measure line when true.
   */
  isInPalmMuteSection: boolean;
  /**
   * Explicit BPM for notes after this measure line.
   * `null` means keep the last defined BPM (sticky) — subsection/tab baseline
   * until the first explicit measure-line BPM in the subsection.
   */
  bpmAfterLine: number | null;
  id: string;
}

export interface TabSection {
  id: string; // used to identify for keys in .map()
  type: "tab";
  bpm: number;
  baseNoteLength: BaseNoteLengths;
  repetitions: number;
  data: (TabNote | TabMeasureLine)[];
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

export type BaseNoteLengths =
  "whole" | "half" | "quarter" | "eighth" | "sixteenth";

export type FullNoteLengths =
  | "whole"
  | "whole dotted"
  | "whole double-dotted"
  | "half"
  | "half dotted"
  | "half double-dotted"
  | "quarter"
  | "quarter dotted"
  | "quarter double-dotted"
  | "eighth"
  | "eighth dotted"
  | "eighth double-dotted"
  | "sixteenth"
  | "sixteenth dotted"
  | "sixteenth double-dotted";

export const baseNoteLengthMultipliers: Record<
  "whole" | "half" | "quarter" | "eighth" | "sixteenth",
  number
> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const noteLengthMultipliers: Record<
  | "whole"
  | "whole dotted"
  | "whole double-dotted"
  | "half"
  | "half dotted"
  | "half double-dotted"
  | "quarter"
  | "quarter dotted"
  | "quarter double-dotted"
  | "eighth"
  | "eighth dotted"
  | "eighth double-dotted"
  | "sixteenth"
  | "sixteenth dotted"
  | "sixteenth double-dotted",
  number
> = {
  whole: 4,
  "whole dotted": 6,
  "whole double-dotted": 7,
  half: 2,
  "half dotted": 3,
  "half double-dotted": 3.5,
  quarter: 1,
  "quarter dotted": 1.5,
  "quarter double-dotted": 1.75,
  eighth: 0.5,
  "eighth dotted": 0.75,
  "eighth double-dotted": 0.875,
  sixteenth: 0.25,
  "sixteenth dotted": 0.375,
  "sixteenth double-dotted": 0.4375,
};

export interface Metadata {
  location: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex?: number;
    chordIndex: number;
  };
  bpm: number;
  noteLengthMultiplier: number;
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
  noteLengthMultiplier: number;
  noteLength: FullNoteLengths;
  elapsedSeconds: number;
  type: "tab" | "strum" | "ornamental" | "loopDelaySpacer";
}

type InstrumentNames =
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

export interface AudioMetadata {
  playing: boolean;
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
  } | null;
  startLoopIndex: number;
  endLoopIndex: number;
  editingLoopRange: boolean;
  fullTabMetadataLength: number;
}

export interface PreviewMetadata {
  indexOfPattern: number;
  currentChordIndex: number;
  type: "chord" | "strummingPattern";
  playing: boolean;
}

export type PlayTabLocation = {
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  /** Column/strum index within the subsection; used to seek start position only. */
  chordIndex?: number;
};

interface PlayTab {
  /**
   * Omit to keep the current `audioMetadata.location` and resume from there.
   * Pass `null` to play the whole tab. Include `chordIndex` to start at that chord.
   */
  location?: PlayTabLocation | null;
}

export type HoveredChordLocation = {
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex?: number;
  chordIndex: number;
};
interface PlayPreview {
  data: string[] | StrummingPattern;
  index: number; // technically only necessary for strumming pattern, not chord preview
  type: "chord" | "strummingPattern";
  customTuning?: string;
  customBpm?: string;
  /** When true, uses the slow fixed delay used by the custom tuning preview. */
  forTuningPreview?: boolean;
  onTuningPreviewNote?: (noteIndex: number) => void;
  isPreviewValid?: () => boolean;
  /** Chord-effect string for type "chord" previews (defaults to "v"). */
  chordEffects?: string;
  /** Compiled strum-spread slot value ("auto" or seconds string) for type "chord". */
  strumSpreadCompileValue?: string;
}

export interface PlaybackTabChord {
  type: "tab";
  isFirstChord: boolean;
  isLastChord: boolean;
  isFirstChordInTab?: boolean;
  isLastChordInTab?: boolean;
  // not my favorite approach below but it makes it easier to compare
  // bpm between tab/strummed chords
  data: {
    chordData: string[];
    bpm: number;
    // outside of on measure lines which already show bpm,
    // only want to show bpm on first chord of a tab sub section and
    // if a chord's bpm is different from the previous chord
    showBpm: boolean;
  };
}

export interface PlaybackStrummedChord {
  type: "strum";
  isFirstChord: boolean;
  isLastChord: boolean;
  isFirstChordInTab?: boolean;
  isLastChordInTab?: boolean;
  data: PlaybackChord;
  baseNoteLength: BaseNoteLengths;
}

export interface PlaybackLoopDelaySpacerChord {
  type: "loopDelaySpacer";
  isFirstChordInTab?: boolean;
  isLastChordInTab?: boolean;
  data: {
    bpm: number;
  };
}

interface PlaybackChord {
  strumIndex: number;
  chordName: string;
  chordColor: string; // hex color for color mode display
  palmMute: "" | "-" | "start" | "end";
  strum: string;
  noteLength: FullNoteLengths;
  beatIndicator: string; // e.g. "1", "e", "&", "a"
  bpm: number;
  // only want to show bpm on first strummed chord of a strumming pattern and
  // only if it's different from the previous chord
  showBpm: boolean;
}

export type COLORS =
  | "peony"
  | "coral"
  | "maple"
  | "saffron"
  | "pistachio"
  | "verdant"
  | "aqua"
  | "sapphire"
  | "amethyst";

export type THEME = "light" | "dark";

const initialStoreState = {
  // tab data
  originalTabData: null,
  tabData: [
    {
      id: crypto.randomUUID(),
      title: "Section 1",
      data: [],
    },
  ] as Section[],
  id: -1,
  createdByUserId: null,
  createdAt: null,
  updatedAt: null,
  title: "",
  artistId: null,
  artistName: undefined,
  artistIsVerified: false,
  description: null,
  genre: "",
  tuning: DEFAULT_TUNING,
  bpm: 75,
  capo: 0,
  key: null,
  difficulty: 1,
  chords: [],
  strummingPatterns: [],
  averageRating: 0.0,
  ratingsCount: 0,
  bookmarkCount: 0,
  sectionProgression: [],
  currentlyCopiedData: null,
  currentlyCopiedChord: null,
  fetchingFullTabData: false,
  interactingWithAudioProgressSlider: false,

  countInTimer: {
    showing: false,
    forSectionContainer: null,
  },

  // modals
  showSectionProgressionDialog: false,
  showGlossaryDialog: false,
  chordBeingEdited: null,
  strummingPatternBeingEdited: null,
  showingGlossary: false,
  showDeleteAccountModal: false,
  showCustomTuningDialog: false,
  showMobileHeaderModal: false,

  // playback
  showPlaybackModal: false,
  playbackModalViewingState: "Practice" as const,
  // Must reset with the route: stale width/expanded data from a previous tab
  // (or orientation) leaves the modal unable to virtualize/highlight chords.
  visiblePlaybackContainerWidth: 0,
  expandedTabData: null,

  // related to sound generation/playing
  currentlyPlayingMetadata: null,
  playbackMetadata: null,
  playbackSpeed: 1 as const,
  loopDelay: 0,
  currentChordIndex: 0,
  playbackStartedAtAudioTime: null,
  audioMetadata: {
    playing: false,
    location: null,
    startLoopIndex: 0,
    endLoopIndex: -1,
    editingLoopRange: false,
    fullTabMetadataLength: -1,
  },
  draftLoopStartIndex: null,
  draftLoopEndIndex: null,
  hoveredChordLocation: null,
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
  canUndo: boolean;
  canRedo: boolean;
  editorHistoryRevision: number;
  undo: () => void;
  redo: () => void;
  clearEditorHistory: () => void;
  groupEditorHistoryInput: (input: unknown, operation?: string) => void;
  breakEditorHistoryGroup: () => void;

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
  chordDisplayMode: "text" | "color";
  setChordDisplayMode: (chordDisplayMode: "text" | "color") => void;

  tabData: Section[];
  setTabData: (updater: (draft: Section[]) => void) => void;

  ratingsCount: number;
  setRatingsCount: (ratingsCount: number) => void;
  averageRating: number;
  setAverageRating: (averageRating: number) => void;
  bookmarkCount: number;
  setBookmarkCount: (bookmarkCount: number) => void;

  editing: boolean;
  setEditing: (editing: boolean) => void;
  sectionProgression: SectionProgression[];
  setSectionProgression: (
    sectionProgression: SectionProgression[],
    options?: { recordHistory: boolean },
  ) => void;
  currentlyCopiedData: CopiedData | null;
  setCurrentlyCopiedData: (currentlyCopiedData: CopiedData | null) => void;
  currentlyCopiedChord: string[] | null;
  setCurrentlyCopiedChord: (currentlyCopiedChord: string[] | null) => void;
  atomicallyUpdateAudioMetadata: (
    updatedFields: Partial<AudioMetadata>,
  ) => void;

  tabIsEffectivelyEmpty: boolean;
  setTabIsEffectivelyEmpty: (tabIsEffectivelyEmpty: boolean) => void;
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
  countInTimerEnabled: boolean;
  setCountInTimerEnabled: (countInTimerEnabled: boolean) => void;
  updateMasterVolumeGainNode: (newVolume: number) => void;

  /**
   * Unused store mirror. `setHoveredChordLocation` writes a module-level value
   * read by the spacebar handler and does not notify subscribers — hovering a
   * column must not wake every mounted note.
   */
  hoveredChordLocation: HoveredChordLocation | null;
  setHoveredChordLocation: (
    hoveredChordLocation: HoveredChordLocation | null,
  ) => void;

  expandedTabData:
    | (
        PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord
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
  showSectionProgressionDialog: boolean;
  setShowSectionProgressionDialog: (
    showSectionProgressionDialog: boolean,
  ) => void;
  showGlossaryDialog: boolean;
  setShowGlossaryDialog: (showGlossaryDialog: boolean) => void;
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: (showDeleteAccountModal: boolean) => void;
  showCustomTuningDialog: boolean;
  setShowCustomTuningDialog: (showCustomTuningDialog: boolean) => void;
  showMobileHeaderModal: boolean;
  setShowMobileHeaderModal: (showMobileHeaderModal: boolean) => void;

  // below are also used to determine if respective dialog should be showing
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
    "Practice" | "Section progression" | "Chords" | "Strumming patterns";
  setPlaybackModalViewingState: (
    playbackModalViewingState:
      "Practice" | "Section progression" | "Chords" | "Strumming patterns",
  ) => void;

  // related to sound generation/playing
  audioContext: AudioContext | null;
  breakOnNextChord: boolean;
  setBreakOnNextChord: (breakOnNextChord: boolean) => void;
  masterVolumeGainNode: GainNode | null;
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
    | "electric_guitar_jazz";
  setCurrentInstrumentName: (
    currentInstrumentName:
      | "acoustic_guitar_nylon"
      | "acoustic_guitar_steel"
      | "electric_guitar_clean"
      | "electric_guitar_jazz",
  ) => void;
  looping: boolean;
  setLooping: (looping: boolean) => void;
  loopDelay: number;
  setLoopDelay: (loopDelay: number) => void;
  playbackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  currentChordIndex: number;
  setCurrentChordIndex: (currentChordIndex: number) => void;
  playbackStartedAtAudioTime: number | null;
  playbackSessionId: number;
  scheduledPlaybackNodes: { stop(when?: number): void }[];
  activePlaybackStrings:
    (Soundfont.Player | AudioBufferSourceNode | undefined)[] | null;
  audioMetadata: AudioMetadata;
  setAudioMetadata: (audioMetadata: AudioMetadata) => void;
  /**
   * Draft loop endpoints while `audioMetadata.editingLoopRange` is true.
   * `null` means that endpoint is not selected yet (full-tab / in-progress pick).
   * Committed on Save; discarded on Return.
   */
  draftLoopStartIndex: number | null;
  draftLoopEndIndex: number | null;
  setDraftLoopStartIndex: (draftLoopStartIndex: number | null) => void;
  setDraftLoopEndIndex: (draftLoopEndIndex: number | null) => void;
  setDraftLoopRange: (range: {
    startIndex: number | null;
    endIndex: number | null;
  }) => void;
  /**
   * Enter loop-range editing. A committed range that is a real subset of the
   * current section or tab is seeded into the draft so the user can adjust it.
   * A range that already spans the whole section/tab starts blank.
   * Remaps `currentChordIndex` from the loop-relative (possibly artificially
   * duplicated) strip onto the matching full-tab chord so the viewport stays put.
   */
  enterPlaybackLoopRangeEditor: () => void;
  /** Discard the draft and restore the playback position from before editing. */
  cancelPlaybackLoopRangeEditor: () => void;
  selectPlaybackLoopRangeChord: (index: number) => void;
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
  interactingWithAudioProgressSlider: boolean;
  setInteractingWithAudioProgressSlider: (
    interactingWithAudioProgressSlider: boolean,
  ) => void;

  // playing/pausing sound functions
  initializeAudioSystem: () => AudioContext | null;
  disposeAudioSystem: () => void;
  subscribeAudioLifecycle: (
    listener: (event: AudioLifecycleEvent) => void,
  ) => () => void;
  ensureAudioContextReady: () => Promise<{
    audioContext: AudioContext;
    masterVolumeGainNode: GainNode;
  } | null>;
  playTabWithCountIn: (
    options?: PlayTab & { countIn?: boolean },
  ) => Promise<void>;
  audioPreparationPending: boolean;
  ensureAudioSystemReady: () => Promise<{
    audioContext: AudioContext;
    masterVolumeGainNode: GainNode;
    currentInstrument: Soundfont.Player | null;
    countInBuffer: AudioBuffer | null;
  } | null>;
  playTab: ({ location }: PlayTab) => Promise<void>;
  playPreview: ({ data, index, type }: PlayPreview) => Promise<void>;
  pauseAudio: (
    resetToStart?: boolean,
    resetCurrentlyPlayingMetadata?: boolean,
  ) => void;
  /**
   * Re-anchors the strip animation clock to "now" at the current chord without
   * stopping audio. Used after orientation/layout invalidation or visibility
   * resume when chordRepetitions were reset and would otherwise desync from a
   * stale playbackStartedAtAudioTime.
   */
  reanchorPlaybackStripAnimation: () => void;
  /**
   * Fully stops playback and clears strip-clock state so the next PlaybackModal
   * open always mounts paused at a clean translateX (no ghost rAF scroll).
   */
  resetPlaybackModalSession: () => void;

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

  // theme
  color: COLORS;
  setColor: (color: COLORS) => void;
  theme: THEME;
  setTheme: (theme: THEME) => void;
  followsDeviceTheme: boolean;
  setFollowsDeviceTheme: (followsDeviceTheme: boolean) => void;

  // reset
  resetStoreToInitValues: () => void;
}

type TabDocument = Pick<
  TabState,
  | "title"
  | "artistId"
  | "artistName"
  | "artistIsVerified"
  | "description"
  | "genre"
  | "tuning"
  | "bpm"
  | "capo"
  | "key"
  | "difficulty"
  | "chords"
  | "strummingPatterns"
  | "sectionProgression"
  | "tabData"
>;

function getEditorDocument(state: TabState): TabDocument {
  return {
    title: state.title,
    artistId: state.artistId,
    artistName: state.artistName,
    artistIsVerified: state.artistIsVerified,
    description: state.description,
    genre: state.genre,
    tuning: state.tuning,
    bpm: state.bpm,
    capo: state.capo,
    key: state.key,
    difficulty: state.difficulty,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    sectionProgression: state.sectionProgression,
    tabData: state.tabData,
  };
}

function editorDocumentsEqual(before: TabDocument, after: TabDocument) {
  if (before.sectionProgression === after.sectionProgression)
    return isEqual(before, after);
  // Timing is recalculated after music edits; it is not an editable field.
  const a = before.sectionProgression;
  const b = after.sectionProgression;
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index]!;
      return (
        entry.id === other.id &&
        entry.sectionId === other.sectionId &&
        entry.title === other.title &&
        entry.repetitions === other.repetitions
      );
    }) &&
    isEqual({ ...before, sectionProgression: b }, after)
  );
}

// Resolve empty sequences as part of the originating edit. A React effect that
// fills these later would create a second undo step and could overwrite redo.
function initializeEmptyChordSequences({
  tabData,
  strummingPatterns,
}: Pick<TabState, "tabData" | "strummingPatterns">) {
  const pattern = strummingPatterns[0];
  if (!pattern) return;
  for (const section of tabData) {
    for (const subSection of section.data) {
      if (subSection.type !== "chord") continue;
      for (const sequence of subSection.data) {
        if (Object.keys(sequence.strummingPattern).length > 0) continue;
        sequence.strummingPattern = pattern;
        sequence.bpm = -1;
        sequence.data = Array.from({ length: pattern.strums.length }, () => "");
      }
    }
  }
}

export const createTabStore = (
  initialValues: Partial<TabState> = {},
  resetAudioRange = resetAudioRangeToStart,
) => {
  let audioPreparation: ReturnType<TabState["ensureAudioSystemReady"]> | null =
    null;
  let audioPreparationContext: AudioContext | null = null;
  let audioPreparationInstrument = "";
  let audioPreparationPauseId = 0;
  let audioPauseRequestId = 0;
  let audioStartRequestId = 0;
  // Keep the loop-relative index, including artificial copies and delay spacers.
  // The editor uses full-tab indices, so its current index cannot restore this.
  let playbackLoopRangeEntryChordIndex: number | null = null;

  let countInTimeout: ReturnType<typeof setTimeout> | undefined;
  const audioController = createAudioContextController({
    onContextChange: (context) => {
      const previousGain = useTabStoreBase.getState().masterVolumeGainNode;
      const gain = context?.createGain() ?? null;
      if (context && gain) {
        gain.gain.value = previousGain?.gain.value ?? (isMobileOnly ? 1.25 : 1);
        gain.connect(context.destination);
      }
      useTabStoreBase.setState({
        audioContext: context,
        masterVolumeGainNode: gain,
        currentInstrument: null,
        instruments: {} as Record<InstrumentNames, Soundfont.Player>,
        countInBuffer: null,
      });
    },
    onUnavailable: () => useTabStoreBase.getState().pauseAudio(),
  });

  const publishAvailability = (availability: {
    canUndo: boolean;
    canRedo: boolean;
  }) => {
    if (
      useTabStoreBase.getState().canUndo !== availability.canUndo ||
      useTabStoreBase.getState().canRedo !== availability.canRedo
    )
      useTabStoreBase.setState(availability);
  };
  const documentHistory = createEditorHistory<TabDocument>({
    equals: editorDocumentsEqual,
    onChange: (availability) => {
      if (
        !useTabStoreBase.getState().chordBeingEdited &&
        !useTabStoreBase.getState().strummingPatternBeingEdited
      ) {
        publishAvailability(availability);
      }
    },
  });
  const chordHistory = createEditorHistory<
    NonNullable<TabState["chordBeingEdited"]>
  >({ equals: isEqual, onChange: publishAvailability });
  const patternHistory = createEditorHistory<
    NonNullable<TabState["strummingPatternBeingEdited"]>
  >({ equals: isEqual, onChange: publishAvailability });
  const histories = [documentHistory, chordHistory, patternHistory];

  const editDocument = (
    update: Partial<TabState> | ((draft: Draft<TabState>) => void),
  ) => {
    const before = getEditorDocument(useTabStoreBase.getState());
    useTabStoreBase.setState(update);
    if (useTabStoreBase.getState().editing) {
      documentHistory.record(
        before,
        getEditorDocument(useTabStoreBase.getState()),
      );
    }
  };

  const restoreHistory = (direction: "undo" | "redo") => {
    const state = useTabStoreBase.getState();
    if (!state.editing) return;

    if (state.chordBeingEdited) {
      const chord = chordHistory[direction](state.chordBeingEdited);
      if (chord === undefined) return;
      state.pauseAudio();
      useTabStoreBase.setState({
        chordBeingEdited: chord,
        editorHistoryRevision: state.editorHistoryRevision + 1,
      });
      return;
    }
    if (state.strummingPatternBeingEdited) {
      const pattern = patternHistory[direction](
        state.strummingPatternBeingEdited,
      );
      if (pattern === undefined) return;
      state.pauseAudio();
      useTabStoreBase.setState({
        strummingPatternBeingEdited: pattern,
        editorHistoryRevision: state.editorHistoryRevision + 1,
      });
      return;
    }
    // These dialogs keep their own local draft histories.
    if (state.showCustomTuningDialog || state.showSectionProgressionDialog)
      return;

    const document = documentHistory[direction](getEditorDocument(state));
    if (document === undefined) return;
    state.pauseAudio(true, true);
    if (useTabStoreBase.getState() === getTabStore()) {
      setHoveredChordLocationValue(null);
    }
    useTabStoreBase.setState({
      ...document,
      editorHistoryRevision: state.editorHistoryRevision + 1,
      tabIsEffectivelyEmpty: tabIsEffectivelyEmpty(document.tabData),
      currentlyPlayingMetadata: null,
      playbackMetadata: null,
      expandedTabData: null,
      currentChordIndex: 0,
      playbackStartedAtAudioTime: null,
      audioMetadata: { ...initialStoreState.audioMetadata },
      previewMetadata: { ...initialStoreState.previewMetadata },
      draftLoopStartIndex: null,
      draftLoopEndIndex: null,
      chordPulse: null,
      countInTimer: { showing: false, forSectionContainer: null },
    });
  };

  const useTabStoreBase = create<TabState>()(
    devtools(
      immer((set, get) => ({
        canUndo: false,
        canRedo: false,
        editorHistoryRevision: 0,
        undo: () => restoreHistory("undo"),
        redo: () => restoreHistory("redo"),
        clearEditorHistory: () => {
          histories.forEach((history) => history.clear());
        },
        groupEditorHistoryInput: (input, operation) => {
          histories.forEach((history) => history.groupInput(input, operation));
        },
        breakEditorHistoryGroup: () => {
          histories.forEach((history) => history.breakGroup());
        },
        // used in <Tab />
        originalTabData: null,
        setOriginalTabData: (originalTabData) => set({ originalTabData }),
        id: -1,
        setId: (id) => {
          if (id !== get().id) get().clearEditorHistory();
          set({ id });
        },
        createdByUserId: null,
        setCreatedByUserId: (createdByUserId) => set({ createdByUserId }),
        createdAt: null,
        setCreatedAt: (createdAt) => set({ createdAt }),
        updatedAt: null,
        setUpdatedAt: (updatedAt) => set({ updatedAt }),
        title: "",
        setTitle: (title) => editDocument({ title }),

        tabData: [
          {
            id: crypto.randomUUID(),
            title: "Section 1",
            data: [],
          },
        ],
        setTabData: (updater) =>
          editDocument((draft) => {
            updater(draft.tabData);
            initializeEmptyChordSequences(draft);
          }),

        artistId: null,
        setArtistId: (artistId) => editDocument({ artistId }),
        artistName: undefined,
        setArtistName: (artistName) => editDocument({ artistName }),
        artistIsVerified: false,
        setArtistIsVerified: (artistIsVerified) =>
          editDocument({ artistIsVerified }),

        description: null,
        setDescription: (description) => editDocument({ description }),
        genre: "",
        setGenre: (genre) => editDocument({ genre }),
        tuning: DEFAULT_TUNING,
        setTuning: (tuning) =>
          editDocument({ tuning: normalizeTuningValue(tuning) }),
        bpm: 75,
        setBpm: (bpm) => editDocument({ bpm }),
        capo: 0,
        setCapo: (capo) => editDocument({ capo }),
        key: null,
        setKey: (key) => editDocument({ key }),
        difficulty: 1,
        setDifficulty: (difficulty) => editDocument({ difficulty }),
        chords: [],
        setChords: (chords) => editDocument({ chords }),
        strummingPatterns: [],
        setStrummingPatterns: (strummingPatterns) =>
          editDocument((draft) => {
            draft.strummingPatterns = strummingPatterns;
            initializeEmptyChordSequences(draft);
          }),
        chordDisplayMode: "text",
        setChordDisplayMode: (chordDisplayMode) => set({ chordDisplayMode }),
        ratingsCount: 0,
        setRatingsCount: (ratingsCount) => set({ ratingsCount }),
        averageRating: 0.0,
        setAverageRating: (averageRating) => set({ averageRating }),
        bookmarkCount: 0,
        setBookmarkCount: (bookmarkCount) => set({ bookmarkCount }),
        editing: false,
        setEditing: (editing) => {
          get().breakEditorHistoryGroup();
          set({ editing });
        },
        sectionProgression: [],
        setSectionProgression: (sectionProgression, options) => {
          if (options?.recordHistory === false) set({ sectionProgression });
          else editDocument({ sectionProgression });
        },
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

        tabIsEffectivelyEmpty: true,
        setTabIsEffectivelyEmpty: (tabIsEffectivelyEmpty) =>
          set({ tabIsEffectivelyEmpty }),

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
        breakOnNextChord: false,
        setBreakOnNextChord: (breakOnNextChord) => set({ breakOnNextChord }),
        masterVolumeGainNode: null,
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
        setPlaybackSpeed: (playbackSpeed) =>
          set({ playbackSpeed: clampPlaybackSpeed(playbackSpeed) }),
        currentChordIndex: 0,
        setCurrentChordIndex: (currentChordIndex) => {
          set({ currentChordIndex });
        },
        playbackStartedAtAudioTime: null,
        playbackSessionId: 0,
        scheduledPlaybackNodes: [],
        activePlaybackStrings: null,
        audioMetadata: {
          playing: false,
          location: null,
          startLoopIndex: 0,
          endLoopIndex: -1,
          editingLoopRange: false,
          fullTabMetadataLength: -1,
        },
        setAudioMetadata: (audioMetadata) => {
          const previous = get().audioMetadata;
          // A section change gives chord indices a different playback scope.
          if (
            !audioMetadata.editingLoopRange ||
            !isEqual(audioMetadata.location, previous.location) ||
            audioMetadata.startLoopIndex !== previous.startLoopIndex ||
            audioMetadata.endLoopIndex !== previous.endLoopIndex
          ) {
            playbackLoopRangeEntryChordIndex = null;
          }
          set({ audioMetadata });
        },
        draftLoopStartIndex: null,
        draftLoopEndIndex: null,
        setDraftLoopStartIndex: (draftLoopStartIndex) =>
          set({ draftLoopStartIndex }),
        setDraftLoopEndIndex: (draftLoopEndIndex) => set({ draftLoopEndIndex }),
        setDraftLoopRange: ({ startIndex, endIndex }) =>
          set({
            draftLoopStartIndex: startIndex,
            draftLoopEndIndex: endIndex,
          }),
        enterPlaybackLoopRangeEditor: () => {
          const { audioMetadata, currentChordIndex, loopDelay } = get();
          if (audioMetadata.editingLoopRange) return;

          playbackLoopRangeEntryChordIndex = currentChordIndex;

          const mappedChordIndex = mapLoopRelativeChordIndexToFullTabIndex({
            currentChordIndex,
            startLoopIndex: audioMetadata.startLoopIndex,
            endLoopIndex: audioMetadata.endLoopIndex,
            fullTabMetadataLength: audioMetadata.fullTabMetadataLength,
            loopDelay,
          });

          const initialDraft = getInitialDraftLoopRange(audioMetadata);

          set({
            draftLoopStartIndex: initialDraft.startIndex,
            draftLoopEndIndex: initialDraft.endIndex,
            currentChordIndex: mappedChordIndex,
            audioMetadata: {
              ...audioMetadata,
              editingLoopRange: true,
            },
          });
        },
        cancelPlaybackLoopRangeEditor: () => {
          const { audioMetadata } = get();
          if (!audioMetadata.editingLoopRange) return;

          const currentChordIndex = playbackLoopRangeEntryChordIndex ?? 0;
          playbackLoopRangeEntryChordIndex = null;
          set({
            currentChordIndex,
            draftLoopStartIndex: null,
            draftLoopEndIndex: null,
            audioMetadata: {
              ...audioMetadata,
              editingLoopRange: false,
            },
          });
        },
        selectPlaybackLoopRangeChord: (index) => {
          const {
            audioMetadata,
            playbackMetadata,
            draftLoopStartIndex,
            draftLoopEndIndex,
          } = get();

          const fullLength = audioMetadata.fullTabMetadataLength;
          if (fullLength <= 1 || index < 0 || index >= fullLength) return;

          const metadataType = playbackMetadata?.[index]?.type;
          if (
            metadataType === "ornamental" ||
            metadataType === "loopDelaySpacer"
          ) {
            return;
          }

          const lastIndex = fullLength - 1;
          const start = draftLoopStartIndex;
          const end = draftLoopEndIndex;

          // Completed range: clicking an endpoint deselects only that endpoint.
          if (start !== null && end !== null) {
            if (index === start) {
              set({ draftLoopStartIndex: null });
              return;
            }
            if (index === end) {
              set({ draftLoopEndIndex: null });
              return;
            }

            // Clicking + elsewhere starts a new range from that chord.
            if (index === lastIndex) return;
            set({
              draftLoopStartIndex: index,
              draftLoopEndIndex: null,
            });

            return;
          }

          // Start selected, awaiting end.
          if (start !== null && end === null) {
            if (index === start) {
              set({ draftLoopStartIndex: null });
              return;
            }
            if (index <= start || Math.abs(index - start) < 1) return;

            set({ draftLoopEndIndex: index });

            return;
          }

          // End selected (or neither), awaiting start.
          if (start === null) {
            if (end !== null && index === end) {
              set({ draftLoopEndIndex: null });
              return;
            }

            if (end !== null) {
              if (index >= end || Math.abs(end - index) < 1) return;
              set({ draftLoopStartIndex: index });

              return;
            }

            if (index === lastIndex) return;
            set({ draftLoopStartIndex: index });
          }
        },
        instruments: {} as Record<InstrumentNames, Soundfont.Player>,
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
        interactingWithAudioProgressSlider: false,
        setInteractingWithAudioProgressSlider: (
          interactingWithAudioProgressSlider,
        ) => set({ interactingWithAudioProgressSlider }),
        countInTimerEnabled: true,
        setCountInTimerEnabled: (countInTimerEnabled) =>
          set({ countInTimerEnabled }),
        hoveredChordLocation: null,
        // Module-level, not `set()`: mouseenter must not notify every column.
        setHoveredChordLocation: (hoveredChordLocation) => {
          if (get() === getTabStore()) {
            setHoveredChordLocationValue(hoveredChordLocation);
          }
        },

        // this function is needed because react doesn't want you to directly
        // update a property of a value returned from a hook
        updateMasterVolumeGainNode: (newVolume: number) => {
          const { masterVolumeGainNode } = get();

          if (!masterVolumeGainNode) return;

          masterVolumeGainNode.gain.value = newVolume;
        },

        // playing/pausing sound functions
        initializeAudioSystem: () => audioController.initialize(),
        disposeAudioSystem: () => audioController.dispose(),
        subscribeAudioLifecycle: (listener) =>
          audioController.subscribe(listener),
        ensureAudioContextReady: () => {
          const readiness = audioController.ensureRunning();
          return readiness.then((context) => {
            const { audioContext, masterVolumeGainNode } = get();
            if (
              !context ||
              context !== audioContext ||
              !masterVolumeGainNode ||
              isAudioPageHidden()
            )
              return null;
            return { audioContext: context, masterVolumeGainNode };
          });
        },
        audioPreparationPending: false,
        ensureAudioSystemReady: () => {
          // Resource-free readiness starts resume synchronously in the gesture.
          const contextReady = get().ensureAudioContextReady();
          const initialContext = get().audioContext;
          if (!initialContext) return Promise.resolve(null);
          if (
            audioPreparation &&
            audioPreparationContext === initialContext &&
            audioPreparationInstrument === get().currentInstrumentName &&
            audioPreparationPauseId === audioPauseRequestId
          )
            return audioPreparation;
          audioPreparationContext = initialContext;
          audioPreparationInstrument = get().currentInstrumentName;
          set({ audioPreparationPending: true });
          const pauseRequestId = audioPauseRequestId;
          audioPreparationPauseId = pauseRequestId;

          const preparation = (async () => {
            const graph = await contextReady;
            if (!graph) return null;
            const context = graph.audioContext;

            const { masterVolumeGainNode, currentInstrumentName } = get();
            if (
              !masterVolumeGainNode ||
              get().audioContext !== context ||
              pauseRequestId !== audioPauseRequestId
            )
              return null;

            // Soundfonts are cached per context. A load from an abandoned graph
            // must never overwrite the current instrument or its cache.
            try {
              const player = await ensureSoundfontPlayer(
                context,
                currentInstrumentName,
                masterVolumeGainNode,
              );
              const countInBuffer = get().countInBuffer;
              const latest = get();
              if (
                latest.audioContext !== context ||
                pauseRequestId !== audioPauseRequestId ||
                latest.currentInstrumentName !== currentInstrumentName ||
                isAudioPageHidden()
              )
                return null;
              set({
                instruments: {
                  ...latest.instruments,
                  [currentInstrumentName]: player,
                },
                currentInstrument: player,
                countInBuffer,
              });
              // Loading can span a phone call or app switch. Check again before
              // either full playback, count-in, or a preview can mark playing.
              if (!(await get().ensureAudioContextReady())) {
                return null;
              }
              if (
                get().audioContext !== context ||
                pauseRequestId !== audioPauseRequestId ||
                get().currentInstrumentName !== currentInstrumentName ||
                isAudioPageHidden()
              )
                return null;
              return {
                audioContext: context,
                masterVolumeGainNode,
                currentInstrument: player,
                countInBuffer,
              };
            } catch (error) {
              if (
                get().audioContext === context &&
                context.state !== "closed" &&
                pauseRequestId === audioPauseRequestId
              )
                console.error("Failed to prepare playback audio:", error);
              return null;
            }
          })()
            .catch((error) => {
              console.error("Failed to recover playback audio:", error);
              return null;
            })
            .finally(() => {
              if (audioPreparation === preparation) {
                audioPreparation = null;
                audioPreparationContext = null;
                set({ audioPreparationPending: false });
              }
            });
          audioPreparation = preparation;
          return preparation;
        },

        playTabWithCountIn: async ({ location, countIn = true } = {}) => {
          get().pauseAudio();
          const requestId = ++audioStartRequestId;
          const ready = await get().ensureAudioSystemReady();
          if (!ready || requestId !== audioStartRequestId) return;
          if (!countIn) {
            void get().playTab({ location });
            return;
          }
          const { audioContext, masterVolumeGainNode, countInBuffer } = ready;
          if (
            requestId !== audioStartRequestId ||
            get().audioContext !== audioContext ||
            isAudioPageHidden()
          )
            return;
          const sessionId = get().playbackSessionId;
          set({ countInTimer: { ...get().countInTimer, showing: true } });
          {
            const nodes: (AudioBufferSourceNode | OscillatorNode)[] = [];
            const countInStart = audioContext.currentTime + 0.3;
            for (let beat = 0; beat < 3; beat++) {
              const when = countInStart + beat;
              const gain = audioContext.createGain();
              let source: AudioBufferSourceNode | OscillatorNode;
              if (countInBuffer) {
                const sample = audioContext.createBufferSource();
                sample.buffer = countInBuffer;
                sample.detune.value = beat === 1 ? -50 : 0;
                source = sample;
                gain.gain.value = 0.25;
              } else {
                // Count-in must remain usable while its optional sample is
                // downloading or unavailable after a network change.
                const click = audioContext.createOscillator();
                click.frequency.value = beat === 1 ? 950 : 1000;
                source = click;
                gain.gain.setValueAtTime(0.15, when);
                gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
              }
              source.connect(gain);
              gain.connect(masterVolumeGainNode);
              source.onended = () => {
                source.disconnect();
                gain.disconnect();
              };
              source.start(when);
              if (!countInBuffer) source.stop(when + 0.08);
              nodes.push(source);
            }
            set({ scheduledPlaybackNodes: nodes });
          }
          countInTimeout = setTimeout(() => {
            countInTimeout = undefined;
            const latest = get();
            if (
              requestId !== audioStartRequestId ||
              latest.playbackSessionId !== sessionId ||
              latest.audioContext !== audioContext ||
              audioContext.state !== "running" ||
              !latest.countInTimer.showing ||
              isAudioPageHidden()
            )
              return;
            set({ countInTimer: { ...latest.countInTimer, showing: false } });
            void get().playTab({ location });
          }, 3000);
        },

        playTab: async ({ location }: PlayTab = {}) => {
          if (get().countInTimer.showing) get().pauseAudio();
          const startRequestId = ++audioStartRequestId;
          const {
            tabData,
            audioMetadata,
            editing,
            sectionProgression: rawSectionProgression,
            tuning: tuningNotes,
            bpm: baselineBpm,
            capo,
            chords,
            strummingPatterns,
            playbackSpeed,
            currentChordIndex,
            setCurrentlyPlayingMetadata,
            visiblePlaybackContainerWidth,
            setPlaybackMetadata,
            loopDelay,
            ensureAudioSystemReady,
            atomicallyUpdateAudioMetadata,
          } = get();

          const audioSystem = await ensureAudioSystemReady();
          if (!audioSystem || startRequestId !== audioStartRequestId) return;

          const { currentInstrument, audioContext, masterVolumeGainNode } =
            audioSystem;

          if (audioContext.state !== "running") return;

          const currentlyPlayingStrings: (
            Soundfont.Player | AudioBufferSourceNode | undefined
          )[] = [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ];

          // Omit `location` to resume the current scope; pass null for the whole tab.
          const locationWasProvided = location !== undefined;
          const requestedLocation: PlayTabLocation | null = locationWasProvided
            ? location
            : audioMetadata.location;

          const locationForAudioMetadata = requestedLocation
            ? {
                sectionIndex: requestedLocation.sectionIndex,
                ...(requestedLocation.subSectionIndex !== undefined && {
                  subSectionIndex: requestedLocation.subSectionIndex,
                }),
                ...(requestedLocation.chordSequenceIndex !== undefined && {
                  chordSequenceIndex: requestedLocation.chordSequenceIndex,
                }),
              }
            : null;

          const sectionProgression =
            !editing && locationForAudioMetadata?.sectionIndex !== undefined
              ? // just for when playing back specific section within PlaybackModal
                [
                  {
                    id: "",
                    sectionId:
                      tabData[locationForAudioMetadata.sectionIndex]?.id ?? "",
                    title: "",
                    repetitions: 1,
                    startSeconds: 0,
                    endSeconds: 0,
                  },
                ]
              : // all other use-cases
                rawSectionProgression.length > 0
                ? rawSectionProgression
                : generateDefaultSectionProgression(tabData);

          const tuning = parse(tuningNotes);

          // entire tab should be shown while editing the loop range
          const adjStartLoopIndex = audioMetadata.editingLoopRange
            ? 0
            : audioMetadata.startLoopIndex;

          const adjEndLoopIndex = audioMetadata.editingLoopRange
            ? -1
            : audioMetadata.endLoopIndex;

          const compiledChords =
            editing && locationForAudioMetadata
              ? compileSpecificChordGrouping({
                  tabData,
                  location: locationForAudioMetadata,
                  chords,
                  strummingPatterns,
                  baselineBpm,
                  playbackSpeed,
                  setCurrentlyPlayingMetadata,
                  startLoopIndex: adjStartLoopIndex,
                  endLoopIndex: adjEndLoopIndex,
                  atomicallyUpdateAudioMetadata,
                  forMetadataOnly: false,
                })
              : compileFullTab({
                  tabData,
                  sectionProgression,
                  chords,
                  strummingPatterns,
                  baselineBpm,
                  playbackSpeed,
                  setCurrentlyPlayingMetadata,
                  startLoopIndex: adjStartLoopIndex,
                  endLoopIndex: adjEndLoopIndex,
                  atomicallyUpdateAudioMetadata,
                  forMetadataOnly: false,
                  forPlayback: editing ? undefined : { loopDelay },
                });

          const expandedTabData = editing
            ? null
            : expandFullTab({
                tabData,
                location: locationForAudioMetadata,
                sectionProgression,
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
          // function, however I think it's cleaner to just augment the loop here range with the
          // % operator to achieve the same effect
          const adjChordCount =
            compiledChords.length *
            (expandedTabData === null
              ? 1
              : expandedTabData.artificialLoopsNecessary);

          const latestMetadata = get().currentlyPlayingMetadata;
          let startChordIndex = currentChordIndex;

          if (
            locationWasProvided &&
            requestedLocation?.chordIndex !== undefined &&
            latestMetadata
          ) {
            const hoveredChordIndex = requestedLocation.chordIndex;
            const matchedIndex = latestMetadata.findIndex(
              (entry) =>
                entry.location.sectionIndex ===
                  requestedLocation.sectionIndex &&
                entry.location.subSectionIndex ===
                  requestedLocation.subSectionIndex &&
                entry.location.chordSequenceIndex ===
                  requestedLocation.chordSequenceIndex &&
                entry.location.chordIndex === hoveredChordIndex,
            );
            startChordIndex = matchedIndex >= 0 ? matchedIndex : 0;
          } else if (startChordIndex >= adjChordCount) {
            startChordIndex = 0;
          }

          // Web Audio is most reliable when you schedule sounds slightly ahead of audioContext.currentTime
          const nextPlaybackSessionId = get().playbackSessionId + 1;
          const scheduledPlaybackNodes: { stop(when?: number): void }[] = [];

          const nextChordStartTime =
            audioContext.currentTime + PLAYBACK_START_EPSILON_SECONDS;

          set({
            audioMetadata: {
              ...audioMetadata,
              location: locationWasProvided
                ? locationForAudioMetadata
                : audioMetadata.location,
              playing: true,
            },
            currentChordIndex: startChordIndex,
            playbackStartedAtAudioTime: nextChordStartTime,
            playbackSessionId: nextPlaybackSessionId,
            scheduledPlaybackNodes,
            activePlaybackStrings: currentlyPlayingStrings,
            breakOnNextChord: false,
          });

          const activeSessionId = nextPlaybackSessionId;

          await runPlaybackScheduler({
            compiledChords,
            adjChordCount,
            startChordIndex,
            playbackStartTime: nextChordStartTime,
            playbackSpeed,
            tuning,
            capo: capo ?? 0,
            audioContext,
            masterVolumeGainNode,
            currentInstrument,
            currentlyPlayingStrings,
            scheduledNodes: scheduledPlaybackNodes,
            playbackSessionId: activeSessionId,
            editing,
            isSessionValid: () => get().playbackSessionId === activeSessionId,
            getState: () => {
              const state = get();
              return {
                breakOnNextChord: state.breakOnNextChord,
                looping: state.looping,
                showPlaybackModal: state.showPlaybackModal,
                audioMetadata: state.audioMetadata,
                currentChordIndex: state.currentChordIndex,
              };
            },
            setState: (partial) => set(partial),
            resetAudioRangeToStart: resetAudioRange,
            clearBreakOnNextChord: () => set({ breakOnNextChord: false }),
          });
        },

        playPreview: async ({
          data,
          index,
          type,
          customTuning,
          customBpm,
          forTuningPreview,
          onTuningPreviewNote,
          isPreviewValid,
          chordEffects,
          strumSpreadCompileValue,
        }: PlayPreview) => {
          if (get().countInTimer.showing) get().pauseAudio();
          const startRequestId = ++audioStartRequestId;
          const { capo, tuning, previewMetadata, ensureAudioSystemReady } =
            get();

          const audioSystem = await ensureAudioSystemReady();
          if (
            !audioSystem ||
            startRequestId !== audioStartRequestId ||
            (isPreviewValid && !isPreviewValid())
          )
            return;

          const { currentInstrument, audioContext, masterVolumeGainNode } =
            audioSystem;
          const { instruments } = get();

          if (!currentInstrument || audioContext.state !== "running") return;

          const currentlyPlayingStrings: (
            Soundfont.Player | AudioBufferSourceNode | undefined
          )[] = [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ];

          const previewScheduledNodes: { stop(when?: number): void }[] = [];
          set({
            activePlaybackStrings: currentlyPlayingStrings,
            scheduledPlaybackNodes: previewScheduledNodes,
            breakOnNextPreviewChord: false,
          });

          const compiledChords =
            type === "chord"
              ? [
                  [
                    "",
                    ...(data as string[]),
                    chordEffects ?? "v",
                    "quarter",
                    customBpm ?? "58",
                    strumSpreadCompileValue ?? "auto",
                  ],
                ]
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
            // ^^ doing this here because didn't update in time with one that was above the loop

            const currColumn = compiledChords[chordIndex];

            if (currColumn === undefined) continue;

            // Calculate the altered BPM using the provided formula
            const noteLengthMultiplier =
              noteLengthMultipliers[currColumn[8] as FullNoteLengths];
            const baseBpm = Number(currColumn[9]);
            const effectiveBpm = baseBpm * (1 / noteLengthMultiplier);

            await playNoteColumn({
              tuning: parse(
                type === "chord"
                  ? (customTuning ?? tuning)
                  : "e2 a2 d3 g3 b3 e4",
              ),
              capo: type === "chord" && !forTuningPreview ? capo : 0,
              bpm: effectiveBpm,
              currColumn,
              audioContext,
              masterVolumeGainNode,
              currentInstrument,
              currentlyPlayingStrings,
              scheduledNodes: previewScheduledNodes,
              acousticSteelOverrideForPreview:
                instruments.acoustic_guitar_steel,
              forTuningPreview: forTuningPreview === true,
              isSessionValid: isPreviewValid,
              onNoteStart:
                forTuningPreview && onTuningPreviewNote
                  ? (stringIndex) => onTuningPreviewNote(5 - stringIndex)
                  : undefined,
            });

            if (isPreviewValid && !isPreviewValid()) return;

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
          audioStartRequestId += 1;
          audioPauseRequestId += 1;
          set({ audioPreparationPending: false });
          clearTimeout(countInTimeout);
          countInTimeout = undefined;
          if (get().countInTimer.showing)
            set({ countInTimer: { ...get().countInTimer, showing: false } });
          const {
            audioMetadata,
            previewMetadata,
            currentInstrument,
            scheduledPlaybackNodes,
            activePlaybackStrings,
            audioContext,
          } = get();

          const stopTime = audioContext?.currentTime ?? 0;

          stopAllScheduledPlaybackNodes(scheduledPlaybackNodes, stopTime);
          stopActivePlaybackStrings(activePlaybackStrings, stopTime);
          currentInstrument?.stop(stopTime);

          const nextPlaybackSessionId = get().playbackSessionId + 1;

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

            resetAudioRange("editing");
            set({
              currentChordIndex: 0,
              playbackStartedAtAudioTime: null,
              playbackSessionId: nextPlaybackSessionId,
              scheduledPlaybackNodes: [],
              activePlaybackStrings: null,
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
              playbackStartedAtAudioTime: null,
              breakOnNextChord: true,
              playbackSessionId: nextPlaybackSessionId,
              scheduledPlaybackNodes: [],
              activePlaybackStrings: null,
            });

            if (resetToStart) {
              resetAudioRange("editing");
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
              playbackSessionId: nextPlaybackSessionId,
              scheduledPlaybackNodes: [],
              activePlaybackStrings: null,
            });

            if (resetToStart) {
              resetAudioRange("editing");
              set({
                currentChordIndex: 0,
              });
            }
          } else {
            set({
              playbackSessionId: nextPlaybackSessionId,
              scheduledPlaybackNodes: [],
              activePlaybackStrings: null,
            });
          }
        },

        reanchorPlaybackStripAnimation: () => {
          const { audioContext, audioMetadata } = get();

          if (!audioContext || !audioMetadata.playing) return;

          set({
            playbackStartedAtAudioTime:
              audioContext.currentTime + PLAYBACK_START_EPSILON_SECONDS,
          });
        },

        resetPlaybackModalSession: () => {
          get().pauseAudio();
          playbackLoopRangeEntryChordIndex = null;

          const latest = get();
          set({
            showPlaybackModal: false,
            playbackStartedAtAudioTime: null,
            currentChordIndex: 0,
            playbackModalViewingState: "Practice",
            visiblePlaybackContainerWidth: 0,
            countInTimer: {
              ...latest.countInTimer,
              showing: false,
            },
            audioMetadata: {
              ...latest.audioMetadata,
              location: null,
              playing: false,
              editingLoopRange: false,
              startLoopIndex: 0,
              endLoopIndex: -1,
            },
            draftLoopStartIndex: null,
            draftLoopEndIndex: null,
          });
        },

        expandedTabData: null,
        setExpandedTabData: (expandedTabData) => set({ expandedTabData }),

        // modals
        showSectionProgressionDialog: false,
        setShowSectionProgressionDialog: (showSectionProgressionDialog) =>
          set({ showSectionProgressionDialog }),
        showGlossaryDialog: false,
        setShowGlossaryDialog: (showGlossaryDialog) =>
          set({ showGlossaryDialog }),
        showDeleteAccountModal: false,
        setShowDeleteAccountModal: (showDeleteAccountModal) =>
          set({ showDeleteAccountModal }),
        showCustomTuningDialog: false,
        setShowCustomTuningDialog: (showCustomTuningDialog) =>
          set({ showCustomTuningDialog }),
        showMobileHeaderModal: false,
        setShowMobileHeaderModal: (showMobileHeaderModal) =>
          set({ showMobileHeaderModal }),

        // below are also used to determine if respective dialog should be showing
        chordBeingEdited: null,
        setChordBeingEdited: (chordBeingEdited) => {
          const previous = get().chordBeingEdited;
          set({ chordBeingEdited });
          if (
            previous !== null &&
            chordBeingEdited !== null &&
            previous.value.id === chordBeingEdited.value.id
          ) {
            chordHistory.record(previous, get().chordBeingEdited!);
          } else {
            chordHistory.clear();
            if (chordBeingEdited) documentHistory.breakGroup();
            if (!chordBeingEdited) set(documentHistory.availability());
          }
        },
        strummingPatternBeingEdited: null,
        setStrummingPatternBeingEdited: (strummingPatternBeingEdited) => {
          const previous = get().strummingPatternBeingEdited;
          set({ strummingPatternBeingEdited });
          if (
            previous !== null &&
            strummingPatternBeingEdited !== null &&
            previous.value.id === strummingPatternBeingEdited.value.id
          ) {
            patternHistory.record(previous, get().strummingPatternBeingEdited!);
          } else {
            patternHistory.clear();
            if (strummingPatternBeingEdited) documentHistory.breakGroup();
            if (!strummingPatternBeingEdited)
              set(documentHistory.availability());
          }
        },
        showPlaybackModal: false,
        setShowPlaybackModal: (showPlaybackModal) => set({ showPlaybackModal }),
        playbackModalViewingState: "Practice",
        setPlaybackModalViewingState: (playbackModalViewingState) =>
          set({ playbackModalViewingState }),

        isLoadingARoute: false,
        setIsLoadingARoute: (isLoadingARoute) => set({ isLoadingARoute }),
        viewportLabel: "mobile",
        setViewportLabel: (viewportLabel) => set({ viewportLabel }),

        // theme
        color: "maple",
        setColor: (color) => set({ color }),
        theme: "light",
        setTheme: (theme) => set({ theme }),
        followsDeviceTheme: true,
        setFollowsDeviceTheme: (followsDeviceTheme) =>
          set({ followsDeviceTheme }),

        // reset
        resetStoreToInitValues: () => {
          playbackLoopRangeEntryChordIndex = null;
          if (useTabStoreBase.getState() === getTabStore()) {
            setHoveredChordLocationValue(null);
          }
          set(initialStoreState);
          get().clearEditorHistory();
        },
        ...initialValues,
      })),
    ),
  );

  return useTabStoreBase;
};

const useTabStoreBase = createTabStore();

export const TabStoreContext = createContext<ReturnType<
  typeof createTabStore
> | null>(null);

/** Embedded editors can share the production components with an independent session. */
export const useTabStoreApi = () =>
  useContext(TabStoreContext) ?? useTabStoreBase;

export const useTabStore = <T>(selector: (state: TabState) => T): T => {
  return useStore(useTabStoreApi(), useShallow(selector));
};

export const useTabDataGetter = () => {
  const store = useTabStoreApi();
  return useCallback(() => store.getState().tabData, [store]);
};

/** Non-reactive store access for event handlers / imperative subscriptions. */
export const getTabStore = () => useTabStoreBase.getState();

export const subscribeTabStore = useTabStoreBase.subscribe;

// Playwright verify scripts (`scripts/verify*.mjs`) read compiled metadata
// without mounting React selectors. Dev/test only surface — not used by UI.
if (typeof window !== "undefined") {
  (
    window as unknown as {
      __AUTOSTRUM_GET_TAB_STORE__?: typeof getTabStore;
    }
  ).__AUTOSTRUM_GET_TAB_STORE__ = getTabStore;
}

export const stringifyFullTabState = () => {
  return JSON.stringify(getEditorDocument(useTabStoreBase.getState()));
};

export const getTabData = () => useTabStoreBase.getState().tabData;
