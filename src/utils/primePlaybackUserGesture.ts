import { getTabStore } from "~/stores/TabStore";

/**
 * Work that must stay inside a real user-gesture stack on iOS Safari:
 * unlock AudioContext and kick off the PlaybackModal chunk download before
 * any await/setTimeout breaks the gesture chain.
 */
export function primePlaybackUserGesture() {
  const { audioContext } = getTabStore();

  // Resume whenever not already running — iOS may report "suspended" after
  // backgrounding, and a no-op resume while running is cheap.
  if (audioContext && audioContext.state !== "running") {
    void audioContext.resume().catch(() => undefined);
  }

  void import("~/components/Tab/Playback/PlaybackModal");
}
