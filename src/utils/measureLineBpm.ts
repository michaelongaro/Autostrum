import type { TabMeasureLine, TabNote } from "~/stores/TabStore";
import getBpmForChord from "~/utils/getBpmForChord";
import { isTabMeasureLine } from "~/utils/tabNoteHelpers";

export interface MeasureLineBpmDisplay {
  /** True when the effective BPM changes across this measure line. */
  show: boolean;
  /** Effective BPM after the measure line (value to display when `show`). */
  bpm: number;
  /** Effective BPM of the chord immediately before the measure line. */
  bpmBefore: number;
  /** Effective BPM of the chord immediately after the measure line. */
  bpmAfter: number;
}

/**
 * Resolve sticky measure-line BPM display for a column.
 *
 * `bpmAfterLine: null` means "keep the last defined BPM" (subsection/tab
 * baseline until the first explicit measure-line BPM). The label is only
 * shown when the chord before and the chord after differ in effective BPM.
 */
export function getMeasureLineBpmDisplay({
  columns,
  measureLineIndex,
  subSectionBpm,
  baselineBpm,
}: {
  columns: (TabNote | TabMeasureLine)[];
  measureLineIndex: number;
  subSectionBpm: number;
  baselineBpm: number;
}): MeasureLineBpmDisplay {
  let currentBpm = getBpmForChord(subSectionBpm, baselineBpm);

  for (let i = 0; i < measureLineIndex; i++) {
    const column = columns[i];
    if (
      column &&
      isTabMeasureLine(column) &&
      column.bpmAfterLine !== null
    ) {
      currentBpm = column.bpmAfterLine;
    }
  }

  const bpmBefore = currentBpm;
  const measureLine = columns[measureLineIndex];
  const bpmAfter =
    measureLine &&
    isTabMeasureLine(measureLine) &&
    measureLine.bpmAfterLine !== null
      ? measureLine.bpmAfterLine
      : bpmBefore;

  return {
    show: bpmBefore !== bpmAfter,
    bpm: bpmAfter,
    bpmBefore,
    bpmAfter,
  };
}

/**
 * Apply sticky measure-line BPM: only overwrite when `bpmAfterLine` is set.
 * Returns the BPM in effect after this measure line.
 */
export function applyStickyMeasureLineBpm(
  currentBpm: number,
  bpmAfterLine: number | null,
): number {
  return bpmAfterLine !== null ? bpmAfterLine : currentBpm;
}
