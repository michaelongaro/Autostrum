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
  let triggerLocalLoad: (() => void) | undefined;

  const localLoad = new Promise<Soundfont.Player>((resolve, reject) => {
    let hasStarted = false;

    triggerLocalLoad = () => {
      if (hasStarted) {
        return;
      }

      hasStarted = true;

      void loadSoundfontLocally(audioContext, instrumentName, destination)
        .then(resolve)
        .catch(reject);
    };
  });

  const timeoutId = window.setTimeout(() => {
    triggerLocalLoad?.();
  }, 600);

  const cdnLoad = loadSoundfontFromCdn(
    audioContext,
    instrumentName,
    destination,
  )
    .then((player) => {
      window.clearTimeout(timeoutId);
      return player;
    })
    .catch((error) => {
      window.clearTimeout(timeoutId);
      triggerLocalLoad?.();
      throw error;
    });

  return await Promise.any([cdnLoad, localLoad]);
}

export async function ensureSoundfontPlayer(
  audioContext: AudioContext,
  instrumentName: InstrumentName,
  destination: AudioNode,
) {
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
