import { isPlaybackStutterDebugEnabled } from "~/utils/playbackStutterDevFlags";

const MARK_PREFIX = "playback-stutter";

export type PlaybackStutterEvent =
  | "chord-index-set"
  | "loop-boundary"
  | "visible-range-compute"
  | "chord-repetitions-primary"
  | "chord-repetitions-catchup"
  | "waapi-start"
  | "waapi-cancel"
  | "slider-loop-reset"
  | "long-task";

interface PlaybackStutterSample {
  event: PlaybackStutterEvent;
  timestamp: number;
  durationMs?: number;
  detail?: Record<string, number | string | boolean>;
}

const recentSamples: PlaybackStutterSample[] = [];
const MAX_SAMPLES = 200;

let longTaskObserver: PerformanceObserver | null = null;
let lastChordIndex: number | null = null;
let lastChordIndexTimestamp = 0;

function pushSample(sample: PlaybackStutterSample) {
  recentSamples.push(sample);
  if (recentSamples.length > MAX_SAMPLES) {
    recentSamples.shift();
  }
}

export function markPlaybackStutter(
  name: string,
  detail?: Record<string, number | string | boolean>,
) {
  if (!isPlaybackStutterDebugEnabled()) return;

  const markName = `${MARK_PREFIX}:${name}`;
  performance.mark(markName);
  pushSample({
    event: name as PlaybackStutterEvent,
    timestamp: performance.now(),
    detail,
  });
}

export function measurePlaybackStutter(
  name: string,
  startMark: string,
  detail?: Record<string, number | string | boolean>,
) {
  if (!isPlaybackStutterDebugEnabled()) return;

  const start = `${MARK_PREFIX}:${startMark}`;
  const end = `${MARK_PREFIX}:${name}:end`;
  performance.mark(end);

  try {
    performance.measure(`${MARK_PREFIX}:${name}`, start, end);
    const entries = performance.getEntriesByName(`${MARK_PREFIX}:${name}`);
    const durationMs = entries.at(-1)?.duration;

    pushSample({
      event: name as PlaybackStutterEvent,
      timestamp: performance.now(),
      durationMs,
      detail,
    });

    if (durationMs !== undefined && durationMs > 8) {
      console.warn(
        `[playback-stutter] ${name} took ${durationMs.toFixed(1)}ms`,
        detail ?? "",
      );
    }
  } catch {
    // measure() throws if marks are missing; ignore in dev tooling
  }
}

export function recordChordIndexSet(chordIndex: number, playing: boolean) {
  if (!isPlaybackStutterDebugEnabled()) return;

  const now = performance.now();
  const deltaSinceLastMs =
    lastChordIndexTimestamp > 0 ? now - lastChordIndexTimestamp : undefined;

  markPlaybackStutter("chord-index-set", {
    chordIndex,
    playing,
    deltaSinceLastMs: deltaSinceLastMs ?? -1,
  });

  lastChordIndex = chordIndex;
  lastChordIndexTimestamp = now;
}

export function recordLoopBoundary(detail: Record<string, number | string>) {
  if (!isPlaybackStutterDebugEnabled()) return;

  markPlaybackStutter("loop-boundary", detail);
  console.info("[playback-stutter] loop boundary", detail);
}

export function startPlaybackStutterDiagnostics() {
  if (!isPlaybackStutterDebugEnabled()) return;
  if (typeof window === "undefined") return;
  if (longTaskObserver) return;

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        pushSample({
          event: "long-task",
          timestamp: entry.startTime,
          durationMs: entry.duration,
        });

        if (entry.duration > 16) {
          const nearChord =
            lastChordIndexTimestamp > 0
              ? entry.startTime - lastChordIndexTimestamp
              : null;

          console.warn(
            `[playback-stutter] long task ${entry.duration.toFixed(1)}ms` +
              (nearChord !== null
                ? ` (${nearChord.toFixed(0)}ms after chord index ${lastChordIndex})`
                : ""),
          );
        }
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: true });
  } catch {
    // longtask observer not supported in all environments
  }

  (window as unknown as { __playbackStutterDiagnostics?: unknown }).__playbackStutterDiagnostics =
    {
      getRecentSamples: () => [...recentSamples],
      summarize: summarizePlaybackStutterDiagnostics,
      clear: () => {
        recentSamples.length = 0;
        performance
          .getEntriesByType("mark")
          .filter((e) => e.name.startsWith(MARK_PREFIX))
          .forEach((e) => performance.clearMarks(e.name));
      },
    };
}

export function summarizePlaybackStutterDiagnostics() {
  const longTasks = recentSamples.filter((s) => s.event === "long-task");
  const chordSets = recentSamples.filter((s) => s.event === "chord-index-set");
  const loopBoundaries = recentSamples.filter((s) => s.event === "loop-boundary");
  const visibleRange = recentSamples.filter(
    (s) => s.event === "visible-range-compute",
  );

  const avgVisibleRangeMs =
    visibleRange.length > 0
      ? visibleRange.reduce((sum, s) => sum + (s.durationMs ?? 0), 0) /
        visibleRange.length
      : 0;

  const summary = {
    sampleCount: recentSamples.length,
    longTaskCount: longTasks.length,
    maxLongTaskMs: Math.max(0, ...longTasks.map((s) => s.durationMs ?? 0)),
    chordIndexUpdates: chordSets.length,
    loopBoundaries: loopBoundaries.length,
    avgVisibleRangeComputeMs: avgVisibleRangeMs,
    longTasksNearChordMs: longTasks
      .map((task) => {
        const priorChord = [...chordSets]
          .reverse()
          .find((c) => c.timestamp <= task.timestamp);
        return priorChord ? task.timestamp - priorChord.timestamp : null;
      })
      .filter((v): v is number => v !== null && v < 50),
  };

  console.table(summary);
  return summary;
}
