import isEqual from "lodash.isequal";
import { MdModeEditOutline } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import StrummingPattern from "./StrummingPattern";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { motion } from "framer-motion";
import type { LastModifiedPalmMuteNodeLocation } from "./TabSection";

const opacityVariants = {
  closed: {
    opacity: 0,
  },
  open: {
    opacity: 1,
  },
};

function StrummingPatterns() {
  const [accordionValue, setAccordionValue] = useState("closed");
  const [showingDeletePopover, setShowingDeletePopover] = useState<boolean[]>(
    [],
  );
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    getTabData,
    setTabData,
    pauseAudio,
    currentlyCopiedData,
    setCurrentlyCopiedData,
  } = useTabStore((state) => ({
    strummingPatterns: state.strummingPatterns,
    setStrummingPatterns: state.setStrummingPatterns,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    pauseAudio: state.pauseAudio,
    currentlyCopiedData: state.currentlyCopiedData,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
  }));

  function handleDeleteStrummingPattern(
    index: number,
    strummingPattern: StrummingPatternType,
  ) {
    const newTabData = getTabData();

    // fyi: this is lazy, but only a copied type of a tab subsection is guaranteed
    // to not need to be modified/removed from currentlyCopiedData. Just resetting
    // to null otherwise
    if (currentlyCopiedData?.type !== "tab") {
      setCurrentlyCopiedData(null);
    }

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
        minWidth: aboveMediumViewportWidth ? "500px" : "300px",
      }}
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 !shadow-lighterGlassmorphic md:p-4"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md px-2 xs:px-0"
      >
        <AccordionItem value="opened" className="w-full">
          <AccordionTrigger className="w-full">
            <p
              style={{
                textShadow: "0 1px 2px hsla(336, 84%, 17%, 0.25)",
              }}
              className="text-lg font-bold"
            >
              Strumming patterns
            </p>
          </AccordionTrigger>
          <AccordionContent>
            <div
              className={`baseFlex !justify-start ${
                // just to get around inherent flexbox space that is taken up by children
                // even when there is no dimensions to them
                strummingPatterns.length > 0 ? "mt-4 gap-4" : "gap-0"
              }`}
            >
              <div className="baseVertFlex w-full !items-start gap-4">
                <div className="baseFlex !flex-wrap !items-start !justify-start gap-4">
                  {strummingPatterns.map((pattern, index) => (
                    <motion.div
                      key={pattern.id}
                      variants={opacityVariants}
                      initial="closed"
                      animate="open"
                      exit="closed"
                      className="overflow-hidden"
                    >
                      <div className="baseFlex !flex-nowrap !items-start">
                        <div className="baseFlex border-b-none !flex-nowrap rounded-md rounded-tr-none border-2">
                          <StrummingPattern
                            data={pattern}
                            mode="viewing"
                            index={index}
                            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                            setLastModifiedPalmMuteNode={
                              setLastModifiedPalmMuteNode
                            }
                            pmNodeOpacities={[]} // placeholder
                          />
                        </div>

                        <div className="baseVertFlex w-fit rounded-l-none rounded-r-sm border-2 border-l-0">
                          {/* edit button */}
                          <Button
                            variant={"ghost"}
                            size={"sm"}
                            className="baseFlex h-8 w-10 rounded-none rounded-tr-[1px] border-b-[1px] p-1"
                            onClick={() => {
                              pauseAudio();
                              setStrummingPatternBeingEdited({
                                index,
                                value: pattern,
                              });
                            }}
                          >
                            <MdModeEditOutline className="h-5 w-5" />
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
                                className="baseFlex h-8 w-10 rounded-none rounded-br-[3px] border-t-[1px] p-0"
                              >
                                <FaTrashAlt className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <div className="baseVertFlex gap-4">
                                <p className="w-auto text-center text-sm">
                                  Any subsections below that use this pattern
                                  will be modified.
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
                                        pattern,
                                      );
                                    }}
                                  >
                                    Confirm
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button
                  className="mb-1"
                  onClick={() => {
                    setStrummingPatternBeingEdited({
                      index: strummingPatterns.length,
                      value: {
                        id: crypto.randomUUID(),
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
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default StrummingPatterns;
