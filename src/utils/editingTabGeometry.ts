/** Shared geometry for the editing tab staff (not used by static/playback). */

export const EDITING_TAB_STRING_COUNT = 6;

/** Vertical space for one string row. Tight enough that notes sit close together. */
export const EDITING_TAB_STRING_ROW_HEIGHT_PX = 24;

export const EDITING_TAB_STRINGS_HEIGHT_PX =
  EDITING_TAB_STRING_ROW_HEIGHT_PX * EDITING_TAB_STRING_COUNT;

/** Fixed width of each notes column. The string line inside is still dynamic. */
export const EDITING_TAB_COLUMN_WIDTH_PX = 40;

export const EDITING_TAB_PALM_MUTE_HEIGHT_PX = 48;

/** Space between the sixth string and the note-length guide. */
export const EDITING_TAB_NOTE_LENGTH_GAP_PX = 8;

/** Ellipsis + chord-effect input + note-length guide under the strings. */
export const EDITING_TAB_FOOTER_HEIGHT_PX = 74 + EDITING_TAB_NOTE_LENGTH_GAP_PX;

export const EDITING_TAB_COLUMN_HEIGHT_PX =
  EDITING_TAB_PALM_MUTE_HEIGHT_PX +
  EDITING_TAB_STRINGS_HEIGHT_PX +
  EDITING_TAB_FOOTER_HEIGHT_PX;

/** Offset from the top of the string stack to the first 1px string line. */
export const EDITING_TAB_STAFF_LINE_INSET_PX =
  EDITING_TAB_STRING_ROW_HEIGHT_PX / 2;

/** Vertical line spanning the first string through the sixth string. */
export const EDITING_TAB_STAFF_LINE_HEIGHT_PX =
  (EDITING_TAB_STRING_COUNT - 1) * EDITING_TAB_STRING_ROW_HEIGHT_PX + 1;
