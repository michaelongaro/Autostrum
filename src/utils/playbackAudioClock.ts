const DESKTOP_SYNC_THRESHOLD_MS = 12;
const MOBILE_SYNC_THRESHOLD_MS = 32;
const PLAYBACK_RATE_NUDGE_THRESHOLD_MS = 4;
const MAX_PLAYBACK_RATE = 1.08;
const MIN_PLAYBACK_RATE = 0.92;

function isMobileTouchDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const macTouch =
    /Macintosh/.test(ua) && typeof (window as Window & { ontouchend?: unknown }).ontouchend !== "undefined";

  return iOS || macTouch;
}

function getSyncThresholdMs() {
  return isMobileTouchDevice()
    ? MOBILE_SYNC_THRESHOLD_MS
    : DESKTOP_SYNC_THRESHOLD_MS;
}

function getAudioContextOutputTimeSeconds(audioContext: AudioContext) {
  if (typeof audioContext.getOutputTimestamp === "function") {
    const timestamp = audioContext.getOutputTimestamp();

    if (
      Number.isFinite(timestamp.contextTime) &&
      timestamp.contextTime >= 0
    ) {
      return timestamp.contextTime;
    }
  }

  return audioContext.currentTime;
}

function getElapsedPlaybackMs({
  audioContext,
  playbackStartedAtAudioTime,
}: {
  audioContext: AudioContext;
  playbackStartedAtAudioTime: number;
}) {
  const outputTimeSeconds = getAudioContextOutputTimeSeconds(audioContext);

  return Math.max(0, (outputTimeSeconds - playbackStartedAtAudioTime) * 1000);
}

function getPlaybackRateNudge(driftMs: number) {
  if (Math.abs(driftMs) <= PLAYBACK_RATE_NUDGE_THRESHOLD_MS) {
    return 1;
  }

  if (Math.abs(driftMs) >= getSyncThresholdMs()) {
    return 1;
  }

  const normalizedDrift =
    (Math.abs(driftMs) - PLAYBACK_RATE_NUDGE_THRESHOLD_MS) /
    (getSyncThresholdMs() - PLAYBACK_RATE_NUDGE_THRESHOLD_MS);

  const rateDelta = normalizedDrift * 0.06;

  return driftMs > 0
    ? Math.max(MIN_PLAYBACK_RATE, 1 - rateDelta)
    : Math.min(MAX_PLAYBACK_RATE, 1 + rateDelta);
}

function waitUntilAudioTime({
  audioContext,
  targetTimeSeconds,
  signal,
}: {
  audioContext: AudioContext;
  targetTimeSeconds: number;
  signal?: AbortSignal;
}) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    let rafId = 0;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const tick = () => {
      if (signal?.aborted) {
        onAbort();
        return;
      }

      if (getAudioContextOutputTimeSeconds(audioContext) >= targetTimeSeconds) {
        cleanup();
        resolve();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    rafId = requestAnimationFrame(tick);
  });
}

export {
  getAudioContextOutputTimeSeconds,
  getElapsedPlaybackMs,
  getPlaybackRateNudge,
  getSyncThresholdMs,
  isMobileTouchDevice,
  waitUntilAudioTime,
};
