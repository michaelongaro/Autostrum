export type PlaybackSpeedPreset = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

/** Playback speed in the inclusive range [0.25, 1.5], typically in 0.05 steps. */
export type PlaybackSpeed = number;

export type PlaybackDifficulty =
  "beginner" | "easy" | "intermediate" | "advanced" | "expert";

export const PLAYBACK_SPEED_MIN = 0.25;
export const PLAYBACK_SPEED_MAX = 1.5;
export const PLAYBACK_SPEED_STEP = 0.05;

export const playbackSpeedPresets: PlaybackSpeedPreset[] = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5,
];

export const playbackSpeedOptions: {
  value: `${PlaybackSpeedPreset}x`;
  label: string;
  speed: PlaybackSpeedPreset;
}[] = [
  { value: "0.25x", label: "0.25x", speed: 0.25 },
  { value: "0.5x", label: "0.5x", speed: 0.5 },
  { value: "0.75x", label: "0.75x", speed: 0.75 },
  { value: "1x", label: "1x", speed: 1 },
  { value: "1.25x", label: "1.25x", speed: 1.25 },
  { value: "1.5x", label: "1.5x", speed: 1.5 },
];

export const playbackDifficultyOptions: {
  value: PlaybackDifficulty;
  label: string;
  speed: PlaybackSpeedPreset;
}[] = [
  { value: "beginner", label: "Beginner", speed: 0.5 },
  { value: "easy", label: "Easy", speed: 0.75 },
  { value: "intermediate", label: "Intermediate", speed: 1 },
  { value: "advanced", label: "Advanced", speed: 1.25 },
  { value: "expert", label: "Expert", speed: 1.5 },
];

const difficultyValueBySpeed: Record<PlaybackSpeedPreset, PlaybackDifficulty> =
  {
    0.25: "beginner",
    0.5: "beginner",
    0.75: "easy",
    1: "intermediate",
    1.25: "advanced",
    1.5: "expert",
  };

export function roundPlaybackSpeed(speed: number): PlaybackSpeed {
  return Math.round(speed / PLAYBACK_SPEED_STEP) * PLAYBACK_SPEED_STEP;
}

export function clampPlaybackSpeed(speed: number): PlaybackSpeed {
  const rounded = roundPlaybackSpeed(speed);
  return Math.min(
    PLAYBACK_SPEED_MAX,
    Math.max(PLAYBACK_SPEED_MIN, Number(rounded.toFixed(2))),
  );
}

export function formatPlaybackSpeed(speed: number): string {
  return `${Number(clampPlaybackSpeed(speed).toFixed(2))}x`;
}

export function getClosestPlaybackSpeedPreset(
  speed: number,
): PlaybackSpeedPreset {
  return playbackSpeedPresets.reduce((closest, preset) =>
    Math.abs(preset - speed) < Math.abs(closest - speed) ? preset : closest,
  );
}

export function getPlaybackControlValue({
  playbackSpeed,
  useDifficultyLabels,
}: {
  playbackSpeed: PlaybackSpeed;
  useDifficultyLabels: boolean;
}) {
  if (useDifficultyLabels) {
    return difficultyValueBySpeed[getClosestPlaybackSpeedPreset(playbackSpeed)];
  }

  return formatPlaybackSpeed(playbackSpeed);
}

export function getPlaybackControlLabel({
  playbackSpeed,
  useDifficultyLabels,
}: {
  playbackSpeed: PlaybackSpeed;
  useDifficultyLabels: boolean;
}) {
  if (useDifficultyLabels) {
    const difficulty =
      difficultyValueBySpeed[getClosestPlaybackSpeedPreset(playbackSpeed)];
    return playbackDifficultyOptions.find(
      (option) => option.value === difficulty,
    )?.label;
  }

  return formatPlaybackSpeed(playbackSpeed);
}

export function getPlaybackSpeedFromControlValue({
  value,
  useDifficultyLabels,
}: {
  value: string;
  useDifficultyLabels: boolean;
}) {
  if (useDifficultyLabels) {
    return (
      playbackDifficultyOptions.find((option) => option.value === value)
        ?.speed ?? 1
    );
  }

  return clampPlaybackSpeed(Number(value.slice(0, value.length - 1)));
}
