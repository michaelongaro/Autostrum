import { DEFAULT_TUNING } from "~/utils/tunings";
import type { Section } from "./types";

export const initialStoreState = {
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
  playbackMetronomeEnabled: false,
  playbackModalViewingState: "Practice" as const,
  // Must reset with the route: stale width/expanded data from a previous tab
  // (or orientation) leaves the modal unable to virtualize/highlight chords.
  visiblePlaybackContainerWidth: 0,
  expandedTabData: null,

  // related to sound generation/playing
  currentlyPlayingMetadata: null,
  playbackMetadata: null,
  playbackSpeed: 1 as const,
  requestedPlaybackSpeed: 1,
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
