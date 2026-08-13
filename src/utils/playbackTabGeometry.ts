/** Shared geometry for playback tab / chord staff alignment. */

export const PLAYBACK_TAB_STRING_COUNT = 6;

/**
 * One playback string row: 1px string line with 10px vertical margin
 * (`my-[10px]`). Portrait uses 12px (`mobilePortrait:my-3`) → 25px.
 */
export const PLAYBACK_TAB_STRING_ROW_HEIGHT_PX = 21;
export const PLAYBACK_TAB_STRING_ROW_HEIGHT_PORTRAIT_PX = 25;

export const PLAYBACK_TAB_STRINGS_HEIGHT_PX =
  PLAYBACK_TAB_STRING_ROW_HEIGHT_PX * PLAYBACK_TAB_STRING_COUNT;
export const PLAYBACK_TAB_STRINGS_HEIGHT_PORTRAIT_PX =
  PLAYBACK_TAB_STRING_ROW_HEIGHT_PORTRAIT_PX * PLAYBACK_TAB_STRING_COUNT;

/** 1px measure lines and start/end staff lines. */
export const PLAYBACK_TAB_MEASURE_LINE_WIDTH_PX = 1;

/**
 * Measure-line column height. Tuned so a centered 126px/150px string span
 * lines up with tab/chord staffs, and so loop-range nodes stay aligned
 * (`mt-6` on chords vs `mt-1` on measure lines).
 */
export const PLAYBACK_TAB_MEASURE_LINE_HEIGHT_PX = 202;
export const PLAYBACK_TAB_MEASURE_LINE_HEIGHT_PORTRAIT_PX = 222;

/** Playhead height matches the string span (tab staff / chord box). */
export const PLAYBACK_TAB_HIGHLIGHT_HEIGHT_PX = PLAYBACK_TAB_STRINGS_HEIGHT_PX;
export const PLAYBACK_TAB_HIGHLIGHT_HEIGHT_PORTRAIT_PX =
  PLAYBACK_TAB_STRINGS_HEIGHT_PORTRAIT_PX;
