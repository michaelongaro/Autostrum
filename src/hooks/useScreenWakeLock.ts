import { useEffect } from "react";
import { useTabStore } from "~/stores/TabStore";

function useScreenWakeLock(enabledOverride?: boolean) {
  const showPlaybackModal = useTabStore((state) => state.showPlaybackModal);
  const shouldEnableWakeLock = enabledOverride ?? showPlaybackModal;

  useEffect(() => {
    if (!shouldEnableWakeLock || !navigator.wakeLock) return;

    let active = true;
    let pending = false;
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      if (
        !active ||
        pending ||
        document.visibilityState !== "visible" ||
        (wakeLock && !wakeLock.released)
      )
        return;

      pending = true;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (!active || document.visibilityState !== "visible") {
          await sentinel.release();
        } else {
          wakeLock = sentinel;
        }
      } catch {
        // Wake locks are optional: permissions, battery saver, and hidden tabs
        // can deny them. Playback remains usable and can retry on visibility.
      } finally {
        pending = false;
      }
    }

    void requestWakeLock();
    const onVisibilityChange = () => void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void wakeLock?.release().catch(() => undefined);
    };
  }, [shouldEnableWakeLock]);
}

export default useScreenWakeLock;
