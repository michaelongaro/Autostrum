import { MdModeEditOutline } from "react-icons/md";
import { FaTrashAlt } from "react-icons/fa";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { motion } from "framer-motion";
import ChordDiagram from "~/components/Tab/Playback/ChordDiagram";

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
  } = useTabStore((state) => ({
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
  }));

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
      className="baseVertFlex lightestGlassmorphic w-1/2 max-w-[91.7%] !items-start gap-4 rounded-md p-2 !shadow-lighterGlassmorphic md:p-4"
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
            <>
              {editing ? (
                <div className="baseFlex mt-4 flex-wrap !justify-start gap-4">
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
                  <Button
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
              ) : (
                <div className="mt-2 grid max-h-[calc(100dvh-6rem)] w-full auto-rows-auto grid-cols-1 place-items-center gap-4 overflow-y-auto px-8 xs:grid-cols-2 md:grid-cols-3">
                  <>
                    {chords.map((chord, index) => (
                      <motion.div
                        key={chord.id}
                        variants={opacityVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        className="baseFlex"
                      >
                        <div className="baseVertFlex gap-3">
                          <div className="baseFlex w-full !justify-between border-b py-2">
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
                                  audioMetadata.playing ||
                                    previewMetadata.playing
                                    ? 50
                                    : 0,
                                );
                              }}
                              className="baseFlex mr-3 h-6 w-10 rounded-sm"
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
                          </div>

                          <div className="h-48">
                            <ChordDiagram originalFrets={chord.frets} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </>
                </div>
              )}
            </>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export default Chords;
