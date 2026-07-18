import type Soundfont from "soundfont-player";
import { noteLengthMultipliers, type FullNoteLengths } from "~/stores/TabStore";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";

export const PLAYBACK_SCHEDULE_LOOKAHEAD_SECONDS = 2.0;

export const PLAYBACK_START_EPSILON_SECONDS = 0.03;

const SCHEDULER_POLL_INTERVAL_MS = 25;
const MIN_SCHEDULER_SLEEP_SECONDS = SCHEDULER_POLL_INTERVAL_MS / 1000;

export interface PlaybackTimelineEntry {
  chordIndex: number;
  adjChordIndex: number;
  startTime: number | null;
  duration: number;
  effectiveBpm: number;
  thirdPrevColumn?: string[];
  secondPrevColumn?: string[];
  prevColumn?: string[];
  currColumn: string[];
  nextColumn?: string[];
  isLastInCompiledSequence: boolean;
}

export interface BuildPlaybackTimelineArgs {
  compiledChords: string[][];
  fromChordIndex: number;
  adjChordCount: number;
  playbackSpeed: number;
  startTime: number;
}

export function buildPlaybackTimeline({
  compiledChords,
  fromChordIndex,
  adjChordCount,
  playbackSpeed,
  startTime,
}: BuildPlaybackTimelineArgs): PlaybackTimelineEntry[] {
  const entries: PlaybackTimelineEntry[] = [];
  let nextStartTime = startTime;

  for (
    let chordIndex = fromChordIndex;
    chordIndex < adjChordCount;
    chordIndex++
  ) {
    const adjChordIndex = chordIndex % compiledChords.length;
    const currColumn = compiledChords[adjChordIndex];

    let entryStartTime: number | null = null;
    let duration = 0;
    let effectiveBpm = 0;

    if (currColumn && currColumn.length > 0) {
      // guard against malformed columns: an invalid note length or bpm must
      // never produce NaN, since it would poison every subsequent startTime
      const noteLengthMultiplier =
        noteLengthMultipliers[currColumn[8] as FullNoteLengths] ?? 1;
      const baseBpm = Number(currColumn[9]);

      if (Number.isFinite(baseBpm) && baseBpm > 0 && playbackSpeed > 0) {
        effectiveBpm = baseBpm * (1 / noteLengthMultiplier) * playbackSpeed;
        duration = 60 / effectiveBpm;
        entryStartTime = nextStartTime;
        nextStartTime += duration;
      }
    }

    entries.push({
      chordIndex,
      adjChordIndex,
      startTime: entryStartTime,
      duration,
      effectiveBpm,
      thirdPrevColumn: compiledChords[adjChordIndex - 3],
      secondPrevColumn: compiledChords[adjChordIndex - 2],
      prevColumn: compiledChords[adjChordIndex - 1],
      currColumn: currColumn ?? [],
      nextColumn: compiledChords[adjChordIndex + 1],
      isLastInCompiledSequence: adjChordIndex === compiledChords.length - 1,
    });
  }

  return entries;
}

function getEntryCompletionTime(
  entry: PlaybackTimelineEntry,
  previousCompletionTime: number,
): number {
  if (entry.startTime !== null) {
    return entry.startTime + entry.duration;
  }

  return previousCompletionTime;
}

function getActiveChordIndexForTime(
  timeline: PlaybackTimelineEntry[],
  now: number,
  timelineAnchorTime: number,
): number | null {
  if (timeline.length === 0) return null;

  let previousCompletionTime = timelineAnchorTime;
  let activeChordIndex = timeline[0]!.chordIndex;

  for (const entry of timeline) {
    if (entry.startTime !== null) {
      if (entry.startTime <= now) {
        activeChordIndex = entry.chordIndex;
        previousCompletionTime = entry.startTime + entry.duration;
        continue;
      }

      break;
    }

    const completionTime = getEntryCompletionTime(
      entry,
      previousCompletionTime,
    );

    if (completionTime <= now) {
      activeChordIndex = entry.chordIndex;
      previousCompletionTime = completionTime;
      continue;
    }

    break;
  }

  return activeChordIndex;
}

