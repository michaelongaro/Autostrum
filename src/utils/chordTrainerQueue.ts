import type { ChordTrainerPreset } from "~/data/tools/chordTrainerPresets";
import type { ChordTrainerStrummingPattern } from "~/data/tools/chordTrainerStrummingPatterns";

export type ChordTrainerQueueItem = {
  instanceId: string;
  chord: ChordTrainerPreset;
  strum: string;
  showDiagram: boolean;
};

export const INITIAL_QUEUE_LENGTH = 36;
export const APPEND_CHUNK_SIZE = 12;
export const CHORD_ITEM_WIDTH = 136;
export const CHORD_ITEM_GAP = 40;
export const TOTAL_CHORD_WIDTH = CHORD_ITEM_WIDTH + CHORD_ITEM_GAP;
export const PATTERN_CHORD_ITEM_GAP = 16;
export const PATTERN_TOTAL_CHORD_WIDTH =
  CHORD_ITEM_WIDTH + PATTERN_CHORD_ITEM_GAP;
export const PATTERN_KEEP_PAST_GROUPS = 8;
export const PATTERN_AHEAD_GROUPS = 16;
export const CENTER_TRIGGER_EPSILON = 0.001;

export function getCenteredChordIndex(scrollX: number) {
  return Math.max(
    0,
    Math.floor(scrollX / TOTAL_CHORD_WIDTH + CENTER_TRIGGER_EPSILON),
  );
}

export function getChordStartScrollX(chordIndex: number) {
  return chordIndex * TOTAL_CHORD_WIDTH;
}

export type ChordTrainerPatternGroup = {
  id: string;
  chord: ChordTrainerPreset;
  items: ChordTrainerQueueItem[];
};

export function getPatternLength(pattern: ChordTrainerStrummingPattern) {
  return Math.max(1, pattern.strums.length);
}

export function getPatternGroupIndex(itemIndex: number, patternLength: number) {
  if (patternLength <= 0) return 0;
  return Math.floor(Math.max(0, itemIndex) / patternLength);
}

export function getStrumIndexInPattern(itemIndex: number, patternLength: number) {
  if (patternLength <= 0) return 0;
  return Math.max(0, itemIndex) % patternLength;
}

export function getPatternGroup(
  queue: ChordTrainerQueueItem[],
  groupIndex: number,
  patternLength: number,
): ChordTrainerPatternGroup | null {
  if (patternLength <= 0 || groupIndex < 0) return null;

  const start = groupIndex * patternLength;
  const items = queue.slice(start, start + patternLength);
  const firstItem = items[0];

  if (!firstItem) return null;

  return {
    id: firstItem.instanceId,
    chord: firstItem.chord,
    items,
  };
}

export function getPatternGroups(
  queue: ChordTrainerQueueItem[],
  patternLength: number,
): ChordTrainerPatternGroup[] {
  if (patternLength <= 0) return [];

  const groups: ChordTrainerPatternGroup[] = [];

  for (
    let groupIndex = 0;
    groupIndex * patternLength < queue.length;
    groupIndex++
  ) {
    const group = getPatternGroup(queue, groupIndex, patternLength);
    if (group) groups.push(group);
  }

  return groups;
}

export function getPatternItemStride(showIcons: boolean) {
  return showIcons ? PATTERN_TOTAL_CHORD_WIDTH : TOTAL_CHORD_WIDTH;
}

export function getPatternVisualScrollX(
  itemIndex: number,
  patternLength: number,
  stride: number = PATTERN_TOTAL_CHORD_WIDTH,
) {
  return getPatternGroupIndex(itemIndex, patternLength) * stride;
}

export function getPatternPlayheadProgress(
  scrollX: number,
  patternLength: number,
) {
  if (patternLength <= 0) return 0;

  const groupWidth = patternLength * TOTAL_CHORD_WIDTH;
  if (groupWidth <= 0) return 0;

  const groupIndex = Math.floor(Math.max(0, scrollX) / groupWidth);
  const groupStartX = groupIndex * groupWidth;

  return Math.max(0, Math.min(1, (scrollX - groupStartX) / groupWidth));
}

