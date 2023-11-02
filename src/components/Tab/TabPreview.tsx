import { Fragment, memo, useCallback, useMemo, type ReactNode } from "react";
import {
  BsArrowDown,
  BsArrowUp,
  BsFillPlayFill,
  BsMusicNote,
} from "react-icons/bs";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import type {
  ChordSection,
  ChordSequence,
  Chord as ChordType,
  Section,
  StrummingPattern,
  TabSection,
} from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import { parse, toString } from "~/utils/tunings";
import Chord from "./Chord";
import HighlightTabColumnWrapper from "./HighlightTabColumnWrapper";

// ---WARNING---: I really didn't want to have to do this approach, but this is the only way
// I could avoid the horrendous performance/rerender issues that would happen when many
// TabPreviews were being rendered at once. This just has a all the tab related component's
// jsx "guts" in one file, without any extra store logic/extra functions. There are most likely
// weird styling syntax choices since I just quickly copied over the jsx from the other files
// and edited out the parts that didn't seem necessary.

interface TabPreview {
  tabData: Section[];
  baselineBpm: number;
  tuning: string;
  chords: ChordType[];
}

function TabPreview({ tabData, baselineBpm, tuning, chords }: TabPreview) {
  return (
    <div className="mt-4 w-full">
      {tabData.map((section, index) => (
        <PreviewSectionContainer
          key={section.id}
          baselineBpm={baselineBpm}
          tuning={tuning}
          sectionIndex={index}
          sectionData={section}
          chords={chords}
        />
      ))}
    </div>
  );
}

interface PreviewSectionContainer {
  baselineBpm: number;
  tuning: string;
  sectionIndex: number;
  sectionData: Section;
  chords: ChordType[];
}

