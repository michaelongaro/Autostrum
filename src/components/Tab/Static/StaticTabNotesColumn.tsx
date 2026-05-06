import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME, TabNote as TabNoteType } from "~/stores/TabStore";
import renderNoteLengthGuide from "~/utils/renderNoteLengthGuide";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import {
  getStringValue,
  isTabMeasureLine,
  isTabNote,
} from "~/utils/tabNoteHelpers";

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
  columnIndex: number;
  isLastColumn: boolean;
  sectionIndex: number;
  subSectionIndex: number;
  color: COLORS;
  theme: THEME;
}

function StaticTabNotesColumn({
  columnData,
  columnIndex,
  isLastColumn,
  sectionIndex,
  subSectionIndex,
  color,
  theme,
}: StaticTabNotesColumnProps) {
  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

  const previousColumn =
    columnIndex > 0 ? subSection.data[columnIndex - 1] : undefined;
  const nextColumn =
    columnIndex < subSection.data.length - 1
      ? subSection.data[columnIndex + 1]
      : undefined;

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
    columnIndex === 0 ||
    (previousColumn !== undefined && isTabMeasureLine(previousColumn));
  const isLastInGroup =
    isLastColumn ||
    columnIndex === subSection.data.length - 1 ||
    (nextColumn !== undefined && isTabMeasureLine(nextColumn));

  return (
    <div className="baseFlex h-[248px] w-[34px] cursor-default">
      <div className="baseVertFlex">
        {/* Palm Mute Node */}
        <div className="baseVertFlex h-[32px] w-full">
          <StaticPalmMuteNode
            value={columnData.palmMute}
            color={color}
            theme={theme}
          />
        </div>

        {/* String Notes (1-6) w/ top and bottom borders */}
        {([0, 1, 2, 3, 4, 5, 6, 7] as const).map((stringIndex) => {
          const note =
            stringIndex !== 0 && stringIndex !== 7
              ? getStringValue(columnData, stringIndex)
              : "null";

          return (
            <div
              key={stringIndex}
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-background"]} / 0.75)`,
              }}
              className="baseFlex relative w-[34px] shrink-0"
            >
              {/* top border */}
              {stringIndex === 0 && (
                <div className="baseVertFlex h-[8px] w-full !justify-start">
                  <div
                    style={{
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                    }}
                    className="h-[2px] w-full"
                  ></div>
                </div>
              )}

              {stringIndex !== 0 && stringIndex !== 7 && (
                <>
                  <div
                    style={{
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
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
                      note.includes(">") ||
                      columnData.chordEffects?.includes(">")
                    }
                    isStaccato={
                      note.includes(".") &&
                      !columnData.chordEffects?.includes(".") // felt distracting to see the staccato on every note w/in the chord
                    }
                    isRest={
                      stringIndex === 4 && columnData.chordEffects === "r"
                    }
                    color={color}
                    theme={theme}
                  />

                  <div
                    style={{
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
                    }}
                    className="h-[1px] w-full"
                  ></div>
                </>
              )}

              {/* bottom border */}
              {stringIndex === 7 && (
                <div className="baseVertFlex h-[8px] w-full !justify-end">
                  <div
                    style={{
                      backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                    }}
                    className="h-[2px] w-full"
                  ></div>
                </div>
              )}
            </div>
          );
        })}

        <div className="baseVertFlex h-[55px] w-full">
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
              color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
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

      {isLastColumn && (
        <div className="baseVertFlex">
          <div className="h-[32px] w-full"></div>
          <div
            style={{
              borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
              backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-background"]} / 0.75)`,
            }}
            className="h-[160px] rounded-r-2xl border-2 p-1"
          ></div>
          <div className="h-[55px] w-full"></div>
        </div>
      )}
    </div>
  );
}

export default StaticTabNotesColumn;
