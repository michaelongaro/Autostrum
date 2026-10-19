import { useCallback, useEffect, useRef } from "react";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import { useIPhoneSoundDrawerStore } from "~/stores/IPhoneSoundDrawerStore";
import { getHoveredChordLocationValue } from "~/utils/hoveredChordLocation";

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
  const store = useTabStoreApi();
  const useHoveredChordLocation = options?.useHoveredChordLocation ?? false;
  const disabled = options?.disabled ?? false;

  const {
    audioMetadata,
    playTab,
    pauseAudio,
    countInTimer,
    setCountInTimer,
    showPlaybackModal,
    editing,
  } = useTabStore((state) => ({
    audioMetadata: state.audioMetadata,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    showPlaybackModal: state.showPlaybackModal,
    editing: state.editing,
  }));

  const isSpacebarPressed = useRef(false);
  const isPlayingStateLocked = useRef(false); // Prevents concurrent executions
  const playRequestIdRef = useRef(0);
  const countInTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countIn = useGetLocalStorageValues().countIn;

  // React Compiler escape hatch: identity is a keydown effect dependency.
  const toggleAudioPlayingState = useCallback(async () => {
    if (isPlayingStateLocked.current) return; // If already in progress, ignore
    isPlayingStateLocked.current = true;

    if (audioMetadata.playing) {
      pauseAudio();
      isPlayingStateLocked.current = false;
      return;
    }

    if (useHoveredChordLocation) {
      // Editing: match AudioControls — no count-in; prefer hovered chord.
      // Read imperatively so hovering a column does not re-render Tab.
      const hoveredChordLocation = getHoveredChordLocationValue();
      if (hoveredChordLocation) {
        void playTab({ location: hoveredChordLocation });
      } else {
        void playTab({});
      }
      isPlayingStateLocked.current = false;
      return;
    }

    if (countIn) {
      const requestId = ++playRequestIdRef.current;
      // Start inside keydown, before the count-in timeout loses activation.
      const ready = await store.getState().ensureAudioSystemReady();
      if (!ready || requestId !== playRequestIdRef.current) {
        isPlayingStateLocked.current = false;
        return;
      }
      setCountInTimer({
        ...countInTimer,
        showing: true,
      });

      countInTimeoutRef.current = setTimeout(() => {
        countInTimeoutRef.current = null;
        if (
          requestId !== playRequestIdRef.current ||
          !store.getState().countInTimer.showing ||
          document.visibilityState === "hidden"
        ) {
          isPlayingStateLocked.current = false;
          return;
        }
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
    pauseAudio,
    playTab,
    setCountInTimer,
    useHoveredChordLocation,
    countIn,
    store,
  ]);

  useEffect(() => {
    const cancelPendingPlay = () => {
      playRequestIdRef.current += 1;
      if (countInTimeoutRef.current !== null) {
        clearTimeout(countInTimeoutRef.current);
        countInTimeoutRef.current = null;
      }
      isPlayingStateLocked.current = false;
      isSpacebarPressed.current = false;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") cancelPendingPlay();
    };
    window.addEventListener("pagehide", cancelPendingPlay);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelPendingPlay();
      window.removeEventListener("pagehide", cancelPendingPlay);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled || useIPhoneSoundDrawerStore.getState().open) return;

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
        void toggleAudioPlayingState();
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
