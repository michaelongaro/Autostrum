import { useEffect } from "react";
import type { useTabStoreApi } from "~/stores/TabStore";
import { watchAudioContext } from "~/utils/audioContextRecovery";

export function useAudioContextRecovery(
  store: ReturnType<typeof useTabStoreApi>,
) {
  useEffect(() => {
    let stopWatching: (() => void) | undefined;
    const watch = () => {
      stopWatching?.();
      const context = store.getState().audioContext;
      if (!context) return;
      stopWatching = watchAudioContext(context, (reason) => {
        const state = store.getState();
        if (state.audioContext !== context) return;
        if (
          reason === "resume-failed" &&
          !state.audioMetadata.playing &&
          !state.previewMetadata.playing &&
          !state.countInTimer.showing
        )
          return;
        // Cancel pending starts as well as active notes when leaving the page.
        state.pauseAudio();
        if (state.countInTimer.showing)
          state.setCountInTimer({ ...state.countInTimer, showing: false });
      });
    };
    watch();
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.audioContext !== previous.audioContext) watch();
    });
    return () => {
      unsubscribe();
      stopWatching?.();
    };
  }, [store]);
}
