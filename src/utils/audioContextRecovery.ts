const RESUME_TIMEOUT_MS = 1200;

const pendingResumes = new WeakMap<AudioContext, Promise<boolean>>();
const countInLoads = new WeakMap<AudioContext, Promise<AudioBuffer>>();

export function isAudioPageHidden() {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

/** Start resume synchronously, while a caller's user activation is still valid. */
export function resumeAudioContext(context: AudioContext): Promise<boolean> {
  if (context.state === "running") return Promise.resolve(true);
  if (context.state === "closed") return Promise.resolve(false);

  // Even with an earlier attempt pending, a fresh tap must issue resume again.
  // Safari can leave the earlier promise pending until another user gesture.
  let attempt: Promise<void>;
  try {
    attempt = context.resume();
  } catch {
    return Promise.resolve(false);
  }

  const pending = pendingResumes.get(context);
  if (pending) {
    void attempt.catch(() => undefined);
    return pending;
  }

  const result = new Promise<boolean>((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      context.removeEventListener("statechange", onStateChange);
      resolve(context.state === "running");
    };
    const onStateChange = () => {
      if (context.state === "running" || context.state === "closed") finish();
    };
    const timeout = setTimeout(finish, RESUME_TIMEOUT_MS);
    context.addEventListener("statechange", onStateChange);
    void attempt.then(finish, finish);
  }).finally(() => {
    pendingResumes.delete(context);
  });

  pendingResumes.set(context, result);
  return result;
}

export function loadCountInBuffer(context: AudioContext) {
  const cached = countInLoads.get(context);
  if (cached) return cached;

  const load = fetch("/sounds/countIn.wav")
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load count-in audio.");
      return context.decodeAudioData(await response.arrayBuffer());
    })
    .catch((error: unknown) => {
      countInLoads.delete(context);
      throw error;
    });
  countInLoads.set(context, load);
  return load;
}

/** Retry on foregrounding and real gestures, without an endless resume loop. */
export function watchAudioContext(
  context: AudioContext,
  onPlaybackUnavailable: (
    reason: "background" | "closed" | "resume-failed",
  ) => void,
) {
  let disposed = false;
  let hasRun = context.state === "running";
  let recovering = false;

  const recover = () => {
    if (document.visibilityState === "hidden") return;
    // Call even while recovering, to preserve fresh gesture activation.
    const resumed = resumeAudioContext(context);
    if (recovering) return;
    recovering = true;
    void resumed.then((running) => {
      recovering = false;
      if (disposed) return;
      if (running) hasRun = true;
      else onPlaybackUnavailable("resume-failed");
    });
  };
  const onStateChange = () => {
    if (context.state === "running") hasRun = true;
    else if (context.state === "closed") onPlaybackUnavailable("closed");
    else if (hasRun) recover();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden")
      onPlaybackUnavailable("background");
    else if (hasRun) recover();
  };
  const onForeground = () => {
    if (hasRun) recover();
  };
  const onPageHide = () => onPlaybackUnavailable("background");

  context.addEventListener("statechange", onStateChange);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onForeground);
  window.addEventListener("focus", onForeground);
  // A touch pointerdown alone is not a valid activation on all Safari versions.
  document.addEventListener("touchend", recover, { passive: true });
  document.addEventListener("click", recover);
  document.addEventListener("keydown", recover);

  return () => {
    disposed = true;
    context.removeEventListener("statechange", onStateChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("pageshow", onForeground);
    window.removeEventListener("focus", onForeground);
    document.removeEventListener("touchend", recover);
    document.removeEventListener("click", recover);
    document.removeEventListener("keydown", recover);
  };
}
