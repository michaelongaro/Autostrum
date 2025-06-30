import { motion } from "framer-motion";
import { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { MdModeEditOutline } from "react-icons/md";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";

const opacityVariants = {
  closed: {
    opacity: 0,
  },
  open: {
    opacity: 1,
  },
};

function Chords() {
  const [accordionValue, setAccordionValue] = useState("closed");
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    chords,
    setChords,
    setChordBeingEdited,
    getTabData,
    setTabData,
    previewMetadata,
    pauseAudio,
    currentlyCopiedData,
    setCurrentlyCopiedData,
  } = useTabStore((state) => ({
    chords: state.chords,
    setChords: state.setChords,
    setChordBeingEdited: state.setChordBeingEdited,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    previewMetadata: state.previewMetadata,
    pauseAudio: state.pauseAudio,
    currentlyCopiedData: state.currentlyCopiedData,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
  }));

  function handleDeleteChord(index: number, chordNameToBeDeleted: string) {
    const newTabData = getTabData();

    // fyi: this is lazy, but only a copied type of a tab subsection is guaranteed
    // to not need to be modified/removed from currentlyCopiedData. Just resetting
    // to null otherwise
    if (currentlyCopiedData?.type !== "tab") {
      setCurrentlyCopiedData(null);
    }

    for (const [sectionIndex, section] of newTabData.entries()) {
      if (!section) continue;

      for (const [subSectionIndex, subSection] of section.data.entries()) {
        if (subSection?.type === "chord") {
          for (const [
            chordSequenceIndex,
            chordGroup,
          ] of subSection.data.entries()) {
            if (!chordGroup) continue;

            for (const [chordIndex, chordName] of chordGroup.data.entries()) {
              if (!chordName) continue;

              if (chordName === chordNameToBeDeleted) {
                // @ts-expect-error undefined checks are done above
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                ]!.data[chordIndex] = "";
              }
            }
          }
        }
      }
    }

    setTabData(newTabData);

    const prevChords = [...chords];
    prevChords.splice(index, 1);
    setChords(prevChords);
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
          <AccordionTrigger>
            <p
              style={{
                textShadow: "0 1px 2px hsla(336, 84%, 17%, 0.25)",
              }}
              className="text-lg font-bold"
            >
              Chords
            </p>
          </AccordionTrigger>
          <AccordionContent className="w-full">
            <div className="baseVertFlex w-full !items-start gap-4">
              <div
                className={`baseFlex flex-wrap !justify-start gap-4 ${chords.length > 0 ? "mt-4" : ""}`}
              >
                {chords.map((chord, index) => (
                  <motion.div
                    key={chord.id}
                    variants={opacityVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="baseFlex border-r-none h-10 !flex-nowrap overflow-hidden rounded-md border-2"
                  >
                    <p
                      style={{
                        textShadow:
                          previewMetadata.indexOfPattern === index &&
                          previewMetadata.playing &&
                          previewMetadata.type === "chord"
                            ? "none"
                            : "0 1px 2px hsla(336, 84%, 17%, 0.25)",
                        color:
                          previewMetadata.indexOfPattern === index &&
                          previewMetadata.playing &&
                          previewMetadata.type === "chord"
                            ? "hsl(335, 78%, 42%)"
                            : "hsl(324, 77%, 95%)",
                      }}
                      className="px-3 font-semibold transition-colors"
                    >
                      {chord.name}
                    </p>

                    <div className="baseFlex h-full w-full !justify-evenly">
                      {/* edit button */}
                      <Button
                        variant={"ghost"}
                        size={"sm"}
                        className="baseFlex h-full w-1/2 gap-2 rounded-none border-l-2 border-r-[1px]"
                        onClick={() => {
                          pauseAudio();
                          setChordBeingEdited({
                            index,
                            value: chord,
                          });
                        }}
                      >
                        {/* add the tooltip below for "Edit" */}
                        <MdModeEditOutline className="h-6 w-6" />
                      </Button>
                      {/* delete button */}
                      <Button
                        variant={"destructive"}
                        size="sm"
                        className="baseFlex h-full w-1/2 rounded-l-none border-l-[1px]"
                        onClick={() => handleDeleteChord(index, chord.name)}
                      >
                        {/* add the tooltip below for "Delete" */}
                        <FaTrashAlt className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                className="mb-1"
                onClick={() => {
                  setChordBeingEdited({
                    index: chords.length,
                    value: {
                      id: crypto.randomUUID(),
                      name: "",
                      frets: ["", "", "", "", "", ""],
                    },
                  });
                }}
              >
                Add chord
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default Chords;
