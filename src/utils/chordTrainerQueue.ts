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

  while (queue.length < INITIAL_QUEUE_LENGTH) {
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
