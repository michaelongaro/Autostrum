import { useState, useEffect } from "react";
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
  const [
    indexOfCurrentlySelectedStrummingPattern,
    setIndexOfCurrentlySelectedStrummingPattern,
  ] = useState(0);

  const {
    editing,
    bpm,
    strummingPatterns,
    setStrummingPatterns,
    tabData,
    setTabData,
    setStrummingPatternBeingEdited,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    }),
    shallow
  );

  // sets sequence's strumming pattern to first existing pattern if the current pattern is empty
  useEffect(() => {
    if (
      Object.keys(chordSequenceData.strummingPattern).length === 0 &&
      strummingPatterns[0]
    ) {
      const newTabData = [...tabData];

      // fill in the chord sequence with empty strings the size of the strumming pattern
      newTabData[sectionIndex]!.data[subSectionIndex]!.data[
        chordSequenceIndex
      ] = {
        repetitions: chordSequenceData.repetitions,
        bpm: chordSequenceData.bpm,
        strummingPattern: strummingPatterns[0]!,
        data: Array.from(
          { length: strummingPatterns[0]!.strums.length },
          () => ""
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
    tabData,
  ]);

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

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newBpm = e.target.value.length === 0 ? -1 : parseInt(e.target.value);
    if (isNaN(newBpm) || newBpm > 400) return;

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
    ]!.bpm = newBpm;

    setTabData(newTabData);
  }

  function handleStrummingPatternChange(value: string) {
    if (value === "-1") {
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
      return;
    }

    const newTabData = [...tabData];

    const newPattern = strummingPatterns[parseInt(value)];

    newTabData[sectionIndex]!.data[subSectionIndex]!.data[
      chordSequenceIndex
    ]!.strummingPattern = newPattern;

    setIndexOfCurrentlySelectedStrummingPattern(parseInt(value));

    setTabData(newTabData);
  }

  return (
    <>
      {Object.keys(chordSequenceData.strummingPattern).length === 0 ? (
        <div
          style={{
            borderTopLeftRadius: chordSequenceData.repetitions > 1 ? 0 : "auto",
          }}
          className="baseVertFlex relative h-full w-full gap-2 rounded-md border-[1px] border-pink-50 bg-black/50 p-4"
        >
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
        <div
          style={{
            borderTopLeftRadius:
              !editing && chordSequenceData.repetitions > 1 ? 0 : "0.375rem",
          }}
          className="baseVertFlex relative w-full !justify-start gap-2 rounded-md border-[1px] border-pink-50 p-4"
        >
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

                <div className="baseFlex gap-2">
                  <Label>BPM</Label>
                  <Input
                    type="text"
                    className="h-8 w-11 px-2 md:h-10 md:w-[52px] md:px-3"
                    placeholder={(bpm ?? 75).toString()}
                    value={
                      chordSequenceData.bpm === -1
                        ? ""
                        : chordSequenceData.bpm.toString()
                    }
                    onChange={handleBpmChange}
                  />
                </div>

                <div className="baseFlex gap-2">
                  <Label>Strumming pattern</Label>

                  <Select
                    onValueChange={handleStrummingPatternChange}
                    value={`${indexOfCurrentlySelectedStrummingPattern}`}
                  >
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
                        <SelectItem value={`${-1}`}>
                          <p>Add new pattern</p>
                        </SelectItem>
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
          )}

          <StrummingPattern
            data={chordSequenceData.strummingPattern}
            mode={editing ? "editingChordSequence" : "viewingWithBeatNumbers"}
            location={{ sectionIndex, subSectionIndex, chordSequenceIndex }}
          />
        </div>
      )}
    </>
  );
}

export default ChordSequence;
