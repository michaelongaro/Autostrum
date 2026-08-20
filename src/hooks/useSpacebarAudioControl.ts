import { useCallback, useEffect, useRef } from "react";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";

interface UseSpacebarAudioControlOptions {
  /**
   * Editing mode: play/pause from Tab.tsx using the hovered chord location.
   * Disabled while the PlaybackModal is open so it cannot fight the modal's
   * own spacebar handler.
   */
  useHoveredChordLocation?: boolean;
  /** When true, spacebar play/pause is ignored (e.g. during glide scrub/coast). */
  disabled?: boolean;
}

function useSpacebarAudioControl(options?: UseSpacebarAudioControlOptions) {
  const useHoveredChordLocation = options?.useHoveredChordLocation ?? false;
  const disabled = options?.disabled ?? false;

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

  const countIn = useGetLocalStorageValues().countIn;

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

    if (countIn) {
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
    } else {
      void playTab({ location: audioMetadata.location });
      isPlayingStateLocked.current = false; // Unlock after play
    }
  }, [
    audioMetadata.location,
    audioMetadata.playing,
    countInTimer,
    hoveredChordLocation,
    pauseAudio,
    playTab,
    setCountInTimer,
    useHoveredChordLocation,
    countIn,
  ]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled) return;

      if (useHoveredChordLocation) {
        if (!editing || showPlaybackModal) return;

        const target = e.target;
        if (
          target instanceof HTMLElement &&
          // should be able to use spacebar to control audio when focused on a <TabNote>
          !target.id.includes("input") &&
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
    disabled,
  ]);
}

export default useSpacebarAudioControl;
