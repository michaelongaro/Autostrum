import { useEffect, useRef } from "react";
import { getTabStoreState, useTabStore } from "~/stores/TabStore";
import { getAudioContextState } from "~/utils/audioContextRuntime";

/**
 * Keeps the shared Web Audio graph healthy across iOS backgrounding.
 *
 * On mobile Safari, leaving the tab can leave AudioContext in an
 * "interrupted" state where resume() never recovers. Recovery is delegated to
 * TabStore.ensureAudioSystemReady(), which soft-resumes when possible and
 * otherwise recreates the context, master gain, soundfonts, and count-in
 * buffer so playback works again without a full page refresh.
 */
export function useAudioContextRecovery() {
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);

  const audioContext = useTabStore((state) => state.audioContext);
  const pauseAudio = useTabStore((state) => state.pauseAudio);
  const ensureAudioSystemReady = useTabStore(
    (state) => state.ensureAudioSystemReady,
  );

  useEffect(() => {
    if (!audioContext) return;

    const recoverAudioSystem = async (): Promise<boolean> => {
      if (recoveryPromiseRef.current) {
        return await recoveryPromiseRef.current;
      }

      const recoveryPromise = ensureAudioSystemReady();
      recoveryPromiseRef.current = recoveryPromise;

      try {
        return await recoveryPromise;
      } finally {
        if (recoveryPromiseRef.current === recoveryPromise) {
          recoveryPromiseRef.current = null;
        }
      }
    };

    const maybeRecover = () => {
      if (document.visibilityState !== "visible") return;

      const latestAudioContext = getTabStoreState().audioContext;
      if (!latestAudioContext) return;

      if (getAudioContextState(latestAudioContext) === "running") return;

      void recoverAudioSystem();
    };

    const handleStateChange = () => {
      const latestAudioContext = getTabStoreState().audioContext;
      if (!latestAudioContext) return;

      const state = getAudioContextState(latestAudioContext);

      if (state === "interrupted" || state === "closed") {
        // Stop any in-flight scheduling immediately; recovery happens on
        // foreground/user interaction so we stay inside gesture policies.
        pauseAudio();

        if (document.visibilityState === "visible") {
          void recoverAudioSystem();
        }
      } else if (
        state === "suspended" &&
        document.visibilityState === "visible"
      ) {
        void recoverAudioSystem();
      }
    };

    const handleUserGesture = () => {
      const latestAudioContext = getTabStoreState().audioContext;
      if (!latestAudioContext) return;

      if (getAudioContextState(latestAudioContext) === "running") return;

      void recoverAudioSystem();
    };

    audioContext.addEventListener("statechange", handleStateChange);
    document.addEventListener("visibilitychange", maybeRecover);
    window.addEventListener("pageshow", maybeRecover);
    window.addEventListener("focus", maybeRecover);
    window.addEventListener("pointerdown", handleUserGesture, true);
    window.addEventListener("touchstart", handleUserGesture, true);
    window.addEventListener("keydown", handleUserGesture, true);

    // Catch already-broken contexts as soon as this effect mounts.
    maybeRecover();

    return () => {
      audioContext.removeEventListener("statechange", handleStateChange);
      document.removeEventListener("visibilitychange", maybeRecover);
      window.removeEventListener("pageshow", maybeRecover);
      window.removeEventListener("focus", maybeRecover);
      window.removeEventListener("pointerdown", handleUserGesture, true);
      window.removeEventListener("touchstart", handleUserGesture, true);
      window.removeEventListener("keydown", handleUserGesture, true);
    };
  }, [audioContext, ensureAudioSystemReady, pauseAudio]);
}
