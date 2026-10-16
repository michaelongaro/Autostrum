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

type ColumnList = (TabNote | TabMeasureLine)[];

interface MeasureLineBpmCacheEntry {
  subSectionBpm: number;
  baselineBpm: number;
  /** Stable display objects, one forward pass per columns-array identity. */
  byIndex: Map<number, MeasureLineBpmDisplay>;
}

const measureLineBpmCache = new WeakMap<ColumnList, MeasureLineBpmCacheEntry>();

function computeMeasureLineBpmMap(
  columns: ColumnList,
  subSectionBpm: number,
  baselineBpm: number,
): Map<number, MeasureLineBpmDisplay> {
  const byIndex = new Map<number, MeasureLineBpmDisplay>();
  let currentBpm = getBpmForChord(subSectionBpm, baselineBpm);

  for (let index = 0; index < columns.length; index++) {
    const column = columns[index];
    if (!column || !isTabMeasureLine(column)) continue;

    const bpmBefore = currentBpm;
    const bpmAfter =
      column.bpmAfterLine !== null ? column.bpmAfterLine : bpmBefore;
    byIndex.set(index, {
      show: bpmBefore !== bpmAfter,
      bpm: bpmAfter,
      bpmBefore,
      bpmAfter,
    });
    currentBpm = bpmAfter;
  }

  return byIndex;
}

/**
 * Resolve sticky measure-line BPM display for a column.
 *
 * `bpmAfterLine: null` means "keep the last defined BPM" (subsection/tab
 * baseline until the first explicit measure-line BPM). The label is only
 * shown when the chord before and the chord after differ in effective BPM.
 *
 * Results are cached per columns-array identity. A long subsection used to
 * rescan every preceding column from each measure line on every store
 * update (quadratic when the whole tab sits in one section).
 */
export function getMeasureLineBpmDisplay({
  columns,
  measureLineIndex,
  subSectionBpm,
  baselineBpm,
}: {
  columns: ColumnList;
  measureLineIndex: number;
  subSectionBpm: number;
  baselineBpm: number;
}): MeasureLineBpmDisplay {
  let entry = measureLineBpmCache.get(columns);
  if (
    !entry ||
    entry.subSectionBpm !== subSectionBpm ||
    entry.baselineBpm !== baselineBpm
  ) {
    entry = {
      subSectionBpm,
      baselineBpm,
      byIndex: computeMeasureLineBpmMap(columns, subSectionBpm, baselineBpm),
    };
    measureLineBpmCache.set(columns, entry);
  }

  const cached = entry.byIndex.get(measureLineIndex);
  if (cached) return cached;

  // Non-measure-line callers (or a stale index) still get the same answer
  // as a direct walk: no BPM change at this column.
  const bpm = getBpmForChord(subSectionBpm, baselineBpm);
  let currentBpm = bpm;
  for (let index = 0; index < measureLineIndex && index < columns.length; index++) {
    const column = columns[index];
    if (column && isTabMeasureLine(column) && column.bpmAfterLine !== null) {
      currentBpm = column.bpmAfterLine;
    }
  }

  return {
    show: false,
    bpm: currentBpm,
    bpmBefore: currentBpm,
    bpmAfter: currentBpm,
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
