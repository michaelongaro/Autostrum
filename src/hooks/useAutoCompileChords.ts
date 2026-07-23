import { useEffect, useRef } from "react";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { getTabStore, subscribeTabStore, useTabStore } from "../stores/TabStore";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import debounce from "lodash.debounce";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { updateElapsedSecondsInSectionProgression } from "~/utils/updateElapsedSecondsInSectionProgression";

/**
 * Recompiles playback metadata when tab content / playback settings change.
 *
 * Intentionally does NOT select `tabData` (or other large trees) through React:
 * that would re-render the host component (often `<Tab />`) on every nested
 * edit and cascade through the whole editing tree. Instead we subscribe
 * imperatively and read fresh state via `getTabStore()`.
 */
function useAutoCompileChords() {
  const editing = useTabStore((state) => state.editing);

  // Keep a stable debounced runner; recreate when editing toggles delay.
  const debouncedRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    const handleTabLogic = () => {
      const {
        editing: isEditing,
        playbackSpeed,
        audioMetadata,
        bpm,
        sectionProgression,
        chords,
        strummingPatterns,
        visiblePlaybackContainerWidth,
        loopDelay,
        tabData,
        setCurrentlyPlayingMetadata,
        setAudioMetadata,
        atomicallyUpdateAudioMetadata,
        setExpandedTabData,
        setPlaybackMetadata,
        setSectionProgression,
        setTabIsEffectivelyEmpty,
      } = getTabStore();

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
        return;
      }

      const sanitizedSectionProgression =
        sectionProgression.length > 0
          ? sectionProgression
          : generateDefaultSectionProgression(tabData);

      if (audioMetadata.location) {
        compileSpecificChordGrouping({
          tabData,
          location: audioMetadata.location,
          chords,
          strummingPatterns,
          baselineBpm: bpm,
          playbackSpeed,
          setCurrentlyPlayingMetadata,
          startLoopIndex: audioMetadata.startLoopIndex,
          endLoopIndex: audioMetadata.endLoopIndex,
          atomicallyUpdateAudioMetadata,
          forMetadataOnly: true,
        });
      } else {
        compileFullTab({
          tabData,
          sectionProgression: sanitizedSectionProgression,
          chords,
          strummingPatterns,
          baselineBpm: bpm,
          playbackSpeed,
          setCurrentlyPlayingMetadata,
          startLoopIndex: audioMetadata.startLoopIndex,
          endLoopIndex: audioMetadata.endLoopIndex,
          atomicallyUpdateAudioMetadata,
          forMetadataOnly: true,
          forPlayback: isEditing ? undefined : { loopDelay },
        });
      }

      if (!isEditing) {
        const expandedTabData = expandFullTab({
          tabData,
          location: audioMetadata.location,
          sectionProgression: sanitizedSectionProgression,
          chords,
          baselineBpm: bpm,
          playbackSpeed,
          setPlaybackMetadata,
          startLoopIndex: audioMetadata.editingLoopRange
            ? 0
            : audioMetadata.startLoopIndex,
          endLoopIndex: audioMetadata.editingLoopRange
            ? -1
            : audioMetadata.endLoopIndex,
          visiblePlaybackContainerWidth,
          loopDelay,
        });

        setExpandedTabData(expandedTabData.chords);
      }

      updateElapsedSecondsInSectionProgression({
        tabData,
        sectionProgression: sanitizedSectionProgression,
        baselineBpm: bpm,
        setSectionProgression,
      });
    };

    const debouncedHandleTabLogic = debounce(
      handleTabLogic,
      editing ? 1000 : 0,
    );
    debouncedRef.current = debouncedHandleTabLogic;

    // Run once for current state, then on relevant store changes only.
    debouncedHandleTabLogic();

    const unsubscribe = subscribeTabStore((state, prevState) => {
      if (
        state.tabData === prevState.tabData &&
        state.playbackSpeed === prevState.playbackSpeed &&
        state.bpm === prevState.bpm &&
        state.sectionProgression === prevState.sectionProgression &&
        state.chords === prevState.chords &&
        state.strummingPatterns === prevState.strummingPatterns &&
        state.visiblePlaybackContainerWidth ===
          prevState.visiblePlaybackContainerWidth &&
        state.loopDelay === prevState.loopDelay &&
        state.editing === prevState.editing &&
        state.audioMetadata.endLoopIndex ===
          prevState.audioMetadata.endLoopIndex &&
        state.audioMetadata.startLoopIndex ===
          prevState.audioMetadata.startLoopIndex &&
        state.audioMetadata.editingLoopRange ===
          prevState.audioMetadata.editingLoopRange &&
        state.audioMetadata.location === prevState.audioMetadata.location
      ) {
        return;
      }

      debouncedHandleTabLogic();
    });

    return () => {
      unsubscribe();
      debouncedHandleTabLogic.cancel();
    };
  }, [editing]);
}

export default useAutoCompileChords;
