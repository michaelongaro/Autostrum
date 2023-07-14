import { useState } from "react";
import {
  type ChordGroup as ChordGroupType,
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
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import StrummingSection from "./ChordSequence";
import ChordSequence from "./ChordSequence";

export interface ChordGroup {
  sectionIndex: number;
  groupIndex: number;
  groupData: ChordGroupType;
}

function ChordGroup({ sectionIndex, groupIndex, groupData }: ChordGroup) {
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

  // effect to show/hide overlay that has button to create first strumming pattern

  function handleRepeatChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRepeat = parseInt(e.target.value);
    if (isNaN(newRepeat)) {
      return;
    }

    const newTabData = [...tabData];

    // @ts-expect-error should totally have "repeat" field
    newTabData[sectionIndex]!.data[groupIndex]!.repeat = newRepeat;

    setTabData(newTabData);
  }

  function handleStrummingPatternChange(value: string) {
    const newTabData = [...tabData];

    const newPattern = strummingPatterns[parseInt(value)];

    // @ts-expect-error should totally have "strummingPattern" field
    newTabData[sectionIndex]!.data[groupIndex]!.strummingPattern = newPattern;

    setIndexOfCurrentlySelectedStrummingPattern(parseInt(value));

    setTabData(newTabData);
  }

  // when changing the strumming pattern, we need to update the "children" chord progressions if
  // the length of the new strumming pattern is different than the old one. If it is longer, we need to
  // add appropriate amount of ""'s to the end of the chord group. If it is shorter, we need to
  // just .slice(0, len) the chord group to the length of the new strumming pattern.

  return (
    <div className="baseVertFlex lightestGlassmorphic relative w-full gap-2 rounded-md p-1 md:p-4">
      {/* rudimentary way to just not render/run into any runtime errors with trying to render
      <StrummingPattern /> w/o an actual strumming pattern */}
      {Object.keys(groupData.pattern).length === 0 && (
        <div className="baseVertFlex absolute z-50 h-full w-full gap-2 rounded-md bg-black/50">
          <p className="text-lg font-semibold">No strumming patterns exist</p>
          <Button
            onClick={() => {
              setStrummingPatternThatIsBeingEdited({
                index: strummingPatterns.length,
                value: {
                  noteLength: "1/8th",
                  strums: new Array<Strum>(8).fill({
                    palmMute: "",
                    strum: "",
                  }),
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
                            tabData[sectionIndex]!.data[groupIndex]!.pattern
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
              value={groupData.repeat.toString()}
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

      {Object.keys(groupData.pattern).length && (
        <div className="baseVertFlex gap-2">
          {groupData.data.map((chordSequence, index) => (
            <ChordSequence
              key={index}
              sectionIndex={sectionIndex}
              groupIndex={groupIndex}
              chordSequenceIndex={index}
              chordSequenceData={chordSequence}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChordGroup;
