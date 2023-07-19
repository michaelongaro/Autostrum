import { useState, useEffect } from "react";
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
    setStrummingPatternThatIsBeingEdited,
    tabData,
    setTabData,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  // effect to show/hide overlay that has button to create first strumming pattern

  function handleRepeatChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepeat = parseInt(e.target.value);
    if (isNaN(newRepeat)) {
      return;
    }

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.repetitions = newRepeat;

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
    if (Object.keys(subSectionData.data).length === 0 && strummingPatterns[0]) {
      const newTabData = [...tabData];

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

  // only take the motion.div wrapper from ChordSection
  // also this experiment means tabsection should have glassmorphic

  return (
    <motion.div
      key={`tabSection${sectionIndex}`}
      // layoutId={`tabSection${sectionIndex}`}
      layout
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: aboveMediumViewportWidth
          ? "2rem"
          : editing
          ? "1rem 0.5rem 1rem 0.5rem"
          : "1rem",
      }}
      className="baseVertFlex lightestGlassmorphic relative h-full w-full !justify-start rounded-md"
    >
      {/* rudimentary way to just not render/run into any runtime errors with trying to render
      <StrummingPattern /> w/o an actual strumming pattern */}
      {Object.keys(subSectionData.data).length === 0 && (
        <div className="baseVertFlex absolute z-50 h-full w-full gap-2 rounded-md bg-black/50">
          <p className="text-lg font-semibold">No strumming patterns exist</p>
          <Button
            onClick={() => {
              setStrummingPatternThatIsBeingEdited({
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
      )}

      <div className="baseFlex w-full !justify-between">
        <div className="baseFlex gap-2">
          <div className="baseFlex gap-2">
            <Label>Strumming pattern</Label>
            <Select
              onValueChange={handleStrummingPatternChange}
              // wtf is below supposed to be like hmmm do we have to store the index in a local state here?
              value={`${indexOfCurrentlySelectedStrummingPattern}`}
            >
              {/* maybe make width auto? test it out */}
              <SelectTrigger className="w-auto">
                {/* okay so I think we will have to render out currently selected <StrummingPattern/>
                inside of <SelectValue /> */}
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Strumming patterns</SelectLabel>
                  {strummingPatterns.map((pattern, index) => {
                    return (
                      <SelectItem key={index} value={`${index}`}>
                        <StrummingPattern
                          data={
                            // tabData[sectionIndex]!.data[subSectionIndex]!.data
                            //   .strummingPattern
                            // I have *no* idea why we were using above instead of just pattern like below..
                            pattern
                          }
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
            <Label>Repeat</Label>
            <Input
              type="text"
              placeholder="1"
              className="w-12"
              value={subSectionData.repetitions.toString()}
              onChange={handleRepeatChange}
            />
          </div>
        </div>

        {/* these need to be updated to only change the chordGroup indicies */}
        {editing && (
          <div className="baseVertFlex w-1/6 !justify-end gap-2 2xl:flex-row">
            <Button
              variant={"secondary"}
              className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
              disabled={sectionIndex === 0}
              onClick={() => {
                let newTabData = [...tabData];

                newTabData = arrayMove(
                  newTabData,
                  sectionIndex,
                  sectionIndex - 1
                );

                setTabData(newTabData);
              }}
            >
              <BiUpArrowAlt className="h-5 w-5" />
            </Button>
            <Button
              variant={"secondary"}
              className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
              disabled={sectionIndex === tabData.length - 1}
              onClick={() => {
                let newTabData = [...tabData];

                newTabData = arrayMove(
                  newTabData,
                  sectionIndex,
                  sectionIndex + 1
                );

                setTabData(newTabData);
              }}
            >
              <BiDownArrowAlt className="h-5 w-5" />
            </Button>
            <Button
              variant={"destructive"}
              className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
              disabled={tabData.length === 1} // maybe allow this later, but currently messes up ui
              onClick={() => {
                const newTabData = [...tabData];

                newTabData.splice(sectionIndex, 1);

                setTabData(newTabData);
              }}
            >
              <IoClose className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {Object.keys(subSectionData.data).length && (
        <div className="baseVertFlex gap-2">
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
      )}
    </motion.div>
  );
}

export default ChordSection;
