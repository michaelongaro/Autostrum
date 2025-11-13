import { motion } from "framer-motion";
import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";
import { getDynamicNoteLengthIcon } from "~/utils/noteLengthIcons";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, FullNoteLengths, THEME } from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import { useTabSubSectionData } from "~/hooks/useTabDataSelectors";
import PauseIcon from "~/components/ui/icons/PauseIcon";

interface StaticTabNotesColumn {
  columnData: string[];
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
}: StaticTabNotesColumn) {
  const subSection = useTabSubSectionData(sectionIndex, subSectionIndex);

  const previousColumn =
    columnIndex > 0 ? subSection.data[columnIndex - 1] : undefined;
  const nextColumn =
    columnIndex < subSection.data.length - 1
      ? subSection.data[columnIndex + 1]
      : undefined;

  const previousColumnIsPlayable =
    previousColumn !== undefined && previousColumn[8] !== "measureLine";
  const nextColumnIsPlayable =
    nextColumn !== undefined && nextColumn[8] !== "measureLine";

  const previousNoteLength = previousColumnIsPlayable
    ? (previousColumn[8] as FullNoteLengths)
    : undefined;
  const nextNoteLength = nextColumnIsPlayable
    ? (nextColumn[8] as FullNoteLengths)
    : undefined;

  const previousIsRestStrum = previousColumnIsPlayable
    ? previousColumn[7] === "r"
    : undefined;
  const currentIsRestStrum = columnData[7] === "r";
  const nextIsRestStrum = nextColumnIsPlayable
    ? nextColumn[7] === "r"
    : undefined;

  return (
    <motion.div
      key={columnData[10]}
      className="baseFlex h-[285px] cursor-default"
    >
      <div className="baseVertFlex mb-[3.2rem] mt-4">
        {columnData.map((note, index) => (
          <Fragment key={index}>
            {index === 0 && (
              <div className="baseFlex h-9 w-full">
                <StaticPalmMuteNode value={note} color={color} theme={theme} />
              </div>
            )}

            {index > 0 && index < 7 && (
              <div
                style={{
                  borderTop: `${index === 1 ? "2px solid" : "none"}`,
                  paddingTop: `${index === 1 ? "7px" : "0"}`,
                  borderBottom: `${index === 6 ? "2px solid" : "none"}`,
                  paddingBottom: `${index === 6 ? "7px" : "0"}`,
                  borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                }}
                className="baseFlex relative w-[35px] basis-[content]"
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
                    note.includes(">") || columnData[7]?.includes(">")
                  }
                  isStaccato={
                    note.includes(".") && !columnData[7]?.includes(".") // felt distracting to see the staccato on every note w/in the chord
                  }
                  isRest={index === 4 && columnData[7] === "r"}
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
            )}

            {index === 8 && (
              <div className="relative h-0 w-full">
                <div
                  className={`baseVertFlex absolute ${isLastColumn ? "left-[42%]" : "left-[53%]"} right-1/2 top-1 h-4 w-full -translate-x-1/2`}
                >
                  {renderStrummingGuide({
                    previousNoteLength,
                    currentNoteLength: columnData[8] as FullNoteLengths,
                    nextNoteLength,
                    previousIsRestStrum,
                    currentIsRestStrum,
                    nextIsRestStrum,
                    color,
                    theme,
                  })}
                </div>
              </div>
            )}

            {index === 7 && (
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
                      columnData[7]?.includes("v") && (
                        <BsArrowDown
                          style={{
                            width: "19px",
                            height: "19px",
                          }}
                          strokeWidth={
                            columnData[7]?.includes(">") ? "1.25px" : "0px"
                          }
                        />
                      )}
                    {chordHasAtLeastOneNote(columnData) &&
                      columnData[7]?.includes("^") && (
                        <BsArrowUp
                          style={{
                            width: "19px",
                            height: "19px",
                          }}
                          strokeWidth={
                            columnData[7]?.includes(">") ? "1.25px" : "0px"
                          }
                        />
                      )}

                    {columnData[7]?.includes("s") && (
                      <div
                        style={{ fontSize: "18px" }}
                        className={`baseFlex leading-[19px] ${columnData[7]?.includes(">") ? "font-semibold" : "font-normal"}`}
                      >
                        s
                      </div>
                    )}

                    {chordHasAtLeastOneNote(columnData) &&
                      columnData[7]?.includes(".") && (
                        <div
                          style={{
                            fontSize: "30px",
                            position: "absolute",
                            top: "-13px",
                            right: "6px",
                            width: columnData[7] === "." ? "10px" : "0px",
                          }}
                        >
                          .
                        </div>
                      )}
                  </div>

                  {columnData[7] === "" && <div className="h-5 w-4"></div>}
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {isLastColumn && (
        <div
          style={{
            borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
          }}
          className="h-[168px] rounded-r-2xl border-2 p-1"
        ></div>
      )}
    </motion.div>
  );
}

function chordHasAtLeastOneNote(chordData: string[]): boolean {
  return chordData.slice(1, 7).some((note) => note !== "");
}

export default StaticTabNotesColumn;
