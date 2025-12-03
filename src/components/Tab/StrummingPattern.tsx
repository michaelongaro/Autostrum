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
import { Element } from "react-scroll";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  type FullNoteLengths,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import renderStrummingGuide from "~/utils/renderStrummingGuide";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { generateBeatLabels } from "~/utils/getBeatIndicator";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import Ellipsis from "~/components/ui/icons/Ellipsis";
import { NoteLengthDropdown } from "~/components/Tab/NoteLengthDropdown";
// import { getBeatIndicator } from "~/utils/getBeatIndicator";

const noteLengthCycle = [
  "whole",
  "whole dotted",
  "whole double-dotted",
  "half",
  "half dotted",
  "half double-dotted",
  "quarter",
  "quarter dotted",
  "quarter double-dotted",
  "eighth",
  "eighth dotted",
  "eighth double-dotted",
  "sixteenth",
  "sixteenth dotted",
  "sixteenth double-dotted",
] as const;

type NoteLength = (typeof noteLengthCycle)[number];

interface StrummingPattern {
  data: StrummingPatternType;
  chordSequence?: string[];

  mode:
    | "editingStrummingPattern"
    | "editingChordSequence"
    | "viewingWithChordNames"
    | "viewing"
    | "viewingInSelectDropdown";
  index?: number; // index of strumming pattern in strummingPatterns array (used for editing pattern)

  // location of strumming pattern (used for editing chord sequence)
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;

  pmNodeOpacities?: string[];
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
  chordSequence,
  mode,
  index,
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
  const [strumIdxBeingHovered, setStrumIdxBeingHovered] = useState<
    number | null
  >(null);
  const [openStrumSettingsDropdownIdx, setOpenStrumSettingsDropdownIdx] =
    useState<number | null>(null);

