import { motion } from "framer-motion";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME, TabNote as TabNoteType } from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import { getStringValue, isTabNote } from "~/utils/tabNoteHelpers";

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

  return (
    <motion.div
      key={columnData.id}
      className="baseFlex h-[290px] cursor-default"
    >
      <div className="baseVertFlex mb-[51px] mt-4">
        {/* Palm Mute Node */}
        <div className="baseFlex h-9 w-full">
          <StaticPalmMuteNode
            value={columnData.palmMute}
            color={color}
            theme={theme}
          />
        </div>

        {/* String Notes (1-6) */}
        {([1, 2, 3, 4, 5, 6] as const).map((stringIndex) => {
          const note = getStringValue(columnData, stringIndex);
          return (
            <div
              key={stringIndex}
              style={{
                borderTop: `${stringIndex === 1 ? "2px solid" : "none"}`,
                paddingTop: `${stringIndex === 1 ? "7px" : "0"}`,
                borderBottom: `${stringIndex === 6 ? "2px solid" : "none"}`,
                paddingBottom: `${stringIndex === 6 ? "7px" : "0"}`,
                borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-background"]} / 0.75)`,
              }}
              className="baseFlex relative min-h-[24px] w-[35px] basis-[content]"
            >
              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
                }}
                className="h-[1px] flex-[1]"
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
                  note.includes(".") && !columnData.chordEffects?.includes(".") // felt distracting to see the staccato on every note w/in the chord
                }
                isRest={stringIndex === 4 && columnData.chordEffects === "r"}
                color={color}
                theme={theme}
              />

              <div
                style={{
                  backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
                }}
                className="h-[1px] flex-[1]"
              ></div>
            </div>
          );
        })}

        {/* Strumming Guide */}
        <div className="relative h-0 w-full">
          <div
            className={`baseVertFlex absolute ${isLastColumn ? "left-[42%]" : "left-[53%]"} right-1/2 top-1 h-4 w-full -translate-x-1/2`}
          >
            {renderStrummingGuide({
              previousNoteLength,
              currentNoteLength: columnData.noteLength,
              nextNoteLength,
              previousIsRestStrum,
              currentIsRestStrum,
              nextIsRestStrum,
              color,
              theme,
            })}
          </div>
        </div>

        {/* Chord Effects */}
        <div className="relative h-0 w-full">
          <div
            style={{
              top: "0.25rem",
              lineHeight: "16px",
              color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            }}
            className="baseVertFlex absolute left-1/2 right-1/2 top-0 mt-6 w-[1.5rem] -translate-x-1/2"
          >
            <div className="baseFlex">
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
                  className={`baseFlex leading-[19px] ${columnData.chordEffects?.includes(">") ? "font-semibold" : "font-normal"}`}
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
                      top: "-13px",
                      right: "6px",
                      width: columnData.chordEffects === "." ? "10px" : "0px",
                    }}
                  >
                    .
                  </div>
                )}
            </div>

            {columnData.chordEffects === "" && <div className="h-5 w-4"></div>}
          </div>
        </div>
      </div>

      {isLastColumn && (
        <div
          style={{
            marginBottom: "-1px",
            borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
            backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-background"]} / 0.75)`,
          }}
          className="h-[168px] rounded-r-2xl border-2 p-1"
        ></div>
      )}
    </motion.div>
  );
}

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

export default StaticTabNotesColumn;
