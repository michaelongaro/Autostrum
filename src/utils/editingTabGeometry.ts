/** Shared geometry for the editing tab staff (not used by static/playback). */

export const EDITING_TAB_STRING_COUNT = 6;

/** Vertical space for one string row. Tight enough that notes sit close together. */
export const EDITING_TAB_STRING_ROW_HEIGHT_PX = 24;

export const EDITING_TAB_STRINGS_HEIGHT_PX =
  EDITING_TAB_STRING_ROW_HEIGHT_PX * EDITING_TAB_STRING_COUNT;

/** Fixed width of each notes column. The string line inside is still dynamic. */
export const EDITING_TAB_COLUMN_WIDTH_PX = 40;

export const EDITING_TAB_PALM_MUTE_HEIGHT_PX = 48;

/**
 * Spacer above the tuning letters / start-end nuts. Slightly shorter than the
 * notes-column palm-mute header so the letters sit flush with the staff.
 */
export const EDITING_TAB_TUNING_PALM_MUTE_SPACER_PX = 46;

/** Space between the sixth string and the note-length guide. */
export const EDITING_TAB_NOTE_LENGTH_GAP_PX = 8;

/** Ellipsis + chord-effect input + note-length guide under the strings. */
export const EDITING_TAB_FOOTER_HEIGHT_PX = 74 + EDITING_TAB_NOTE_LENGTH_GAP_PX;

/**
 * Footer height used by measure-line reorder/delete controls and the overall
 * column height budget (includes the extra 4px those controls need).
 */
export const EDITING_TAB_REORDER_FOOTER_HEIGHT_PX =
  EDITING_TAB_FOOTER_HEIGHT_PX + 4;

export const EDITING_TAB_COLUMN_HEIGHT_PX =
  EDITING_TAB_PALM_MUTE_HEIGHT_PX +
  EDITING_TAB_STRINGS_HEIGHT_PX +
  EDITING_TAB_REORDER_FOOTER_HEIGHT_PX;

/**
 * Dim overlay placed over the staff during column reorder/delete. Inset from
 * the palm-mute header and clipped short of the full string stack so it
 * covers the string lines without eating the PM / footer chrome.
 */
export const EDITING_TAB_REORDER_DIM_TOP_PX = 59;
export const EDITING_TAB_REORDER_DIM_HEIGHT_PX = 119;

/** Offset from the top of the string stack to the first 1px string line. */
export const EDITING_TAB_STAFF_LINE_INSET_PX =
  EDITING_TAB_STRING_ROW_HEIGHT_PX / 2;

/** Vertical line spanning the first string through the sixth string. */
export const EDITING_TAB_STAFF_LINE_HEIGHT_PX =
  (EDITING_TAB_STRING_COUNT - 1) * EDITING_TAB_STRING_ROW_HEIGHT_PX + 1;
