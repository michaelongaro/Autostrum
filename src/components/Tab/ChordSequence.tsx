import { motion } from "framer-motion";
import { useEffect, useMemo, useState, memo } from "react";
import { Button } from "~/components/ui/button";
import isEqual from "lodash.isequal";
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
import {
  useTabStore,
  type ChordSequence as ChordSequenceData,
  type ChordSection,
} from "~/stores/TabStore";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import MiscellaneousControls from "./MiscellaneousControls";
import StrummingPattern from "./StrummingPattern";
import StrummingPatternPreview from "./StrummingPatternPreview";

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
  sectionId: string;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  chordSequenceData: ChordSequenceData;
  subSectionData: ChordSection;
}

function ChordSequence({
  sectionId,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  chordSequenceData,
  subSectionData,
}: ChordSequence) {
  const [selectIsOpen, setSelectIsOpen] = useState(false);
  const [
    indexOfCurrentlySelectedStrummingPattern,
    setIndexOfCurrentlySelectedStrummingPattern,
  ] = useState(0);
  const [
    indexOfCurrentlyFocusedStrummingPattern,
    setIndexOfCurrentlyFocusedStrummingPattern,
  ] = useState(0);

  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const {
    bpm,
    strummingPatterns,
    getTabData,
    setTabData,
    setStrummingPatternBeingEdited,
  } = useTabStore((state) => ({
    bpm: state.bpm,
    strummingPatterns: state.strummingPatterns,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
  }));

  // sets sequence's strumming pattern to first existing pattern if the current pattern is empty
  useEffect(() => {
    if (
      Object.keys(chordSequenceData.strummingPattern).length === 0 &&
      strummingPatterns[0]
    ) {
      const newTabData = getTabData();

      // fill in the chord sequence with empty strings the size of the strumming pattern
      newTabData[sectionIndex]!.data[subSectionIndex]!.data[
        chordSequenceIndex
      ] = {
        id: chordSequenceData.id,
        repetitions: chordSequenceData.repetitions,
        bpm: -1,
        strummingPattern: strummingPatterns[0]!,
        data: Array.from(
          { length: strummingPatterns[0]!.strums.length },
          () => "",
        ),
      };

      setIndexOfCurrentlySelectedStrummingPattern(0);

      setTabData(newTabData);
    }
  }, [
    strummingPatterns,
    subSectionIndex,
    sectionIndex,
    chordSequenceData,
    chordSequenceIndex,
    setTabData,
    getTabData,
  ]);

  const placeholderBpm = useMemo(() => {
    if (chordSequenceData.bpm !== -1) return chordSequenceData.bpm.toString();

    if (subSectionData.bpm !== -1) return subSectionData.bpm.toString();

    if (bpm !== -1) return bpm.toString();

    return "";
  }, [bpm, subSectionData.bpm, chordSequenceData.bpm]);

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
      // @ts-expect-error we know it's the chord type not tab type
    ]!.repetitions = newRepetitions;

    setTabData(newTabData);
  }

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 500) return;

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
    ]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function handleStrummingPatternChange(value: string) {
    // if the user is creating a new strumming pattern
    if (value === "-1") {
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
      return;
    }

    const newTabData = getTabData();

    const newPattern = strummingPatterns[parseInt(value)];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
    ]!.strummingPattern = newPattern;

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
    ]!.data = Array.from({ length: newPattern!.strums.length }, () => "");

    setIndexOfCurrentlySelectedStrummingPattern(parseInt(value));

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={chordSequenceData.id}
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
      {Object.keys(chordSequenceData.strummingPattern).length === 0 ? (
        <div className="baseVertFlex relative h-full w-full gap-2 rounded-md border-2 border-pink-100 bg-black/25 p-4 shadow-sm">
          <p className="mt-8 text-lg font-semibold sm:mt-0">
            No strumming patterns exist
          </p>
          <Button
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
            Create one
          </Button>

          <div className="baseFlex absolute right-2 top-2 w-full">
            <div className="w-5/6"></div>
            <MiscellaneousControls
              type={"chordSequence"}
              sectionId={sectionId}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              chordSequenceIndex={chordSequenceIndex}
              hidePlayPauseButton={true}
            />
          </div>
        </div>
      ) : (
        <div className="baseVertFlex relative w-full !justify-start gap-4 rounded-md border-2 border-pink-100 p-4 shadow-sm">
          <div className="baseFlex w-full !items-start">
            <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
              <div className="baseFlex gap-2">
                <Label>Repetitions</Label>
                <div className="relative w-12">
                  <span className="absolute bottom-[9px] left-2 text-sm">
                    x
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-[45px] pl-4"
                    placeholder="1"
                    value={
                      chordSequenceData.repetitions === -1
                        ? ""
                        : chordSequenceData.repetitions.toString()
                    }
                    onChange={handleRepetitionsChange}
                  />
                </div>
              </div>

              <div className="baseFlex gap-2">
                <Label>BPM</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                  placeholder={placeholderBpm}
                  value={
                    chordSequenceData.bpm === -1
                      ? ""
                      : chordSequenceData.bpm.toString()
                  }
                  onChange={handleBpmChange}
                />
              </div>

              <div className="baseFlex !justify-start gap-2">
                <Label>Strumming pattern</Label>

                <Select
                  open={selectIsOpen}
                  onOpenChange={setSelectIsOpen}
                  onValueChange={handleStrummingPatternChange}
                  value={`${indexOfCurrentlySelectedStrummingPattern}`}
                >
                  <SelectTrigger className="w-auto">
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
                          <SelectItem
                            key={index}
                            value={`${index}`}
                            onFocus={() => {
                              setIndexOfCurrentlyFocusedStrummingPattern(index);
                            }}
                            onBlur={() => {
                              setIndexOfCurrentlyFocusedStrummingPattern(-1);
                            }}
                          >
                            <StrummingPattern
                              data={pattern}
                              mode={"viewingInSelectDropdown"}
                              isBeingHighlightedInDropdown={
                                index ===
                                indexOfCurrentlyFocusedStrummingPattern
                              }
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

                      <div className="baseFlex my-2 w-full">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectIsOpen(false);
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
              sectionId={sectionId}
              sectionIndex={sectionIndex}
              subSectionIndex={subSectionIndex}
              chordSequenceIndex={chordSequenceIndex}
            />
          </div>

          <StrummingPattern
            data={chordSequenceData.strummingPattern}
            chordSequenceData={chordSequenceData.data}
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

export default memo(ChordSequence, (prevProps, nextProps) => {
  const {
    chordSequenceData: prevChordSequenceData,
    subSectionData: prevSubSectionData,
    ...restPrev
  } = prevProps;
  const {
    chordSequenceData: nextChordSequenceData,
    subSectionData: nextSubSectionDataData,
    ...restNext
  } = nextProps;

  // Custom comparison for object props
  if (
    !isEqual(prevChordSequenceData, nextChordSequenceData) ||
    !isEqual(prevSubSectionData, nextSubSectionDataData)
  ) {
    return false; // props are not equal, so component should re-render
  }

  // Default shallow comparison for other props using Object.is()
  const allKeys = new Set([...Object.keys(restPrev), ...Object.keys(restNext)]);
  for (const key of allKeys) {
    // @ts-expect-error we know that these keys are in the objects
    if (!Object.is(restPrev[key], restNext[key])) {
      return false; // props are not equal, so component should re-render
    }
  }

  return true;
});
