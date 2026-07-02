import type Soundfont from "soundfont-player";
import {
  noteLengthMultipliers,
  type FullNoteLengths,
} from "~/stores/TabStore";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";

export const PLAYBACK_SCHEDULE_LOOKAHEAD_SECONDS = 1.0;

export const PLAYBACK_START_EPSILON_SECONDS = 0.03;

const SCHEDULER_POLL_INTERVAL_MS = 25;

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

  for (let chordIndex = fromChordIndex; chordIndex < adjChordCount; chordIndex++) {
    const adjChordIndex = chordIndex % compiledChords.length;
    const currColumn = compiledChords[adjChordIndex];

    let entryStartTime: number | null = null;
    let duration = 0;
    let effectiveBpm = 0;

    if (currColumn && currColumn.length > 0) {
      const noteLengthMultiplier =
        noteLengthMultipliers[currColumn[8] as FullNoteLengths];
      const baseBpm = Number(currColumn[9]);
      effectiveBpm = baseBpm * (1 / noteLengthMultiplier) * playbackSpeed;
      duration = 60 / effectiveBpm;
      entryStartTime = nextStartTime;
      nextStartTime += duration;
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
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
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
  };
  setState: (partial: Record<string, unknown>) => void;
  resetProgressTabSliderPosition: (mode: "editing" | "playback") => void;
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
  resetProgressTabSliderPosition,
  clearBreakOnNextChord,
  editing,
}: RunPlaybackSchedulerArgs): Promise<void> {
  let timeline = buildPlaybackTimeline({
    compiledChords,
    fromChordIndex: startChordIndex,
    adjChordCount,
    playbackSpeed,
    startTime: playbackStartTime,
  });

  let scheduledIndex = 0;
  let processedIndex = 0;
  let lastCompletionTime = playbackStartTime;
  let timelineAnchorTime = playbackStartTime;
  let segmentEndTime = playbackStartTime;

  for (const entry of timeline) {
    if (entry.startTime !== null) {
      segmentEndTime = entry.startTime + entry.duration;
    }
  }

  while (isSessionValid()) {
    const now = audioContext.currentTime;
    const horizon = now + PLAYBACK_SCHEDULE_LOOKAHEAD_SECONDS;

    let uiPreviousCompletion = timelineAnchorTime;

    for (let index = 0; index < timeline.length; index++) {
      const entry = timeline[index]!;
      const completionTime = getEntryCompletionTime(entry, uiPreviousCompletion);

      if (entry.startTime !== null) {
        if (entry.startTime <= now) {
          setState({ currentChordIndex: entry.chordIndex });
          uiPreviousCompletion = completionTime;
        } else {
          break;
        }
      } else if (completionTime <= now) {
        setState({ currentChordIndex: entry.chordIndex });
        uiPreviousCompletion = completionTime;
      } else {
        break;
      }
    }

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

    while (processedIndex < timeline.length && isSessionValid()) {
      const entry = timeline[processedIndex]!;
      const completionTime = getEntryCompletionTime(entry, lastCompletionTime);

      if (now < completionTime) {
        break;
      }

      if (entry.isLastInCompiledSequence) {
        resetProgressTabSliderPosition(editing ? "editing" : "playback");
      }

      const { breakOnNextChord } = getState();

      if (breakOnNextChord) {
        clearBreakOnNextChord();
        return;
      }

      lastCompletionTime = completionTime;
      processedIndex++;
    }

    if (processedIndex >= timeline.length) {
      const lastEntry = timeline[timeline.length - 1];
      const { looping, showPlaybackModal, audioMetadata } = getState();

      if (
        lastEntry &&
        lastEntry.chordIndex === adjChordCount - 1 &&
        (looping || showPlaybackModal) &&
        audioMetadata.playing &&
        isSessionValid()
      ) {
        setState({ currentChordIndex: 0 });

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

        segmentEndTime = segmentEndTime;
        for (const entry of timeline) {
          if (entry.startTime !== null) {
            segmentEndTime = entry.startTime + entry.duration;
          }
        }

        continue;
      }

      if (
        lastEntry &&
        lastEntry.chordIndex === adjChordCount - 1 &&
        !looping
      ) {
        setState({
          currentChordIndex: 0,
          playbackStartedAtAudioTime: null,
          audioMetadata: {
            ...audioMetadata,
            playing: false,
          },
        });
      }

      return;
    }

    const nextUnscheduledEntry = timeline[scheduledIndex];
    const nextUnprocessedEntry = timeline[processedIndex];

    let wakeTime = now + SCHEDULER_POLL_INTERVAL_MS / 1000;

    if (
      nextUnscheduledEntry &&
      nextUnscheduledEntry.startTime !== null &&
      nextUnscheduledEntry.startTime !== undefined
    ) {
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

    await sleepUntilAudioTime(audioContext, wakeTime, () => !isSessionValid());
  }
}
