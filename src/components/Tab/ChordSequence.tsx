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
import MiscellaneousControls from "./MiscellaneousControls";

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
    const newRepetitions =
      e.target.value.length === 0 ? -1 : parseInt(e.target.value);

    if (isNaN(newRepetitions) || newRepetitions > 99) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
      // @ts-expect-error we know it's the chord type not tab type
    ]!.repetitions = newRepetitions;

    setTabData(newTabData);
  }

  return (
    <div className="baseVertFlex chordSectionGlassmorphic relative gap-2 rounded-md p-4">
      {editing && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
            <div className="baseFlex gap-2">
              <Label>Repetitions</Label>
              <Input
                type="text"
                className="w-12"
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

          <MiscellaneousControls
            type={"chordSequence"}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
            chordSequenceIndex={chordSequenceIndex}
          />
        </div>
      )}

      {!editing && (
        <p className="lightestGlassmorphic absolute -top-12 left-0 rounded-md p-2">
          {chordSequenceData.repetitions}
        </p>
      )}

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