  const {
    chords,
    setStrummingPatternBeingEdited,
    currentlyPlayingMetadata,
    currentChordIndex,
    previewMetadata,
    audioMetadata,
    setTabData,
  } = useTabStore((state) => ({
    chords: state.chords,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    previewMetadata: state.previewMetadata,
    audioMetadata: state.audioMetadata,
    setTabData: state.setTabData,
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
        return "36px";
      } else {
        return "1.5rem";
      }
    }

    return "0";
  }, [mode, patternHasPalmMuting]);

  const beatLabels = useMemo(() => {
    const strumsWithNoteLengths = data.strums.map((strum) => {
      return strum.noteLength;
    });

    return generateBeatLabels(strumsWithNoteLengths);
  }, [data]);

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    beatIndex: number,
  ) {
    const newStrummingPattern = structuredClone(data);

    // v/↓ for downstrum, ^/↑ for upstrum, s for slap, r for rest
    if ((!e.shiftKey && e.key === "ArrowDown") || e.key.toLowerCase() === "v") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!,
        strum: "v",
      };
    } else if ((!e.shiftKey && e.key === "ArrowUp") || e.key === "^") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!,
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
        ...data.strums[beatIndex]!,
        strum: "s",
      };
    } else if (e.key.toLowerCase() === "r") {
      newStrummingPattern.strums[beatIndex] = {
        ...data.strums[beatIndex]!,
        strum: "r",
      };
    }

    // Change note length with Shift + ArrowUp/ArrowDown
    if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();

      const order = noteLengthCycle;
      const current =
        (newStrummingPattern.strums[beatIndex]?.noteLength as NoteLength) ??
        "quarter";
      let idx = order.indexOf(current);
      if (idx === -1) idx = order.indexOf("quarter");

      if (e.key === "ArrowUp" && idx < order.length - 1) idx += 1; // increase resolution
      if (e.key === "ArrowDown" && idx > 0) idx -= 1; // decrease resolution

      const newLength: NoteLength = order[idx] ?? "quarter";
      newStrummingPattern.strums[beatIndex]!.noteLength = newLength;
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
          noteLength: data.baseNoteLength,
          noteLengthModified: false,
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

  function addNewChord(after: boolean) {
    const newStrummingPattern = structuredClone(data);

    newStrummingPattern.strums.splice(
      after ? strumIdxBeingHovered! + 1 : strumIdxBeingHovered!,
      0,
      {
        palmMute: "" as "" | "start" | "end",
        strum: "",
        noteLength: data.baseNoteLength,
        noteLengthModified: false,
      },
    );

    setInputIdToFocus(
      `input-strummingPatternModal-${
        after ? strumIdxBeingHovered! + 1 : strumIdxBeingHovered!
      }-1`,
    );

    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: newStrummingPattern,
    });
  }

  function handleNoteLengthChange(
    strumIndex: number,
    noteLength: FullNoteLengths,
  ) {
    const newStrummingPattern = structuredClone(data);

    newStrummingPattern.strums[strumIndex] = {
      ...data.strums[strumIndex]!,
      noteLength: noteLength,
      noteLengthModified: true,
    };
    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: newStrummingPattern,
    });
  }

  function addStrumsToPattern() {
    const newStrummingPattern = structuredClone(data);

    const remainingSpace = 32 - newStrummingPattern.strums.length;
    const strumsToAdd = Math.min(remainingSpace, 4);

    for (let i = 0; i < strumsToAdd; i++) {
      newStrummingPattern.strums.push({
        palmMute: "",
        strum: "",
        noteLength: data.baseNoteLength,
        noteLengthModified: false,
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
    setTabData?.((draft) => {
      const chordSection = draft[sectionIndex ?? 0]?.data[subSectionIndex ?? 0];

      if (chordSection && chordSection.type === "chord") {
        const newChordSection = { ...chordSection };
        const newChord = value === "noChord" ? "" : value;
        newChordSection.data[chordSequenceIndex ?? 0]!.data[beatIndex] =
          newChord;
        draft[sectionIndex ?? 0]!.data[subSectionIndex ?? 0] = newChordSection;
      }
    });
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
          <span
            style={{
              top: patternHasPalmMuting() ? "-26px" : "-38px",
            }}
            className="relative left-0 pr-2 text-sm font-medium"
          >
            Chords
          </span>
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
              onMouseEnter={() => setStrumIdxBeingHovered(strumIndex)}
              onMouseLeave={() => setStrumIdxBeingHovered(null)}
            >
              {strum.palmMute !== "" || editingPalmMuteNodes ? (
                <StrummingPatternPalmMuteNode
                  value={strum.palmMute}
                  beatIndex={strumIndex}
                  strummingPatternBeingEdited={{
                    index: index ?? 0,
                    value: data,
                  }}
                  opacity={
                    pmNodeOpacities ? (pmNodeOpacities[strumIndex] ?? "1") : "1"
                  }
                  editingPalmMuteNodes={editingPalmMuteNodes!}
                  setEditingPalmMuteNodes={setEditingPalmMuteNodes!}
                  lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                  setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
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
                  {strum.strum.includes("s") ||
                  strum.strum === "r" ||
                  strum.strum === "" ? (
                    <div className="h-[40px] w-[42px]"></div>
                  ) : (
                    <Select
                      onValueChange={(value) =>
                        handleChordChange(value, strumIndex)
                      }
                      value={
                        chordSequence?.[strumIndex] === ""
                          ? "noChord"
                          : chordSequence?.[strumIndex]
                      }
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue>{chordSequence?.[strumIndex]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup className="max-h-60 overflow-y-auto overflow-x-hidden">
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
                    className={`baseVertFlex relative mb-2 h-[20px] text-lg ${mode === "viewingInSelectDropdown" ? "" : "transition-colors"}`}
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
                        className="absolute bottom-[12px] right-[-2px]"
                      >
                        .
                      </div>
                    )}

                    {strum.strum === "r" && <PauseIcon className="size-3" />}

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

              {/* note length dropdown menu */}
              {mode === "editingStrummingPattern" && (
                <>
                  {strumIdxBeingHovered === strumIndex ||
                  openStrumSettingsDropdownIdx === strumIndex ? (
                    <DropdownMenu
                      modal={true}
                      open={openStrumSettingsDropdownIdx === strumIndex}
                      onOpenChange={(open) =>
                        setOpenStrumSettingsDropdownIdx(
                          open ? strumIndex : null,
                        )
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-1 w-4 !p-0">
                          <Ellipsis className="h-3 w-4 rotate-90" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent side={"bottom"}>
                        <DropdownMenuItem
                          className="baseFlex !justify-between gap-2"
                          onClick={() => addNewChord(false)}
                        >
                          Add strum before
                          <BsPlus className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="baseFlex !justify-between gap-2"
                          onClick={() => addNewChord(true)}
                        >
                          Add strum after
                          <BsPlus className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-primary" />
                        <NoteLengthDropdown
                          value={strum.noteLength}
                          onValueChange={(value) => {
                            handleNoteLengthChange(strumIndex, value);
                          }}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="h-1"></div>
                  )}
                </>
              )}

              {/* beat indicator */}
              <p
                style={{
                  color: highlightChord(strumIndex, index !== undefined)
                    ? "hsl(var(--primary) / 0.75)"
                    : "inherit",
                }}
                className={`text-sm ${mode === "viewingInSelectDropdown" ? "" : "transition-colors"}`}
              >
                {beatLabels[strumIndex]}
              </p>

              {/* strumming guide */}
              <div className="h-4 w-full">
                {renderStrummingGuide({
                  previousNoteLength: data.strums[strumIndex - 1]?.noteLength,
                  currentNoteLength: strum.noteLength,
                  nextNoteLength: data.strums[strumIndex + 1]?.noteLength,
                  previousIsRestStrum:
                    data.strums[strumIndex - 1]?.strum === "r",
                  currentIsRestStrum: strum.strum === "r",
                  nextIsRestStrum: data.strums[strumIndex + 1]?.strum === "r",
                })}
              </div>

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

export default StrummingPattern;