function PreviewSectionContainer({
  baselineBpm,
  tuning,
  sectionData,
  sectionIndex,
  chords,
}: PreviewSectionContainer) {
  return (
    <div className="baseVertFlex w-full gap-4 px-2 pb-4 md:px-7">
      <div className="baseFlex w-full !justify-start gap-4">
        <div className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2">
          <p className="text-xl font-semibold">{sectionData.title}</p>

          <Button variant="playPause" tabIndex={-1} className="h-8 md:h-9">
            <BsFillPlayFill className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* map over tab/chord subSections */}
      <div className="baseVertFlex w-full">
        {sectionData.data.map((subSection, index) => (
          // TODO: this index is probably not the best since the array can be reordered/mutated,
          // also applies to further child components
          <div
            key={subSection.id}
            className="baseVertFlex w-full !items-start pb-2"
          >
            <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
              <div className="baseFlex gap-1">
                <BsMusicNote className="h-3 w-3" />
                {subSection.bpm === -1 ? baselineBpm : subSection.bpm} BPM
              </div>

              {subSection.repetitions > 1 && (
                <div className="baseFlex gap-3">
                  <Separator className="h-4 w-[1px]" orientation="vertical" />

                  <p>Repeat x{subSection.repetitions}</p>
                </div>
              )}
            </div>

            {subSection.type === "chord" ? (
              <PreviewChordSection
                baselineBpm={baselineBpm}
                subSectionData={subSection}
                chords={chords}
              />
            ) : (
              <div className="baseVertFlex relative h-full w-full !items-start">
                <PreviewTabSection
                  tuning={tuning}
                  subSectionData={subSection}
                  subSectionIndex={index}
                  sectionIndex={sectionIndex}
                  baselineBpm={baselineBpm}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewSubSectionContainer {
  baselineBpm: number;
  tuning: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: TabSection | ChordSection;
  currentSubSectionisPlaying?: boolean;
  chords: ChordType[];
}

function PreviewSubSectionContainer({
  baselineBpm,
  tuning,
  sectionIndex,
  subSectionIndex,
  subSectionData,
  currentSubSectionisPlaying,
  chords,
}: PreviewSubSectionContainer) {
  return (
    <>
      {subSectionData.type === "chord" ? (
        <PreviewChordSection
          baselineBpm={baselineBpm}
          subSectionData={subSectionData}
          chords={chords}
        />
      ) : (
        <div className="baseVertFlex relative h-full w-full !items-start">
          <PreviewTabSection
            tuning={tuning}
            subSectionData={subSectionData}
            subSectionIndex={subSectionIndex}
            sectionIndex={sectionIndex}
            baselineBpm={baselineBpm}
          >
            {currentSubSectionisPlaying && (
              <HighlightTabColumnWrapper
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                subSectionData={subSectionData}
              />
            )}
          </PreviewTabSection>
        </div>
      )}
    </>
  );
}

export const MemoizedPreviewSubSectionContainer = memo(
  PreviewSubSectionContainer,
  (prevProps, nextProps) => {
    return (
      prevProps.currentSubSectionisPlaying ===
      nextProps.currentSubSectionisPlaying
    );
  }
);

interface PreviewChordSection {
  baselineBpm: number;
  subSectionData: ChordSection;
  chords: ChordType[];
}

function PreviewChordSection({
  baselineBpm,
  subSectionData,
  chords,
}: PreviewChordSection) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const padding = useMemo(() => {
    let padding = "0";

    if (aboveMediumViewportWidth) {
      padding = "2rem";
    } else {
      padding = "1rem";
    }

    return padding;
  }, [aboveMediumViewportWidth]);

  return (
    <div
      style={{
        padding: padding,
        width: "auto",
        borderTopLeftRadius: subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md"
    >
      <div className="baseFlex w-auto !items-end !justify-start gap-8">
        {subSectionData.data.map((chordSequence) => (
          <Fragment key={`${chordSequence.id}wrapper`}>
            {chordSequence.data.length > 0 ? (
              <div className="baseVertFlex w-auto !items-start">
                {((chordSequence.bpm !== -1 &&
                  chordSequence.bpm !== subSectionData.bpm) ||
                  chordSequence.repetitions > 1) && (
                  <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
                    {chordSequence.bpm !== -1 &&
                      chordSequence.bpm !== subSectionData.bpm && (
                        <div className="baseFlex gap-1">
                          <BsMusicNote className="h-3 w-3" />
                          {chordSequence.bpm === -1
                            ? baselineBpm
                            : chordSequence.bpm}{" "}
                          BPM
                        </div>
                      )}

                    {chordSequence.repetitions > 1 && (
                      <div className="baseFlex gap-3">
                        {chordSequence.bpm !== -1 &&
                          chordSequence.bpm !== subSectionData.bpm && (
                            <Separator
                              className="h-4 w-[1px]"
                              orientation="vertical"
                            />
                          )}

                        <p>Repeat x{chordSequence.repetitions}</p>
                      </div>
                    )}
                  </div>
                )}

                <PreviewChordSequence
                  chordSequenceData={chordSequence}
                  chords={chords}
                />
              </div>
            ) : (
              <p className="italic text-pink-200">Empty strumming pattern</p>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

interface PreviewChordSequence {
  chordSequenceData: ChordSequence;
  chords: ChordType[];
}

function PreviewChordSequence({
  chordSequenceData,
  chords,
}: PreviewChordSequence) {
  return (
    <div
      style={{
        borderTopLeftRadius: chordSequenceData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex relative w-auto !justify-start gap-8 rounded-md border-2 border-pink-50 p-1"
    >
      <PreviewStrummingPattern
        chordSequenceData={chordSequenceData.data}
        data={chordSequenceData.strummingPattern}
        mode={"viewingWithChordNames"}
        chords={chords}
      />
    </div>
  );
}

interface PreviewStrummingPattern {
  chordSequenceData: string[];
  data: StrummingPattern;
  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown";
  chords: ChordType[];
}

function PreviewStrummingPattern({
  chordSequenceData,
  data,
  mode,
  chords,
}: PreviewStrummingPattern) {
  const patternHasPalmMuting = useCallback(() => {
    return data.strums?.some((strum) => strum.palmMute !== "");
  }, [data]);

  const heightOfStrummingPatternFiller = useMemo(() => {
    if (patternHasPalmMuting()) {
      if (mode === "editingStrummingPattern") {
        return "2.2rem";
      } else {
        return "1.5rem";
      }
    }

    return "0";
  }, [mode, patternHasPalmMuting]);

  function getBeatIndicator(noteLength: string, beatIndex: number) {
    let beat: number | string = "";
    switch (noteLength) {
      case "1/4th":
        beat = beatIndex + 1;
        break;
      case "1/8th":
        beat = beatIndex % 2 === 0 ? beatIndex / 2 + 1 : "&";
        break;
      case "1/16th":
        beat =
          beatIndex % 4 === 0
            ? beatIndex / 4 + 1
            : beatIndex % 2 === 0
            ? "&"
            : "";
        break;
      case "1/4th triplet":
        beat = beatIndex % 3 === 0 ? (beatIndex / 3) * 2 + 1 : "";
        break;
      case "1/8th triplet":
        beat = beatIndex % 3 === 0 ? beatIndex / 3 + 1 : "";
        break;
      case "1/16th triplet":
        beat =
          beatIndex % 3 === 0
            ? (beatIndex / 3) % 2 === 0
              ? beatIndex / 3 / 2 + 1
              : "&"
            : "";
        break;
    }
    return beat.toString();
  }

  return (
    <div
      style={{
        padding: "0.25rem",
        justifyContent: "start",
      }}
      className="baseFlex w-auto"
    >
      <div
        style={{
          paddingLeft: "0",
        }}
        className="baseFlex relative mb-1 !justify-start"
      >
        {data?.strums?.map((strum, strumIndex) => (
          <div key={strumIndex} className="baseFlex">
            <div
              style={{
                marginTop:
                  mode === "editingStrummingPattern" ? "1rem" : "0.25rem",
                gap:
                  mode === "editingStrummingPattern" ||
                  mode === "editingChordSequence"
                    ? "0.5rem"
                    : "0",
              }}
              className="baseVertFlex relative"
            >
              {strum.palmMute !== "" ? (
                <PreviewStrummingPatternPalmMuteNode value={strum.palmMute} />
              ) : (
                <div
                  style={{
                    height: heightOfStrummingPatternFiller,
                  }}
                  className="h-6"
                ></div>
              )}

              {/* chord viewer */}

              <Popover>
                <PopoverTrigger
                  asChild
                  disabled={chordSequenceData?.[strumIndex] === ""}
                  className="baseFlex rounded-md transition-all hover:bg-white/20 active:hover:bg-white/10"
                >
                  <Button
                    variant={"ghost"}
                    className="baseFlex mb-1 h-6 px-1 py-0"
                  >
                    <p
                      style={{
                        color: "hsl(327, 73%, 97%)",
                      }}
                      className="mx-0.5  h-6 text-base font-semibold transition-colors"
                    >
                      {chordSequenceData?.[strumIndex]}
                    </p>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  className="w-40 bg-pink-300 p-0 text-pink-50 shadow-lg"
                >
                  <Chord
                    chordBeingEdited={{
                      index: -1,
                      value:
                        chords[
                          chords.findIndex(
                            (chord) =>
                              chord.name === chordSequenceData?.[strumIndex]
                          ) ?? 0
                        ],
                    }}
                    editing={false}
                    highlightChord={false}
                  />
                </PopoverContent>
              </Popover>

              <div className="baseFlex !flex-nowrap">
                <div
                  style={{
                    width: "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}

                <div
                  style={{
                    color: "hsl(327, 73%, 97%)",
                  }}
                  className="baseVertFlex relative mb-2 h-[20px] text-lg transition-colors"
                >
                  {strum.strum.includes("v") && (
                    <BsArrowDown
                      style={{
                        width: strum.strum.includes(">") ? "18.5px" : "20px",
                        height: strum.strum.includes(">") ? "18.5px" : "20px",
                      }}
                      strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                    />
                  )}
                  {strum.strum.includes("^") && (
                    <BsArrowUp
                      style={{
                        width: strum.strum.includes(">") ? "18.5px" : "20px",
                        height: strum.strum.includes(">") ? "18.5px" : "20px",
                      }}
                      strokeWidth={strum.strum.includes(">") ? "1.25px" : "0px"}
                    />
                  )}

                  {strum.strum.includes("s") && (
                    <div
                      style={{
                        fontSize: "20px",
                      }}
                      className={`baseFlex h-5 leading-[0] ${
                        strum.strum.includes(">")
                          ? "font-semibold"
                          : "font-normal"
                      }`}
                    >
                      {strum.strum[0]}
                    </div>
                  )}

                  {strum.strum.includes(".") && (
                    <div
                      style={{
                        fontSize: "30px",
                      }}
                      className="absolute bottom-[-9px]"
                    >
                      .
                    </div>
                  )}

                  {strum.strum === "" && <div className="h-5 w-4"></div>}
                </div>

                <div
                  style={{
                    width: "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}
              </div>

              {/* beat indicator */}
              <p
                style={{
                  height:
                    getBeatIndicator(data.noteLength, strumIndex) === ""
                      ? "1.25rem"
                      : "auto",
                  color: "hsl(327, 73%, 97%)",
                }}
                className="text-sm transition-colors"
              >
                {getBeatIndicator(data.noteLength, strumIndex)}
              </p>

              {/* strumming guide */}
              {renderStrummingGuide(data.noteLength, strumIndex, mode)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewStrummingPatternPalmMuteNode {
  value: string;
}

function PreviewStrummingPatternPalmMuteNode({
  value,
}: PreviewStrummingPatternPalmMuteNode) {
  return (
    <>
      {(value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex relative w-full !flex-nowrap">
              <div className="h-[14px] w-[1px] flex-shrink-0 bg-background"></div>
              <div className="h-[1px] w-1 flex-shrink-0 bg-background"></div>
              <i className="mx-[0.125rem] flex-shrink-0">PM</i>
              <div className="h-[1px] w-full bg-background"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative my-1 w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-background"></div>
              <div className="h-[14px] w-[1px] bg-background"></div>
            </div>
          )}
        </>
      )}

      {value === "-" && (
        <div
          style={{
            margin: "0.75rem 0",
          }}
          className="h-[1px] w-full bg-background"
        ></div>
      )}
    </>
  );
}

interface PreviewTabSection {
  tuning: string;
  subSectionData: TabSection;
  subSectionIndex: number;
  sectionIndex: number;
  baselineBpm: number;
  children?: ReactNode;
}

function PreviewTabSection({
  tuning,
  subSectionData,
  subSectionIndex,
  sectionIndex,
  baselineBpm,
  children,
}: PreviewTabSection) {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const sectionPadding = useMemo(() => {
    let padding = "0 1rem";

    if (aboveMediumViewportWidth) {
      padding = "0 2rem";
    } else {
      padding = "0 1rem";
    }

    return padding;
  }, [aboveMediumViewportWidth]);

  return (
    <div
      style={{
        gap: "0",
        padding: sectionPadding,
        width: "auto",
        borderTopLeftRadius: subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md"
    >
      {children}

      <div className="baseFlex relative w-full !justify-start">
        <div
          style={{
            height: "168px",
            marginBottom: "-1px",
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-50 p-2"
        >
          {toString(parse(tuning), { pad: 1 })
            .split(" ")
            .reverse()
            .map((note, index) => (
              <div key={index}>{note}</div>
            ))}
        </div>

        {subSectionData.data.map((column, index) => (
          <Fragment key={column[9]}>
            {column.includes("|") ? (
              <PreviewTabMeasureLine
                tabSectionData={subSectionData}
                columnIndex={index}
                columnData={column}
                baselineBpm={baselineBpm}
              />
            ) : (
              <PreviewTabNotesColumn
                columnIndex={index}
                subSectionIndex={subSectionIndex}
                sectionIndex={sectionIndex}
                columnData={column}
              />
            )}
          </Fragment>
        ))}

        <div
          style={{
            height: "168px",
            marginBottom: "-1px",
          }}
          className="rounded-r-2xl border-2 border-pink-50 p-1"
        ></div>
      </div>
    </div>
  );
}

interface PreviewTabMeasureLine {
  tabSectionData: TabSection;
  columnIndex: number;
  columnData: string[];
  baselineBpm: number;
}

function PreviewTabMeasureLine({
  tabSectionData,
  columnIndex,
  columnData,
  baselineBpm,
}: PreviewTabMeasureLine) {
  const conditionalBaselineBpmToShow = useMemo(() => {
    const tabSection = tabSectionData.data;
    const tabSectionBpm = tabSectionData.bpm;

    for (let i = columnIndex - 1; i > 0; i--) {
      const bpm = parseInt(tabSection[i][7]);
      if (bpm > 0) {
        return (tabSectionBpm === -1 ? baselineBpm : tabSectionBpm).toString();
      }
    }

    return null;
  }, [columnIndex, tabSectionData, baselineBpm]);

  return (
    <div className="baseVertFlex relative h-[271px]">
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {((columnData[7] && columnData[7] !== "-1") ||
                conditionalBaselineBpmToShow) && (
                <div
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-50 ${
                    note === "-" ? "top-[10px]" : "top-[27px]"
                  }`}
                >
                  <BsMusicNote className="h-3 w-3" />
                  <p className="text-center text-xs">
                    {columnData[7] !== "-1" && columnData[7] !== ""
                      ? columnData[7]!.toString()
                      : conditionalBaselineBpmToShow}
                  </p>
                </div>
              )}

              <div className="baseFlex mb-0 h-0 w-full">
                {note === "-" && (
                  <div className="relative top-[-18px] h-[1px] w-full bg-pink-50"></div>
                )}
              </div>
            </>
          )}

          {index > 0 && index < 7 && (
            <div className="baseFlex w-full">
              <div className="h-[28px] w-[2px] bg-pink-50"></div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

interface PreviewTabNotesColumn {
  columnData: string[];
  columnIndex: number;
  subSectionIndex: number;
  sectionIndex: number;
}

function PreviewTabNotesColumn({
  columnData,
  columnIndex,
  sectionIndex,
  subSectionIndex,
}: PreviewTabNotesColumn) {
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
    <div
      id={`tabPreview-section${sectionIndex}-subSection${subSectionIndex}-chord${columnIndex}`}
      className="baseVertFlex h-[271px] cursor-default"
    >
      <div className="baseFlex relative">
        <div className="baseVertFlex mb-[3.2rem] mt-4">
          {columnData.map((note, index) => (
            <Fragment key={index}>
              {index === 0 && (
                <div className="baseFlex h-9 w-full">
                  <PreviewPalmMuteNode value={note} />
                </div>
              )}

              {index > 0 && index < 7 && (
                <div
                  style={{
                    borderTop: `${
                      index === 1 ? "2px solid rgb(253 242 248)" : "none"
                    }`,
                    paddingTop: `${index === 1 ? "7px" : "0"}`,
                    borderBottom: `${
                      index === 6 ? "2px solid rgb(253 242 248)" : "none"
                    }`,
                    paddingBottom: `${index === 6 ? "7px" : "0"}`,

                    // might need to refine these widths/values a bit if the sound playing overlay isn't
                    // as smooth/seamless as we want it to be.
                    width: "35px",

                    // maybe also need "flex-basis: content" here if editing?
                  }}
                  className="baseFlex relative basis-[content]"
                >
                  <div
                    style={{
                      opacity: lineBeforeNoteOpacity(index) ? 1 : 0,
                    }}
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>

                  <PreviewTabNote note={note} />

                  <div
                    style={{
                      opacity: lineAfterNoteOpacity(index) ? 1 : 0,
                    }}
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>
                </div>
              )}

              {index === 7 && (
                <div className="relative h-0 w-full">
                  <div
                    style={{
                      top: "0.25rem",
                      lineHeight: "16px",
                    }}
                    className="baseVertFlex absolute left-1/2 right-1/2 top-2 w-[1.5rem] -translate-x-1/2"
                  >
                    {columnData[7]?.includes("^") && (
                      <div className="relative top-1 rotate-180">v</div>
                    )}
                    {columnData[7]?.includes("v") && <div>v</div>}
                    {columnData[7]?.includes("s") && <div>s</div>}
                    {columnData[7]?.includes(">") && <div>{">"}</div>}
                    {columnData[7]?.includes(".") && (
                      <div className="relative bottom-2">.</div>
                    )}
                  </div>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PreviewPalmMuteNode {
  value: string;
}

function PreviewPalmMuteNode({ value }: PreviewPalmMuteNode) {
  return (
    <>
      {(value === "start" || value === "end") && (
        <>
          {value === "start" && (
            <div className="baseFlex w-full !flex-nowrap">
              <div className="h-[14px] w-[1px] bg-pink-50"></div>
              <div className="h-[1px] w-1 bg-pink-50"></div>
              <i className="mx-[0.125rem]">PM</i>
              <div className="h-[1px] w-[3px] bg-pink-50"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-pink-50"></div>
              <div className="h-[14px] w-[1px] bg-pink-50"></div>
            </div>
          )}
        </>
      )}

      {value === "-" && <div className="h-[1px] w-full bg-pink-50"></div>}
    </>
  );
}

interface PreviewTabNote {
  note: string;
}

function PreviewTabNote({ note }: PreviewTabNote) {
  return (
    <div className="baseFlex w-[35px]">
      <div className="my-3 h-[1px] flex-[1] bg-pink-50/50"></div>
      {/* {formatNoteAndEffect(note)} */}
      <div>{note}</div>
      <div className="my-3 h-[1px] flex-[1] bg-pink-50/50"></div>
    </div>
  );
}

export default TabPreview;
