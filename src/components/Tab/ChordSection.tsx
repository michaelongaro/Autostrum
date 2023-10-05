import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { BsMusicNote } from "react-icons/bs";
import { v4 as uuid } from "uuid";
import { shallow } from "zustand/shallow";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
} from "~/stores/TabStore";
import ChordSequence from "./ChordSequence";
import MiscellaneousControls from "./MiscellaneousControls";
import type StrummingPattern from "./StrummingPattern";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.5,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};
export interface ChordSection {
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: ChordSectionType;
}

function ChordSection({
  sectionId,
  sectionIndex,
  subSectionIndex,
  subSectionData,
}: ChordSection) {
  const {
    editing,
    bpm,
    tabData,
    setTabData,
    audioMetadata,
    currentlyPlayingMetadata,
    currentChordIndex,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      bpm: state.bpm,
      tabData: state.tabData,
      setTabData: state.setTabData,
      audioMetadata: state.audioMetadata,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
    }),
    shallow
  );

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions =
      newRepetitions;

    setTabData(newTabData);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 400) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function addAnotherChordSequence() {
    const newTabData = [...tabData];

    // Tries to initialize with the section bpm first if available
    const relativeBpm = subSectionData.bpm === -1 ? bpm : subSectionData.bpm;

    newTabData[sectionIndex]!.data[subSectionIndex]!.data.push({
      id: uuid(),
      repetitions: 1,
      bpm: relativeBpm,
      // @ts-expect-error the correct strummingPattern will get set in <ChordSequence /> if it is available
      strummingPattern: {} as StrummingPattern,
      data: [], // this will also get set in <ChordSequence />
    });

    setTabData(newTabData);
  }

  const padding = useMemo(() => {
    let padding = "0";

    // figure out whether this applies at all now

    if (editing) {
      // padding =  "1rem 0.5rem 1rem 0.5rem";
      if (aboveMediumViewportWidth) {
        padding = "2rem";
      } else {
        padding = "1rem";
      }
    } else if (aboveMediumViewportWidth) {
      padding = "2rem";
    } else {
      padding = "1rem";
    }

    return padding;
  }, [editing, aboveMediumViewportWidth]);

  const layoutProp = useMemo(() => {
    return editing ? { layout: "position" as const } : {};
  }, [editing]);

  return (
    <motion.div
      key={subSectionData.id}
      {...layoutProp}
      variants={opacityAndScaleVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: padding,
        width: editing ? "100%" : "auto",
        borderTopLeftRadius:
          !editing && subSectionData.repetitions > 1 ? 0 : "0.375rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md"
    >
      {editing && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
            <div className="baseFlex gap-2">
              <Label>Repetitions</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="1"
                className="w-12"
                value={
                  subSectionData.repetitions === -1
                    ? ""
                    : subSectionData.repetitions.toString()
                }
                onChange={handleRepetitionsChange}
              />
            </div>

            <div className="baseFlex gap-2">
              <Label>BPM</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                placeholder={
                  subSectionData.bpm === -1
                    ? bpm.toString()
                    : subSectionData.bpm.toString()
                }
                value={
                  subSectionData.bpm === -1 ? "" : subSectionData.bpm.toString()
                }
                onChange={handleBpmChange}
              />
            </div>
          </div>
          <MiscellaneousControls
            type={"chord"}
            sectionId={sectionId}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${subSectionData.id}ChordSectionWrapper`}
          {...layoutProp}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          exit="closed"
          transition={{
            layout: {
              type: "spring",
              bounce: 0.15,
              duration: 1,
            },
          }}
          style={{
            flexDirection: editing ? "column" : "row",
            width: editing ? "100%" : "auto",
            gap: editing ? "0.5rem" : "2rem",
          }}
          className="baseVertFlex !items-end !justify-start gap-2"
        >
          {subSectionData.data.map((chordSequence, index) => (
            <>
              {editing || (!editing && chordSequence.data.length > 0) ? (
                <div
                  key={chordSequence.id}
                  style={{
                    width: editing ? "100%" : "auto",
                  }}
                  className="baseVertFlex !items-start"
                >
                  {!editing &&
                    ((chordSequence.bpm !== -1 &&
                      chordSequence.bpm !== subSectionData.bpm) ||
                      chordSequence.repetitions > 1) && (
                      <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
                        {chordSequence.bpm !== -1 &&
                          chordSequence.bpm !== subSectionData.bpm && (
                            <div className="baseFlex gap-1">
                              <BsMusicNote className="h-3 w-3" />
                              {chordSequence.bpm === -1
                                ? bpm
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

                            <p
                              className={`${
                                audioMetadata.type === "Generated" &&
                                audioMetadata.playing &&
                                currentlyPlayingMetadata?.[currentChordIndex]
                                  ?.location?.sectionIndex === sectionIndex &&
                                currentlyPlayingMetadata?.[currentChordIndex]
                                  ?.location?.subSectionIndex ===
                                  subSectionIndex &&
                                currentlyPlayingMetadata?.[currentChordIndex]
                                  ?.location?.chordSequenceIndex === index
                                  ? "animate-colorOscillate"
                                  : ""
                              }
                            `}
                            >
                              Repeat x{chordSequence.repetitions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  <AnimatePresence mode="wait">
                    <ChordSequence
                      sectionId={sectionId}
                      sectionIndex={sectionIndex}
                      subSectionIndex={subSectionIndex}
                      chordSequenceIndex={index}
                      chordSequenceData={chordSequence}
                      subSectionData={subSectionData}
                    />
                  </AnimatePresence>
                </div>
              ) : (
                <p
                  key={`emptyStrummingPattern${index}`}
                  className="italic text-pink-200"
                >
                  Empty strumming pattern
                </p>
              )}
            </>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* TODO: prob only show this when there is at least one strumming pattern defined */}
      {editing && (
        <Button onClick={addAnotherChordSequence}>
          {`Add ${
            subSectionData.data.length === 0 ? "a" : "another"
          } chord progression`}
        </Button>
      )}
    </motion.div>
  );
}

export default ChordSection;
