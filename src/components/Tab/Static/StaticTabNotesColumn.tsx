import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";
import type {
  COLORS,
  THEME,
  TabMeasureLine as TabMeasureLineType,
  TabNote as TabNoteType,
} from "~/stores/TabStore";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import {
  getStringValue,
  isTabMeasureLine,
  isTabNote,
} from "~/utils/tabNoteHelpers";
import {
  STATIC_TAB_BORDER_SPACER_PX,
  STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX,
  STATIC_TAB_NOTES_COLUMN_WIDTH_PX,
  STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX,
  STATIC_TAB_ROW_HEIGHT_PX,
} from "~/utils/staticTabGeometry";

function chordHasAtLeastOneNote(chordData: TabNoteType): boolean {
  return [
    chordData.firstString,
    chordData.secondString,
    chordData.thirdString,
    chordData.fourthString,
    chordData.fifthString,
    chordData.sixthString,
  ].some((note) => note !== "");
}

interface StaticTabNotesColumnProps {
  columnData: TabNoteType;
  // neighbors are resolved by the row renderer in StaticTabSection so that
  // offscreen (virtualized) columns hold no store subscriptions
  previousColumn: TabNoteType | TabMeasureLineType | undefined;
  nextColumn: TabNoteType | TabMeasureLineType | undefined;
  isLastColumn: boolean;
  color: COLORS;
  theme: THEME;
}

function StaticTabNotesColumn({
  columnData,
  previousColumn,
  nextColumn,
  isLastColumn,
  color,
  theme,
}: StaticTabNotesColumnProps) {
  const previousColumnIsPlayable =
    previousColumn !== undefined && isTabNote(previousColumn);
  const nextColumnIsPlayable =
    nextColumn !== undefined && isTabNote(nextColumn);

  const previousNoteLength = previousColumnIsPlayable
    ? previousColumn.noteLength
    : undefined;
  const nextNoteLength = nextColumnIsPlayable
    ? nextColumn.noteLength
    : undefined;

  const previousIsRestStrum = previousColumnIsPlayable
    ? previousColumn.chordEffects === "r"
    : undefined;
  const currentIsRestStrum = columnData.chordEffects === "r";
  const nextIsRestStrum = nextColumnIsPlayable
    ? nextColumn.chordEffects === "r"
    : undefined;

  // Determine group boundaries for note length guide beam rendering
  const isFirstInGroup =
    previousColumn === undefined || isTabMeasureLine(previousColumn);
  const isLastInGroup =
    isLastColumn || nextColumn === undefined || isTabMeasureLine(nextColumn);

  return (
    <div
      style={{
        height: STATIC_TAB_ROW_HEIGHT_PX,
        width: STATIC_TAB_NOTES_COLUMN_WIDTH_PX,
      }}
      className="baseFlex"
    >
      <div className="baseVertFlex size-full !justify-start">
        {/* Palm Mute Node */}
        <div
          style={{ height: STATIC_TAB_PALM_MUTE_HEADER_HEIGHT_PX }}
          className="baseVertFlex w-full"
        >
          <StaticPalmMuteNode value={columnData.palmMute} />
        </div>

        {/* Former top container border — spacer only, so row height is unchanged */}
        <div
          style={{ height: STATIC_TAB_BORDER_SPACER_PX }}
          className="w-full shrink-0"
        />

        {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => {
          const note = getStringValue(columnData, stringIndex);

          return (
            <div
              key={stringIndex}
              style={{
                width: STATIC_TAB_NOTES_COLUMN_WIDTH_PX,
              }}
              className="baseFlex relative shrink-0"
            >
              <div
                style={{
                  backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
                }}
                className="h-[1px] w-full"
              ></div>

              <StaticTabNote
                note={
                  note.includes(">")
                    ? note.slice(0, note.length - 1)
                    : note.includes(".")
                      ? note.slice(0, note.length - 1)
                      : note
                }
                isAccented={
                  note.includes(">") || columnData.chordEffects?.includes(">")
                }
                isStaccato={
                  note.includes(".") &&
                  !columnData.chordEffects?.includes(".") // felt distracting to see the staccato on every note w/in the chord
                }
                isRest={stringIndex === 4 && columnData.chordEffects === "r"}
              />

              <div
                style={{
                  backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
                }}
                className="h-[1px] w-full"
              ></div>
            </div>
          );
        })}

        {/* Former bottom container border — spacer only */}
        <div
          style={{ height: STATIC_TAB_BORDER_SPACER_PX }}
          className="w-full shrink-0"
        />

        <div
          style={{ height: STATIC_TAB_NOTE_LENGTH_FOOTER_HEIGHT_PX }}
          className="baseVertFlex w-full"
        >
          {/* Note Length Guide */}
          <div className="relative h-5 w-full">
            <div className="baseVertFlex mt-1 h-4 w-full">
              {renderNoteLengthGuide({
                previousNoteLength,
                currentNoteLength: columnData.noteLength,
                nextNoteLength,
                previousIsRestStrum,
                currentIsRestStrum,
                nextIsRestStrum,
                color,
                theme,
                isFirstInGroup,
                isLastInGroup,
              })}
            </div>
          </div>

          {/* Chord Effects */}
          <div
            style={{
              lineHeight: "16px",
              color: "hsl(var(--screenshot-foreground))",
            }}
            className="baseVertFlex relative mt-2 h-[19px] w-[1.5rem]"
          >
            {chordHasAtLeastOneNote(columnData) &&
              columnData.chordEffects?.includes("v") && (
                <BsArrowDown
                  style={{
                    width: "19px",
                    height: "19px",
                  }}
                  strokeWidth={
                    columnData.chordEffects?.includes(">") ? "1.25px" : "0px"
                  }
                />
              )}

            {chordHasAtLeastOneNote(columnData) &&
              columnData.chordEffects?.includes("^") && (
                <BsArrowUp
                  style={{
                    width: "19px",
                    height: "19px",
                  }}
                  strokeWidth={
                    columnData.chordEffects?.includes(">") ? "1.25px" : "0px"
                  }
                />
              )}

            {columnData.chordEffects?.includes("s") && (
              <div
                style={{ fontSize: "18px" }}
                className={`baseFlex ${columnData.chordEffects?.includes(">") ? "font-semibold" : "font-normal"} mt-[-4px]`}
              >
                s
              </div>
            )}

            {chordHasAtLeastOneNote(columnData) &&
              columnData.chordEffects?.includes(".") && (
                <div
                  style={{
                    fontSize: "30px",
                    position: "absolute",
                    top: columnData.chordEffects === "." ? "-8px" : "-15px",
                    right: columnData.chordEffects === "." ? "6px" : "8px",
                    width: columnData.chordEffects === "." ? "10px" : "0px",
                  }}
                >
                  .
                </div>
              )}

            {columnData.chordEffects === "" && <div className="h-5 w-4"></div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaticTabNotesColumn;
