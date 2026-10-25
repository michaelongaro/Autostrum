const RESUME_TIMEOUT_MS = 1200;
const CLOCK_TIMEOUT_MS = 600;
const CLOCK_POLL_MS = 50;

export type AudioUnavailableReason =
  "background" | "interrupted" | "closed" | "resume-failed" | "disposed";
export type AudioLifecycleEvent =
  AudioUnavailableReason | "foreground" | "ready";

const countInLoads = new WeakMap<AudioContext, Promise<AudioBuffer>>();

export function isAudioPageHidden() {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

type PageEvent = "background" | "foreground" | "gesture";
const pageListeners = new Set<(event: PageEvent) => void>();
let removePageListeners: (() => void) | undefined;
let inGesture = false;

// All sessions share one set of DOM listeners. Capture runs before React's
// handlers, so a replacement is created/unlocked inside the activating gesture.
function watchAudioPage(listener: (event: PageEvent) => void) {
  pageListeners.add(listener);
  if (!removePageListeners) {
    const emit = (event: PageEvent) => {
      for (const callback of pageListeners) callback(event);
    };
    const onVisibility = () =>
      emit(isAudioPageHidden() ? "background" : "foreground");
    const onHide = () => emit("background");
    const onForeground = () => {
      if (!isAudioPageHidden()) emit("foreground");
    };
    const onGesture = (event: Event) => {
      if (!event.isTrusted || isAudioPageHidden()) return;
      inGesture = true;
      try {
        emit("gesture");
      } finally {
        inGesture = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onForeground);
    window.addEventListener("focus", onForeground);
    document.addEventListener("touchend", onGesture, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    removePageListeners = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onForeground);
      window.removeEventListener("focus", onForeground);
      document.removeEventListener("touchend", onGesture, true);
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }
  return () => {
    pageListeners.delete(listener);
    if (pageListeners.size === 0) {
      removePageListeners?.();
      removePageListeners = undefined;
    }
  };
}

function hasUserActivation() {
  return (
    inGesture ||
    (typeof navigator !== "undefined" && navigator.userActivation?.isActive)
  );
}

type ResumeAttempt = {
  promise: Promise<boolean>;
  retry: (attempt: Promise<void>, gesture: boolean) => void;
};
const pendingResumes = new WeakMap<AudioContext, ResumeAttempt>();

/** Every real tap issues resume synchronously, even if Safari left an older promise pending. */
export function resumeAudioContext(context: AudioContext): Promise<boolean> {
  // Safari can report running before rendering has actually recovered. A real
  // tap must still reach resume(), including while a clock check is pending.
  if (context.state === "running" && !hasUserActivation())
    return Promise.resolve(true);
  if (context.state === "closed") return Promise.resolve(false);
  let attempt: Promise<void>;
  try {
    attempt = context.resume();
  } catch {
    return Promise.resolve(false);
  }
  const pending = pendingResumes.get(context);
  if (pending) {
    pending.retry(attempt, Boolean(hasUserActivation()));
    return pending.promise;
  }
  let retry: ResumeAttempt["retry"] = () => undefined;
  const promise = new Promise<boolean>((resolve) => {
    let settled = false;
    let attemptId = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      context.removeEventListener("statechange", onStateChange);
      resolve(context.state === "running");
    };
    const onStateChange = () => {
      if (context.state === "running" || context.state === "closed") finish();
    };
    retry = (nextAttempt, gesture) => {
      const id = ++attemptId;
      if (gesture || !timeout) {
        clearTimeout(timeout);
        timeout = setTimeout(finish, RESUME_TIMEOUT_MS);
      }
      void nextAttempt.then(
        () => {
          if (context.state === "running") finish();
        },
        () => {
          if (id === attemptId) finish();
        },
      );
    };
    context.addEventListener("statechange", onStateChange);
    retry(attempt, true);
  }).finally(() => {
    pendingResumes.delete(context);
  });
  pendingResumes.set(context, { promise, retry });
  return promise;
}

function closeAudioContext(context: AudioContext) {
  if (context.state === "closed") return;
  try {
    void context.close().catch(() => undefined);
  } catch {
    /* Already released. */
  }
}

/** One owner for creation, recovery, replacement, and disposal of an audio graph. */
export function createAudioContextController(options: {
  onContextChange: (context: AudioContext | null) => void;
  onUnavailable: (reason: AudioUnavailableReason) => void;
}) {
  let context: AudioContext | null = null;
  let requested = false;
  let hasRun = false;
  let replaceOnGesture = false;
  let version = 0;
  let pending: Promise<AudioContext | null> | null = null;
  let unwatch: (() => void) | undefined;
  let clockTimer: ReturnType<typeof setTimeout> | undefined;
  let clockSample: number | null = null;
  let lastVerifiedAt = -Infinity;
  const listeners = new Set<(event: AudioLifecycleEvent) => void>();
  const emit = (event: AudioLifecycleEvent) => {
    if (event !== "ready" && event !== "foreground")
      options.onUnavailable(event);
    for (const listener of listeners) listener(event);
  };
  const onStateChange = () => {
    if (!context || context.state === "running") return;
    lastVerifiedAt = -Infinity;
    if (context.state === "closed") {
      version++;
      pending = null;
      emit("closed");
    } else if (hasRun) {
      // Stop scheduled notes immediately; their timestamps cannot survive an interruption.
      emit("interrupted");
      if (!pending && !replaceOnGesture) void ensureRunning();
    }
  };
  const onPageEvent = (event: PageEvent) => {
    if (event === "background") {
      clockSample = null;
      lastVerifiedAt = -Infinity;
      version++;
      pending = null;
      emit("background");
    } else if (event === "foreground") {
      clockSample = null;
      lastVerifiedAt = -Infinity;
      emit("foreground");
      if (requested && !replaceOnGesture) void ensureRunning();
    } else if (
      requested &&
      (replaceOnGesture || context?.state !== "running" || pending)
    ) {
      void ensureRunning();
    }
  };

  function monitorClock() {
    clearTimeout(clockTimer);
    clockTimer = setTimeout(() => {
      if (!context || replaceOnGesture) return;
      if (isAudioPageHidden() || context.state !== "running") {
        clockSample = null;
      } else {
        if (clockSample !== null && context.currentTime <= clockSample) {
          replaceOnGesture = true;
          emit("resume-failed");
          return;
        }
        clockSample = context.currentTime;
      }
      monitorClock();
    }, 1000);
  }

  function initialize() {
    if (
      context &&
      context.state !== "closed" &&
      !(replaceOnGesture && hasUserActivation())
    )
      return context;
    const previous = context;
    let next: AudioContext | null = null;
    try {
      // Release the failed graph before allocating another hardware context.
      // Mobile browsers can impose a small limit on live contexts.
      previous?.removeEventListener("statechange", onStateChange);
      if (previous) closeAudioContext(previous);
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      next = new Constructor();
      context = next;
      version++;
      pending = null;
      hasRun = false;
      replaceOnGesture = false;
      clockSample = null;
      lastVerifiedAt = -Infinity;
      clearTimeout(clockTimer);
      options.onContextChange(next);
      next.addEventListener("statechange", onStateChange);
      unwatch ??= watchAudioPage(onPageEvent);
      return next;
    } catch (error) {
      if (next) closeAudioContext(next);
      context = previous;
      previous?.addEventListener("statechange", onStateChange);
      console.error("Could not create the audio context:", error);
      return null;
    }
  }

  function ensureRunning(): Promise<AudioContext | null> {
    if (isAudioPageHidden()) return Promise.resolve(null);
    const target = initialize();
    if (!target) return Promise.resolve(null);
    requested = true;
    // A second tap can unlock Safari even when the first resume() never settles.
    const resumed = resumeAudioContext(target);
    if (hasUserActivation() && performance.now() - lastVerifiedAt >= 250) {
      // iOS may need a source started in the gesture as well as resume(). The
      // real notes wait for readiness/sample loading, so unlock with one silent
      // frame now rather than waiting for a clock that has not started yet.
      let source: AudioBufferSourceNode | undefined;
      try {
        source = target.createBufferSource();
        source.buffer = target.createBuffer(1, 1, target.sampleRate);
        source.connect(target.destination);
        const unlockSource = source;
        source.onended = () => {
          unlockSource.disconnect();
          unlockSource.onended = null;
        };
        source.start(0);
      } catch {
        source?.disconnect();
        // Resume and the bounded clock check still decide readiness if this
        // browser cannot schedule the unlock source.
      }
    }
    if (pending) return pending;
    // Playback preparation checks before and after sample loading. Reuse a
    // recent clock proof instead of adding another delay to the same tap.
    if (
      !replaceOnGesture &&
      target.state === "running" &&
      performance.now() - lastVerifiedAt < 250
    )
      return Promise.resolve(target);
    const attemptVersion = version;
    const isCurrent = () =>
      context === target && version === attemptVersion && !isAudioPageHidden();
    const preparation = (async () => {
      if (!(await resumed) || !isCurrent()) return null;
      // Safari can report running with a frozen rendering clock after an app switch.
      let startTime = target.currentTime;
      let deadline = performance.now() + CLOCK_TIMEOUT_MS;
      let retriedDuringPreparation = false;
      while (isCurrent()) {
        // Opening a microphone or changing an output route can suspend a graph
        // during its first clock check. Retry that graph once within this
        // bounded preparation instead of failing/recreating a healthy session.
        if (target.state !== "running") {
          if (retriedDuringPreparation || !(await resumeAudioContext(target)))
            break;
          retriedDuringPreparation = true;
          startTime = target.currentTime;
          deadline = performance.now() + CLOCK_TIMEOUT_MS;
        }
        await new Promise((resolve) => setTimeout(resolve, CLOCK_POLL_MS));
        if (target.state !== "running") continue;
        if (target.currentTime > startTime) {
          if (!isCurrent() || target.state !== "running") return null;
          hasRun = true;
          replaceOnGesture = false;
          clockSample = target.currentTime;
          lastVerifiedAt = performance.now();
          monitorClock();
          emit("ready");
          return target;
        }
        if (performance.now() >= deadline) break;
      }
      return null;
    })()
      .then((ready) => {
        if (!ready && isCurrent()) {
          // Recreating after an await loses user activation. Wait for the next
          // trusted gesture before replacing a failed graph.
          replaceOnGesture = true;
          emit("resume-failed");
        }
        return ready;
      })
      .finally(() => {
        if (pending === preparation) pending = null;
      });
    pending = preparation;
    return preparation;
  }

  return {
    initialize,
    ensureRunning,
    subscribe(listener: (event: AudioLifecycleEvent) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      clearTimeout(clockTimer);
      clockSample = null;
      version++;
      requested = false;
      pending = null;
      unwatch?.();
      unwatch = undefined;
      const previous = context;
      previous?.removeEventListener("statechange", onStateChange);
      context = null;
      emit("disposed");
      options.onContextChange(null);
      if (previous) closeAudioContext(previous);
    },
  };
}

/** A stalled download/decode must leave its cache retryable after a network switch. */
export function withAudioLoadTimeout<T>(load: Promise<T>, label: string) {
  let timeout: ReturnType<typeof setTimeout>;
  return Promise.race([
    load,
    new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`${label} timed out. Please try again.`)),
        15000,
      );
    }),
  ]).finally(() => clearTimeout(timeout));
}

export function loadCountInBuffer(context: AudioContext) {
  const cached = countInLoads.get(context);
  if (cached) return cached;
  const controller = new AbortController();
  const load = withAudioLoadTimeout(
    fetch("/sounds/countIn.wav", { signal: controller.signal }).then(
      async (response) => {
        if (!response.ok) throw new Error("Could not load count-in audio.");
        return context.decodeAudioData(await response.arrayBuffer());
      },
    ),
    "Count-in audio",
  ).catch((error: unknown) => {
    countInLoads.delete(context);
    throw error;
  });
  void load.finally(() => controller.abort()).catch(() => undefined);
  countInLoads.set(context, load);
  return load;
}
