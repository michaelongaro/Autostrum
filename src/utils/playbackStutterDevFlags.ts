// Dev-only flags for bisecting playback modal stutter causes.
// Enable via URL query params on any page, e.g.:
//   ?playbackStutterDebug=1
//   ?playbackStutterDebug=1&playbackSkipInlineTransform=1
// Flags persist in sessionStorage for the tab session.

const SESSION_PREFIX = "playbackStutter:";

export interface PlaybackStutterDevFlags {
  /** Master switch: performance marks, long-task observer, console summaries */
  debug: boolean;
  /** Wrap PlaybackModal strip in React.Profiler */
  reactProfiler: boolean;
  /** Omit inline transform on the strip while playing (production fix A/B) */
  skipInlineTransformWhilePlaying: boolean;
  /** Render every chord instead of visibleRange windowing */
  disableVirtualization: boolean;
  /** Skip chordRepetitions batch updates during loop */
  freezeChordRepetitions: boolean;
  /** Pass disableHighlightTransitions to chord components */
  disableHighlightTransitions: boolean;
  /** Zero out progress slider CSS transitions while playing */
  disableSliderTransitions: boolean;
  /** Skip resetProgressTabSliderPosition at loop boundary */
  skipLoopSliderReset: boolean;
}

const DEFAULT_FLAGS: PlaybackStutterDevFlags = {
  debug: false,
  reactProfiler: false,
  skipInlineTransformWhilePlaying: true,
  disableVirtualization: false,
  freezeChordRepetitions: false,
  disableHighlightTransitions: false,
  disableSliderTransitions: false,
  skipLoopSliderReset: false,
};

const FLAG_KEYS: (keyof PlaybackStutterDevFlags)[] = [
  "debug",
  "reactProfiler",
  "skipInlineTransformWhilePlaying",
  "disableVirtualization",
  "freezeChordRepetitions",
  "disableHighlightTransitions",
  "disableSliderTransitions",
  "skipLoopSliderReset",
];

const QUERY_ALIASES: Record<string, keyof PlaybackStutterDevFlags> = {
  playbackStutterDebug: "debug",
  playbackReactProfiler: "reactProfiler",
  playbackSkipInlineTransform: "skipInlineTransformWhilePlaying",
  playbackDisableVirtualization: "disableVirtualization",
  playbackFreezeRepetitions: "freezeChordRepetitions",
  playbackDisableHighlights: "disableHighlightTransitions",
  playbackDisableSliderTransitions: "disableSliderTransitions",
  playbackSkipLoopSliderReset: "skipLoopSliderReset",
};

function parseBool(value: string | string[] | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

function readSessionFlag(key: keyof PlaybackStutterDevFlags): boolean | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
  if (stored === "1") return true;
  if (stored === "0") return false;
  return null;
}

function writeSessionFlags(flags: PlaybackStutterDevFlags) {
  if (typeof window === "undefined") return;
  for (const key of FLAG_KEYS) {
    sessionStorage.setItem(
      `${SESSION_PREFIX}${key}`,
      flags[key] ? "1" : "0",
    );
  }
}

function applyQueryToFlags(
  query: Record<string, string | string[] | undefined>,
  base: PlaybackStutterDevFlags,
): PlaybackStutterDevFlags {
  const next = { ...base };

  for (const [queryKey, flagKey] of Object.entries(QUERY_ALIASES)) {
    const parsed = parseBool(query[queryKey]);
    if (parsed !== undefined) {
      next[flagKey] = parsed;
    }
  }

  // Shorthand: any playbackStutter* param turns debug on unless explicitly false
  const debugParam = parseBool(query.playbackStutterDebug);
  if (debugParam === true) {
    next.debug = true;
  }

  return next;
}

let cachedFlags: PlaybackStutterDevFlags | null = null;

export function getPlaybackStutterDevFlags(
  query?: Record<string, string | string[] | undefined>,
): PlaybackStutterDevFlags {
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_FLAGS;
  }

  if (query) {
    const fromSession = FLAG_KEYS.reduce((acc, key) => {
      const stored = readSessionFlag(key);
      if (stored !== null) acc[key] = stored;
      return acc;
    }, {} as Partial<PlaybackStutterDevFlags>);

    const merged = { ...DEFAULT_FLAGS, ...fromSession };
    const fromQuery = applyQueryToFlags(query, merged);
    writeSessionFlags(fromQuery);
    cachedFlags = fromQuery;
    return fromQuery;
  }

  if (cachedFlags) return cachedFlags;

  const fromSession = FLAG_KEYS.reduce((acc, key) => {
    const stored = readSessionFlag(key);
    if (stored !== null) acc[key] = stored;
    return acc;
  }, {} as Partial<PlaybackStutterDevFlags>);

  cachedFlags = { ...DEFAULT_FLAGS, ...fromSession };
  return cachedFlags;
}

export function isPlaybackStutterDebugEnabled(): boolean {
  return getPlaybackStutterDevFlags().debug;
}

/**
 * Omit React-managed inline transform while playing so WAAPI owns strip motion.
 * Enabled in production. In dev, set playbackSkipInlineTransform=0 to restore old
 * behavior for A/B comparison.
 */
export function shouldOmitInlineTransformWhilePlaying(playing: boolean): boolean {
  if (!playing) return false;
  if (process.env.NODE_ENV === "production") return true;
  return getPlaybackStutterDevFlags().skipInlineTransformWhilePlaying;
}
