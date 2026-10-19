import { getTabStore } from "~/stores/TabStore";
import { resumeAudioContext } from "~/utils/audioContextRecovery";

/**
 * Work that must stay inside a real user-gesture stack on iOS Safari:
 * unlock AudioContext and kick off the PlaybackModal chunk download before
 * any await/setTimeout breaks the gesture chain.
 */
export function primePlaybackUserGesture() {
  getTabStore().initializeAudioSystem();
  const { audioContext } = getTabStore();

  // Resume whenever not already running — iOS may report "suspended" after
  // backgrounding, and a no-op resume while running is cheap.
  if (audioContext) void resumeAudioContext(audioContext);

  void import("~/components/Tab/Playback/PlaybackModal");
}
