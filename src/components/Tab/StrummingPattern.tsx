import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useTabStore,
  type FullNoteLengths,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { generateBeatLabels } from "~/utils/getBeatIndicator";
import StrummingPatternStrum from "./StrummingPatternStrum";

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
  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  showingDeleteStrumsButtons,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
}: StrummingPattern) {
  const [inputIdToFocus, setInputIdToFocus] = useState<string | null>(null);
  const [pmNodeOpacities, setPMNodeOpacities] = useState<string[]>([]);

  // Intentionally omit currentChordIndex / currentlyPlayingMetadata /
  // previewMetadata: each strum subscribes with useStrumHighlight so playback
  // and pattern-preview ticks don't re-render the whole pattern.
  const { setStrummingPatternBeingEdited, setTabData } = useTabStore(
    (state) => ({
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      setTabData: state.setTabData,
    }),
  );

  useEffect(() => {
    if (inputIdToFocus) {
      const newNoteToFocus = document.getElementById(inputIdToFocus);
      newNoteToFocus?.focus();
      setInputIdToFocus(null);
    }
  }, [inputIdToFocus]);

  // React Compiler escape hatch: identity is an effect dependency that
  // recomputes palm-mute node opacities.
  const getPMNodeOpacities = useCallback(() => {
    const strums = data.strums;

    if (lastModifiedPalmMuteNode === null) {
      return new Array(strums.length).fill("1") as string[];
    }

    const newOpacities = new Array(strums.length).fill("0.25") as string[];

    const getPalmMute = (index: number) => strums[index]?.palmMute ?? "";

    // Case 1: Added new "PM Start" node - show valid end positions
    if (lastModifiedPalmMuteNode.prevValue === "") {
      // The start node itself should be fully visible (to allow cancel)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Find the nearest existing "start" node to the right (can't place end past it)
      let nearestStartNodeIndex = strums.length;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strums.length;
        i++
      ) {
        if (getPalmMute(i) === "start") {
          nearestStartNodeIndex = i;
          break;
        }
      }

      // Enable all empty nodes between the new start and the nearest start node/end of section
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < nearestStartNodeIndex;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "") {
          newOpacities[i] = "1";
        }
      }
    }

    // Case 2: Removed "PM Start" node - enable nodes left (until end) and right (until pair end)
    else if (lastModifiedPalmMuteNode.prevValue === "start") {
      // The removed start node should be visible (to allow cancel/restore)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Enable all empty nodes to the left until an "end" node is found
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        const pm = getPalmMute(i);
        if (pm === "end") {
          break;
        }
        newOpacities[i] = "1";
      }

      // Enable all empty nodes to the right until the pair "end" node is found
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strums.length;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "end") {
          newOpacities[i] = "1";
          break;
        }
        newOpacities[i] = "1";
      }
    }

    // Case 3: Removed "PM End" node - enable nodes right (until start) and left (until pair start)
    else if (lastModifiedPalmMuteNode.prevValue === "end") {
      // The removed end node should be visible (to allow cancel/restore)
      newOpacities[lastModifiedPalmMuteNode.columnIndex] = "1";

      // Enable all empty nodes to the right until a "start" node is found
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strums.length;
        i++
      ) {
        const pm = getPalmMute(i);
        if (pm === "start") {
          break;
        }
        newOpacities[i] = "1";
      }

      // Enable all empty nodes to the left until the pair "start" node is found
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        const pm = getPalmMute(i);
        if (pm === "start") {
          newOpacities[i] = "1";
          break;
        }
        newOpacities[i] = "1";
      }
    }

    return newOpacities;
  }, [data.strums, lastModifiedPalmMuteNode]);

  useEffect(() => {
    if (editingPalmMuteNodes) {
      setPMNodeOpacities(getPMNodeOpacities());
    }
  }, [editingPalmMuteNodes, lastModifiedPalmMuteNode, getPMNodeOpacities]);

  function patternHasPalmMuting() {
    return data.strums.some((strum) => strum.palmMute !== "");
  }

  const heightOfStrummingPatternFiller = patternHasPalmMuting()
    ? mode === "editingStrummingPattern"
      ? "36px"
      : "1.5rem"
    : "0";

  const beatLabels = generateBeatLabels(
    data.strums.map((strum) => strum.noteLength),
  );

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
        newStrummingPattern.strums[beatIndex]?.noteLength ?? "quarter";
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
      strum: value,
    };

    setStrummingPatternBeingEdited({
      index: index ?? 0,
      value: newStrummingPattern,
    });
  }

  function addNewChord(after: boolean, atIndex: number) {
    const newStrummingPattern = structuredClone(data);

    newStrummingPattern.strums.splice(after ? atIndex + 1 : atIndex, 0, {
      palmMute: "",
      strum: "",
      noteLength: data.baseNoteLength,
    });

    setInputIdToFocus(
      `input-strummingPatternModal-${after ? atIndex + 1 : atIndex}-1`,
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

      if (chordSection?.type === "chord") {
        const newChordSection = { ...chordSection };
        const newChord = value === "noChord" ? "" : value;
        newChordSection.data[chordSequenceIndex ?? 0]!.data[beatIndex] =
          newChord;
        draft[sectionIndex ?? 0]!.data[subSectionIndex ?? 0] = newChordSection;
      }
    });
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
          <StrummingPatternStrum
            key={strumIndex}
            strum={strum}
            strumIndex={strumIndex}
            data={data}
            chordSequence={chordSequence}
            mode={mode}
            patternIndex={index}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
            chordSequenceIndex={chordSequenceIndex}
            beatLabel={beatLabels[strumIndex] ?? ""}
            heightOfStrummingPatternFiller={heightOfStrummingPatternFiller}
            pmNodeOpacity={pmNodeOpacities[strumIndex] ?? "1"}
            editingPalmMuteNodes={editingPalmMuteNodes}
            setEditingPalmMuteNodes={setEditingPalmMuteNodes}
            showingDeleteStrumsButtons={showingDeleteStrumsButtons}
            lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
            setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
            isLastStrum={strumIndex === data.strums.length - 1}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onNoteLengthChange={handleNoteLengthChange}
            onAddStrum={addNewChord}
            onDeleteStrum={deleteStrum}
            onChordChange={handleChordChange}
            onExtendPatternKeyDown={handleExtendPatternButtonKeyDown}
            onExtendPatternClick={addStrumsToPattern}
          />
        ))}
      </div>
    </div>
  );
}

export default StrummingPattern;
