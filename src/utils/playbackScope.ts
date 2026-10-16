export interface PlaybackScope {
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
}

/**
 * Whether a section, subsection, or chord-sequence play button targets the
 * scope stored on `audioMetadata.location`.
 *
 * Stored locations omit optional indices that were undefined. Button scopes
 * still pass those indices as `undefined`. Strict equality treats that as the
 * same scope. Deep equality does not, because one object has the key and the
 * other does not, which made a pause click restart playback from the first chord.
 */
export function playbackScopesMatch(
  location: PlaybackScope | null | undefined,
  scope: PlaybackScope,
): boolean {
  if (!location) return false;

  return (
    location.sectionIndex === scope.sectionIndex &&
    location.subSectionIndex === scope.subSectionIndex &&
    location.chordSequenceIndex === scope.chordSequenceIndex
  );
}
