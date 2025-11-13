export default function getBpmForChord(
  chordBpm: number,
  baselineBpm: number,
  subSectionBpm?: number,
): number {
  if (chordBpm !== -1) return chordBpm;

  if (subSectionBpm && subSectionBpm !== -1) return subSectionBpm;

  return baselineBpm;
}
