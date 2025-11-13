import type { FullNoteLengths } from "~/stores/TabStore";

const NOTE_TICKS: Record<FullNoteLengths, number> = {
  whole: 1,
  "whole dotted": 1,
  "whole double-dotted": 1,
  half: 1,
  "half dotted": 1,
  "half double-dotted": 1,
  quarter: 1,
  "quarter dotted": 1,
  "quarter double-dotted": 1,
  eighth: 0.5,
  "eighth dotted": 0.5,
  "eighth double-dotted": 0.5,
  sixteenth: 0.25,
  "sixteenth dotted": 0.25,
  "sixteenth double-dotted": 0.25,
};

function beatLabelAt(tick: number): string {
  const beatNum = Math.floor(tick) + 1;
  const fractionalPart = tick - Math.floor(tick);

  // Use small epsilon for floating point comparison
  const epsilon = 0.001;

  if (Math.abs(fractionalPart) < epsilon) {
    return beatNum.toString();
  } else if (Math.abs(fractionalPart - 0.25) < epsilon) {
    return "e";
  } else if (Math.abs(fractionalPart - 0.5) < epsilon) {
    return "&";
  } else if (Math.abs(fractionalPart - 0.75) < epsilon) {
    return "a";
  }

  return beatNum.toString(); // fallback
}

function generateBeatLabels(durations: FullNoteLengths[]) {
  let tick = 0;
  return durations.map((duration) => {
    const label = beatLabelAt(tick);
    tick += NOTE_TICKS[duration];
    return label;
  });
}

export { generateBeatLabels };
