import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useTabStore } from "~/stores/TabStore";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import MiscellaneousControls from "./MiscellaneousControls";
import StrummingPattern from "./StrummingPattern";
import StrummingPatternPreview from "./StrummingPatternPreview";
import { QuarterNote } from "~/utils/noteLengthIcons";
import {
  useChordSequenceData,
  useChordSubSectionData,
} from "~/hooks/useTabDataSelectors";

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
export interface ChordSequence {
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
}

function ChordSequence({
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
}: ChordSequence) {
  const [selectIsOpen, setSelectIsOpen] = useState(false);
  const [
    indexOfCurrentlySelectedStrummingPattern,
    setIndexOfCurrentlySelectedStrummingPattern,
  ] = useState(0);

  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const { bpm, strummingPatterns, setStrummingPatternBeingEdited, setTabData } =
    useTabStore((state) => ({
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      setTabData: state.setTabData,
    }));

  const subSection = useChordSubSectionData(sectionIndex, subSectionIndex);
  const chordSequence = useChordSequenceData(
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
  );

  // sets sequence's strumming pattern to first existing pattern if the current pattern is empty
  useEffect(() => {
    if (
      Object.keys(chordSequence.strummingPattern).length === 0 &&
      strummingPatterns[0]
    ) {
      setTabData((draft) => {
        // fill in the chord sequence with empty strings the size of the strumming pattern
        draft[sectionIndex]!.data[subSectionIndex]!.data[chordSequenceIndex] = {
          id: chordSequence.id,
          repetitions: chordSequence.repetitions,
          bpm: -1,
          strummingPattern: strummingPatterns[0]!,
          data: Array.from(
            { length: strummingPatterns[0]!.strums.length },
            () => "",
          ),
        };
      });

      setIndexOfCurrentlySelectedStrummingPattern(0);
    }
  }, [
    strummingPatterns,
    subSectionIndex,
    sectionIndex,
    chordSequence,
    chordSequenceIndex,
    setTabData,
  ]);

  const placeholderBpm = useMemo(() => {
    if (chordSequence.bpm !== -1) return chordSequence.bpm.toString();

    if (subSection.bpm !== -1) return subSection.bpm.toString();

    if (bpm !== -1) return bpm.toString();

    return "";
  }, [bpm, subSection.bpm, chordSequence.bpm]);

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord") {
        subSection.data[chordSequenceIndex]!.repetitions = newRepetitions;
      }
    });
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord") {
        subSection.data[chordSequenceIndex]!.bpm = newBpm;
      }
    });
  }

  function handleStrummingPatternChange(value: string) {
    // if the user is creating a new strumming pattern
    if (value === "-1") {
      setStrummingPatternBeingEdited({
        index: strummingPatterns.length,
        value: {
          id: crypto.randomUUID(),
          baseNoteLength: "eighth",
          strums: Array.from({ length: 8 }, () => ({
            palmMute: "",
            strum: "",
            noteLength: "eighth",
            noteLengthModified: false,
          })),
        },
      });
      return;
    }

    const newPattern = strummingPatterns[parseInt(value)];

    setTabData((draft) => {
      const subSection = draft[sectionIndex]!.data[subSectionIndex];
      if (subSection?.type === "chord" && newPattern) {
        subSection.data[chordSequenceIndex]!.strummingPattern = newPattern;
        subSection.data[chordSequenceIndex]!.data = Array.from(
          { length: newPattern.strums.length },
          () => "",
        );
      }
    });

    setIndexOfCurrentlySelectedStrummingPattern(parseInt(value));
  }

  return (
    <motion.div
      key={chordSequence.id}
      layout={"position"}
      variants={opacityAndScaleVariants}
      initial={"closed"}
      animate={"expanded"}
      exit={"closed"}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      className="baseFlex w-full"
    >
      {Object.keys(chordSequence.strummingPattern).length === 0 ? (
        <div className="baseVertFlex relative h-full w-full gap-2 rounded-md border bg-background px-4 py-8 shadow-sm">
          <p className="mt-8 text-lg font-semibold sm:mt-0">
            No strumming patterns exist
          </p>
          <Button
            onClick={() => {
              setStrummingPatternBeingEdited({
                index: strummingPatterns.length,
                value: {
                  id: crypto.randomUUID(),
                  baseNoteLength: "eighth",
                  strums: Array.from({ length: 8 }, () => ({
                    palmMute: "",
                    strum: "",
                    noteLength: "eighth",
                    noteLengthModified: false,
                  })),
                },
              });
            }}
          >
            Create one
          </Button>

          <div className="baseFlex absolute right-2 top-2 w-full">
            <div className="w-5/6"></div>
            <MiscellaneousControls
              type={"chordSequence"}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              chordSequenceIndex={chordSequenceIndex}
              hidePlayPauseButton={true}
            />
          </div>
        </div>
      ) : (
        <div className="baseVertFlex relative w-full !justify-start gap-4 rounded-md border bg-background p-4 shadow-sm">
          <div className="baseFlex w-full !items-start">
            <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
              <div className="baseFlex gap-2">
                <Label
                  htmlFor={`chordSequenceBpmInput${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                >
                  BPM
                </Label>

                <div className="baseFlex">
                  <QuarterNote className="-ml-1 size-5" />

                  <Input
                    id={`chordSequenceBpmInput${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-[52px] px-2.5"
                    placeholder={placeholderBpm}
                    value={
                      chordSequence.bpm === -1
                        ? ""
                        : chordSequence.bpm.toString()
                    }
                    onChange={handleBpmChange}
                  />
                </div>
              </div>

              <div className="baseFlex gap-2">
                <Label
                  htmlFor={`chordSequenceRepetitionsInput${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                >
                  Repetitions
                </Label>
                <div className="relative w-12">
                  <span className="absolute bottom-[9px] left-2 text-sm">
                    x
                  </span>
                  <Input
                    id={`chordSequenceRepetitionsInput${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-[45px] px-2 pl-4"
                    placeholder="1"
                    value={
                      chordSequence.repetitions === -1
                        ? ""
                        : chordSequence.repetitions.toString()
                    }
                    onChange={handleRepetitionsChange}
                  />
                </div>
              </div>

              <div className="baseFlex !justify-start gap-2">
                <Label
                  htmlFor={`chordSequenceStrummingPatternSelect${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                >
                  Strumming pattern
                </Label>

                <Select
                  open={selectIsOpen}
                  onOpenChange={setSelectIsOpen}
                  onValueChange={handleStrummingPatternChange}
                  value={`${indexOfCurrentlySelectedStrummingPattern}`}
                >
                  <SelectTrigger
                    id={`chordSequenceStrummingPatternSelect${sectionIndex}${subSectionIndex}${chordSequenceIndex}`}
                    className="w-auto"
                  >
                    <SelectValue>
                      <StrummingPatternPreview
                        data={
                          strummingPatterns[
                            indexOfCurrentlySelectedStrummingPattern
                          ]
                        }
                      />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup className="max-h-60 overflow-y-auto overflow-x-hidden">
                      <SelectLabel>Strumming patterns</SelectLabel>
                      {strummingPatterns.map((pattern, index) => {
                        return (
                          <SelectItem key={index} value={`${index}`}>
                            <StrummingPattern
                              data={pattern}
                              mode={"viewingInSelectDropdown"}
                              lastModifiedPalmMuteNode={
                                lastModifiedPalmMuteNode
                              }
                              setLastModifiedPalmMuteNode={
                                setLastModifiedPalmMuteNode
                              }
                            />
                          </SelectItem>
                        );
                      })}

                      <SelectSeparator />

                      <div className="baseFlex mb-2 mt-3 w-full">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectIsOpen(false);
                            setStrummingPatternBeingEdited({
                              index: strummingPatterns.length,
                              value: {
                                id: crypto.randomUUID(),
                                baseNoteLength: "eighth",
                                strums: Array.from({ length: 8 }, () => ({
                                  palmMute: "",
                                  strum: "",
                                  noteLength: "eighth",
                                  noteLengthModified: false,
                                })),
                              },
                            });
                          }}
                        >
                          Add new pattern
                        </Button>
                      </div>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <MiscellaneousControls
              type={"chordSequence"}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              chordSequenceIndex={chordSequenceIndex}
            />
          </div>

          <StrummingPattern
            data={chordSequence.strummingPattern}
            chordSequence={chordSequence.data}
            mode={"editingChordSequence"}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
            chordSequenceIndex={chordSequenceIndex}
            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode} // hopefully this doesn't crash something
            setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode} // hopefully this doesn't crash something
          />
        </div>
      )}
    </motion.div>
  );
}

export default ChordSequence;
