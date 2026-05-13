export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

export type PlaybackDifficulty =
  | "beginner"
  | "easy"
  | "intermediate"
  | "advanced"
  | "expert";

export const playbackSpeedOptions: {
  value: `${PlaybackSpeed}x`;
  label: string;
  speed: PlaybackSpeed;
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
  speed: PlaybackSpeed;
}[] = [
  { value: "beginner", label: "Beginner", speed: 0.5 },
  { value: "easy", label: "Easy", speed: 0.75 },
  { value: "intermediate", label: "Intermediate", speed: 1 },
  { value: "advanced", label: "Advanced", speed: 1.25 },
  { value: "expert", label: "Expert", speed: 1.5 },
];

const difficultyValueBySpeed: Record<PlaybackSpeed, PlaybackDifficulty> = {
  0.25: "beginner",
  0.5: "beginner",
  0.75: "easy",
  1: "intermediate",
  1.25: "advanced",
  1.5: "expert",
};

export function getPlaybackControlValue({
  playbackSpeed,
  useDifficultyLabels,
}: {
  playbackSpeed: PlaybackSpeed;
  useDifficultyLabels: boolean;
}) {
  if (useDifficultyLabels) {
    return difficultyValueBySpeed[playbackSpeed];
  }

  return `${playbackSpeed}x` as const;
}

export function getPlaybackControlLabel({
  playbackSpeed,
  useDifficultyLabels,
}: {
  playbackSpeed: PlaybackSpeed;
  useDifficultyLabels: boolean;
}) {
  if (useDifficultyLabels) {
    return playbackDifficultyOptions.find(
      (option) => option.value === difficultyValueBySpeed[playbackSpeed],
    )?.label;
  }

  return `${playbackSpeed}x`;
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

  return Number(value.slice(0, value.length - 1)) as PlaybackSpeed;
}
