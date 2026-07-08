import { isMobileOnly } from "react-device-detect";
import type Soundfont from "soundfont-player";
import type { InstrumentName } from "soundfont-player";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

export type ExtendedAudioContextState = AudioContextState | "interrupted";

export type AudioGraph = {
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
};

export type ReinitializedAudioSystem = AudioGraph & {
  instruments: Partial<Record<InstrumentName, Soundfont.Player>>;
  currentInstrument: Soundfont.Player | null;
  countInBuffer: AudioBuffer | null;
};

const RESUME_TIMEOUT_MS = 1500;

type GainNodeWithDestinationFlag = GainNode & {
  __autostrumConnectedToDestination?: boolean;
};

function getStoredVolume() {
  if (typeof window === "undefined") return 1;

  if (isMobileOnly) {
    return 1.25;
  }

  const storedVolume = window.localStorage.getItem("autostrum-volume");
  if (!storedVolume) return 1;

  const parsedVolume = Number(storedVolume);
  return Number.isFinite(parsedVolume) ? parsedVolume : 1;
}

export function getAudioContextState(
  audioContext: AudioContext,
): ExtendedAudioContextState {
  // Safari/iOS expose "interrupted" at runtime; keep a widened return type for
  // callers even when TypeScript's AudioContextState already includes it.
  return audioContext.state;
}

export function isAudioContextInterrupted(audioContext: AudioContext) {
  return getAudioContextState(audioContext) === "interrupted";
}

export function isAudioContextUnusable(audioContext: AudioContext | null) {
  if (!audioContext) return true;

  const state = getAudioContextState(audioContext);
  return state === "closed" || state === "interrupted";
}

export function needsAudioContextRecovery(audioContext: AudioContext | null) {
  if (!audioContext) return true;

  const state = getAudioContextState(audioContext);
  return (
    state === "closed" || state === "interrupted" || state === "suspended"
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: number | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("AudioContext operation timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export async function resumeAudioContext(
  audioContext: AudioContext,
): Promise<boolean> {
  const state = getAudioContextState(audioContext);

  if (state === "running") {
    return true;
  }

  if (state === "closed") {
    return false;
  }

  try {
    // Some iOS versions recover better from interrupted when suspend() is
    // attempted before resume(), even if suspend itself rejects.
    if (state === "interrupted") {
      try {
        await withTimeout(audioContext.suspend(), RESUME_TIMEOUT_MS);
      } catch {
        // Best-effort only.
      }
    }

    await withTimeout(audioContext.resume(), RESUME_TIMEOUT_MS);
    return getAudioContextState(audioContext) === "running";
  } catch {
    return false;
  }
}

export function createAudioGraph(volume = getStoredVolume()): AudioGraph {
  const AudioContextConstructor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const audioContext = new AudioContextConstructor();
  const masterVolumeGainNode = audioContext.createGain();
  masterVolumeGainNode.gain.value = volume;
  masterVolumeGainNode.connect(audioContext.destination);

  (masterVolumeGainNode as GainNodeWithDestinationFlag).__autostrumConnectedToDestination =
    true;

  if (isMobileOnly) {
    window.localStorage.setItem("autostrum-volume", String(volume));
  }

  return {
    audioContext,
    masterVolumeGainNode,
  };
}

export async function closeAudioContext(audioContext: AudioContext | null) {
  if (!audioContext) return;

  if (getAudioContextState(audioContext) === "closed") return;

  try {
    await audioContext.close();
  } catch {
    // Context may already be closing/closed by the browser.
  }
}

export async function loadCountInBuffer(audioContext: AudioContext) {
  const response = await fetch("/sounds/countIn.wav");
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

export async function ensureAudioContextRunning(
  audioContext: AudioContext | null,
): Promise<boolean> {
  if (!audioContext) return false;

  if (getAudioContextState(audioContext) === "running") {
    return true;
  }

  return await resumeAudioContext(audioContext);
}

export async function reinitializeAudioSystem({
  previousAudioContext,
  currentInstrumentName,
  previousVolume,
}: {
  previousAudioContext: AudioContext | null;
  currentInstrumentName: InstrumentName;
  previousVolume?: number;
}): Promise<ReinitializedAudioSystem> {
  // Prefer the live gain value when available so desktop volume is preserved.
  const resolvedVolume = previousVolume ?? getStoredVolume();

  await closeAudioContext(previousAudioContext);

  const { audioContext, masterVolumeGainNode } =
    createAudioGraph(resolvedVolume);

  // Unlock/resume immediately when possible (especially after a user gesture).
  await resumeAudioContext(audioContext);

  let currentInstrument: Soundfont.Player | null = null;
  const instruments: Partial<Record<InstrumentName, Soundfont.Player>> = {};

  try {
    currentInstrument = await ensureSoundfontPlayer(
      audioContext,
      currentInstrumentName,
      masterVolumeGainNode,
    );
    instruments[currentInstrumentName] = currentInstrument;
  } catch (error) {
    console.error(
      `Failed to reload ${currentInstrumentName} after AudioContext recovery:`,
      error,
    );
  }

  let countInBuffer: AudioBuffer | null = null;
  try {
    countInBuffer = await loadCountInBuffer(audioContext);
  } catch (error) {
    console.error(
      "Failed to reload count-in audio after AudioContext recovery:",
      error,
    );
  }

  return {
    audioContext,
    masterVolumeGainNode,
    instruments,
    currentInstrument,
    countInBuffer,
  };
}

/**
 * Soft-resume when possible; fully recreate the audio graph when the context
 * is interrupted/closed or resume fails (common on iOS after backgrounding).
 */
export async function recoverOrReinitializeAudioSystem({
  audioContext,
  masterVolumeGainNode,
  currentInstrumentName,
}: {
  audioContext: AudioContext | null;
  masterVolumeGainNode: GainNode | null;
  currentInstrumentName: InstrumentName;
}): Promise<ReinitializedAudioSystem | null> {
  if (!audioContext || !masterVolumeGainNode) {
    return null;
  }

  const state = getAudioContextState(audioContext);

  if (state === "running") {
    return {
      audioContext,
      masterVolumeGainNode,
      instruments: {},
      currentInstrument: null,
      countInBuffer: null,
    };
  }

  if (state === "suspended") {
    const resumed = await resumeAudioContext(audioContext);
    if (resumed) {
      return {
        audioContext,
        masterVolumeGainNode,
        instruments: {},
        currentInstrument: null,
        countInBuffer: null,
      };
    }
  }

  if (
    state === "interrupted" ||
    state === "closed" ||
    state === "suspended"
  ) {
    return await reinitializeAudioSystem({
      previousAudioContext: state === "closed" ? null : audioContext,
      currentInstrumentName,
      previousVolume: masterVolumeGainNode.gain.value,
    });
  }

  return null;
}
