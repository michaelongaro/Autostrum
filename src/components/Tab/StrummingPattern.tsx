import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { BsArrowDown, BsArrowUp, BsPlus } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
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
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";

interface StrummingPattern {
  data: StrummingPatternType;
  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown";
  index?: number; // index of strumming pattern in strummingPatterns array (used for editing pattern)
  location?: {
    sectionIndex: number;
    subSectionIndex: number;
    chordSequenceIndex: number;
  }; // location of strumming pattern in tabData array (used for editing chord sequence)
  editingPalmMuteNodes?: boolean;
  setEditingPalmMuteNodes?: Dispatch<SetStateAction<boolean>>;
  showingDeleteStrumsButtons?: boolean;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
}

function StrummingPattern({
  data,
  mode,
  index,
  location,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: StrummingPattern) {
  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);

  const [isFocused, setIsFocused] = useState<boolean[]>(
    data?.strums?.map(() => false)
  );

  const {
    chords,
    tabData,
    setTabData,
    setStrummingPatternBeingEdited,
    currentlyPlayingMetadata,
    currentChordIndex,
    previewMetadata,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      tabData: state.tabData,
      setTabData: state.setTabData,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      previewMetadata: state.previewMetadata,
    }),
    shallow
  );

  useEffect(() => {
    if (inputIdToFocus) {
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      newNoteToFocus?.focus();
      setInputIdToFocus(null);
    }
  }, [inputIdToFocus]);

  const patternHasPalmMuting = useCallback(() => {
    return data.strums.some((strum) => strum.palmMute !== "");
  }, [data]);

  const heightOfStrummingPatternFiller = useMemo(() => {
    if (patternHasPalmMuting()) {
      if (mode === "editingStrummingPattern") {
        return "2.2rem";
      } else {
        return "1.5rem";
      }
    }

    return "0";
  }, [mode, patternHasPalmMuting]);

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    beatIndex: number
  ) {
    const newStrummingPattern = { ...data };

    // v/d for downstrum, ^/u for upstrum, and s for slap
    if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "v") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "v",
      };
    } else if (e.key.toLowerCase() === "u" || e.key === "^") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "^",
      };
    } else if (e.key.toLowerCase() === "s") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "s",
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
      index: index ?? 0,
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

    const chordEffects = /^[v^s]{1}(>|\.|>\.|\.>)?$/;
    if (value !== "" && !chordEffects.test(value)) return;

    const newStrummingPattern = { ...data };

    newStrummingPattern.strums[beatIndex] = {
      ...data.strums[beatIndex]!, // ! because we know it's not undefined
      strum: value as
        | ""
        | "v"
        | "^"
        | "s"
        | "v>"
        | "^>"
        | "s>"
        | "v.>"
        | "^.>"
        | "s.>"
        | "v>."
        | "u>."
        | "s>.",
    };

    setStrummingPatternBeingEdited({
      index: index ?? 0,
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
      index: index ?? 0,
      value: newStrummingPattern,
    });

    const firstNewStrumIndex = newStrummingPattern.strums.length - 4; // this will be the first of the 8 new strums added

    setInputIdToFocus(`input-strummingPatternModal-${firstNewStrumIndex}-1`);
  }

  function handleDeletePalmMutedStrum(
    newStrummingPattern: StrummingPatternType,
    strumIndex: number
  ) {
    // const newStrummingPattern = [...strummingPattern];

    const currentPalmMuteNodeValue =
      newStrummingPattern.strums[strumIndex]?.palmMute;
    const currentStrummingPatternLength =
      newStrummingPattern.strums.length ?? 0;

    if (currentPalmMuteNodeValue === "start") {
      let index = 0;
      while (index < currentStrummingPatternLength) {
        if (newStrummingPattern.strums[index]?.palmMute === "end") {
          newStrummingPattern.strums[index]!.palmMute = "";
          break;
        }

        newStrummingPattern.strums[index]!.palmMute = "";

        index++;
      }
    } else if (currentPalmMuteNodeValue === "end") {
      let index = currentStrummingPatternLength - 1;
      while (index >= 0) {
        if (newStrummingPattern.strums[index]?.palmMute === "start") {
          newStrummingPattern.strums[index]!.palmMute = "";
          break;
        }

        newStrummingPattern.strums[index]!.palmMute = "";

        index--;
      }
    }

    return newStrummingPattern;
  }

  function deleteStrum(beatIndex: number) {
    const newStrummingPattern = handleDeletePalmMutedStrum(data, beatIndex);

    newStrummingPattern.strums.splice(beatIndex, 1);

    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: newStrummingPattern,
    });
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

  function highlightChord(chordIndex: number, forPreview = false) {
    // preview strumming pattern
    if (
      forPreview &&
      (index === undefined ||
        previewMetadata.type !== "strummingPattern" ||
        previewMetadata.indexOfPattern !== index ||
        previewMetadata.currentChordIndex !== chordIndex)
    ) {
      return false;
    }

    // regular strumming pattern
    if (
      !forPreview &&
      (currentlyPlayingMetadata === null ||
        !location ||
        currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex !==
          location.sectionIndex ||
        currentlyPlayingMetadata[currentChordIndex]?.location
          .subSectionIndex !== location.subSectionIndex ||
        currentlyPlayingMetadata[currentChordIndex]?.location
          .chordSequenceIndex !== location.chordSequenceIndex ||
        (currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex ??
          -1) !== chordIndex)
    ) {
      return false;
    }

    return true;
  }

  // I really feel like there should be some way to declare color/backgroundColor
  // logic somewhere at a higher parent div, but there is nuance to it so holding
  // off for later refactor.

  return (
    <div
      style={{
        padding: mode === "editingStrummingPattern" ? "0" : "0.25rem",
        justifyContent: mode === "editingStrummingPattern" ? "center" : "start",
      }}
      className="baseFlex w-full"
    >
      <div className="baseFlex relative !justify-start">
        {mode === "editingChordSequence" && (
          <Label className="relative -top-8 left-0 pr-2">Chords</Label>
        )}

        {data?.strums?.map((strum, strumIndex) => (
          <div
            key={strumIndex}
            id={`section${location?.sectionIndex ?? ""}-subSection${
              location?.subSectionIndex ?? ""
            }-chordSequence${
              location?.chordSequenceIndex ?? ""
            }-chord${strumIndex}`}
            className="baseFlex"
          >
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
                    index: index ?? 0,
                    value: data,
                  }}
                  editingPalmMuteNodes={editingPalmMuteNodes!}
                  setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                  lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                  setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  darkMode={mode === "viewingInSelectDropdown"}
                  viewingInSelectDropdown={mode === "viewingInSelectDropdown"}
                  editingChordSequence={mode === "editingChordSequence"}
                  editing={mode === "editingStrummingPattern"}
                />
              ) : (
                <div
                  style={{
                    height: heightOfStrummingPatternFiller,
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
                      ? "blues" // TODO: currently have no clue why this (any) random value is needed. I would imagine that
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
                      <SelectItem value="" className="italic !text-gray-500">
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
              {mode === "viewingWithChordNames" && (
                <p
                  style={{
                    color: highlightChord(strumIndex)
                      ? "hsl(333, 71%, 51%)"
                      : "hsl(327, 73%, 97%)",
                  }}
                  className="h-6 font-semibold transition-colors"
                >
                  {getChordName(strumIndex)}
                </p>
              )}

              <div className="baseFlex !flex-nowrap">
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
                      color: highlightChord(strumIndex, true)
                        ? "hsl(333, 71%, 51%)"
                        : "hsl(327, 73%, 97%)",
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
                      color:
                        mode === "viewingInSelectDropdown"
                          ? "hsl(336, 84%, 17%)"
                          : highlightChord(strumIndex, index !== undefined)
                          ? "hsl(333, 71%, 51%)"
                          : "hsl(327, 73%, 97%)",
                    }}
                    className="baseVertFlex h-full text-lg transition-colors"
                  >
                    {strum.strum.includes("v") && (
                      <BsArrowDown className="h-5 w-5" />
                    )}
                    {strum.strum.includes("^") && (
                      <BsArrowUp className="h-5 w-5" />
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

              {/* beat indicator */}
              <p
                style={{
                  height:
                    getBeatIndicator(data.noteLength, strumIndex) === ""
                      ? "1.25rem"
                      : "auto",
                  color:
                    mode === "viewingInSelectDropdown"
                      ? "hsl(336, 84%, 17%)"
                      : "hsl(327, 73%, 97%)",
                }}
                className="text-sm transition-colors"
              >
                {getBeatIndicator(data.noteLength, strumIndex)}
              </p>

              {/* strumming guide */}
              {renderStrummingGuide(data.noteLength, strumIndex, mode)}

              {/* delete strum button */}
              {showingDeleteStrumsButtons && (
                // can do framer motion here if you want
                <Button
                  variant={"destructive"}
                  disabled={data.strums.length === 1}
                  className=" h-6 w-6 p-0"
                  onClick={() => deleteStrum(strumIndex)}
                >
                  <IoClose className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* conditional "+" button to extend pattern if not at max length */}
            {mode === "editingStrummingPattern" &&
              strumIndex === data.strums.length - 1 &&
              data.strums.length < 32 && (
                <Button
                  id={"strummingPatternExtendPatternButton"}
                  className="ml-4 rounded-full px-[0.4rem] py-0 md:px-2"
                  onKeyDown={handleExtendPatternButtonKeyDown}
                  onClick={addStrumsToPattern}
                >
                  <BsPlus className="h-6 w-6" />
                </Button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StrummingPattern;
