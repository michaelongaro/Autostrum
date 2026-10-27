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

// Compiled playback arrays are immutable. Resolve each span once, not once
// per mounted chord on every highlight/visibility update. Weak keys release
// the flags when a tab is recompiled or its session is discarded.
const playbackBeamCache = new WeakMap<
  readonly PlaybackBeamChord[],
  BeamBreakFlags[]
>();

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
  let flags = playbackBeamCache.get(chords);
  if (!flags) {
    flags = new Array<BeamBreakFlags>(chords.length).fill(CLOSED_BREAKS);
    for (let start = 0; start < chords.length;) {
      let end = start;
      while (
        end + 1 < chords.length &&
        canJoinPlaybackSpan(chords[end]!, chords[end + 1]!)
      )
        end++;
      const events: BeamSpanEvent[] = [];
      const indices: number[] = [];
      for (let cursor = start; cursor <= end; cursor++) {
        const event = playbackEvent(chords[cursor]!);
        if (event) {
          indices.push(cursor);
          events.push(event);
        }
      }
      const spanFlags = resolveBeamBreaks(events);
      indices.forEach((chordIndex, eventIndex) => {
        flags![chordIndex] = spanFlags[eventIndex] ?? CLOSED_BREAKS;
      });
      start = end + 1;
    }
    playbackBeamCache.set(chords, flags);
  }
  return flags[index] ?? CLOSED_BREAKS;
}
