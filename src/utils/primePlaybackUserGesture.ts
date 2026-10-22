import { getTabStore } from "~/stores/TabStore";

/**
 * Work that must stay inside a real user-gesture stack on iOS Safari:
 * unlock AudioContext and kick off the PlaybackModal chunk download before
 * any await/setTimeout breaks the gesture chain.
 */
export function primePlaybackUserGesture(audioSystem = getTabStore()) {
  void audioSystem.ensureAudioContextReady();

  void import("~/components/Tab/Playback/PlaybackModal");
}
