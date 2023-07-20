import { useState, useEffect, useMemo } from "react";
import {
  type ChordSection as ChordSectionType,
  useTabStore,
  Strum,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabMeasureLine from "./TabMeasureLine";
import TabNotesColumn from "./TabNotesColumn";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { type LastModifiedPalmMuteNodeLocation } from "./TabSection";
import { Button } from "~/components/ui/button";
import StrummingPattern from "./StrummingPattern";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { motion } from "framer-motion";
import StrummingSection from "./ChordSequence";
import ChordSequence from "./ChordSequence";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import MiscellaneousControls from "./MiscellaneousControls";

export interface ChordSection {
  sectionIndex: number;
  subSectionIndex: number;
  subSectionData: ChordSectionType;
}

function ChordSection({
  sectionIndex,
  subSectionIndex,
  subSectionData,
}: ChordSection) {
  const [
    indexOfCurrentlySelectedStrummingPattern,
    setIndexOfCurrentlySelectedStrummingPattern,
  ] = useState(0);

  const {
    editing,
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    tabData,
    setTabData,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  // effect to show/hide overlay that has button to create first strumming pattern

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepetitions = parseInt(e.target.value);
    if (isNaN(newRepetitions)) {
      return;
    }

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions =
      newRepetitions;

    setTabData(newTabData);
  }

  function handleStrummingPatternChange(value: string) {
    const newTabData = [...tabData];

    const newPattern = strummingPatterns[parseInt(value)];

    // @ts-expect-error should totally have "strummingPattern" field
    newTabData[sectionIndex]!.data[subSectionIndex]!.strummingPattern =
      newPattern;

    setIndexOfCurrentlySelectedStrummingPattern(parseInt(value));

    setTabData(newTabData);
  }

  // sets current group's pattern to first existing pattern if the current pattern is empty
  useEffect(() => {
    if (
      Object.keys(subSectionData.strummingPattern).length === 0 &&
      strummingPatterns[0]
    ) {
      // why this rerendering perma, unrelated but it actually should be creating empty sections below
      // for each chord sequence in subSectionData.data

      const newTabData = [...tabData];

      newTabData[sectionIndex]!.data[subSectionIndex]!.strummingPattern =
        strummingPatterns[0];

      // fill in the chord sequence with empty strings the size of the strumming pattern
      newTabData[sectionIndex]!.data[subSectionIndex]!.data = [
        {
          repetitions: 1,
          data: Array.from(
            { length: strummingPatterns[0].strums.length },
            () => ""
          ),
        },
      ];

      setTabData(newTabData);
    }
  }, [
    subSectionData,
    strummingPatterns,
    subSectionIndex,
    sectionIndex,
    setTabData,
    tabData,
  ]);

  function addAnotherChordSequence() {
    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data.push({
      repetitions: 1,
      data: Array.from(
        { length: strummingPatterns[indexOfCurrentlySelectedStrummingPattern] },
        () => ""
      ),
    });

    setTabData(newTabData);
  }

  const padding = useMemo(() => {
    let padding = "0";

    if (editing) {
      if (Object.keys(subSectionData.strummingPattern).length === 0) {
        padding = "0";
      }
      // padding =  "1rem 0.5rem 1rem 0.5rem";
      else if (aboveMediumViewportWidth) {
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
  }, [editing, aboveMediumViewportWidth, subSectionData.strummingPattern]);

  return (
    <motion.div
      key={`tabSection${sectionIndex}`}
      // layoutId={`tabSection${sectionIndex}`}
      layout
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: padding,
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full w-full !justify-start rounded-md"
    >
      {Object.keys(subSectionData.strummingPattern).length === 0 ? (
        <div className="baseVertFlex h-full w-full gap-2 rounded-md bg-black/50 p-4">
          <p className="text-lg font-semibold">No strumming patterns exist</p>
          <Button
            onClick={() => {
              setStrummingPatternBeingEdited({
                index: strummingPatterns.length,
                value: {
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
        </div>
      ) : (
        <>
          {editing && (
            <div className="baseFlex w-full !items-start">
              <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
                <div className="baseFlex gap-2">
                  <Label>Strumming pattern</Label>
                  <Select
                    onValueChange={handleStrummingPatternChange}
                    value={`${indexOfCurrentlySelectedStrummingPattern}`}
                  >
                    {/* maybe make width auto? test it out */}
                    <SelectTrigger className="w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Strumming patterns</SelectLabel>
                        {strummingPatterns.map((pattern, index) => {
                          return (
                            <SelectItem key={index} value={`${index}`}>
                              <StrummingPattern
                                data={pattern}
                                mode={"viewing"}
                              />
                            </SelectItem>
                          );
                        })}

                        {/* at bottom: button to create a new pattern */}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="baseFlex gap-2">
                  <Label>Repetitions</Label>
                  <Input
                    type="text"
                    placeholder="1"
                    className="w-12"
                    value={subSectionData.repetitions.toString()}
                    onChange={handleRepetitionsChange}
                  />
                </div>
              </div>
              <MiscellaneousControls
                type={"chord"}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
              />
            </div>
          )}

          {!editing && (
            <p className="lightestGlassmorphic absolute -top-12 left-0 rounded-md p-2">
              {subSectionData.repetitions}
            </p>
          )}

          <div className="baseVertFlex w-full !items-start gap-2">
            {subSectionData.data.map((chordSequence, index) => (
              <ChordSequence
                key={index}
                sectionIndex={sectionIndex}
                subSectionIndex={subSectionIndex}
                chordSequenceIndex={index}
                chordSequenceData={chordSequence}
              />
            ))}
          </div>

          {editing && (
            <Button onClick={addAnotherChordSequence}>
              Add another chord progression
            </Button>
          )}
        </>
      )}
    </motion.div>
  );
}

export default ChordSection;