export function getPatternTrimCount(
  currentCenterIndex: number,
  patternLength: number,
) {
  if (patternLength <= 0) return 0;

  const keepPastItems = PATTERN_KEEP_PAST_GROUPS * patternLength;
  const raw = currentCenterIndex - keepPastItems;
  if (raw <= 0) return 0;

  return Math.floor(raw / patternLength) * patternLength;
}

export function shouldExtendPatternQueue(
  currentCenterIndex: number,
  queueLength: number,
  patternLength: number,
) {
  if (patternLength <= 0) return false;

  const currentGroup = getPatternGroupIndex(currentCenterIndex, patternLength);
  const totalGroups = Math.ceil(queueLength / patternLength);

  return currentGroup + PATTERN_AHEAD_GROUPS >= totalGroups;
}

export function getInitialQueueLength(
  showIcons: boolean,
  patternLength: number,
) {
  if (!showIcons) return INITIAL_QUEUE_LENGTH;

  return Math.max(
    INITIAL_QUEUE_LENGTH,
    patternLength * (PATTERN_KEEP_PAST_GROUPS + PATTERN_AHEAD_GROUPS),
  );
}

export function createPatternQueueItems(
  chord: ChordTrainerPreset,
  pattern: ChordTrainerStrummingPattern,
): ChordTrainerQueueItem[] {
  let diagramAssigned = false;

  return pattern.strums.map((strum) => {
    const isSpacer = strum.effect === "";
    const showDiagram = pattern.showIcons
      ? !isSpacer && !diagramAssigned
      : true;

    if (showDiagram) {
      diagramAssigned = true;
    }

    return {
      instanceId: crypto.randomUUID(),
      chord,
      strum: strum.effect,
      showDiagram,
    };
  });
}

export function getRandomChord(
  chords: ChordTrainerPreset[],
  previousChordId?: string,
): ChordTrainerPreset | null {
  if (chords.length === 0) return null;
  if (chords.length === 1) return chords[0] ?? null;

  const candidates = previousChordId
    ? chords.filter((chord) => chord.id !== previousChordId)
    : chords;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const randomChord = candidates.at(randomIndex);

  if (randomChord) {
    return randomChord;
  }

  return chords[0] ?? null;
}

function resolveQueueChord(
  chord: ChordTrainerPreset | null,
  fallbackChord: ChordTrainerPreset,
) {
  return chord ?? fallbackChord;
}

export function buildInitialQueue(
  chords: ChordTrainerPreset[],
  pattern: ChordTrainerStrummingPattern,
): ChordTrainerQueueItem[] {
  const queue: ChordTrainerQueueItem[] = [];
  let previousChordId: string | undefined = undefined;
  const fallbackChord = chords[0];

  if (!fallbackChord || pattern.strums.length === 0) {
    return queue;
  }

  const targetLength = getInitialQueueLength(
    pattern.showIcons,
    getPatternLength(pattern),
  );

  while (queue.length < targetLength) {
    const chord = resolveQueueChord(
      getRandomChord(chords, previousChordId),
      fallbackChord,
    );

    queue.push(...createPatternQueueItems(chord, pattern));
    previousChordId = chord.id;
  }

  return queue;
}

export function appendQueue(
  queue: ChordTrainerQueueItem[],
  chords: ChordTrainerPreset[],
  pattern: ChordTrainerStrummingPattern,
  count = APPEND_CHUNK_SIZE,
): ChordTrainerQueueItem[] {
  if (chords.length === 0 || pattern.strums.length === 0) return queue;

  let lastChordId = queue[queue.length - 1]?.chord.id;
  const fallbackChord = chords[0];
  if (!fallbackChord) return queue;

  const appends: ChordTrainerQueueItem[] = [];

  while (appends.length < count) {
    const nextChord = resolveQueueChord(
      getRandomChord(chords, lastChordId),
      fallbackChord,
    );

    appends.push(...createPatternQueueItems(nextChord, pattern));
    lastChordId = nextChord.id;
  }

  return [...queue, ...appends];
}
