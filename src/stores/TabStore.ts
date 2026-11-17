import {
  getEditorDocument,
  editorDocumentsEqual,
  initializeEmptyChordSequences,
} from "./tab/document";
import type { Draft } from "immer";
import isEqual from "lodash.isequal";
import { createContext, useCallback, useContext } from "react";
import {
  create,
  useStore,
  type Mutate,
  type StoreApi,
  type UseBoundStore,
} from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/shallow";
import { appendNewlyAddedSectionsToProgression } from "~/utils/appendNewlyAddedSectionsToProgression";
import { resetAudioRangeToStart } from "~/utils/audioRangeHelpers";
import { createEditorHistory } from "~/utils/createEditorHistory";
import { setHoveredChordLocationValue } from "~/utils/hoveredChordLocation";
import { ensureSectionProgression } from "~/utils/sectionProgression";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { DEFAULT_TUNING, normalizeTuningValue } from "~/utils/tunings";
import {
  createAppPreferencesStore,
  defaultAppPreferencesStore,
  type AppPreferencesState,
} from "./AppPreferencesStore";
import { createAudioSlice } from "./tab/audio";
import { initialStoreState } from "./tab/initialState";
import type { AudioMetadata, TabDocument, TabState } from "./tab/types";
export { noteLengthMultipliers } from "~/utils/noteLengthMultipliers";
export { baseNoteLengthMultipliers } from "./tab/types";
export type {
  AudioMetadata,
  BaseNoteLengths,
  COLORS,
  Chord,
  ChordSection,
  ChordSequence,
  CopiedData,
  FullNoteLengths,
  HoveredChordLocation,
  InstrumentNames,
  Metadata,
  PlayPreview,
  PlayTab,
  PlayTabLocation,
  PlaybackChord,
  PlaybackLoopDelaySpacerChord,
  PlaybackMetadata,
  PlaybackStrummedChord,
  PlaybackTabChord,
  PreviewMetadata,
  Section,
  SectionProgression,
  Strum,
  StrummingPattern,
  THEME,
  TabDocument,
  TabMeasureLine,
  TabNote,
  TabSection,
  TabState,
} from "./tab/types";

export type TabStoreApi = UseBoundStore<
  Mutate<
    StoreApi<TabState>,
    [["zustand/devtools", never], ["zustand/immer", never]]
  >
> & { preferences: ReturnType<typeof createAppPreferencesStore> };

