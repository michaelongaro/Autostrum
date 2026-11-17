import isEqual from "lodash.isequal";
import { isMobileOnly } from "react-device-detect";
import type Soundfont from "soundfont-player";
import {
  createAudioContextController,
  isAudioPageHidden,
} from "~/utils/audioContextRecovery";
import type { resetAudioRangeToStart } from "~/utils/audioRangeHelpers";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  compileStrummingPatternPreview,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import type { PlaybackStrings } from "~/utils/guitarEffects";
import { setHoveredChordLocationValue } from "~/utils/hoveredChordLocation";
import {
  getInitialDraftLoopRange,
  mapLoopRelativeChordIndexToFullTabIndex,
} from "~/utils/loopRangeHelpers";
import { noteLengthMultipliers } from "~/utils/noteLengthMultipliers";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import {
  PLAYBACK_START_EPSILON_SECONDS,
  runPlaybackScheduler,
} from "~/utils/playbackScheduler";
import { clampPlaybackSpeed } from "~/utils/playbackSpeedControls";
import {
  playNoteColumn,
  stopActivePlaybackStrings,
  stopAllScheduledPlaybackNodes,
  type StoppablePlaybackNode,
} from "~/utils/playGeneratedAudioHelpers";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";
import { parse } from "~/utils/tunings";

import type { TabStateSetter } from "./storeTypes";
import type {
  FullNoteLengths,
  InstrumentNames,
  PlayPreview,
  PlayTab,
  PlayTabLocation,
  StrummingPattern,
  TabState,
} from "./types";
const MASTER_VOLUME_GAIN_MULTIPLIER = 2;