export function sleepUntilAudioTime(
  audioContext: AudioContext,
  targetTime: number,
  isCancelled: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (isCancelled()) {
        resolve();
        return;
      }

      if (audioContext.currentTime >= targetTime) {
        resolve();
        return;
      }

      setTimeout(check, SCHEDULER_POLL_INTERVAL_MS);
    };

    check();
  });
}

export interface RunPlaybackSchedulerArgs {
  compiledChords: string[][];
  adjChordCount: number;
  startChordIndex: number;
  playbackStartTime: number;
  playbackSpeed: number;
  tuning: number[];
  capo: number;
  audioContext: AudioContext;
  masterVolumeGainNode: GainNode;
  currentInstrument: Soundfont.Player | null;
  currentlyPlayingStrings: (
    Soundfont.Player | AudioBufferSourceNode | undefined
  )[];
  scheduledNodes?: { stop(when?: number): void }[];
  playbackSessionId: number;
  editing: boolean;
  isSessionValid: () => boolean;
  getState: () => {
    breakOnNextChord: boolean;
    looping: boolean;
    showPlaybackModal: boolean;
    audioMetadata: { playing: boolean };
    currentChordIndex: number;
  };
  setState: (partial: Record<string, unknown>) => void;
  resetAudioRangeToStart: (mode: "editing" | "playback") => void;
  clearBreakOnNextChord: () => void;
}

