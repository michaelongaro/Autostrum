import { useState, type Dispatch, type SetStateAction } from "react";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { shallow } from "zustand/shallow";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface StrummingPattern {
  data: StrummingPatternType;
  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithBeatNumbers"
    | "viewing";
  index?: number; // index of strumming pattern in strummingPatterns array (used for editing pattern)
  location?: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex: number;
  }; // location of strumming pattern in tabData array (used for editing chord sequence)
  editingPalmMuteNodes?: boolean;
  setEditingPalmMuteNodes?: Dispatch<SetStateAction<boolean>>;
  showingDeleteStrumsButtons?: boolean;
}

function StrummingPattern({
  data,
  mode,
  index = 0,
  location,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons,
}: StrummingPattern) {
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  const [isFocused, setIsFocused] = useState<boolean[]>(
    data?.strums?.map(() => false)
  );

  // whenever adding more strums or deleting strums, immediately edit the isFocused array
  // to either add new false values or delete the strum that was deleted!

  const {
    chords,
    tabData,
    setTabData,
    setStrummingPatternBeingEdited,
    currentlyPlayingMetadata,
    currentChordIndex,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      tabData: state.tabData,
      setTabData: state.setTabData,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
    }),
    shallow
  );

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    beatIndex: number
  ) {
    const newStrummingPattern = { ...data };

    // v/d for downstrum and ^/u for upstrum
    if (e.key === "d") {
      // techincally would overwrite w/e was in input..
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "v",
      };
    } else if (e.key === "u") {
      // techincally would overwrite w/e was in input..
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "^",
      };
    }

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    else if (e.key === "ArrowUp") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex}-0`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex - 1}-1`
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (beatIndex === data.strums.length - 1) {
        const newNoteToFocus = document.getElementById(
          "strummingPatternExtendPatternButton"
        );

        newNoteToFocus?.focus();
        return;
      }

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex + 1}-1`
      );

      newNoteToFocus?.focus();
    }

    setStrummingPatternBeingEdited({
      index,
      value: { ...newStrummingPattern }, // I am pretty sure this or the one below is the problem
      // but I don't know why it isn't a separate memory reference... prob chatgpt tbh
    });
  }

  function handleExtendPatternButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const lastStrumIndex = data.strums.length - 1;

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${lastStrumIndex}-1`
      );

      newNoteToFocus?.focus();
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    beatIndex: number
  ) {
    const value = e.target.value;

    const chordEffects = /^[v^s]{1}>?$/;
    if (value !== "" && !chordEffects.test(value)) return;

    const newStrummingPattern = { ...data };

    newStrummingPattern.strums[beatIndex] = {
      ...data.strums[beatIndex]!, // ! because we know it's not undefined
      strum: value as "" | "v" | "^" | "s" | "v>" | "^>" | "s>",
    };

    setStrummingPatternBeingEdited({
      index,
      value: newStrummingPattern,
    });
  }

  function getBeatIndicator(noteLength: string, beatIndex: number) {
    let beat: number | string = "";
    switch (noteLength) {
      case "1/4th":
        beat = beatIndex + 1;
        break;
      case "1/8th":
        beat = beatIndex % 2 === 0 ? beatIndex / 2 + 1 : "&";
        break;
      case "1/16th":
        beat =
          beatIndex % 4 === 0
            ? beatIndex / 4 + 1
            : beatIndex % 2 === 0
            ? "&"
            : "";
        break;
      case "1/4th triplet":
        beat = beatIndex % 3 === 0 ? (beatIndex / 3) * 2 + 1 : "";
        break;
      case "1/8th triplet":
        beat = beatIndex % 3 === 0 ? beatIndex / 3 + 1 : "";
        break;
      case "1/16th triplet":
        beat =
          beatIndex % 3 === 0
            ? (beatIndex / 3) % 2 === 0
              ? beatIndex / 3 / 2 + 1
              : "&"
            : "";
        break;
    }
    return beat.toString();
  }

  function addStrumsToPattern() {
    const newStrummingPattern = { ...data };

    const remainingSpace = 32 - newStrummingPattern.strums.length;
    const strumsToAdd = Math.min(remainingSpace, 4);

    for (let i = 0; i < strumsToAdd; i++) {
      newStrummingPattern.strums.push({
        palmMute: "",
        strum: "",
      });
    }

    setStrummingPatternBeingEdited({
      index,
      value: newStrummingPattern,
    });
  }

  function deleteStrum(beatIndex: number) {
    const newStrummingPattern = { ...data };

    newStrummingPattern.strums.splice(beatIndex, 1);

    setStrummingPatternBeingEdited({
      index,
      value: newStrummingPattern,
    });
  }

  function patternHasPalmMuting() {
    return data.strums.some((strum) => strum.palmMute !== "");
  }

  function patternHasAccents() {
    return data.strums.some((strum) => strum.strum.includes(">"));
  }

  function getChordName(beatIndex: number) {
    const chordSection =
      tabData[location?.sectionIndex ?? 0]?.data[
        location?.subSectionIndex ?? 0
      ];

    if (chordSection && chordSection.type === "chord") {
      const chord =
        chordSection.data[location?.chordSequenceIndex ?? 0]?.data[beatIndex];
      return chord ?? "";
    }

    return "";
  }

  function handleChordChange(value: string, beatIndex: number) {
    const chordSection =
      tabData[location?.sectionIndex ?? 0]?.data[
        location?.subSectionIndex ?? 0
      ];

    if (chordSection && chordSection.type === "chord") {
      const newChordSection = { ...chordSection };

      newChordSection.data[location?.chordSequenceIndex ?? 0]!.data[beatIndex] =
        value;

      const newTabData = [...tabData];

      newTabData[location?.sectionIndex ?? 0]!.data[
        location?.subSectionIndex ?? 0
      ] = newChordSection;

      setTabData(newTabData);
    }
  }

  function highlightChord(chordIndex: number) {
    if (currentlyPlayingMetadata === null || !location) return false;

    if (
      currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex !==
        location.sectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location.subSectionIndex !==
        location.subSectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location
        .chordSequenceIndex !== location.chordSequenceIndex ||
      (currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex ?? 0) <
        chordIndex
    ) {
      return false;
    }

    return true;
  }

  return (
    <div
      style={{
        padding: mode === "editingStrummingPattern" ? "0" : "0.25rem",
        justifyContent: mode === "editingStrummingPattern" ? "center" : "start",
      }}
      className="baseFlex w-full"
    >
      <div
        // TODO: look at alignment when not just v/^
        className="baseFlex !justify-start"
      >
        {mode === "editingChordSequence" && (
          // TODO: mt-6 needs to be conditional, need to make it larger when palm mute exists
          // since that makes the regular section taller
          <Label className="mt-6">Chords</Label>
        )}

        {data?.strums?.map((strum, strumIndex) => (
          <div key={strumIndex} className="baseFlex">
            <div
              style={{
                marginTop:
                  mode === "editingStrummingPattern" ? "1rem" : "0.25rem",
                gap:
                  mode === "editingStrummingPattern" ||
                  mode === "editingChordSequence"
                    ? "0.5rem"
                    : "0",
              }}
              className="baseVertFlex relative"
            >
              {strum.palmMute !== "" || editingPalmMuteNodes ? (
                <StrummingPatternPalmMuteNode
                  value={strum.palmMute}
                  beatIndex={strumIndex}
                  strummingPatternBeingEdited={{
                    index,
                    value: data,
                  }}
                  editingPalmMuteNodes={editingPalmMuteNodes!}
                  setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                  lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                  setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  editing={mode === "editingStrummingPattern"}
                />
              ) : (
                <div
                  style={{
                    height: patternHasPalmMuting() ? "1.5rem" : "0",
                  }}
                  className="h-6"
                ></div>
              )}

              {/* chord selector */}
              {mode === "editingChordSequence" && (
                <Select
                  onValueChange={(value) =>
                    handleChordChange(value, strumIndex)
                  }
                  value={
                    getChordName(strumIndex) === ""
                      ? "blues" // currently have no clue why this (any) random value is needed. I would imagine that
                      : // I could pass "" and the value would be "" but that doesn't work
                        getChordName(strumIndex)
                  }
                >
                  <SelectTrigger className="w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Chord</SelectLabel>
                      <SelectItem value="" className="italic !text-zinc-500">
                        No chord
                      </SelectItem>
                      {chords.map((chord) => (
                        <SelectItem key={chord.name} value={chord.name}>
                          {chord.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}

              {/* chord viewer */}
              {mode === "viewingWithBeatNumbers" && (
                <p
                  style={{
                    color: highlightChord(strumIndex)
                      ? "rgb(219 39 119"
                      : "auto",
                  }}
                  className="font-semibold"
                >
                  {getChordName(strumIndex)}
                </p>
              )}

              <div
                // style={{
                //   width: mode === "editingStrummingPattern" ? "auto" : "1.5rem",
                // }}
                className="baseFlex !flex-nowrap"
              >
                <div
                  style={{
                    width:
                      mode === "editingChordSequence" ? "1.25rem" : "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}

                {mode === "editingStrummingPattern" ? (
                  <Input
                    id={`input-strummingPatternModal-${strumIndex}-1`}
                    type="text"
                    autoComplete="off"
                    value={strum.strum}
                    onKeyDown={(e) => handleKeyDown(e, strumIndex)}
                    onChange={(e) => handleChange(e, strumIndex)}
                    style={{
                      borderWidth: `${
                        strum.strum.length > 0 && !isFocused[strumIndex]
                          ? "2px"
                          : "1px"
                      }`,
                    }}
                    className="h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center shadow-sm"
                    onFocus={() => {
                      setIsFocused((prev) => {
                        prev[strumIndex] = true;
                        return [...prev];
                      });
                    }}
                    onBlur={() => {
                      setIsFocused((prev) => {
                        prev[strumIndex] = false;
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
                      color: highlightChord(strumIndex)
                        ? "rgb(219 39 119"
                        : "auto",
                    }}
                    className="baseVertFlex h-full text-lg"
                  >
                    {strum.strum.includes("v") && (
                      <BiDownArrowAlt className="h-5 w-5" />
                    )}
                    {strum.strum.includes("^") && (
                      <BiUpArrowAlt className="h-5 w-5" />
                    )}

                    {strum.strum.includes("s") && (
                      <div className="baseFlex h-5 leading-[0]">
                        {strum.strum[0]}
                      </div>
                    )}
                    {strum.strum.includes(">") && <p>&gt;</p>}
                    {/* buffer to keep vertical spacing the same no matter the type of strum */}
                    {strum.strum !== "" && !strum.strum.includes(">") && (
                      <div className="h-1"></div>
                    )}
                    {strum.strum === "" && <div className="h-6 w-4"></div>}
                  </div>
                )}

                <div
                  style={{
                    width:
                      mode === "editingChordSequence" ? "1.25rem" : "0.25rem",
                  }}
                ></div>
                {/* spacer so that PM nodes can be connected seamlessly above */}
              </div>

              {mode !== "viewing" && (
                <p
                  style={{
                    height:
                      getBeatIndicator(data.noteLength, strumIndex) === ""
                        ? "1.5rem"
                        : "auto",
                    color: highlightChord(strumIndex)
                      ? "rgb(219 39 119"
                      : "auto",
                  }}
                >
                  {getBeatIndicator(data.noteLength, strumIndex)}
                </p>
              )}

              {/* delete strum button */}
              {showingDeleteStrumsButtons && (
                // can do framer motion here if you want
                <Button
                  variant={"destructive"}
                  className=" h-4 w-2 p-3" //absolute -bottom-7
                  onClick={() => deleteStrum(strumIndex)}
                >
                  x
                </Button>
              )}
            </div>

            {/* conditional "+" button to extend pattern if not at max length */}
            {mode === "editingStrummingPattern" &&
              strumIndex === data.strums.length - 1 &&
              data.strums.length < 32 && (
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
