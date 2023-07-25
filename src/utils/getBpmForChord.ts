export default function getBpmForChord(
  chordBpm: number,
  baselineBpm: number
): string {
  // if the chordBpm is empty, set it to the baselineBpm
  if (chordBpm === -1) {
    return `${baselineBpm}`;
  }

  // if the chordBpm is not empty, return it
  return `${chordBpm}`;
}
