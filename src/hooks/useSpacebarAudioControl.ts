import { useCallback, useEffect, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";

function useSpacebarAudioControl() {
  const {
    id,
    audioMetadata,
    playTab,
    pauseAudio,
    countInTimer,
    setCountInTimer,
  } = useTabStore((state) => ({
    id: state.id,
    audioMetadata: state.audioMetadata,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
  }));

  const isSpacebarPressed = useRef(false);
  const isPlayingStateLocked = useRef(false); // Prevents concurrent executions

  const toggleAudioPlayingState = useCallback(() => {
    if (isPlayingStateLocked.current) return; // If already in progress, ignore
    isPlayingStateLocked.current = true;

    if (audioMetadata.playing) {
      pauseAudio();
    } else {
      setCountInTimer({
        ...countInTimer,
        showing: true,
      });

      setTimeout(() => {
        void playTab({ tabId: id, location: audioMetadata.location });

        setCountInTimer({
          ...countInTimer,
          showing: false,
        });

        isPlayingStateLocked.current = false; // Unlock after play
      }, 3000);
    }

    // Unlock immediately if pausing
    if (audioMetadata.playing) {
      isPlayingStateLocked.current = false;
    }
  }, [
    audioMetadata.location,
    audioMetadata.playing,
    countInTimer,
    id,
    pauseAudio,
    playTab,
    setCountInTimer,
  ]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        !countInTimer.showing &&
        e.code === "Space" &&
        !isSpacebarPressed.current
      ) {
        isSpacebarPressed.current = true;
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
  }, [toggleAudioPlayingState, countInTimer.showing]);
}

export default useSpacebarAudioControl;
