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
import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { getNextChordColor } from "~/utils/chordColors";
import { Separator } from "~/components/ui/separator";
import ChordName from "~/components/ui/ChordName";
import { BsMusicNoteBeamed } from "react-icons/bs";

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

  const {
    chords,
    currentlyCopiedData,
    setChords,
    setChordBeingEdited,
    pauseAudio,
    setCurrentlyCopiedData,
    setTabData,
  } = useTabStore((state) => ({
    chords: state.chords,
    currentlyCopiedData: state.currentlyCopiedData,
    setChords: state.setChords,
    setChordBeingEdited: state.setChordBeingEdited,
    pauseAudio: state.pauseAudio,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
    setTabData: state.setTabData,
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
    <div className="baseVertFlex relative w-1/2 min-w-[300px] max-w-[91.7%] !items-start gap-4 rounded-md bg-secondary text-secondary-foreground !shadow-primaryButton sm:min-w-[500px]">
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md px-2 sm:px-0"
      >
        <AccordionItem value="opened" className="w-full">
          <AccordionTrigger className="p-2 sm:p-4">
            <div className="baseFlex gap-2">
              <BsMusicNoteBeamed className="size-4" />
              <span className="my-1 text-base font-bold xs:my-0 xs:text-lg">
                Chords
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="w-full">
            <div className="baseVertFlex w-full !items-start gap-4 p-2 !pt-0 sm:p-4">
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
                    className="baseVertFlex overflow-hidden rounded-md border-2"
                  >
                    <div className="baseFlex h-8 text-nowrap px-3">
                      <ChordName
                        name={chord.name}
                        color={chord.color}
                        truncate={false}
                      />
                    </div>

                    <div className="baseFlex h-8 w-full !justify-evenly border-t-2">
                      {/* edit button */}
                      <Button
                        variant={"ghost"}
                        size={"sm"}
                        className="baseFlex h-full w-full min-w-[50px] gap-2 rounded-none"
                        onClick={() => {
                          pauseAudio();
                          setChordBeingEdited({
                            index,
                            value: chord,
                          });
                        }}
                      >
                        {/* add the tooltip below for "Edit" */}
                        <MdModeEditOutline className="size-5" />
                      </Button>

                      <Separator
                        orientation="vertical"
                        className="h-full w-[2px] bg-border"
                      />

                      {/* delete button */}
                      <Button
                        variant={"destructive"}
                        size="sm"
                        className="baseFlex h-full w-full min-w-[50px] rounded-none border-none"
                        onClick={() => handleDeleteChord(index, chord.name)}
                      >
                        {/* add the tooltip below for "Delete" */}
                        <FaTrashAlt className="size-4" />
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
                      color: getNextChordColor(chords),
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
