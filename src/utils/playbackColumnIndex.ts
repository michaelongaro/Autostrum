import type { Metadata } from "~/stores/TabStore";

/**
 * Existence key for a compiled chord. Chord-sequence index is part of the key
 * so a tab column and a strum that share a chord index do not collide.
 * Omitted sequence indexes (tab notes, measure lines) use an empty slot.
 */
export function playbackLocationKey(location: {
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  chordIndex: number;
}): string {
  return `${location.sectionIndex}:${location.subSectionIndex ?? ""}:${location.chordSequenceIndex ?? ""}:${location.chordIndex}`;
}

const columnIndexCache = new WeakMap<Metadata[], Set<string>>();

export function getPlaybackColumnKeySet(metadata: Metadata[]): Set<string> {
  let keys = columnIndexCache.get(metadata);
  if (!keys) {
    keys = new Set();
    for (const entry of metadata) {
      keys.add(playbackLocationKey(entry.location));
    }
    columnIndexCache.set(metadata, keys);
  }
  return keys;
}

export function playbackMetadataHasColumn(
  metadata: Metadata[],
  location: {
    sectionIndex: number;
    subSectionIndex?: number;
    chordSequenceIndex?: number;
    chordIndex: number;
  },
): boolean {
  return getPlaybackColumnKeySet(metadata).has(playbackLocationKey(location));
}
