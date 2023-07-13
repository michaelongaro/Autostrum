import { useState, type Dispatch, type SetStateAction } from "react";
import { shallow } from "zustand/shallow";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "~/components/ui/select";

interface StrummingPattern {
  strummingPatternThatIsBeingEdited: {
    index: number;
    value: StrummingPatternType;
  };
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes?: Dispatch<SetStateAction<boolean>>;
  showingDeleteStrumsButtons?: boolean;
  editing?: boolean;
  sectionIndex?: number;
  sectionBeingEdited?: {
    outerIndex: number;
    innerIndex: number;
  };
  viewingStrummingSection?: boolean;
}

function StrummingPattern({
  strummingPatternThatIsBeingEdited,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons = false,
  editing = false,
  sectionIndex = 0,
  sectionBeingEdited,
  viewingStrummingSection = false,
}: StrummingPattern) {
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const [isFocused, setIsFocused] = useState<boolean[]>(
    strummingPatternThatIsBeingEdited.value.strums.map(() => false)
  );

  // whenever adding more strums or deleting strums, immediately edit the isFocused array
  // to either add new false values or delete the strum that was deleted!

  const {
    tuning,
    strummingPatterns,
    setStrummingPatterns,
    chords,
    tabData,
    setTabData: setTabData,
    setStrummingPatternThatIsBeingEdited,
    modifyStrummingPatternPalmMuteDashes,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      chords: state.chords,
      tabData: state.tabData,
      setTabData: state.setTabData,
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      modifyStrummingPatternPalmMuteDashes:
        state.modifyStrummingPatternPalmMuteDashes,
    }),
    shallow
  );

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) {
    const newStrummingPattern = { ...strummingPatternThatIsBeingEdited };

    // v/d for downstrum and ^/u for upstrum
    if (e.key === "d") {
      // techincally would overwrite w/e was in input..
      newStrummingPattern.value.strums[index] = {
        ...strummingPatternThatIsBeingEdited.value.strums[index]!, // ! because we know it's not undefined
        strum: "v",
      };
    } else if (e.key === "u") {
      // techincally would overwrite w/e was in input..
      newStrummingPattern.value.strums[index] = {
        ...strummingPatternThatIsBeingEdited.value.strums[index]!, // ! because we know it's not undefined
        strum: "^",
      };
    }

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    else if (e.key === "ArrowUp") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${index}-0`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${index - 1}-1`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (index === strummingPatternThatIsBeingEdited.value.strums.length - 1) {
        const newNoteToFocus = document.getElementById(
          "strummingPatternExtendPatternButton"
        );

        newNoteToFocus?.focus();
        return;
      }

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${index + 1}-1`
      );

      newNoteToFocus?.focus();
    }

    setStrummingPatternThatIsBeingEdited(newStrummingPattern);
  }

  function handleExtendPatternButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const lastStrumIndex =
        strummingPatternThatIsBeingEdited.value.strums.length - 1;

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${lastStrumIndex}-1`
      );

      newNoteToFocus?.focus();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const value = e.target.value;

    const chordEffects = /^[v^s]{1}>?$/;
    if (value !== "" && !chordEffects.test(value)) return;

    const newStrummingPattern = { ...strummingPatternThatIsBeingEdited };

    newStrummingPattern.value.strums[index] = {
      ...strummingPatternThatIsBeingEdited.value.strums[index]!, // ! because we know it's not undefined
      strum: value as "" | "v" | "^" | "s" | "v>" | "^>" | "s>",
    };

    setStrummingPatternThatIsBeingEdited(newStrummingPattern);
  }

  function getBeatIndicator(noteLength: string, index: number) {
    let beat: number | string = "";
    switch (noteLength) {
      case "1/4th":
        beat = index + 1;
        break;
      case "1/8th":
        beat = index % 2 === 0 ? index / 2 + 1 : "&";
        break;
      case "1/16th":
        beat = index % 4 === 0 ? index / 4 + 1 : index % 2 === 0 ? "&" : "";
        break;
      case "1/4th triplet":
        beat = index % 3 === 0 ? (index / 3) * 2 + 1 : "";
        break;
      case "1/8th triplet":
        beat = index % 3 === 0 ? index / 3 + 1 : "";
        break;
      case "1/16th triplet":
        beat =
          index % 3 === 0
            ? (index / 3) % 2 === 0
              ? index / 3 / 2 + 1
              : "&"
            : "";
        break;
    }
    return beat.toString();
  }

  function addStrumsToPattern() {
    const newStrummingPattern = { ...strummingPatternThatIsBeingEdited };

    const remainingSpace = 32 - newStrummingPattern.value.strums.length;
    const strumsToAdd = Math.min(remainingSpace, 4);

    for (let i = 0; i < strumsToAdd; i++) {
      newStrummingPattern.value.strums.push({
        palmMute: "",
        strum: "",
      });
    }

    setStrummingPatternThatIsBeingEdited(newStrummingPattern);
  }

  function deleteStrum(index: number) {
    const newStrummingPattern = { ...strummingPatternThatIsBeingEdited };

    newStrummingPattern.value.strums.splice(index, 1);

    setStrummingPatternThatIsBeingEdited(newStrummingPattern);
  }

  function patternHasPalmMuting() {
    return strummingPatternThatIsBeingEdited.value.strums.some(
      (strum) => strum.palmMute !== ""
    );
  }

  function patternHasAccents() {
    return strummingPatternThatIsBeingEdited.value.strums.some((strum) =>
      strum.strum.includes(">")
    );
  }

  function getChordName(index: number) {
    const chordSection = tabData[sectionIndex];

    if (chordSection && chordSection.type === "chord") {
      const outerIndex = sectionBeingEdited?.outerIndex ?? 0;
      const innerIndex = sectionBeingEdited?.innerIndex ?? 0;

      const chord =
        chordSection.data[outerIndex]?.[innerIndex]?.chordSequence[index];
      return chord ?? "";
    }

    return "";
  }

  function handleChordChange(value: string, index: number) {
    const chordSection = tabData[sectionIndex];

    if (chordSection && chordSection.type === "chord") {
      const outerIndex = sectionBeingEdited?.outerIndex ?? 0;
      const innerIndex = sectionBeingEdited?.innerIndex ?? 0;

      const newChordSection = { ...chordSection };

      // @ts-expect-error asdf
      newChordSection.data[outerIndex][innerIndex].chordSequence[index] = value;

      const newTabData = [...tabData];

      newTabData[sectionIndex] = newChordSection;

      setTabData(newTabData);
    }
  }

  return (
    <div
      style={{
        padding: editing ? "0" : "0.25rem",
      }}
      className="baseFlex w-full"
    >
      <div className="baseFlex !justify-start">
        {strummingPatternThatIsBeingEdited.value.strums.map((strum, index) => (
          <div key={index} className="baseFlex gap-2">
            <div
              style={{
                marginTop: editing ? "1rem" : "0.25rem",
                gap: editing ? "0.5rem" : "0",
              }}
              className="baseVertFlex relative"
            >
              {strummingPatternThatIsBeingEdited.value.strums[index]!
                .palmMute !== "" || editingPalmMuteNodes ? (
                <StrummingPatternPalmMuteNode
                  value={
                    strummingPatternThatIsBeingEdited.value.strums[index]!
                      .palmMute
                  }
                  beatIndex={index}
                  strummingPatternThatIsBeingEdited={
                    strummingPatternThatIsBeingEdited
                  }
                  editingPalmMuteNodes={editingPalmMuteNodes}
                  setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                  lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                  setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  editing={editing || false}
                />
              ) : (
                <div
                  style={{
                    height: patternHasPalmMuting() ? "1.5rem" : "0",
                  }}
                  className="h-6"
                ></div>
              )}

              {/* chord viewer / selector */}
              {(sectionBeingEdited || viewingStrummingSection) && (
                <>
                  {sectionBeingEdited && (
                    <Select
                      onValueChange={(value) => handleChordChange(value, index)}
                      value={getChordName(index)}
                    >
                      <SelectTrigger className="w-[75px]">
                        {/* prob leave this out placeholder="Select a length" */}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Chord</SelectLabel>
                          {chords.map((chord) => (
                            <SelectItem key={chord.name} value={chord.name}>
                              {chord.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}

                  {viewingStrummingSection && <p>{getChordName(index)}</p>}
                </>
              )}

              <div
                style={{
                  width: editing ? "auto" : "1.25rem",
                }}
                className="baseFlex"
              >
                <div className="w-1"></div>
                {/* spacer so that PM node can be connected seamlessly above */}

                {editing ? (
                  <Input
                    id={`input-strummingPatternModal-${index}-1`}
                    type="text"
                    autoComplete="off"
                    value={strum.strum}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onChange={(e) => handleChange(e, index)}
                    style={{
                      borderWidth: `${
                        strum.strum.length > 0 && !isFocused[index]
                          ? "2px"
                          : "1px"
                      }`,
                    }}
                    className={`h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center 
                            ${
                              strum.strum.length > 0 ? "shadow-md" : "shadow-sm"
                            }
                          `}
                    onFocus={() => {
                      setIsFocused((prev) => {
                        prev[index] = true;
                        return [...prev];
                      });
                    }}
                    onBlur={() => {
                      setIsFocused((prev) => {
                        prev[index] = false;
                        return [...prev];
                      });
                    }}
                  />
                ) : (
                  <div
                    style={{
                      marginBottom:
                        strum.strum.includes(">") || !patternHasAccents()
                          ? "0"
                          : "1.5rem",
                    }}
                    className="baseVertFlex h-full"
                  >
                    {strum.strum.includes("v") && (
                      <BiDownArrowAlt className="h-4 w-4" />
                    )}
                    {strum.strum.includes("^") && (
                      <BiUpArrowAlt className="h-4 w-4" />
                    )}
                    {strum.strum.includes("s") && <p>{strum.strum}</p>}
                    {strum.strum === "" && <div className="h-4"></div>}
                    {strum.strum.includes(">") && <p>&gt;</p>}
                  </div>
                )}

                <div className="w-1"></div>
                {/* spacer so that PM node can be connected seamlessly above */}
              </div>

              {(editing || sectionBeingEdited || viewingStrummingSection) && (
                <p
                  style={{
                    height:
                      getBeatIndicator(
                        strummingPatternThatIsBeingEdited.value.noteLength,
                        index
                      ) === ""
                        ? "1.5rem"
                        : "auto",
                  }}
                >
                  {getBeatIndicator(
                    strummingPatternThatIsBeingEdited.value.noteLength,
                    index
                  )}
                </p>
              )}
              {/* delete strum button */}
              {showingDeleteStrumsButtons && (
                // can do framer motion here if you want
                <Button
                  variant={"destructive"}
                  className=" h-4 w-2 p-3" //absolute -bottom-7
                  onClick={() => deleteStrum(index)}
                >
                  x
                </Button>
              )}
            </div>

            {/* conditional "+" button to extend pattern if not at max length */}
            {editing &&
              index ===
                strummingPatternThatIsBeingEdited.value.strums.length - 1 &&
              strummingPatternThatIsBeingEdited.value.strums.length < 32 && (
                <Button
                  id={"strummingPatternExtendPatternButton"}
                  className="ml-4 rounded-full"
                  onKeyDown={handleExtendPatternButtonKeyDown}
                  onClick={addStrumsToPattern}
                >
                  +
                </Button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StrummingPattern;
