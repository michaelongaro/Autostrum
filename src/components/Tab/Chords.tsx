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
import { useTabStore, type Section } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import type { Updater } from "use-immer";

const opacityVariants = {
  closed: {
    opacity: 0,
  },
  open: {
    opacity: 1,
  },
};

interface Chords {
  setTabData: Updater<Section[]>;
}

function Chords({ setTabData }: Chords) {
  const [accordionValue, setAccordionValue] = useState("closed");
  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  const {
    chords,
    setChords,
    setChordBeingEdited,
    pauseAudio,
    currentlyCopiedData,
    setCurrentlyCopiedData,
  } = useTabStore((state) => ({
    chords: state.chords,
    setChords: state.setChords,
    setChordBeingEdited: state.setChordBeingEdited,
    pauseAudio: state.pauseAudio,
    currentlyCopiedData: state.currentlyCopiedData,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
  }));

  function handleDeleteChord(index: number, chordNameToBeDeleted: string) {
    setTabData((draft) => {
      // fyi: this is lazy, but only a copied type of a tab subsection is guaranteed
      // to not need to be modified/removed from currentlyCopiedData. Just resetting
      // to null otherwise
      if (currentlyCopiedData?.type !== "tab") {
        setCurrentlyCopiedData(null);
      }

      for (const [sectionIndex, section] of draft.entries()) {
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
                  const section = draft[sectionIndex]!.data[subSectionIndex];

                  if (!section || section.type !== "chord") continue;

                  section.data[chordSequenceIndex]!.data[chordIndex] = "";
                }
              }
            }
          }
        }
      }
    });

    const prevChords = [...chords];
    prevChords.splice(index, 1);
    setChords(prevChords);
  }

  return (
    <div
      style={{
        minWidth: aboveMediumViewportWidth ? "500px" : "300px",
      }}
      className="baseVertFlex relative w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md bg-secondary text-secondary-foreground !shadow-primaryButton transition-all hover:bg-secondary-hover hover:text-secondary-foreground"
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
          <AccordionTrigger className="p-2 md:p-4">
            <span className="text-lg font-bold">Chords</span>
          </AccordionTrigger>
          <AccordionContent className="w-full">
            <div className="baseVertFlex w-full !items-start gap-4 p-2 !pt-0 md:p-4">
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
                    className="baseFlex border-r-none h-10 overflow-hidden rounded-md border-2"
                  >
                    <span className="px-3 font-semibold text-foreground">
                      {chord.name}
                    </span>

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
                        className="baseFlex h-full w-1/2 rounded-l-none rounded-r-sm border-l-[1px]"
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
