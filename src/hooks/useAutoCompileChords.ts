import { useEffect, useCallback, useMemo } from "react";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { useTabStore } from "../stores/TabStore";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import debounce from "lodash.debounce";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { updateElapsedSecondsInSectionProgression } from "~/utils/updateElapsedSecondsInSectionProgression";

function useAutoCompileChords() {
  const {
    editing,
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
  } = useTabStore((state) => ({
    editing: state.editing,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
    bpm: state.bpm,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    loopDelay: state.loopDelay,
    tabData: state.tabData,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    setAudioMetadata: state.setAudioMetadata,
    atomicallyUpdateAudioMetadata: state.atomicallyUpdateAudioMetadata,
    setExpandedTabData: state.setExpandedTabData,
    setPlaybackMetadata: state.setPlaybackMetadata,
    setSectionProgression: state.setSectionProgression,
    setTabIsEffectivelyEmpty: state.setTabIsEffectivelyEmpty,
  }));

  const handleTabLogic = useCallback(() => {
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
        forPlayback: editing ? undefined : { loopDelay },
      });
    }

    if (!editing) {
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
  }, [
    editing,
    bpm,
    tabData,
    playbackSpeed,
    audioMetadata.endLoopIndex,
    audioMetadata.location,
    audioMetadata.startLoopIndex,
    audioMetadata.editingLoopRange,
    sectionProgression,
    chords,
    strummingPatterns,
    visiblePlaybackContainerWidth,
    loopDelay,
    setAudioMetadata,
    setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata,
    setExpandedTabData,
    setPlaybackMetadata,
    setSectionProgression,
    setTabIsEffectivelyEmpty,
  ]);

  // runs at most every 2 seconds when editing
  const debouncedHandleTabLogic = useMemo(
    () => debounce(handleTabLogic, editing ? 1000 : 0),
    [handleTabLogic, editing],
  );

  useEffect(() => {
    debouncedHandleTabLogic();

    return () => {
      debouncedHandleTabLogic.cancel();
    };
  }, [debouncedHandleTabLogic]);
}

export default useAutoCompileChords;
