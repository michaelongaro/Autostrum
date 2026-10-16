import type { FullNoteLengths } from "~/stores/TabStore";

/**
 * Note-length beams, without a time signature.
 *
 * Barlines are the only metrical anchors the tab has, and a bar is not
 * required to add up to a full measure. Inside each span (a run of notes
 * between barlines, or one strumming pattern) every note is laid on a grid
 * that starts at the beginning of that span, using its real duration.
 *
 * The grid pulse is a quarter note — the same pulse as the "1 e & a" labels
 * on strumming patterns, and the usual guitar beat. Eighths therefore beam
 * in pairs and sixteenths in fours, which you can count without tracing the
 * whole tab.
 *
 * A dotted-quarter pulse (compound meter: 6/8, 12/8, …) is used only when
 * that reading scores clearly better than the quarter grid. One ambiguous
 * cell stays in simple meter, so a common 4/4 figure such as dotted-eighth +
 * sixteenth + eighth is not glued into a single beam. A repeated compound
 * cell, which makes the quarter grid beam across a beat, switches over.
 */

/** Duration unit: one 64th note. A quarter note is 16. */
const QUARTER_PULSE = 16;
const DOTTED_QUARTER_PULSE = 24;

/**
 * How much better the compound reading must be before we leave simple meter.
 * Just under one "complete beat group" (+5), so a single ambiguous cell stays
 * in quarter time and a repeated compound pattern does not.
 */
const SIMPLE_METER_BIAS = 4;

export interface BeamSpanEvent {
  noteLength: FullNoteLengths;
  isRest: boolean;
}

export interface BeamBreakFlags {
  /** Do not join a beam from this note to the previous one. */
  breakWithPrevious: boolean;
  /** Do not join a beam from this note to the next one. */
  breakWithNext: boolean;
}

/**
 * Same durations as `noteLengthMultipliers`, in 64th notes.
 * A dot adds half the base, a double dot adds half plus a quarter.
 */
function durationUnits(noteLength: FullNoteLengths): number {
  let base = QUARTER_PULSE;

  if (noteLength.startsWith("whole")) base = 64;
  else if (noteLength.startsWith("half")) base = 32;
  else if (noteLength.startsWith("quarter")) base = QUARTER_PULSE;
  else if (noteLength.startsWith("eighth")) base = 8;
  else if (noteLength.startsWith("sixteenth")) base = 4;

  if (noteLength.includes("double-dotted")) {
    return base + base / 2 + base / 4;
  }

  if (noteLength.includes("dotted")) {
    return base + base / 2;
  }

  return base;
}

function isBeamableLength(noteLength: FullNoteLengths): boolean {
  return noteLength.startsWith("eighth") || noteLength.startsWith("sixteenth");
}

function isBeamableEvent(event: BeamSpanEvent): boolean {
  return !event.isRest && isBeamableLength(event.noteLength);
}

function scorePulse(events: BeamSpanEvent[], pulse: number): number {
  const durations = events.map((event) => durationUnits(event.noteLength));
  const starts: number[] = [];
  let position = 0;

  for (const duration of durations) {
    starts.push(position);
    position += duration;
  }

  let score = 0;
  let index = 0;

  while (index < events.length) {
    const event = events[index];
    if (!event || !isBeamableEvent(event)) {
      index++;
      continue;
    }

    const pulseIndex = Math.floor((starts[index] ?? 0) / pulse);
    let end = index + 1;

    while (
      end < events.length &&
      events[end] &&
      isBeamableEvent(events[end]!) &&
      Math.floor((starts[end] ?? 0) / pulse) === pulseIndex
    ) {
      end++;
    }

    const groupCount = end - index;
    const groupStart = starts[index] ?? 0;
    const lastDuration = durations[end - 1] ?? 0;
    const groupDuration = (starts[end - 1] ?? 0) + lastDuration - groupStart;

    if (groupCount >= 2 && groupDuration === pulse) {
      score += 5;
    } else if (groupCount >= 2 && groupDuration < pulse) {
      score += 2;
    } else if (groupCount === 1 && (durations[index] ?? 0) < pulse) {
      score -= 1;
    } else if (groupDuration > pulse) {
      // Notes that start in one beat but together cross into the next.
      score -= 3;
    }

    index = end;
  }

  return score;
}

function choosePulse(events: BeamSpanEvent[]): number {
  const quarter = scorePulse(events, QUARTER_PULSE);
  const dotted = scorePulse(events, DOTTED_QUARTER_PULSE);

  if (dotted > quarter + SIMPLE_METER_BIAS) {
    return DOTTED_QUARTER_PULSE;
  }

  return QUARTER_PULSE;
}

function startPositions(events: BeamSpanEvent[]): number[] {
  const starts: number[] = [];
  let position = 0;

  for (const event of events) {
    starts.push(position);
    position += durationUnits(event.noteLength);
  }

  return starts;
}

/**
 * For each event, whether the beam to its neighbor should break.
 * Rests and notes longer than an eighth never beam; those breaks are true too.
 */
export function resolveBeamBreaks(events: BeamSpanEvent[]): BeamBreakFlags[] {
  if (events.length === 0) return [];

  const pulse = choosePulse(events);
  const starts = startPositions(events);

  return events.map((event, index) => {
    const previous = events[index - 1];
    const next = events[index + 1];
    const start = starts[index] ?? 0;

    const sharesPulseWith = (neighbor: BeamSpanEvent, neighborStart: number) =>
      isBeamableEvent(event) &&
      isBeamableEvent(neighbor) &&
      Math.floor(start / pulse) === Math.floor(neighborStart / pulse);

    return {
      breakWithPrevious: !(
        previous && sharesPulseWith(previous, starts[index - 1] ?? 0)
      ),
      breakWithNext: !(next && sharesPulseWith(next, starts[index + 1] ?? 0)),
    };
  });
}

const CLOSED_BREAKS: BeamBreakFlags = {
  breakWithPrevious: true,
  breakWithNext: true,
};

/**
 * Beam breaks for a tab row. Measure lines (anything whose type is not
 * "note") end the current span and reset the beat grid.
 */
export function beamBreaksForNoteSpans(
  columns: readonly {
    type: string;
    noteLength?: FullNoteLengths;
    chordEffects?: string;
  }[],
): BeamBreakFlags[] {
  const breaks = columns.map(() => ({ ...CLOSED_BREAKS }));
  let index = 0;

  while (index < columns.length) {
    if (columns[index]?.type !== "note") {
      index++;
      continue;
    }

    const start = index;
    while (index < columns.length && columns[index]?.type === "note") {
      index++;
    }

    const events: BeamSpanEvent[] = [];
    for (let cursor = start; cursor < index; cursor++) {
      const note = columns[cursor];
      events.push({
        noteLength: note?.noteLength ?? "quarter",
        isRest: note?.chordEffects === "r",
      });
    }

    const spanBreaks = resolveBeamBreaks(events);
    for (let offset = 0; offset < spanBreaks.length; offset++) {
      const flags = spanBreaks[offset];
      if (flags) breaks[start + offset] = flags;
    }
  }

  return breaks;
}

export function beamBreaksForStrums(
  strums: readonly { noteLength: FullNoteLengths; strum: string }[],
): BeamBreakFlags[] {
  return resolveBeamBreaks(
    strums.map((strum) => ({
      noteLength: strum.noteLength,
      isRest: strum.strum === "r",
    })),
  );
}
