import { useState, Fragment } from "react";
import {
  type TabSection as TabSectionType,
  type ChordSection as ChordSectionType,
  type StrummingPattern as StrummingPatternType,
  useTabStore,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { BsFillPlayFill, BsStopFill } from "react-icons/bs";
import { AiFillEdit } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import StrummingPattern from "./StrummingPattern";
import isEqual from "lodash.isequal";
import useSound from "~/hooks/useSound";

function StrummingPatterns() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const [showingDeletePopover, setShowingDeletePopover] = useState<boolean[]>(
    []
  );
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    editing,
    bpm,
    tabData,
    setTabData,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
    previewMetadata,
  } = useTabStore(
    (state) => ({
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      editing: state.editing,
      bpm: state.bpm,
      tabData: state.tabData,
      setTabData: state.setTabData,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      audioMetadata: state.audioMetadata,
      previewMetadata: state.previewMetadata,
    }),
    shallow
  );

  const { playPreview, pauseAudio } = useSound();

  function handleDeleteStrummingPattern(
    index: number,
    strummingPattern: StrummingPatternType
  ) {
    const newTabData = [...tabData];

    for (
      let sectionIndex = newTabData.length - 1;
      sectionIndex >= 0;
      sectionIndex--
    ) {
      const section = newTabData[sectionIndex];

      if (!section) continue;

      for (
        let subSectionIndex = section.data.length - 1;
        subSectionIndex >= 0;
        subSectionIndex--
      ) {
        const subSection = section.data[subSectionIndex];
        if (subSection?.type === "chord") {
          for (
            let chordSequenceIndex = subSection.data.length - 1;
            chordSequenceIndex >= 0;
            chordSequenceIndex--
          ) {
            const chordGroup = subSection.data[chordSequenceIndex];

            if (
              !chordGroup ||
              !isEqual(chordGroup.strummingPattern, strummingPattern)
            )
              continue;

            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              chordSequenceIndex
            ] = {
              ...chordGroup,
              // @ts-expect-error <ChordSequence /> effect will set to first existing strumming pattern if it exists
              strummingPattern: {} as StrummingPattern,
              data: [],
            };
          }
        }
      }
    }

    setTabData(newTabData);

    const prevStrummingPatterns = [...strummingPatterns];
    prevStrummingPatterns.splice(index, 1);
    setStrummingPatterns(prevStrummingPatterns);
  }

  return (
    <div
      style={{
        display: editing
          ? "flex"
          : strummingPatterns.length === 0
          ? "none"
          : "flex",
        minWidth: aboveMediumViewportWidth
          ? strummingPatterns.length === 0
            ? "450px"
            : "500px"
          : "300px",
      }}
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 md:px-8 md:py-4"
    >
      <p className="text-lg font-bold">Strumming patterns</p>
      <div
        className={`baseFlex !justify-start ${
          // just to get around inherent flexbox space that is taken up by children
          // even when there is no dimensions to them
          strummingPatterns.length > 0 ? "gap-4" : "gap-0"
        }`}
      >
        <div className="baseFlex !items-start !justify-start gap-4">
          {strummingPatterns.map((pattern, index) => (
            <Fragment key={index}>
              {editing && (
                <div className="baseVertFlex border-b-none !flex-nowrap rounded-md border-2">
                  <StrummingPattern
                    data={pattern}
                    mode="viewing"
                    index={index}
                  />

                  <div className="baseFlex w-full !justify-evenly rounded-bl-md border-t-2">
                    <>
                      {/* edit button */}
                      <Button
                        variant={"ghost"}
                        size={"sm"}
                        className="baseFlex h-8 w-1/2 gap-2 rounded-r-none rounded-bl-sm rounded-tl-none border-r-[1px]"
                        onClick={() => {
                          setStrummingPatternBeingEdited({
                            index,
                            value: pattern,
                          });
                        }}
                      >
                        {/* add the tooltip below for "Edit" */}
                        <AiFillEdit className="h-6 w-6" />
                      </Button>

                      {/* delete button */}
                      <Popover
                        open={showingDeletePopover[index]}
                        onOpenChange={(openValue) => {
                          setShowingDeletePopover((prev) => {
                            const prevShowingDeletePopover = [...prev];
                            prevShowingDeletePopover[index] = openValue;
                            return prevShowingDeletePopover;
                          });
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant={"destructive"}
                            size="sm"
                            className="baseFlex h-8 w-1/2 rounded-l-none rounded-br-sm rounded-tr-none border-l-[1px]"
                          >
                            {/* add the tooltip below for "Delete" */}
                            <FaTrashAlt className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="baseVertFlex gap-4">
                            <p className="w-auto text-sm">
                              Chord progressions that use this pattern will be
                              modified.
                            </p>

                            <div className="baseFlex gap-4">
                              <Button
                                variant={"outline"}
                                size="sm"
                                className="border-none"
                                onClick={() =>
                                  setShowingDeletePopover((prev) => {
                                    const prevShowingDeletePopover = [...prev];
                                    prevShowingDeletePopover[index] = false;
                                    return prevShowingDeletePopover;
                                  })
                                }
                              >
                                Cancel
                              </Button>

                              <Button
                                variant={"destructive"}
                                size="sm"
                                // className="baseFlex h-8 w-1/2"
                                onClick={() => {
                                  handleDeleteStrummingPattern(index, pattern);
                                  setShowingDeletePopover((prev) => {
                                    const prevShowingDeletePopover = [...prev];
                                    prevShowingDeletePopover[index] = false;
                                    return prevShowingDeletePopover;
                                  });
                                }}
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  </div>
                </div>
              )}

              {!editing && (
                <div className="baseFlex !flex-nowrap !items-start">
                  <div className="baseFlex border-b-none !flex-nowrap  rounded-md rounded-tr-none border-2 ">
                    <StrummingPattern
                      data={pattern}
                      mode="viewing"
                      index={index}
                    />
                  </div>

                  <Button
                    variant={"playPause"}
                    size={"sm"}
                    disabled={artificalPlayButtonTimeout}
                    onClick={() => {
                      if (
                        previewMetadata.playing &&
                        index === previewMetadata.indexOfPattern &&
                        previewMetadata.type === "strummingPattern"
                      ) {
                        setArtificalPlayButtonTimeout(true);

                        setTimeout(() => {
                          setArtificalPlayButtonTimeout(false);
                        }, 300);
                        pauseAudio();
                      } else {
                        void playPreview({
                          data: pattern,
                          index,
                          type: "strummingPattern",
                        });
                      }
                    }}
                    className="w-10 rounded-l-none rounded-r-sm border-2 border-l-0 p-3"
                  >
                    {previewMetadata.playing &&
                    previewMetadata.type === "strummingPattern" ? (
                      <BsStopFill className="h-6 w-6" />
                    ) : (
                      <BsFillPlayFill className="h-6 w-6" />
                    )}
                  </Button>
                </div>
              )}
            </Fragment>
          ))}
        </div>
        {editing && (
          <Button
            onClick={() => {
              setStrummingPatternBeingEdited({
                index: strummingPatterns.length,
                value: {
                  noteLength: "1/8th",
                  strums: Array.from({ length: 8 }, () => ({
                    palmMute: "",
                    strum: "",
                  })),
                },
              });
            }}
          >
            Add strumming pattern
          </Button>
        )}
      </div>
    </div>
  );
}

export default StrummingPatterns;
