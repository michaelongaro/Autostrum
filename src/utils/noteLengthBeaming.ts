import {
  noteLengthMultipliers,
  type FullNoteLengths,
  type PlaybackLoopDelaySpacerChord,
  type PlaybackStrummedChord,
  type PlaybackTabChord,
  type TabMeasureLine,
  type TabNote,
} from "~/stores/TabStore";
import {
  beamBreaksForNoteSpans,
  resolveBeamBreaks,
  type BeamBreakFlags,
  type BeamSpanEvent,
} from "~/utils/noteLengthBeamingCore";
import { isTabNote } from "~/utils/tabNoteHelpers";

export {
  beamBreaksForNoteSpans,
  beamBreaksForStrums,
  resolveBeamBreaks,
  type BeamBreakFlags,
  type BeamSpanEvent,
} from "~/utils/noteLengthBeamingCore";

const CLOSED_BREAKS: BeamBreakFlags = {
  breakWithPrevious: true,
  breakWithNext: true,
};

type PlaybackBeamChord =
  PlaybackTabChord | PlaybackStrummedChord | PlaybackLoopDelaySpacerChord;

export function beamBreaksForTabColumns(
  columns: readonly (TabNote | TabMeasureLine)[],
): BeamBreakFlags[] {
  return beamBreaksForNoteSpans(columns);
}

export function beamBreaksAtTabColumn(
  columns: readonly (TabNote | TabMeasureLine)[],
  columnIndex: number,
): BeamBreakFlags {
  const column = columns[columnIndex];
  if (!column || !isTabNote(column)) return CLOSED_BREAKS;

  let start = columnIndex;
  while (start > 0 && isTabNote(columns[start - 1]!)) start--;

  let end = columnIndex;
  while (end < columns.length - 1 && isTabNote(columns[end + 1]!)) end++;

  const events: BeamSpanEvent[] = [];
  for (let cursor = start; cursor <= end; cursor++) {
    const note = columns[cursor];
    if (!note || !isTabNote(note)) continue;
    events.push({
      noteLength: note.noteLength,
      isRest: note.chordEffects === "r",
    });
  }

  return resolveBeamBreaks(events)[columnIndex - start] ?? CLOSED_BREAKS;
}

function isPlaybackMeasureLine(chord: PlaybackBeamChord): boolean {
  return (
    chord.type === "tab" &&
    (chord.data.chordData.includes("|") ||
      chord.data.chordData[8] === "measureLine")
  );
}

function isSpanBoundary(chord: PlaybackBeamChord): boolean {
  return chord.type === "loopDelaySpacer" || isPlaybackMeasureLine(chord);
}

function canJoinPlaybackSpan(
  left: PlaybackBeamChord,
  right: PlaybackBeamChord,
): boolean {
  if (isSpanBoundary(left) || isSpanBoundary(right)) return false;
  if (left.type !== right.type) return false;
  if (left.type !== "tab" && left.type !== "strum") return false;
  if (left.isLastChord) return false;
  if (right.type === "tab" || right.type === "strum") {
    if (right.isFirstChord) return false;
  }
  return true;
}

function isFullNoteLength(value: string | undefined): value is FullNoteLengths {
  return value !== undefined && value in noteLengthMultipliers;
}

function playbackEvent(chord: PlaybackBeamChord): BeamSpanEvent | null {
  if (chord.type === "tab") {
    if (isPlaybackMeasureLine(chord)) return null;
    const noteLength = chord.data.chordData[8];
    if (!isFullNoteLength(noteLength)) return null;
    return {
      noteLength,
      isRest: chord.data.chordData[7] === "r",
    };
  }

  if (chord.type === "strum") {
    return {
      noteLength: chord.data.noteLength,
      isRest: chord.data.strum === "r",
    };
  }

  return null;
}

export function beamBreaksForPlaybackIndex(
  chords: readonly PlaybackBeamChord[],
  index: number,
): BeamBreakFlags {
  const chord = chords[index];
  if (!chord || isSpanBoundary(chord)) return CLOSED_BREAKS;

  let start = index;
  while (start > 0 && canJoinPlaybackSpan(chords[start - 1]!, chords[start]!)) {
    start--;
  }

  let end = index;
  while (
    end < chords.length - 1 &&
    canJoinPlaybackSpan(chords[end]!, chords[end + 1]!)
  ) {
    end++;
  }

  const events: BeamSpanEvent[] = [];
  let indexInSpan = 0;

  for (let cursor = start; cursor <= end; cursor++) {
    const event = playbackEvent(chords[cursor]!);
    if (!event) continue;
    if (cursor === index) indexInSpan = events.length;
    events.push(event);
  }

  return resolveBeamBreaks(events)[indexInSpan] ?? CLOSED_BREAKS;
}
