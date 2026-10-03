import type { Metadata } from "~/stores/TabStore";

function isPlayableMetadata(metadata: Metadata): boolean {
  return metadata.type === "tab" || metadata.type === "strum";
}

function getChordDurationSeconds(
  metadata: Metadata,
  playbackSpeed: number,
): number {
  if (!isPlayableMetadata(metadata)) return 0;

  const bpm = metadata.bpm;
  const noteLengthMultiplier = Number(metadata.noteLengthMultiplier);
  if (
    !(bpm > 0) ||
    !(noteLengthMultiplier > 0) ||
    !(playbackSpeed > 0) ||
    !Number.isFinite(bpm) ||
    !Number.isFinite(noteLengthMultiplier)
  ) {
    return 0;
  }

  return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
}

const cumulativeCache = new WeakMap<Metadata[], Map<number, number[]>>();

/**
 * Prefix sums of chord start times. Cached on the metadata array identity so
 * the editing playhead does not rebuild an O(tab) timeline on every frame.
 */
export function getPlaybackCumulativeSeconds(
  metadata: Metadata[],
  playbackSpeed: number,
): number[] {
  let bySpeed = cumulativeCache.get(metadata);
  if (!bySpeed) {
    bySpeed = new Map();
    cumulativeCache.set(metadata, bySpeed);
  }

  const cached = bySpeed.get(playbackSpeed);
  if (cached) return cached;

  const cumulative = new Array(metadata.length + 1).fill(0) as number[];
  for (let index = 0; index < metadata.length; index++) {
    cumulative[index + 1] =
      cumulative[index]! +
      getChordDurationSeconds(metadata[index]!, playbackSpeed);
  }

  bySpeed.set(playbackSpeed, cumulative);
  return cumulative;
}

/**
 * Last metadata index whose start time is `<= loopSeconds`.
 * Same result as a forward scan that breaks at the first later timestamp.
 */
export function findPlaybackSegmentIndex(
  cumulative: number[],
  metadataLength: number,
  loopSeconds: number,
): number {
  if (metadataLength <= 0) return 0;

  let lo = 0;
  let hi = metadataLength - 1;
  let answer = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if ((cumulative[mid] ?? 0) <= loopSeconds) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return answer;
}
