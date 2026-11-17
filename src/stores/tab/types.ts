import type Soundfont from "soundfont-player";
import type { Tab } from "~/generated/browser";
import type { AudioLifecycleEvent } from "~/utils/audioContextRecovery";
import type { PalmMuteSettings } from "~/utils/palmMuteAudio";
import type { PlaybackSpeed } from "~/utils/playbackSpeedControls";
export type SectionProgression = {
  id: string; // used to identify the section for the sorting context
  sectionId: string;
  title: string;
  repetitions: number;
  startSeconds: number;
  endSeconds: number;
};

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
  palmMuteSettings?: PalmMuteSettings;
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
  palmMuteSettings?: PalmMuteSettings;
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

export interface CopiedData {
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

export type InstrumentNames =
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

export interface PlayTab {
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
export interface PlayPreview {
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

export interface PlaybackChord {
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

export interface TabState {
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
  importDocument: (document: TabDocument) => void;
  /** Replace a document without recording hydration as an edit. */
  loadDocument: (
    document: TabDocument,
    identity?: Partial<
      Pick<
        TabState,
        "id" | "createdByUserId" | "createdAt" | "updatedAt" | "originalTabData"
      >
    >,
  ) => void;
  /** Stop external resources; callers must commit stopped transport state atomically. */
  stopAudioResources: () => void;

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
  playbackMetronomeEnabled: boolean;
  setPlaybackMetronomeEnabled: (enabled: boolean) => void;
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
  /** Tempo currently audible, also used by metadata and playhead clocks. */
  playbackSpeed: PlaybackSpeed;
  /** Slider selection; the scheduler applies it after already-buffered notes. */
  requestedPlaybackSpeed: PlaybackSpeed;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  currentChordIndex: number;
  setCurrentChordIndex: (currentChordIndex: number) => void;
  playbackStartedAtAudioTime: number | null;
  playbackSessionId: number;
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
  // reset
  resetStoreToInitValues: () => void;
}

export type TabDocument = Pick<
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