export async function runPlaybackScheduler({
  compiledChords,
  adjChordCount,
  startChordIndex,
  playbackStartTime,
  playbackSpeed,
  tuning,
  capo,
  audioContext,
  masterVolumeGainNode,
  currentInstrument,
  currentlyPlayingStrings,
  scheduledNodes,
  isSessionValid,
  getState,
  setState,
  resetAudioRangeToStart,
  clearBreakOnNextChord,
  editing,
}: RunPlaybackSchedulerArgs): Promise<void> {
  // clamp a stale resume index so we never start past the end of the tab,
  // which would otherwise produce an empty timeline
  const safeStartChordIndex =
    startChordIndex >= adjChordCount || startChordIndex < 0
      ? 0
      : startChordIndex;

  let timeline = buildPlaybackTimeline({
    compiledChords,
    fromChordIndex: safeStartChordIndex,
    adjChordCount,
    playbackSpeed,
    startTime: playbackStartTime,
  });

  let scheduledIndex = 0;
  let processedIndex = 0;
  let lastCompletionTime = playbackStartTime;
  let timelineAnchorTime = playbackStartTime;
  let segmentEndTime = playbackStartTime;
  let lastReportedChordIndex = getState().currentChordIndex;

  for (const entry of timeline) {
    if (entry.startTime !== null) {
      segmentEndTime = entry.startTime + entry.duration;
    }
  }

  const maybeUpdateCurrentChordIndex = (nextChordIndex: number | null) => {
    if (nextChordIndex === null || nextChordIndex === lastReportedChordIndex) {
      return;
    }

    lastReportedChordIndex = nextChordIndex;
    setState({ currentChordIndex: nextChordIndex });
  };

  const stopAllScheduledAudio = () => {
    if (scheduledNodes) {
      for (const node of scheduledNodes) {
        try {
          node.stop();
        } catch {
          // node may have already finished/been stopped
        }
      }
      scheduledNodes.length = 0;
    }

    for (const currentlyPlayingString of currentlyPlayingStrings) {
      try {
        currentlyPlayingString?.stop();
      } catch {
        // ignore already-stopped nodes
      }
    }
  };

  const stopPlaybackState = () => {
    const { audioMetadata } = getState();
    setState({
      currentChordIndex: 0,
      playbackStartedAtAudioTime: null,
      audioMetadata: {
        ...audioMetadata,
        playing: false,
      },
    });
  };

  while (isSessionValid()) {
    const now = audioContext.currentTime;
    const horizon = now + PLAYBACK_SCHEDULE_LOOKAHEAD_SECONDS;

    maybeUpdateCurrentChordIndex(
      getActiveChordIndexForTime(timeline, now, timelineAnchorTime),
    );

    // schedule everything inside the lookahead window
    while (scheduledIndex < timeline.length && isSessionValid()) {
      const entry = timeline[scheduledIndex]!;

      if (entry.startTime !== null && entry.startTime > horizon) {
        break;
      }

      if (entry.startTime !== null && entry.currColumn.length > 0) {
        void playNoteColumn({
          tuning,
          capo,
          bpm: entry.effectiveBpm,
          targetStartTime: entry.startTime,
          thirdPrevColumn: entry.thirdPrevColumn,
          secondPrevColumn: entry.secondPrevColumn,
          prevColumn: entry.prevColumn,
          currColumn: entry.currColumn,
          nextColumn: entry.nextColumn,
          audioContext,
          masterVolumeGainNode,
          currentInstrument,
          currentlyPlayingStrings,
          scheduledNodes,
        });
      }

      scheduledIndex++;
    }

    // process ALL entries that have completed by `now` (not just one),
    // so we recover immediately after background-tab timer throttling
    while (processedIndex < timeline.length && isSessionValid()) {
      const entry = timeline[processedIndex]!;
      const completionTime = getEntryCompletionTime(entry, lastCompletionTime);

      if (now < completionTime) break;

      const { breakOnNextChord } = getState();

      if (breakOnNextChord) {
        clearBreakOnNextChord();
        // silence audio already scheduled within the lookahead window,
        // otherwise up to a second of notes keeps playing after "pause"
        stopAllScheduledAudio();
        return;
      }

      if (entry.isLastInCompiledSequence) {
        resetAudioRangeToStart(editing ? "editing" : "playback");
      }

      lastCompletionTime = completionTime;
      processedIndex++;
    }

    if (processedIndex >= timeline.length) {
      const lastEntry = timeline[timeline.length - 1];
      const { looping, showPlaybackModal, audioMetadata } = getState();

      // empty timeline (e.g. empty compiledChords): make sure we don't
      // leave the UI stuck in a "playing" state
      if (!lastEntry) {
        stopPlaybackState();
        return;
      }

      if (
        lastEntry.chordIndex === adjChordCount - 1 &&
        (looping || showPlaybackModal) &&
        audioMetadata.playing &&
        isSessionValid()
      ) {
        maybeUpdateCurrentChordIndex(0);

        timeline = buildPlaybackTimeline({
          compiledChords,
          fromChordIndex: 0,
          adjChordCount,
          playbackSpeed,
          startTime: segmentEndTime,
        });

        scheduledIndex = 0;
        processedIndex = 0;
        lastCompletionTime = segmentEndTime;
        timelineAnchorTime = segmentEndTime;

        for (const entry of timeline) {
          if (entry.startTime !== null) {
            segmentEndTime = entry.startTime + entry.duration;
          }
        }

        continue;
      }

      if (lastEntry.chordIndex === adjChordCount - 1 && !looping) {
        stopPlaybackState();
      }

      return;
    }

    const nextUnscheduledEntry = timeline[scheduledIndex];
    const nextUnprocessedEntry = timeline[processedIndex];

    let wakeTime = now + MIN_SCHEDULER_SLEEP_SECONDS;

    if (nextUnscheduledEntry && nextUnscheduledEntry.startTime !== null) {
      const scheduleWake =
        nextUnscheduledEntry.startTime - PLAYBACK_SCHEDULE_LOOKAHEAD_SECONDS;
      wakeTime = Math.min(wakeTime, scheduleWake);
    }

    if (nextUnprocessedEntry) {
      const processWake = getEntryCompletionTime(
        nextUnprocessedEntry,
        lastCompletionTime,
      );
      wakeTime = Math.min(wakeTime, processWake);
    }

    wakeTime = Math.max(now + MIN_SCHEDULER_SLEEP_SECONDS, wakeTime);

    await sleepUntilAudioTime(audioContext, wakeTime, () => !isSessionValid());
  }
}
