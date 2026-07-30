import { useCallback, useEffect, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";

interface UseSpacebarAudioControlOptions {
  /**
   * Editing mode: play/pause from Tab.tsx using the hovered chord location.
   * Disabled while the PlaybackModal is open so it cannot fight the modal's
   * own spacebar handler.
   */
  useHoveredChordLocation?: boolean;
}

function useSpacebarAudioControl(options?: UseSpacebarAudioControlOptions) {
  const useHoveredChordLocation = options?.useHoveredChordLocation ?? false;

  const {
    audioMetadata,
    playTab,
    pauseAudio,
    countInTimer,
    setCountInTimer,
    hoveredChordLocation,
    showPlaybackModal,
    editing,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    hoveredChordLocation: state.hoveredChordLocation,
    showPlaybackModal: state.showPlaybackModal,
    editing: state.editing,
  }));

  const isSpacebarPressed = useRef(false);
  const isPlayingStateLocked = useRef(false); // Prevents concurrent executions

  // React Compiler escape hatch: identity is a keydown effect dependency.
  const toggleAudioPlayingState = useCallback(() => {
    if (isPlayingStateLocked.current) return; // If already in progress, ignore
    isPlayingStateLocked.current = true;

    if (audioMetadata.playing) {
      pauseAudio();
      isPlayingStateLocked.current = false;
      return;
    }

    if (useHoveredChordLocation) {
      // Editing: match AudioControls — no count-in; prefer hovered chord.
      if (hoveredChordLocation) {
        void playTab({ location: hoveredChordLocation });
      } else {
        void playTab({});
      }
      isPlayingStateLocked.current = false;
      return;
    }

    setCountInTimer({
      ...countInTimer,
      showing: true,
    });

    setTimeout(() => {
      void playTab({ location: audioMetadata.location });

      setCountInTimer({
        ...countInTimer,
        showing: false,
      });

      isPlayingStateLocked.current = false; // Unlock after play
    }, 3000);
  }, [
    audioMetadata.location,
    audioMetadata.playing,
    countInTimer,
    hoveredChordLocation,
    pauseAudio,
    playTab,
    setCountInTimer,
    useHoveredChordLocation,
  ]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (useHoveredChordLocation) {
        // Only while editing, and never alongside the PlaybackModal handler.
        if (!editing || showPlaybackModal) return;

        const target = e.target;
        if (
          target instanceof HTMLElement &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }
      }

      if (
        !countInTimer.showing &&
        e.code === "Space" &&
        !isSpacebarPressed.current
      ) {
        isSpacebarPressed.current = true;
        if (useHoveredChordLocation) {
          e.preventDefault();
        }
        toggleAudioPlayingState();
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === "Space" && isSpacebarPressed.current) {
        isSpacebarPressed.current = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    toggleAudioPlayingState,
    countInTimer.showing,
    useHoveredChordLocation,
    editing,
    showPlaybackModal,
  ]);
}

export default useSpacebarAudioControl;
