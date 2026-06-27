import Soundfont, { type InstrumentName } from "soundfont-player";
import { isIOS, isSafari } from "react-device-detect";

type InstrumentCache = Map<InstrumentName, Promise<Soundfont.Player>>;

const soundfontLoadCache = new WeakMap<AudioContext, InstrumentCache>();

function getSoundfontFormat() {
  return isSafari || isIOS ? "mp3" : "ogg";
}

function getOrCreateContextCache(audioContext: AudioContext) {
  let contextCache = soundfontLoadCache.get(audioContext);

  if (!contextCache) {
    contextCache = new Map<InstrumentName, Promise<Soundfont.Player>>();
    soundfontLoadCache.set(audioContext, contextCache);
  }

  return contextCache;
}

async function loadSoundfontFromCdn(
  audioContext: AudioContext,
  instrumentName: InstrumentName,
  destination: AudioNode,
) {
  return await Soundfont.instrument(audioContext, instrumentName, {
    soundfont: "MusyngKite",
    format: getSoundfontFormat(),
    destination,
  });
}

async function loadSoundfontLocally(
  audioContext: AudioContext,
  instrumentName: InstrumentName,
  destination: AudioNode,
) {
  return await Soundfont.instrument(audioContext, instrumentName, {
    soundfont: "MusyngKite",
    format: getSoundfontFormat(),
    destination,
    nameToUrl: (name: string, _soundfont: string, format: string) =>
      `/sounds/instruments/${name}-${format}.js`,
  });
}

async function loadSoundfontWithFallback(
  audioContext: AudioContext,
  instrumentName: InstrumentName,
  destination: AudioNode,
) {
  const localLoad = loadSoundfontLocally(audioContext, instrumentName, destination);
  let triggerCdnLoad: (() => void) | undefined;

  const cdnLoad = new Promise<Soundfont.Player>((resolve, reject) => {
    triggerCdnLoad = () => {
      void loadSoundfontFromCdn(audioContext, instrumentName, destination)
        .then(resolve)
        .catch(reject);
    };
  });

  const timeoutId = window.setTimeout(() => {
    triggerCdnLoad?.();
  }, 600);

  void localLoad.then(() => {
    window.clearTimeout(timeoutId);
  });

  return await Promise.any([localLoad, cdnLoad]);
}

export async function ensureSoundfontPlayer(
  audioContext: AudioContext,
  instrumentName: InstrumentName,
  destination: AudioNode,
) {
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const contextCache = getOrCreateContextCache(audioContext);
  const cachedLoad = contextCache.get(instrumentName);

  if (cachedLoad) {
    return await cachedLoad;
  }

  const loadPromise = loadSoundfontWithFallback(
    audioContext,
    instrumentName,
    destination,
  ).catch((error) => {
    contextCache.delete(instrumentName);
    throw error;
  });

  contextCache.set(instrumentName, loadPromise);

  return await loadPromise;
}
