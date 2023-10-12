import { MdModeEditOutline } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
import { shallow } from "zustand/shallow";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "../ui/button";
import { HiOutlineInformationCircle } from "react-icons/hi";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import Chord from "./Chord";
import { v4 as uuid } from "uuid";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { motion } from "framer-motion";

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
    id,
    currentInstrument,
    chords,
    setChords,
    setChordBeingEdited,
    getTabData,
    setTabData,
    editing,
    audioMetadata,
    previewMetadata,
    playPreview,
    pauseAudio,
  } = useTabStore(
    (state) => ({
      id: state.id,
      currentInstrument: state.currentInstrument,
      chords: state.chords,
      setChords: state.setChords,
      setChordBeingEdited: state.setChordBeingEdited,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      editing: state.editing,
      audioMetadata: state.audioMetadata,
      previewMetadata: state.previewMetadata,
      playPreview: state.playPreview,
      pauseAudio: state.pauseAudio,
    }),
    shallow
  );

  function handleDeleteChord(index: number, chordNameToBeDeleted: string) {
    const newTabData = getTabData();

    for (
      let sectionIndex = 0;
      sectionIndex < newTabData.length;
      sectionIndex++
    ) {
      const section = newTabData[sectionIndex];

      if (!section) continue;
      for (
        let subSectionIndex = 0;
        subSectionIndex < section.data.length;
        subSectionIndex++
      ) {
        const subSection = section.data[subSectionIndex];

        if (subSection?.type === "chord") {
          for (
            let chordSequenceIndex = 0;
            chordSequenceIndex < subSection.data.length;
            chordSequenceIndex++
          ) {
            const chordGroup = subSection.data[chordSequenceIndex];

            if (!chordGroup) continue;
            for (
              let chordIndex = 0;
              chordIndex < chordGroup.data.length;
              chordIndex++
            ) {
              const chordName = chordGroup.data[chordIndex];
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
        display: editing ? "flex" : chords.length === 0 ? "none" : "flex",
        minWidth: aboveMediumViewportWidth
          ? chords.length === 0
            ? "450px"
            : "500px"
          : "300px",
      }}
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 md:p-4"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionValue}
        onValueChange={(value) => {
          setAccordionValue(value);
        }}
        className="baseVertFlex w-full !items-start gap-2 rounded-md"
      >
        <AccordionItem value="opened">
          <AccordionTrigger>
            <p className="text-lg font-bold">Chords</p>
          </AccordionTrigger>
          <AccordionContent>
            <div className="baseFlex mt-4 !justify-start gap-4">
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
                      color:
                        previewMetadata.indexOfPattern === index &&
                        previewMetadata.playing &&
                        previewMetadata.type === "chord"
                          ? "hsl(333, 71%, 51%)"
                          : "hsl(327, 73%, 97%)",
                    }}
                    className="px-3 font-semibold transition-colors"
                  >
                    {chord.name}
                  </p>

                  <div className="baseFlex h-full w-full !justify-evenly">
                    {editing ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        {/* preview button */}
                        <Popover>
                          <PopoverTrigger className="baseFlex mr-1 h-8 w-8 rounded-md transition-all hover:bg-white/20 active:hover:bg-white/10 ">
                            <HiOutlineInformationCircle className="h-5 w-5" />
                          </PopoverTrigger>
                          <PopoverContent className="w-40 bg-pink-300 p-0 text-pink-50 shadow-lg">
                            <Chord
                              chordBeingEdited={{
                                index,
                                value: chord,
                              }}
                              editing={false}
                              highlightChord={
                                previewMetadata.indexOfPattern === index &&
                                previewMetadata.playing &&
                                previewMetadata.type === "chord"
                              }
                            />
                          </PopoverContent>
                        </Popover>
                        {/* preview chord button */}
                        <Button
                          variant={"playPause"}
                          disabled={
                            !currentInstrument ||
                            (previewMetadata.indexOfPattern === index &&
                              previewMetadata.playing &&
                              previewMetadata.type === "chord")
                          }
                          size={"sm"}
                          onClick={() => {
                            if (
                              audioMetadata.playing ||
                              previewMetadata.playing
                            ) {
                              pauseAudio();
                            }

                            setTimeout(
                              () => {
                                void playPreview({
                                  data: chord.frets,
                                  index,
                                  type: "chord",
                                });
                              },
                              audioMetadata.playing || previewMetadata.playing
                                ? 50
                                : 0
                            );
                          }}
                          className="baseFlex h-full w-10 rounded-l-none border-l-2"
                        >
                          <PlayButtonIcon
                            uniqueLocationKey={`chordPreview${index}`}
                            tabId={id}
                            currentInstrument={currentInstrument}
                            previewMetadata={previewMetadata}
                            indexOfPattern={index}
                            previewType="chord"
                          />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {editing && (
                <Button
                  onClick={() => {
                    setChordBeingEdited({
                      index: chords.length,
                      value: {
                        id: uuid(),
                        name: "",
                        frets: ["", "", "", "", "", ""],
                      },
                    });
                  }}
                >
                  Add chord
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default Chords;
