import type { PlaybackTimelineEntry } from "~/utils/playbackScheduler";

const BEAT_EPSILON = 1e-8;
const LOOKAHEAD_SECONDS = 0.15;

/** Quarter-note pulse, independent of bar lines and note attacks. */
export function buildMetronomeTimeline(
  timeline: PlaybackTimelineEntry[],
  beatsUntilNextClick = 0,
) {
  const clickTimes: number[] = [];

  for (const entry of timeline) {
    if (
      entry.startTime === null ||
      !Number.isFinite(entry.metronomeBpm) ||
      entry.metronomeBpm <= 0 ||
      !Number.isFinite(entry.duration) ||
      entry.duration <= 0
    )
      continue;

    const secondsPerBeat = 60 / entry.metronomeBpm;
    const beatsInEntry = entry.duration / secondsPerBeat;
    let beat = beatsUntilNextClick;

    // An endpoint belongs to the next entry/cycle, avoiding double clicks.
    while (beat < beatsInEntry - BEAT_EPSILON) {
      clickTimes.push(entry.startTime + beat * secondsPerBeat);
      beat += 1;
    }

    beatsUntilNextClick = beat - beatsInEntry;
    if (Math.abs(beatsUntilNextClick) < BEAT_EPSILON) beatsUntilNextClick = 0;
  }

  return { clickTimes, beatsUntilNextClick };
}

function timelineDuration(timeline: PlaybackTimelineEntry[]) {
  let end = 0;
  for (const entry of timeline) {
    if (entry.startTime !== null) end = entry.startTime + entry.duration;
  }
  return end;
}

export function createPlaybackMetronome({
  audioContext,
  destination,
  timeline,
  repeatTimeline,
}: {
  audioContext: AudioContext;
  destination: GainNode;
  timeline: PlaybackTimelineEntry[];
  /** Full cycle with relative times starting at zero (resume may start later). */
  repeatTimeline: PlaybackTimelineEntry[];
}) {
  let { clickTimes, beatsUntilNextClick } = buildMetronomeTimeline(timeline);
  let nextClickIndex = 0;
  let nextCycleStart = timelineDuration(timeline);
  const cycleDuration = timelineDuration(repeatTimeline);
  const activeClicks = new Map<OscillatorNode, number>();
  let stopped = false;

  function stopClicks() {
    for (const source of activeClicks.keys()) source.stop();
    activeClicks.clear();
  }

  return {
    stop() {
      stopped = true;
      stopClicks();
    },
    schedule(enabled: boolean, repeat: boolean) {
      if (stopped) return;
      const now = audioContext.currentTime;
      const horizon = now + LOOKAHEAD_SECONDS;

      if (!enabled && activeClicks.size > 0) {
        // A quick off/on must still be able to join the next beat, even if
        // that beat was already scheduled and then cancelled while muted.
        const futureClicks = [...activeClicks.values()].filter(
          (when) => when > now,
        );
        stopClicks();
        clickTimes = futureClicks
          .concat(clickTimes.slice(nextClickIndex))
          .sort((a, b) => a - b);
        nextClickIndex = 0;
      }

      // Prepare beats across the loop boundary before the note scheduler wraps.
      // Fractional beats carry through both tempo changes and uneven loops.
      while (repeat && cycleDuration > 0 && nextCycleStart <= horizon) {
        const next = buildMetronomeTimeline(
          repeatTimeline,
          beatsUntilNextClick,
        );
        clickTimes = clickTimes.slice(nextClickIndex);
        nextClickIndex = 0;
        for (const time of next.clickTimes)
          clickTimes.push(nextCycleStart + time);
        beatsUntilNextClick = next.beatsUntilNextClick;
        nextCycleStart += cycleDuration;
      }

      while (nextClickIndex < clickTimes.length) {
        const when = clickTimes[nextClickIndex]!;
        if (when > (enabled ? horizon : now)) break;
        nextClickIndex++;
        // Never bunch overdue beats together after a delayed scheduler poll.
        if (!enabled || when < now) continue;

        const source = audioContext.createOscillator();
        const gain = audioContext.createGain();
        source.type = "sine";
        source.frequency.value = 1000;
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.2, when + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
        source.connect(gain);
        gain.connect(destination);
        activeClicks.set(source, when);
        source.onended = () => {
          activeClicks.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        source.start(when);
        source.stop(when + 0.05);
      }
    },
  };
}
