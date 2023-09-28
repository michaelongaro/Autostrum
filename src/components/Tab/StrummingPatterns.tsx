import isEqual from "lodash.isequal";
import { Fragment, useState } from "react";
import { AiFillEdit } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { shallow } from "zustand/shallow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useSound from "~/hooks/useSound";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import { Button } from "../ui/button";
import StrummingPattern from "./StrummingPattern";
import { v4 as uuid } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

const opacityAndScaleVariants = {
  closed: {
    opacity: 0,
    scale: 0,
  },
  open: {
    opacity: 1,
    scale: 1,
  },
};

function StrummingPatterns() {
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const [showingDeletePopover, setShowingDeletePopover] = useState<boolean[]>(
    []
  );
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const {
    id,
    currentInstrument,
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    editing,
    tabData,
    setTabData,
    previewMetadata,
  } = useTabStore(
    (state) => ({
      id: state.id,
      currentInstrument: state.currentInstrument,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
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
          <AnimatePresence>
            {strummingPatterns.map((pattern, index) => (
              <motion.div
                key={pattern.id}
                variants={opacityAndScaleVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                {editing && (
                  <div className="baseVertFlex border-b-none !flex-nowrap rounded-md border-2">
                    <StrummingPattern
                      data={pattern}
                      mode="viewing"
                      index={index}
                      lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                      setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
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
                              <FaTrashAlt className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent>
                            <div className="baseVertFlex gap-4">
                              <p className="w-auto text-center text-sm">
                                Chord progressions that use this pattern will be
                                modified.
                              </p>

                              <div className="baseFlex gap-4">
                                <Button
                                  variant={"outline"}
                                  size="sm"
                                  onClick={() =>
                                    setShowingDeletePopover((prev) => {
                                      const prevShowingDeletePopover = [
                                        ...prev,
                                      ];
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
                                  onClick={() => {
                                    setShowingDeletePopover((prev) => {
                                      const prevShowingDeletePopover = [
                                        ...prev,
                                      ];
                                      prevShowingDeletePopover[index] = false;
                                      return prevShowingDeletePopover;
                                    });
                                    handleDeleteStrummingPattern(
                                      index,
                                      pattern
                                    );
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
                        lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                        setLastModifiedPalmMuteNode={
                          setLastModifiedPalmMuteNode
                        }
                      />
                    </div>

                    <Button
                      variant={"playPause"}
                      size={"sm"}
                      disabled={
                        !currentInstrument || artificalPlayButtonTimeout
                      }
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
                      <PlayButtonIcon
                        uniqueLocationKey={`strummingPatternPreview${index}}`}
                        tabId={id}
                        currentInstrument={currentInstrument}
                        previewMetadata={previewMetadata}
                        indexOfPattern={index}
                        previewType="strummingPattern"
                      />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {editing && (
          <Button
            onClick={() => {
              setStrummingPatternBeingEdited({
                index: strummingPatterns.length,
                value: {
                  id: uuid(),
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