export const createTabStore = (
  initialValues: Partial<TabState & AppPreferencesState> = {},
  resetAudioRange = resetAudioRangeToStart,
  preferences = createAppPreferencesStore(initialValues),
): TabStoreApi => {
  const sessionValues = { ...initialValues };
  for (const key of [
    "color",
    "theme",
    "viewportLabel",
    "followsDeviceTheme",
    "setColor",
    "setTheme",
    "setViewportLabel",
    "setFollowsDeviceTheme",
  ] as const)
    delete sessionValues[key];
  const initialTabData = initialValues.tabData?.length
    ? initialValues.tabData
    : [{ id: crypto.randomUUID(), title: "Section 1", data: [] }];
  let playbackLoopRangeEntryChordIndex: number | null = null;
  let replacingDocument = false;
  const publishAvailability = (availability: {
    canUndo: boolean;
    canRedo: boolean;
  }) => {
    if (replacingDocument) return;
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
        loadDocument: (document, identity = {}) => {
          const tabData = document.tabData.length
            ? document.tabData
            : [{ id: crypto.randomUUID(), title: "Section 1", data: [] }];
          get().stopAudioResources();
          playbackLoopRangeEntryChordIndex = null;
          if (get() === getTabStore()) setHoveredChordLocationValue(null);
          replacingDocument = true;
          try {
            histories.forEach((history) => history.clear());
          } finally {
            replacingDocument = false;
          }
          set((draft) => {
            Object.assign(draft, document, identity, {
              tabData,
              tuning: normalizeTuningValue(document.tuning),
              sectionProgression: ensureSectionProgression(
                tabData,
                document.sectionProgression,
              ),
              canUndo: false,
              canRedo: false,
              editorHistoryRevision: draft.editorHistoryRevision + 1,
              tabIsEffectivelyEmpty: tabIsEffectivelyEmpty(tabData),
              currentlyCopiedData: null,
              currentlyCopiedChord: null,
              chordBeingEdited: null,
              strummingPatternBeingEdited: null,
              showSectionProgressionDialog: false,
              showCustomTuningDialog: false,
              currentlyPlayingMetadata: null,
              playbackMetadata: null,
              expandedTabData: null,
              currentChordIndex: 0,
              playbackStartedAtAudioTime: null,
              playbackSessionId: draft.playbackSessionId + 1,
              audioPreparationPending: false,
              playbackSpeed: draft.requestedPlaybackSpeed,
              audioMetadata: { ...initialStoreState.audioMetadata },
              previewMetadata: { ...initialStoreState.previewMetadata },
              countInTimer: { showing: false, forSectionContainer: null },
              draftLoopStartIndex: null,
              draftLoopEndIndex: null,
              chordPulse: null,
            });
            initializeEmptyChordSequences(draft);
          });
          resetAudioRange("editing");
        },
        importDocument: (document) => {
          get().pauseAudio(true, true);
          histories.forEach((history) => history.breakGroup());
          if (get() === getTabStore()) setHoveredChordLocationValue(null);
          editDocument({
            ...document,
            currentlyCopiedData: null,
            currentlyCopiedChord: null,
            audioMetadata: { ...initialStoreState.audioMetadata },
            previewMetadata: { ...initialStoreState.previewMetadata },
            draftLoopStartIndex: null,
            draftLoopEndIndex: null,
            chordPulse: null,
            editorHistoryRevision: get().editorHistoryRevision + 1,
          });
        },

        setTabData: (updater) =>
          editDocument((draft) => {
            const knownSectionIds = new Set(
              draft.tabData.map((section) => section.id),
            );
            updater(draft.tabData);
            if (draft.tabData.length === 0) {
              draft.tabData.push({
                id: crypto.randomUUID(),
                title: "Section 1",
                data: [],
              });
            }
            initializeEmptyChordSequences(draft);
            const sectionIds = new Set(
              draft.tabData.map((section) => section.id),
            );
            const remainingProgression = draft.sectionProgression.every(
              (entry) => sectionIds.has(entry.sectionId),
            )
              ? draft.sectionProgression
              : draft.sectionProgression.filter((entry) =>
                  sectionIds.has(entry.sectionId),
                );
            draft.sectionProgression = ensureSectionProgression(
              draft.tabData,
              appendNewlyAddedSectionsToProgression({
                tabData: draft.tabData,
                sectionProgression: remainingProgression,
                knownSectionIds,
              }),
            );
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
        setSectionProgression: (sectionProgression, options) => {
          const progression = ensureSectionProgression(
            get().tabData,
            sectionProgression,
          );
          if (options?.recordHistory === false)
            set({ sectionProgression: progression });
          else editDocument({ sectionProgression: progression });
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

        ...createAudioSlice(
          set,
          get,
          resetAudioRange,
          () => get() === getTabStore(),
          () => playbackLoopRangeEntryChordIndex,
          (value) => {
            playbackLoopRangeEntryChordIndex = value;
          },
          () => {
            playbackLoopRangeEntryChordIndex = null;
          },
        ),

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
        // reset
        resetStoreToInitValues: () => {
          get().pauseAudio();
          playbackLoopRangeEntryChordIndex = null;
          if (useTabStoreBase.getState() === getTabStore()) {
            setHoveredChordLocationValue(null);
          }
          set({
            ...initialStoreState,
            sectionProgression: ensureSectionProgression(
              initialStoreState.tabData,
              [],
            ),
          });
          get().clearEditorHistory();
        },
        requestedPlaybackSpeed: initialValues.playbackSpeed ?? 1,
        ...sessionValues,
        tabData: initialTabData,
        sectionProgression: ensureSectionProgression(
          initialTabData,
          initialValues.sectionProgression,
        ),
      })),
    ),
  );

  return Object.assign(useTabStoreBase, { preferences });
};

const useTabStoreBase = createTabStore(
  {},
  resetAudioRangeToStart,
  defaultAppPreferencesStore,
);
export const appPreferencesStore = useTabStoreBase.preferences;

export const TabStoreContext = createContext<ReturnType<
  typeof createTabStore
> | null>(null);

/** Embedded editors can share the production components with an independent session. */
export const useTabStoreApi = () =>
  useContext(TabStoreContext) ?? useTabStoreBase;

export const useTabStore = <T>(selector: (state: TabState) => T): T => {
  return useStore(useTabStoreApi(), selector);
};

/** Composite object/array selections must opt into shallow equality. */
export const useTabStoreShallow = <T>(selector: (state: TabState) => T): T =>
  useStore(useTabStoreApi(), useShallow(selector));

export const useTabDataGetter = () => {
  const store = useTabStoreApi();
  return useCallback(() => store.getState().tabData, [store]);
};

/** Non-reactive store access for event handlers / imperative subscriptions. */
export const getTabStore = (): TabState => useTabStoreBase.getState();

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
