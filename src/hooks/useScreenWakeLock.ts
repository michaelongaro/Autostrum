import { useEffect, useRef } from "react";
import { useTabStore } from "~/stores/TabStore";

function useScreenWakeLock() {
  const { showPlaybackModal } = useTabStore((state) => ({
    showPlaybackModal: state.showPlaybackModal,
  }));

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let isMounted = true; // To prevent state updates after unmount

    async function requestWakeLock() {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("hit");
      } catch (err) {
        console.error(`The Wake Lock request has failed: ${err}`);
      }
    }

    function reaquireWakeLock() {
      if (
        wakeLockRef.current !== null &&
        document.visibilityState === "visible"
      ) {
        navigator.wakeLock
          .request("screen")
          .then((sentinel) => {
            if (isMounted) {
              wakeLockRef.current = sentinel;
            }
          })
          .catch((err) => {
            console.error(`The Wake Lock request has failed: ${err}`);
          });
      }
    }

    if (showPlaybackModal) {
      requestWakeLock();
    } else {
      wakeLockRef.current?.release().then(() => {
        wakeLockRef.current = null;
      });
    }

    document.addEventListener("visibilitychange", reaquireWakeLock);

    return () => {
      isMounted = false; // Clean up the flag on unmount

      wakeLockRef.current?.release().then(() => {
        wakeLockRef.current = null;
      });

      document.removeEventListener("visibilitychange", reaquireWakeLock);
    };
  }, [showPlaybackModal]);
}

export default useScreenWakeLock;
