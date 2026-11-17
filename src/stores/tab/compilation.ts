import isEqual from "lodash.isequal";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { updateElapsedSecondsInSectionProgression } from "~/utils/updateElapsedSecondsInSectionProgression";

import type { StoreApi } from "zustand";
import type { SectionProgression, TabState } from "./types";

/** Timing is output, while section identity/order/repetition are compilation inputs. */
export function progressionStructureEqual(
  a: SectionProgression[],
  b: SectionProgression[],
) {
  return (
    a === b ||
    (a.length === b.length &&
      a.every((entry, index) => {
        const other = b[index]!;
        return (
          entry.id === other.id &&
          entry.sectionId === other.sectionId &&
          entry.title === other.title &&
          entry.repetitions === other.repetitions
        );
      }))
  );
}

export function playbackCompilationInputsChanged(
  state: TabState,
  previous: TabState,
) {
  return (
    state.tabData !== previous.tabData ||
    state.playbackSpeed !== previous.playbackSpeed ||
    state.bpm !== previous.bpm ||
    !progressionStructureEqual(
      state.sectionProgression,
      previous.sectionProgression,
    ) ||
    state.chords !== previous.chords ||
    state.strummingPatterns !== previous.strummingPatterns ||
    state.visiblePlaybackContainerWidth !==
      previous.visiblePlaybackContainerWidth ||
    state.loopDelay !== previous.loopDelay ||
    state.editing !== previous.editing ||
    state.audioMetadata.endLoopIndex !== previous.audioMetadata.endLoopIndex ||
    state.audioMetadata.startLoopIndex !==
      previous.audioMetadata.startLoopIndex ||
    state.audioMetadata.editingLoopRange !==
      previous.audioMetadata.editingLoopRange ||
    state.audioMetadata.location !== previous.audioMetadata.location
  );
}

export function compileTabPlayback(
  store: Pick<StoreApi<TabState>, "getState" | "setState">,
  preservePlaybackStrip = false,
) {
  const patch: Partial<TabState> = {};
  const setCurrentlyPlayingMetadata: TabState["setCurrentlyPlayingMetadata"] = (
    value,
  ) => {
    patch.currentlyPlayingMetadata = value;
  };
  const setAudioMetadata: TabState["setAudioMetadata"] = (value) => {
    patch.audioMetadata = value;
  };
  const atomicallyUpdateAudioMetadata: TabState["atomicallyUpdateAudioMetadata"] =
    (value) => {
      patch.audioMetadata = {
        ...(patch.audioMetadata ?? store.getState().audioMetadata),
        ...value,
      };
    };
  const setExpandedTabData: TabState["setExpandedTabData"] = (value) => {
    patch.expandedTabData = value;
  };
  const setPlaybackMetadata: TabState["setPlaybackMetadata"] = (value) => {
    patch.playbackMetadata = value;
  };
  const setSectionProgression: TabState["setSectionProgression"] = (value) => {
    patch.sectionProgression = value;
  };
  const setTabIsEffectivelyEmpty: TabState["setTabIsEffectivelyEmpty"] = (
    value,
  ) => {
    patch.tabIsEffectivelyEmpty = value;
  };
  const {
    editing: isEditing,
    playbackSpeed,
    audioMetadata,
    bpm,
    sectionProgression: rawSectionProgression,
    chords,
    strummingPatterns,
    visiblePlaybackContainerWidth,
    loopDelay,
    tabData,
  } = store.getState();

  const isEffectivelyEmpty = tabIsEffectivelyEmpty(tabData);

  setTabIsEffectivelyEmpty(isEffectivelyEmpty);

  if (isEffectivelyEmpty) {
    setAudioMetadata({
      playing: false,
      location: null,
      startLoopIndex: 0,
      endLoopIndex: -1,
      editingLoopRange: false,
      fullTabMetadataLength: -1,
    });
    setCurrentlyPlayingMetadata(null);
    setPlaybackMetadata(null);
    setExpandedTabData(null);
    store.setState(patch);
    return;
  }

  const isPlaybackModalSectionOverride =
    !isEditing && audioMetadata.location?.sectionIndex !== undefined;

  const sectionProgression = isPlaybackModalSectionOverride
    ? // just for when playing back specific section within PlaybackModal
      [
        {
          id: "",
          sectionId: tabData[audioMetadata.location!.sectionIndex]?.id ?? "",
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

  if (isEditing && audioMetadata.location) {
    compileSpecificChordGrouping({
      tabData,
      location: audioMetadata.location,
      chords,
      strummingPatterns,
      baselineBpm: bpm,
      playbackSpeed,
      setCurrentlyPlayingMetadata,
      // While editing the loop range the strip shows the full selected
      // tab/section, so slider bounds/timestamps must match that scope.
      startLoopIndex: audioMetadata.editingLoopRange
        ? 0
        : audioMetadata.startLoopIndex,
      endLoopIndex: audioMetadata.editingLoopRange
        ? -1
        : audioMetadata.endLoopIndex,
      atomicallyUpdateAudioMetadata,
      forMetadataOnly: true,
    });
  } else {
    compileFullTab({
      tabData,
      sectionProgression: sectionProgression,
      chords,
      strummingPatterns,
      baselineBpm: bpm,
      playbackSpeed,
      setCurrentlyPlayingMetadata,
      startLoopIndex: audioMetadata.editingLoopRange
        ? 0
        : audioMetadata.startLoopIndex,
      endLoopIndex: audioMetadata.editingLoopRange
        ? -1
        : audioMetadata.endLoopIndex,
      atomicallyUpdateAudioMetadata,
      forMetadataOnly: true,
      forPlayback: isEditing ? undefined : { loopDelay },
    });
  }

  if (isEditing) {
    updateElapsedSecondsInSectionProgression({
      tabData,
      sectionProgression: sectionProgression,
      baselineBpm: bpm,
      // Playback timings are derived; they must not create history entries
      // or clear redo after a document is restored.
      setSectionProgression: (progression) =>
        setSectionProgression(progression, { recordHistory: false }),
    });
  } else {
    const startLoopIndex = audioMetadata.editingLoopRange
      ? 0
      : audioMetadata.startLoopIndex;
    const endLoopIndex = audioMetadata.editingLoopRange
      ? -1
      : audioMetadata.endLoopIndex;
    const expandedTabData = expandFullTab({
      tabData,
      location: audioMetadata.location,
      sectionProgression: sectionProgression,
      chords,
      baselineBpm: bpm,
      playbackSpeed,
      setPlaybackMetadata,
      startLoopIndex,
      endLoopIndex,
      visiblePlaybackContainerWidth,
      loopDelay,
    });

    // Tempo only changes timestamps. Preserve strip geometry/repetitions
    // so PlaybackModal does not replace the scheduler's precise anchor
    // with its generic geometry-change reanchor.
    if (
      !preservePlaybackStrip ||
      !isEqual(expandedTabData.chords, store.getState().expandedTabData)
    ) {
      setExpandedTabData(expandedTabData.chords);
    }
  }

  store.setState(patch);
}
