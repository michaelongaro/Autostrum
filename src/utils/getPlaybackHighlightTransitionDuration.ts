import { noteLengthMultipliers, type FullNoteLengths } from "~/stores/TabStore";

const MIN_CHORD_DURATION_SECONDS = 0.125;
const MAX_CHORD_DURATION_SECONDS = 2.5;
const MIN_TRANSITION_DURATION_MS = 40;
const MAX_TRANSITION_DURATION_MS = 240;

export default function getPlaybackHighlightTransitionDuration({
  bpm,
  noteLength,
  playbackSpeed = 1,
}: {
  bpm: number;
  noteLength: FullNoteLengths;
  playbackSpeed?: number;
}): number {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 60;
  const safePlaybackSpeed =
    Number.isFinite(playbackSpeed) && playbackSpeed > 0 ? playbackSpeed : 1;

  const chordDurationSeconds =
    60 / ((safeBpm / noteLengthMultipliers[noteLength]) * safePlaybackSpeed);

  const clampedDurationSeconds = Math.min(
    MAX_CHORD_DURATION_SECONDS,
    Math.max(MIN_CHORD_DURATION_SECONDS, chordDurationSeconds),
  );

  const normalizedDuration =
    (clampedDurationSeconds - MIN_CHORD_DURATION_SECONDS) /
    (MAX_CHORD_DURATION_SECONDS - MIN_CHORD_DURATION_SECONDS);

  return Math.round(
    MIN_TRANSITION_DURATION_MS +
      normalizedDuration *
        (MAX_TRANSITION_DURATION_MS - MIN_TRANSITION_DURATION_MS),
  );
}
