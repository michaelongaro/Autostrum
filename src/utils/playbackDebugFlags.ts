const DEBUG_STORAGE_KEY = "playbackDebug";

interface PlaybackDebugFlags {
  logDrift: boolean;
  logLoopTeardown: boolean;
  logChordIndexTiming: boolean;
  disableDriftCorrection: boolean;
  disableSliderTransitions: boolean;
  disableHighlightTransitions: boolean;
  disableVirtualizationDuringPlayback: boolean;
}

const DEFAULT_FLAGS: PlaybackDebugFlags = {
  logDrift: false,
  logLoopTeardown: false,
  logChordIndexTiming: false,
  disableDriftCorrection: false,
  disableSliderTransitions: false,
  disableHighlightTransitions: false,
  disableVirtualizationDuringPlayback: false,
};

function readPlaybackDebugFlags(): PlaybackDebugFlags {
  if (typeof window === "undefined") {
    return DEFAULT_FLAGS;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get(DEBUG_STORAGE_KEY);

    if (fromQuery) {
      const parsed = JSON.parse(fromQuery) as Partial<PlaybackDebugFlags>;
      return { ...DEFAULT_FLAGS, ...parsed };
    }

    const fromStorage = window.localStorage.getItem(DEBUG_STORAGE_KEY);
    if (fromStorage) {
      const parsed = JSON.parse(fromStorage) as Partial<PlaybackDebugFlags>;
      return { ...DEFAULT_FLAGS, ...parsed };
    }
  } catch {
    return DEFAULT_FLAGS;
  }

  return DEFAULT_FLAGS;
}

let cachedFlags: PlaybackDebugFlags | null = null;

function getPlaybackDebugFlags(): PlaybackDebugFlags {
  if (!cachedFlags) {
    cachedFlags = readPlaybackDebugFlags();
  }

  return cachedFlags;
}

function logPlaybackDebug(
  channel: keyof PlaybackDebugFlags,
  message: string,
  data?: Record<string, unknown>,
) {
  const flags = getPlaybackDebugFlags();

  if (!flags[channel]) {
    return;
  }

  if (data) {
    console.info(`[playback:${channel}] ${message}`, data);
    return;
  }

  console.info(`[playback:${channel}] ${message}`);
}

export {
  getPlaybackDebugFlags,
  logPlaybackDebug,
  type PlaybackDebugFlags,
};
