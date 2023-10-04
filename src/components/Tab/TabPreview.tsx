import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BsArrowDown,
  BsArrowUp,
  BsFillPlayFill,
  BsMusicNote,
} from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { type TabWithLikes } from "~/server/api/routers/tab";
import type {
  ChordSection,
  ChordSequence,
  Section,
  StrummingPattern,
  TabSection,
} from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import { parse, toString } from "~/utils/tunings";

// ---WARNING---: I really didn't want to have to do this approach, but this is the only way
// I could avoid the horrendous performance/rerender issues that would happen when many
// TabPreviews were being rendered at once. This just has a all the tab related component's
// jsx "guts" in one file, without any extra store logic/extra functions. There are most likely
// weird styling syntax choices since I just quickly copied over the jsx from the other files
// and edited out the parts that didn't seem necessary.

interface TabPreview {
  tab: TabWithLikes | undefined | null;
  scale: number;
}

function TabPreview({ tab, scale }: TabPreview) {
  const [tabData, setTabData] = useState<Section[]>();

  useEffect(() => {
    if (tab) {
      // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
      setTabData(tab.tabData);
    }
  }, [tab]);

  return (
    <>
      {!tab && <div className="h-full w-full animate-pulse rounded-t-md"></div>}

      {tab && tabData && (
        <div
          style={{
            transform: `scale(${scale})`,
          }}
          className="pointer-events-none absolute left-0 top-0 z-[-1] mt-2 w-[1200px] origin-top-left select-none p-4 md:p-0"
        >
          {/* this is risky performance wise, really want to limit it to showing just one section
          but for short first sections it leaves unwanted "whitespace". Maybe look into
          shrinking down overall aspect ratio for preview to almost just render what would be
          one "row". Probably one and a half rows of height to show that there is more to the tab */}
          {tabData.slice(0, 2).map((section, index) => (
            <PreviewSectionContainer
              key={section.id}
              tabData={tabData}
              baselineBpm={tab.bpm}
              tuning={tab.tuning}
              sectionIndex={index}
              sectionData={section}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface PreviewSectionContainer {
  tabData: Section[];
  baselineBpm: number;
  tuning: string;
  sectionIndex: number;
  sectionData: Section;
}

function PreviewSectionContainer({
  tabData,
  baselineBpm,
  tuning,
  sectionData,
  sectionIndex,
}: PreviewSectionContainer) {
  return (
    <div className="baseVertFlex w-full gap-4 px-2 pb-4 md:px-7">
      <div className="baseFlex w-full !justify-start gap-4">
        <div className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2">
          <p className="text-xl font-semibold">{sectionData.title}</p>

          <Button variant="playPause" tabIndex={-1}>
            <BsFillPlayFill className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* map over tab/chord subSections */}
      <div className="baseVertFlex w-full gap-4">
        {sectionData.data.map((subSection, index) => (
          // TODO: this index is probably not the best since the array can be reordered/mutated,
          // also applies to further child components
          <div
            key={subSection.id}
            className="baseVertFlex w-full !items-start pb-2"
          >
            <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 !shadow-sm">
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
                tabData={tabData}
                baselineBpm={baselineBpm}
                sectionId={sectionData.id}
                sectionIndex={sectionIndex}
                subSectionIndex={index}
                subSectionData={subSection}
              />
            ) : (
              <PreviewTabSection
                tabData={tabData}
                tuning={tuning}
                sectionId={sectionData.id}
                sectionIndex={sectionIndex}
                subSectionIndex={index}
                subSectionData={subSection}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewChordSection {
  tabData: Section[];
  baselineBpm: number;
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: ChordSection;
}

function PreviewChordSection({
  tabData,
  baselineBpm,
  sectionId,
  sectionIndex,
  subSectionIndex,
  subSectionData,
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
        {subSectionData.data.map((chordSequence, index) => (
          <div
            key={chordSequence.id}
            className="baseVertFlex w-auto !items-start"
          >
            {((chordSequence.bpm !== -1 &&
              chordSequence.bpm !== subSectionData.bpm) ||
              chordSequence.repetitions > 1) && (
              <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 !shadow-sm">
                <div className="baseFlex gap-1">
                  <BsMusicNote className="h-3 w-3" />
                  {chordSequence.bpm === -1
                    ? baselineBpm
                    : chordSequence.bpm}{" "}
                  BPM
                </div>

                {chordSequence.repetitions > 1 && (
                  <div className="baseFlex gap-3">
                    <Separator className="h-4 w-[1px]" orientation="vertical" />

                    <p>Repeat x{chordSequence.repetitions}</p>
                  </div>
                )}
              </div>
            )}

            <PreviewChordSequence
              tabData={tabData}
              sectionId={sectionId}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              chordSequenceIndex={index}
              chordSequenceData={chordSequence}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface PreviewChordSequence {
  tabData: Section[];
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  chordSequenceData: ChordSequence;
}

function PreviewChordSequence({
  tabData,
  sectionId,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  chordSequenceData,
}: PreviewChordSequence) {
  return (
    <div
      style={{
        borderTopLeftRadius: chordSequenceData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex relative w-auto !justify-start gap-8 rounded-md border-[1px] border-pink-50 p-1"
    >
      <PreviewStrummingPattern
        tabData={tabData}
        data={chordSequenceData.strummingPattern}
        mode={"viewingWithChordNames"}
        location={{ sectionIndex, subSectionIndex, chordSequenceIndex }}
      />
    </div>
  );
}

// mode shoudl only ever be viewingWithChordNames btw

interface PreviewStrummingPattern {
  tabData: Section[];
  data: StrummingPattern;
  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown";
  index?: number; // index of strumming pattern in strummingPatterns array (used for editing pattern)
  location?: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex: number;
  }; // location of strumming pattern in tabData array (used for editing chord sequence)
}

function PreviewStrummingPattern({
  tabData,
  data,
  mode,
  index,
  location,
}: PreviewStrummingPattern) {
  const patternHasPalmMuting = useCallback(() => {
    return data.strums.some((strum) => strum.palmMute !== "");
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

  function patternHasAccents() {
    return data.strums.some((strum) => strum.strum.includes(">"));
  }

  function getChordName(beatIndex: number) {
    const chordSection =
      tabData[location?.sectionIndex ?? 0]?.data[
        location?.subSectionIndex ?? 0
      ];

    if (chordSection && chordSection.type === "chord") {
      const chord =
        chordSection.data[location?.chordSequenceIndex ?? 0]?.data[beatIndex];
      return chord ?? "";
    }

    return "";
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

              <p
                style={{
                  color: "hsl(327, 73%, 97%)",
                }}
                className="h-6 font-semibold transition-colors"
              >
                {getChordName(strumIndex)}
              </p>

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
                          : "font-thin"
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
                      className="absolute bottom-[-8px]"
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
              <div className="h-4 w-[1px] flex-shrink-0 bg-background"></div>
              <div className="h-[1px] w-1 flex-shrink-0 bg-background"></div>
              <i className="mx-[0.125rem] flex-shrink-0">PM</i>
              <div className="h-[1px] w-full bg-background"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex relative my-1 w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-background"></div>
              <div className="h-4 w-[1px] bg-background"></div>
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
  tabData: Section[];
  tuning: string;
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: TabSection;
}

function PreviewTabSection({
  tabData,
  tuning,
  sectionId,
  sectionIndex,
  subSectionIndex,
  subSectionData,
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
          <PreviewTabColumn
            tabData={tabData}
            key={column[9]} // this is a unique id for the column
            columnData={column}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
            columnIndex={index}
          />
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

interface PreviewTabColumn {
  tabData: Section[];
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
}

function PreviewTabColumn({
  tabData,
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,
}: PreviewTabColumn) {
  return (
    <>
      {columnData.includes("|") ? (
        <PreviewTabMeasureLine columnData={columnData} />
      ) : (
        <TabNotesColumn
          tabData={tabData}
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
          columnIndex={columnIndex}
          columnData={columnData}
        />
      )}
    </>
  );
}

interface ColumnDataMockup {
  columnData: string[];
}

function PreviewTabMeasureLine({ columnData }: ColumnDataMockup) {
  return (
    <div className="baseVertFlex relative h-[271px]">
      {columnData.map((note, index) => (
        <Fragment key={index}>
          {index === 0 && (
            <>
              {columnData[7] && columnData[7] !== "-1" && (
                <div
                  className={`baseFlex absolute !flex-nowrap gap-[0.125rem] text-pink-50 ${
                    note === "-" ? "top-[10px]" : "top-[27px]"
                  }`}
                >
                  <BsMusicNote className="h-3 w-3" />
                  <p className="text-center text-xs">
                    {columnData[7].toString()}
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

interface TabNotesColumn {
  tabData: Section[];
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
}

function TabNotesColumn({
  tabData,
  columnData,
  sectionIndex,
  subSectionIndex,
  columnIndex,
}: TabNotesColumn) {
  function relativelyGetColumn(indexRelativeToCurrentCombo: number): string[] {
    return (tabData[sectionIndex]?.data[subSectionIndex]?.data[
      columnIndex + indexRelativeToCurrentCombo
    ] ?? []) as string[];
  }

  return (
    <div className="baseVertFlex h-[271px] cursor-default">
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
                      // width: editing
                      //   ? relativelyGetColumn(-1)?.[8] === "measureLine"
                      //     ? "4px"
                      //     : "8px"
                      //   : // need to fix logic below
                      //   // relativelyGetColumn(-1)?.[8] === "measureLine" &&
                      //   //   (relativelyGetColumn(0)?.[index]?.length ?? 0) < 2
                      //   (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                      //   ? "0px"
                      //   : "1px",

                      opacity:
                        relativelyGetColumn(-1)[index] === "" ||
                        (relativelyGetColumn(-1)[index] === "|" &&
                          (relativelyGetColumn(-2)[index] === "" ||
                            relativelyGetColumn(0)[index] === "")) ||
                        relativelyGetColumn(-1)[index] === "~" ||
                        relativelyGetColumn(-1)[index] === undefined
                          ? 1
                          : 0,
                    }}
                    className="h-[1px] flex-[1] bg-pink-50/50"
                  ></div>

                  <PreviewTabNote note={note} />

                  <div
                    style={{
                      // width: editing
                      //   ? "8px"
                      //   : `${
                      //       (relativelyGetColumn(0)?.[index]?.length ?? 0) > 1
                      //         ? "0px"
                      //         : "1px"
                      //     }`,
                      opacity:
                        relativelyGetColumn(1)[index] === "" ||
                        (relativelyGetColumn(2)[index] === "|" &&
                          relativelyGetColumn(2)[index] === "") ||
                        relativelyGetColumn(1)[index] === undefined
                          ? 1
                          : 0,
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
              <div className="h-4 w-[1px] bg-pink-50"></div>
              <div className="h-[1px] w-1 bg-pink-50"></div>
              <i className="mx-[0.125rem]">PM</i>
              <div className="h-[1px] w-[3px] bg-pink-50"></div>
            </div>
          )}

          {value === "end" && (
            <div className="baseFlex w-full !flex-nowrap">
              <div className="h-[1px] w-full bg-pink-50"></div>
              <div className="h-4 w-[1px] bg-pink-50"></div>
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

export default memo(TabPreview);
