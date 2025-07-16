import { motion } from "framer-motion";
import { Fragment } from "react";
import { BsArrowDown, BsArrowUp } from "react-icons/bs";
import StaticPalmMuteNode from "~/components/Tab/Static/StaticPalmMuteNode";
import StaticTabNote from "~/components/Tab/Static/StaticTabNote";
import { getDynamicNoteLengthIcon } from "~/utils/bpmIconRenderingHelpers";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";

interface StaticTabNotesColumn {
  columnData: string[];
  columnIndex: number;
  isFinalColumn: boolean;
  color: string;
  theme: "light" | "dark";
}

function StaticTabNotesColumn({
  columnData,
  columnIndex,
  isFinalColumn,
  color,
  theme,
}: StaticTabNotesColumn) {
  function relativelyGetColumn(indexRelativeToCurrentCombo: number): string[] {
    return (columnData[columnIndex + indexRelativeToCurrentCombo] ??
      []) as string[];
  }

  function lineBeforeNoteOpacity(index: number): boolean {
    const colMinus1 = relativelyGetColumn(-1);
    const colMinus2 = relativelyGetColumn(-2);
    const col0 = relativelyGetColumn(0);

    return (
      colMinus1[index] === "" ||
      (colMinus1[index] === "|" &&
        (colMinus2[index] === "" || col0[index] === "")) ||
      colMinus1[index] === "~" ||
      colMinus1[index] === undefined
    );
  }

  function lineAfterNoteOpacity(index: number): boolean {
    const col0 = relativelyGetColumn(0);
    const col1 = relativelyGetColumn(1);
    const col2 = relativelyGetColumn(2);

    return (
      col1[index] === "" ||
      (col1[index] === "|" && (col2[index] === "" || col0[index] === "")) ||
      col1[index] === "~" ||
      col1[index] === undefined
    );
  }

  return (
    <motion.div
      key={columnData[9]}
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
                    opacity: lineBeforeNoteOpacity(index) ? 1 : 0,
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
                  color={color}
                  theme={theme}
                />

                <div
                  style={{
                    opacity: lineAfterNoteOpacity(index) ? 1 : 0,
                    backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]} / 0.5)`,
                  }}
                  className="h-[1px] flex-[1]"
                ></div>
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
                  className="baseVertFlex absolute left-1/2 right-1/2 top-2 w-[1.5rem] -translate-x-1/2"
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
                            right: "7px",
                            width: columnData[7] === "." ? "10px" : "0px",
                          }}
                        >
                          .
                        </div>
                      )}
                  </div>

                  {(columnData[8] === "1/8th" ||
                    columnData[8] === "1/16th") && (
                    // slaps are treated as regular chords in regards to note length icons
                    <div
                      style={{
                        marginTop:
                          (columnData[7]?.includes("s") ||
                            chordHasAtLeastOneNote(columnData)) &&
                          columnData[7] !== ""
                            ? "5px"
                            : "0",
                      }}
                    >
                      {getDynamicNoteLengthIcon({
                        noteLength: columnData[8],
                        isARestNote:
                          !columnData[7]?.includes("s") &&
                          columnData.slice(1, 7).every((note) => note === ""),
                      })}
                    </div>
                  )}

                  {columnData[7] === "" && <div className="h-5 w-4"></div>}
                </div>
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {isFinalColumn && (
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
