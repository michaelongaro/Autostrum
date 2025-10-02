import { useState, useEffect, useCallback, useMemo } from "react";
import {
  compileFullTab,
  compileSpecificChordGrouping,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { useTabStore, type Section } from "../stores/TabStore";
import {
  expandFullTab,
  updateElapsedSecondsInSectionProgression,
} from "~/utils/playbackChordCompilationHelpers";
import debounce from "lodash.debounce";

function useAutoCompileChords() {
  const {
    editing,
    setCurrentlyPlayingMetadata,
    playbackSpeed,
    audioMetadata,
    setAudioMetadata,
    bpm,
    sectionProgression,
    chords,
    atomicallyUpdateAudioMetadata,
    setExpandedTabData,
    setPlaybackMetadata,
    setSectionProgression,
    visiblePlaybackContainerWidth,
    loopDelay,
    tabData,
  } = useTabStore((state) => ({
    editing: state.editing,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    playbackSpeed: state.playbackSpeed,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    bpm: state.bpm,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    atomicallyUpdateAudioMetadata: state.atomicallyUpdateAudioMetadata,
    setExpandedTabData: state.setExpandedTabData,
    setPlaybackMetadata: state.setPlaybackMetadata,
    setSectionProgression: state.setSectionProgression,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
    loopDelay: state.loopDelay,
    tabData: state.tabData,
  }));

  const [
    prevFullCurrentlyPlayingMetadataLength,
    setPrevFullCurrentlyPlayingMetadataLength,
  ] = useState(-1);

  const handleTabLogic = useCallback(() => {
    function wholeTabIsEmpty() {
      if (tabData.length === 0 || tabData[0]?.data.length === 0) {
        return true;
      }

      if (
        tabData[0]?.data?.[0]?.type === "chord" &&
        tabData[0]?.data?.[0]?.data?.[0]?.data?.length === 0
      ) {
        return true;
      }

      return false;
    }

    if (wholeTabIsEmpty()) {
      setAudioMetadata({
        tabId: -1,
        playing: false,
        location: null,
        startLoopIndex: 0,
        endLoopIndex: -1,
        editingLoopRange: false,
        fullCurrentlyPlayingMetadataLength: -1,
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
      });
    } else {
      compileFullTab({
        tabData,
        sectionProgression: sanitizedSectionProgression,
        chords,
        baselineBpm: bpm,
        playbackSpeed,
        setCurrentlyPlayingMetadata,
        startLoopIndex: audioMetadata.startLoopIndex,
        endLoopIndex: audioMetadata.endLoopIndex,
        atomicallyUpdateAudioMetadata,
        loopDelay,
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
    setAudioMetadata,
    setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata,
    setExpandedTabData,
    setPlaybackMetadata,
    setSectionProgression,
    visiblePlaybackContainerWidth,
    loopDelay,
  ]);

  // runs at most every 2 seconds when editing
  const debouncedHandleTabLogic = useMemo(
    () => debounce(handleTabLogic, editing ? 2000 : 0),
    [handleTabLogic, editing],
  );

  useEffect(() => {
    debouncedHandleTabLogic();

    return () => {
      debouncedHandleTabLogic.cancel();
    };
  }, [debouncedHandleTabLogic]);

  useEffect(() => {
    if (
      audioMetadata.fullCurrentlyPlayingMetadataLength ===
      prevFullCurrentlyPlayingMetadataLength
    )
      return;

    if (
      audioMetadata.fullCurrentlyPlayingMetadataLength <
      prevFullCurrentlyPlayingMetadataLength
    ) {
      atomicallyUpdateAudioMetadata({
        startLoopIndex: 0,
        endLoopIndex: -1,
      });
    }

    setPrevFullCurrentlyPlayingMetadataLength(
      audioMetadata.fullCurrentlyPlayingMetadataLength,
    );
  }, [
    audioMetadata.fullCurrentlyPlayingMetadataLength,
    atomicallyUpdateAudioMetadata,
    prevFullCurrentlyPlayingMetadataLength,
  ]);
}

export default useAutoCompileChords;