/** Per-session audio ownership. Mutable Web Audio registries never enter Immer state. */
export function createAudioSlice(
  set: TabStateSetter,
  get: () => TabState,
  resetAudioRange: typeof resetAudioRangeToStart,
  isGlobalSession: () => boolean,
  getLoopRangeEntry: () => number | null,
  setLoopRangeEntry: (value: number) => void,
  resetLoopRangeEntry: () => void,
) {
  let audioPreparation: ReturnType<TabState["ensureAudioSystemReady"]> | null =
    null;
  let audioPreparationContext: AudioContext | null = null;
  let audioPreparationInstrument = "";
  let audioPreparationPauseId = 0;
  let audioPauseRequestId = 0;
  let audioStartRequestId = 0;
  // Audio callbacks and the scheduler mutate these registries. Keep them outside
  // Immer state so document edits cannot freeze arrays still owned by Web Audio.
  let scheduledPlaybackNodes: StoppablePlaybackNode[] = [];
  let activePlaybackStrings: PlaybackStrings | null = null;

  let countInTimeout: ReturnType<typeof setTimeout> | undefined;
  const audioController = createAudioContextController({
    onContextChange: (context) => {
      const previousGain = get().masterVolumeGainNode;
      const gain = context?.createGain() ?? null;
      if (context && gain) {
        gain.gain.value =
          previousGain?.gain.value ??
          (isMobileOnly ? 1.25 : 1) * MASTER_VOLUME_GAIN_MULTIPLIER;
        gain.connect(context.destination);
      }
      set({
        audioContext: context,
        masterVolumeGainNode: gain,
        currentInstrument: null,
        instruments: {} as Record<InstrumentNames, Soundfont.Player>,
        countInBuffer: null,
      });
    },
    onUnavailable: () => get().pauseAudio(),
  });

  const stopAudioResources = () => {
    audioStartRequestId += 1;
    audioPauseRequestId += 1;
    clearTimeout(countInTimeout);
    countInTimeout = undefined;
    const { currentInstrument, audioContext } = get();

    const stopTime = audioContext?.currentTime ?? 0;

    stopAllScheduledPlaybackNodes(scheduledPlaybackNodes, stopTime);
    stopActivePlaybackStrings(activePlaybackStrings, stopTime);
    scheduledPlaybackNodes = [];
    activePlaybackStrings = null;
    currentInstrument?.stop(stopTime);
  };
  const state: Pick<
    TabState,
    | "stopAudioResources"
    | "audioContext"
    | "breakOnNextChord"
    | "setBreakOnNextChord"
    | "masterVolumeGainNode"
    | "showingAudioControls"
    | "setShowingAudioControls"
    | "currentlyPlayingMetadata"
    | "setCurrentlyPlayingMetadata"
    | "playbackMetadata"
    | "setPlaybackMetadata"
    | "visiblePlaybackContainerWidth"
    | "setVisiblePlaybackContainerWidth"
    | "currentInstrumentName"
    | "setCurrentInstrumentName"
    | "looping"
    | "setLooping"
    | "loopDelay"
    | "setLoopDelay"
    | "playbackSpeed"
    | "requestedPlaybackSpeed"
    | "setPlaybackSpeed"
    | "currentChordIndex"
    | "setCurrentChordIndex"
    | "playbackStartedAtAudioTime"
    | "playbackSessionId"
    | "audioMetadata"
    | "setAudioMetadata"
    | "draftLoopStartIndex"
    | "draftLoopEndIndex"
    | "setDraftLoopStartIndex"
    | "setDraftLoopEndIndex"
    | "setDraftLoopRange"
    | "enterPlaybackLoopRangeEditor"
    | "cancelPlaybackLoopRangeEditor"
    | "selectPlaybackLoopRangeChord"
    | "instruments"
    | "setInstruments"
    | "currentInstrument"
    | "setCurrentInstrument"
    | "previewMetadata"
    | "setPreviewMetadata"
    | "breakOnNextPreviewChord"
    | "setBreakOnNextPreviewChord"
    | "interactingWithAudioProgressSlider"
    | "setInteractingWithAudioProgressSlider"
    | "countInTimerEnabled"
    | "playbackMetronomeEnabled"
    | "setPlaybackMetronomeEnabled"
    | "setCountInTimerEnabled"
    | "hoveredChordLocation"
    | "setHoveredChordLocation"
    | "updateMasterVolumeGainNode"
    | "initializeAudioSystem"
    | "disposeAudioSystem"
    | "subscribeAudioLifecycle"
    | "ensureAudioContextReady"
    | "audioPreparationPending"
    | "ensureAudioSystemReady"
    | "playTabWithCountIn"
    | "playTab"
    | "playPreview"
    | "pauseAudio"
    | "reanchorPlaybackStripAnimation"
    | "resetPlaybackModalSession"
    | "expandedTabData"
    | "setExpandedTabData"
  > = {
    stopAudioResources,
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
    requestedPlaybackSpeed: 1,
    setPlaybackSpeed: (speed) => {
      const requestedPlaybackSpeed = clampPlaybackSpeed(speed);
      set({
        requestedPlaybackSpeed,
        ...(!get().audioMetadata.playing && {
          playbackSpeed: requestedPlaybackSpeed,
        }),
      });
    },
    currentChordIndex: 0,
    setCurrentChordIndex: (currentChordIndex) => {
      set({ currentChordIndex });
    },
    playbackStartedAtAudioTime: null,
    playbackSessionId: 0,
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
        resetLoopRangeEntry();
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

      setLoopRangeEntry(currentChordIndex);

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

      const currentChordIndex = getLoopRangeEntry() ?? 0;
      resetLoopRangeEntry();
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
      if (metadataType === "ornamental" || metadataType === "loopDelaySpacer") {
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
    countInTimerEnabled: false,
    playbackMetronomeEnabled: false,
    setPlaybackMetronomeEnabled: (playbackMetronomeEnabled) =>
      set({ playbackMetronomeEnabled }),
    setCountInTimerEnabled: (countInTimerEnabled) =>
      set({ countInTimerEnabled }),
    hoveredChordLocation: null,
    // Module-level, not `set()`: mouseenter must not notify every column.
    setHoveredChordLocation: (hoveredChordLocation) => {
      if (isGlobalSession()) {
        setHoveredChordLocationValue(hoveredChordLocation);
      }
    },

    // this function is needed because react doesn't want you to directly
    // update a property of a value returned from a hook
    updateMasterVolumeGainNode: (newVolume: number) => {
      const { masterVolumeGainNode } = get();

      if (!masterVolumeGainNode) return;

      masterVolumeGainNode.gain.value =
        newVolume * MASTER_VOLUME_GAIN_MULTIPLIER;
    },

    // playing/pausing sound functions
    initializeAudioSystem: () => audioController.initialize(),
    disposeAudioSystem: () => audioController.dispose(),
    subscribeAudioLifecycle: (listener) => audioController.subscribe(listener),
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

    playTabWithCountIn: async ({
      location,
      countIn = get().countInTimerEnabled,
    } = {}) => {
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
        scheduledPlaybackNodes = nodes;
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
      )[] = [undefined, undefined, undefined, undefined, undefined, undefined];

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
            entry.location.sectionIndex === requestedLocation.sectionIndex &&
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
      const playbackScheduledNodes: StoppablePlaybackNode[] = [];
      scheduledPlaybackNodes = playbackScheduledNodes;
      activePlaybackStrings = currentlyPlayingStrings;

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
        breakOnNextChord: false,
      });

      const activeSessionId = nextPlaybackSessionId;

      await runPlaybackScheduler({
        compiledChords,
        adjChordCount,
        startChordIndex,
        playbackStartTime: nextChordStartTime,
        playbackSpeed,
        loopDelayChordCount: editing ? 0 : loopDelay,
        tuning,
        capo: capo ?? 0,
        audioContext,
        masterVolumeGainNode,
        currentInstrument,
        currentlyPlayingStrings,
        scheduledNodes: playbackScheduledNodes,
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
            playbackMetronomeEnabled: state.playbackMetronomeEnabled,
            requestedPlaybackSpeed: state.requestedPlaybackSpeed,
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
      // Stop both sounding and future scheduled notes before replacing the
      // node collections. Every continuation belongs to this request only.
      get().pauseAudio();
      const startRequestId = ++audioStartRequestId;
      const isCurrentPreview = () =>
        startRequestId === audioStartRequestId &&
        (!isPreviewValid || isPreviewValid());
      const { capo, tuning, previewMetadata, ensureAudioSystemReady } = get();

      const audioSystem = await ensureAudioSystemReady();
      if (!audioSystem || !isCurrentPreview()) return;

      const { currentInstrument, audioContext, masterVolumeGainNode } =
        audioSystem;
      const { instruments } = get();

      if (!currentInstrument || audioContext.state !== "running") return;

      const currentlyPlayingStrings: (
        Soundfont.Player | AudioBufferSourceNode | undefined
      )[] = [undefined, undefined, undefined, undefined, undefined, undefined];

      const previewScheduledNodes: { stop(when?: number): void }[] = [];
      activePlaybackStrings = currentlyPlayingStrings;
      scheduledPlaybackNodes = previewScheduledNodes;
      set({
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
        if (!isCurrentPreview()) return;
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
            type === "chord" ? (customTuning ?? tuning) : "e2 a2 d3 g3 b3 e4",
          ),
          capo: type === "chord" && !forTuningPreview ? capo : 0,
          bpm: effectiveBpm,
          currColumn,
          audioContext,
          masterVolumeGainNode,
          currentInstrument,
          currentlyPlayingStrings,
          scheduledNodes: previewScheduledNodes,
          acousticSteelOverrideForPreview: instruments.acoustic_guitar_steel,
          forTuningPreview: forTuningPreview === true,
          isSessionValid: isCurrentPreview,
          onNoteStart:
            forTuningPreview && onTuningPreviewNote
              ? (stringIndex) => onTuningPreviewNote(5 - stringIndex)
              : undefined,
        });

        if (!isCurrentPreview()) return;

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
      stopAudioResources();
      set({
        audioPreparationPending: false,
        playbackSpeed: get().requestedPlaybackSpeed,
      });
      if (get().countInTimer.showing)
        set({ countInTimer: { ...get().countInTimer, showing: false } });
      const { audioMetadata, previewMetadata } = get();

      const nextPlaybackSessionId = get().playbackSessionId + 1;

      if (!audioMetadata.playing && !previewMetadata.playing && resetToStart) {
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
      resetLoopRangeEntry();

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
  };
  return state;
}
