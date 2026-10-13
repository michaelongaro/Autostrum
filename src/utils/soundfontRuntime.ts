import Soundfont, { type InstrumentName } from "soundfont-player";
import { isIOS, isSafari } from "react-device-detect";
import type { GuitarInstrument } from "~/utils/guitarSampleTypes";

type InstrumentCache = Map<InstrumentName, Promise<GuitarInstrument>>;

const soundfontLoadCache = new WeakMap<
  AudioContext,
  WeakMap<AudioNode, InstrumentCache>
>();

function getSoundfontFormat() {
  return isSafari || isIOS ? "mp3" : "ogg";
}

function getOrCreateContextCache(
  audioContext: AudioContext,
  destination: AudioNode,
) {
  let destinations = soundfontLoadCache.get(audioContext);
  if (!destinations) {
    destinations = new WeakMap();
    soundfontLoadCache.set(audioContext, destinations);
  }
  let contextCache = destinations.get(destination);
  if (!contextCache) {
    contextCache = new Map();
    destinations.set(destination, contextCache);
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
): Promise<GuitarInstrument> {
  const contextCache = getOrCreateContextCache(audioContext, destination);
  const cachedLoad = contextCache.get(instrumentName);

  if (cachedLoad) {
    return await cachedLoad;
  }

  const loadPromise = (async (): Promise<GuitarInstrument> => {
    if (
      [
        "acoustic_guitar_steel",
        "acoustic_guitar_nylon",
        "electric_guitar_clean",
        "electric_guitar_jazz",
      ].includes(instrumentName)
    ) {
      try {
        const { loadGuitarSamplePlayer } =
          await import("~/utils/guitarSampleRuntime");
        return await loadGuitarSamplePlayer(
          audioContext,
          instrumentName,
          destination,
        );
      } catch (error) {
        console.warn(
          `Dedicated ${instrumentName} samples unavailable; loading the soundfont fallback.`,
          error,
        );
      }
    }
    return await loadSoundfontWithFallback(
      audioContext,
      instrumentName,
      destination,
    );
  })().catch((error: unknown) => {
    contextCache.delete(instrumentName);
    throw error;
  });

  contextCache.set(instrumentName, loadPromise);

  return await loadPromise;
}
