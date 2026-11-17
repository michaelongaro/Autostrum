import { useEffect, useRef } from "react";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useIPhoneSoundDrawerStore } from "~/stores/IPhoneSoundDrawerStore";
import { useTabStoreApi } from "~/stores/TabStore";
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

  const isSpacebarPressed = useRef(false);

  useEffect(
    () =>
      store.getState().subscribeAudioLifecycle((event) => {
        if (event !== "ready" && event !== "foreground")
          isSpacebarPressed.current = false;
      }),
    [store],
  );

  const countIn = useGetLocalStorageValues().countIn;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled || useIPhoneSoundDrawerStore.getState().open) return;
      const {
        editing,
        showPlaybackModal,
        countInTimer,
        audioMetadata,
        pauseAudio,
        playTab,
        playTabWithCountIn,
      } = store.getState();

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
        if (audioMetadata.playing) {
          pauseAudio();
        } else if (useHoveredChordLocation) {
          const hoveredChordLocation = getHoveredChordLocationValue();
          void playTab(
            hoveredChordLocation ? { location: hoveredChordLocation } : {},
          );
        } else {
          void playTabWithCountIn({
            location: audioMetadata.location,
            countIn,
          });
        }
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
  }, [store, countIn, useHoveredChordLocation, disabled]);
}

export default useSpacebarAudioControl;
