import isEqual from "lodash.isequal";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { BsArrowDown, BsArrowUp, BsPlus } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { Element } from "react-scroll";
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
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface StrummingPattern {
  data: StrummingPatternType;
  chordSequenceData?: string[];

  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown";
  index?: number; // index of strumming pattern in strummingPatterns array (used for editing pattern)
  isBeingHighlightedInDropdown?: boolean;

  // location of strumming pattern in getTabData() array (used for editing chord sequence)
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;

  pmNodeOpacities: string[];
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
  chordSequenceData,
  mode,
  index,
  isBeingHighlightedInDropdown,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  pmNodeOpacities,
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: StrummingPattern) {
  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);

  const [isFocused, setIsFocused] = useState<boolean[]>(
    data?.strums?.map(() => false),
  );

  const {
    chords,
    getTabData,
    setTabData,
    setStrummingPatternBeingEdited,
    currentlyPlayingMetadata,
    currentChordIndex,
    previewMetadata,
    audioMetadata,
  } = useTabStore((state) => ({
    chords: state.chords,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    previewMetadata: state.previewMetadata,
    audioMetadata: state.audioMetadata,
  }));

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
    beatIndex: number,
  ) {
    const newStrummingPattern = structuredClone(data);

    // v/d for downstrum, ^/u for upstrum, and s for slap
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "v") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "v",
      };
    } else if (e.key === "ArrowUp" || e.key === "^") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "^",
      };

      // Set caret to end after React updates the value
      setTimeout(() => {
        const inputElem = document.getElementById(
          `input-strummingPatternModal-${beatIndex}-1`,
        ) as HTMLInputElement;

        if (inputElem) {
          const len = inputElem.value.length;
          inputElem.setSelectionRange(len, len);
        }
      }, 0);
    } else if (e.key.toLowerCase() === "s") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!, // ! because we know it's not undefined
        strum: "s",
      };
    }

    // arrow key navigation
    else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex - 1}-1`,
      );

      newNoteToFocus?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (beatIndex === data.strums.length - 1) {
        const newNoteToFocus = document.getElementById(
          "strummingPatternExtendPatternButton",
        );

        newNoteToFocus?.focus();
        return;
      }

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${beatIndex + 1}-1`,
      );

      newNoteToFocus?.focus();
    }

    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: { ...newStrummingPattern },
    });
  }

  function handleExtendPatternButtonKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const lastStrumIndex = data.strums.length - 1;

      const newNoteToFocus = document.getElementById(
        `input-strummingPatternModal-${lastStrumIndex}-1`,
      );

      newNoteToFocus?.focus();
    } else if (e.key === "Enter") {
      const newStrummingPattern = structuredClone(data);

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
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    beatIndex: number,
  ) {
    const value = e.target.value;

    const chordEffects = /^[v^s]{1}(>|\.|>\.|\.>)?$/;
    if (value !== "" && !chordEffects.test(value)) return;

    const newStrummingPattern = structuredClone(data);

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
    const newStrummingPattern = structuredClone(data);

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
  }

  function handleDeletePalmMutedStrum(
    newStrummingPattern: StrummingPatternType,
    strumIndex: number,
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
    const newStrummingPattern = handleDeletePalmMutedStrum(
      structuredClone(data),
      beatIndex,
    );

    newStrummingPattern.strums.splice(beatIndex, 1);

    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: newStrummingPattern,
    });
  }

  function handleChordChange(value: string, beatIndex: number) {
    const chordSection =
      getTabData()[sectionIndex ?? 0]?.data[subSectionIndex ?? 0];

    if (chordSection && chordSection.type === "chord") {
      const newChordSection = { ...chordSection };

      const newChord = value === "noChord" ? "" : value;

      newChordSection.data[chordSequenceIndex ?? 0]!.data[beatIndex] = newChord;

      const newTabData = getTabData();

      newTabData[sectionIndex ?? 0]!.data[subSectionIndex ?? 0] =
        newChordSection;

      setTabData(newTabData);
    }
  }

  function highlightChord(chordIndex: number, forPreview = false) {
    // preview strumming pattern
    if (forPreview) {
      return (
        previewMetadata.type === "strummingPattern" &&
        previewMetadata.indexOfPattern === index &&
        previewMetadata.currentChordIndex >= chordIndex
      );
    }

    if (!currentlyPlayingMetadata) return false;

    if (audioMetadata.editingLoopRange) {
      const isInSectionBeingLooped = currentlyPlayingMetadata.some(
        (metadata) => {
          return (
            sectionIndex === metadata.location.sectionIndex &&
            subSectionIndex === metadata.location.subSectionIndex &&
            chordSequenceIndex === metadata.location?.chordSequenceIndex &&
            chordIndex === metadata.location.chordIndex
          );
        },
      );

      return isInSectionBeingLooped;
    }

    const correspondingChordIndex = currentlyPlayingMetadata.some(
      (metadata) => {
        return (
          sectionIndex === metadata.location.sectionIndex &&
          subSectionIndex === metadata.location.subSectionIndex &&
          chordSequenceIndex === metadata.location?.chordSequenceIndex &&
          chordIndex === metadata.location.chordIndex
        );
      },
    );

    if (!correspondingChordIndex) return false;

    // regular strumming pattern
    if (
      currentlyPlayingMetadata[currentChordIndex]?.location.sectionIndex !==
        sectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location.subSectionIndex !==
        subSectionIndex ||
      currentlyPlayingMetadata[currentChordIndex]?.location
        .chordSequenceIndex !== chordSequenceIndex ||
      (currentlyPlayingMetadata[currentChordIndex]?.location.chordIndex ?? -1) <
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
        width: mode === "viewingWithChordNames" ? "auto" : "100%",
      }}
      className="baseFlex"
    >
      <div className="baseFlex relative mb-1 flex-wrap !justify-start">
        {mode === "editingChordSequence" && (
          <Label
            style={{
              top: patternHasPalmMuting() ? "-22px" : "-2rem",
            }}
            className="relative -top-8 left-0 pr-2"
          >
            Chords
          </Label>
        )}
        {data?.strums?.map((strum, strumIndex) => (
          <Element
            key={strumIndex}
            name={`section${sectionIndex ?? ""}-subSection${
              subSectionIndex ?? ""
            }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
            id={`section${sectionIndex ?? ""}-subSection${
              subSectionIndex ?? ""
            }-chordSequence${chordSequenceIndex ?? ""}-chord${strumIndex}`}
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
                  opacity={pmNodeOpacities[strumIndex] ?? "1"}
                  editingPalmMuteNodes={editingPalmMuteNodes!}
                  setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                  lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                  setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                  darkMode={
                    mode === "viewingInSelectDropdown" &&
                    !isBeingHighlightedInDropdown
                  }
                  viewingInSelectDropdown={mode === "viewingInSelectDropdown"}
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
                <>
                  {strum.strum.includes("s") || strum.strum === "" ? (
                    <div className="h-[40px] w-[42px]"></div>
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        handleChordChange(value, strumIndex)
                      }
                      value={
                        chordSequenceData?.[strumIndex] === ""
                          ? "noChord"
                          : chordSequenceData?.[strumIndex]
                      }
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue>
                          {chordSequenceData?.[strumIndex]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup className="max-h-60 overflow-y-auto overflow-x-hidden">
                          <SelectLabel>Chords</SelectLabel>

                          {chords.map((chord) => (
                            <SelectItem key={chord.name} value={chord.name}>
                              {chord.name}
                            </SelectItem>
                          ))}

                          {chords.length > 0 && (
                            <SelectSeparator className="mr-2" />
                          )}

                          <SelectItem
                            value="noChord"
                            className="hover:text-shadow italic"
                          >
                            No chord
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}

              <div className="baseFlex">
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
                        ? "hsl(var(--primary) / 0.75)"
                        : "hsl(var(--foreground))",
                    }}
                    className="h-[2.35rem] w-[2.35rem] rounded-full p-0 text-center shadow-sm"
                    onFocus={(e) => {
                      setIsFocused((prev) => {
                        prev[strumIndex] = true;
                        return [...prev];
                      });

                      // focuses end of the input (better ux when navigating with arrow keys)
                      e.target.setSelectionRange(
                        e.target.value.length,
                        e.target.value.length,
                      );
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
                      color: highlightChord(strumIndex, index !== undefined)
                        ? "hsl(var(--primary) / 0.75)"
                        : "inherit",
                    }}
                    className="baseVertFlex relative mb-2 h-[20px] text-lg transition-colors"
                  >
                    {strum.strum.includes("v") && (
                      <BsArrowDown
                        style={{
                          width: strum.strum.includes(">") ? "18.5px" : "20px",
                          height: strum.strum.includes(">") ? "18.5px" : "20px",
                        }}
                        strokeWidth={
                          strum.strum.includes(">") ? "1.25px" : "0px"
                        }
                      />
                    )}
                    {strum.strum.includes("^") && (
                      <BsArrowUp
                        style={{
                          width: strum.strum.includes(">") ? "18.5px" : "20px",
                          height: strum.strum.includes(">") ? "18.5px" : "20px",
                        }}
                        strokeWidth={
                          strum.strum.includes(">") ? "1.25px" : "0px"
                        }
                      />
                    )}

                    {strum.strum.includes("s") && (
                      <div
                        style={{
                          fontSize: "20px",
                        }}
                        className={`baseFlex mb-1 h-5 leading-[0] ${
                          strum.strum.includes(">")
                            ? "font-semibold"
                            : "font-normal"
                        }`}
                      >
                        {strum.strum[0]}
                      </div>
                    )}

                    {strum.strum.includes(".") && (
                      <div
                        style={{
                          fontSize: "30px",
                        }}
                        className="absolute bottom-[-9px]"
                      >
                        .
                      </div>
                    )}

                    {strum.strum === "" && <div className="h-5 w-4"></div>}
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
                  color: highlightChord(strumIndex, index !== undefined)
                    ? "hsl(var(--primary) / 0.75)"
                    : "inherit",
                }}
                className="text-sm transition-colors"
              >
                {getBeatIndicator(data.noteLength, strumIndex)}
              </p>

              {/* strumming guide */}
              {renderStrummingGuide(
                data.noteLength,
                strumIndex,
                mode,
                isBeingHighlightedInDropdown,
              )}

              {/* delete strum button */}
              {showingDeleteStrumsButtons && (
                <Button
                  variant={"destructive"}
                  disabled={data.strums.length === 1 || previewMetadata.playing}
                  className="h-6 w-6 p-0"
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
                  className="ml-2 mr-1 rounded-full px-[6px] py-0 md:px-2"
                  onKeyDown={handleExtendPatternButtonKeyDown}
                  onClick={addStrumsToPattern}
                >
                  <BsPlus className="h-6 w-6" />
                </Button>
              )}
          </Element>
        ))}
      </div>
    </div>
  );
}

export default memo(StrummingPattern, (prevProps, nextProps) => {
  const {
    data: prevData,
    chordSequenceData: prevChordSequenceData,
    lastModifiedPalmMuteNode: prevLastModifiedPalmMuteNode,
    ...restPrev
  } = prevProps;
  const {
    data: nextData,
    chordSequenceData: nextChordSequenceData,
    lastModifiedPalmMuteNode: nextLastModifiedPalmMuteNode,
    ...restNext
  } = nextProps;

  // Custom comparison for props that are objects
  if (
    !isEqual(prevData, nextData) ||
    !isEqual(prevChordSequenceData, nextChordSequenceData) ||
    !isEqual(prevLastModifiedPalmMuteNode, nextLastModifiedPalmMuteNode)
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
