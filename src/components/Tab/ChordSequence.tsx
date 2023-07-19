import type { Dispatch, SetStateAction } from "react";
import { ChordGroup, useTabStore } from "~/stores/TabStore";
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
import { Label } from "../ui/label";
import { type ChordSequence as ChordSequenceData } from "~/stores/TabStore";
import { Input } from "../ui/input";

export interface ChordSequence {
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  chordSequenceData: ChordSequenceData;
}

function ChordSequence({
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  chordSequenceData,
}: ChordSequence) {
  const {
    editing,
    strummingPatterns,
    setStrummingPatterns,
    tabData,
    setTabData,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  // effect to show/hide overlay that has button to create first strumming pattern
  //

  // pattern selector + up down delete buttons on top
  // map of patterns w/in subSectionData
  // prob a button to add another pattern

  function handleRepetitionsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepeat = parseInt(e.target.value);
    if (isNaN(newRepeat)) {
      return;
    }

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
      // @ts-expect-error we know it's the chord type not tab type
    ]!.repetitions = newRepeat;

    setTabData(newTabData);
  }

  return (
    <div className="baseVertFlex lightestGlassmorphic relative w-full gap-2 p-1">
      <div className="baseFlex w-full !justify-between">
        {editing ? (
          <div className="baseFlex gap-2">
            <Label>Repetitions</Label>
            <Input
              type="text"
              className="w-12"
              placeholder="1"
              value={chordSequenceData.repetitions.toString()}
              onChange={handleRepetitionsChange}
            />
          </div>
        ) : (
          <p className="lightestGlassmorphic absolute -top-12 left-0 rounded-md p-2">
            {chordSequenceData.repetitions}
          </p>
        )}

        {/* these need to be updated to only change the strummingSection indicies */}
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

      <StrummingPattern
        // @ts-expect-error should totally have "pattern" field
        data={tabData[sectionIndex]!.data[subSectionIndex]!.strummingPattern}
        mode={editing ? "editingChordSequence" : "viewingWithBeatNumbers"}
        location={{ sectionIndex, subSectionIndex, chordSequenceIndex }}
      />
    </div>
  );
}

export default ChordSequence;
