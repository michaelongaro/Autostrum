import { getTabStore } from "~/stores/TabStore";

/**
 * Work that must stay inside a real user-gesture stack on iOS Safari:
 * unlock AudioContext before any await/setTimeout breaks the gesture chain.
 */
export function primePlaybackUserGesture(audioSystem = getTabStore()) {
  void audioSystem.ensureAudioContextReady();
}
