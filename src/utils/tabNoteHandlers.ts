// ~/utils/tabNoteHandlers.ts
import type {
  Section,
  TabSection,
  TabNote,
  FullNoteLengths,
} from "~/stores/TabStore";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";
import {
  createTabNote,
  createTabMeasureLine,
  isTabNote,
  isTabMeasureLine,
  getStringValue,
  setStringValue,
} from "~/utils/tabNoteHelpers";

const chordMappings = {
  A: ["", "0", "2", "2", "2", "0"],
  a: ["", "0", "2", "2", "1", "0"],
  B: ["", "2", "4", "4", "4", "2"],
  b: ["", "2", "4", "4", "3", "2"],
  C: ["", "3", "2", "0", "1", "0"],
  c: ["", "3", "5", "5", "4", "3"],
  D: ["", "", "0", "2", "3", "2"],
  d: ["", "", "0", "2", "3", "1"],
  E: ["0", "2", "2", "1", "0", "0"],
  e: ["0", "2", "2", "0", "0", "0"],
  F: ["1", "3", "3", "2", "1", "1"],
  f: ["1", "3", "3", "1", "1", "1"],
  G: ["3", "2", "0", "0", "0", "3"],
  g: ["3", "5", "5", "3", "3", "3"],
};

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

function validNoteInput(input: string) {
  // standalone effects
  if (
    input === "|" ||
    input === "x" ||
    input === "h" ||
    input === "p" ||
    input === "r"
  ) {
    return true;
  }

  // Regex pattern to match a fret number between 0 and 22
  const numberPattern = /^(?:[0-9]|1[0-9]|2[0-2])$/;

  // Regex pattern to match any *one* inline effect of:
  // "h", "p", "/", "\", "~", ">", ".", "b", "x"
  const characterPattern = /^[hp\/\\\\~>.br]$/;

  if (input[0] === "/" || input[0] === "\\") {
    if (input.length === 1) return true;
    // Check for "/" and "\" at the start (just one digit number after)
    else if (input.length === 2) {
      return numberPattern.test(input[1] || "");
    }

    // Check for "/" and "\" at the start (two digit number after)
    else if (input.length === 3) {
      return numberPattern.test(input.substring(1, 3));
    }
  }

  // If input is a single digit or two digits between 10 to 22
  if (input.length === 1 && numberPattern.test(input)) {
    return true;
  }

  // If input starts with a number between 0 and 22 followed by
  // exactly one of the characters "h", "p", "/", "\", or "~"
  if (input.length === 2 || input.length === 3) {
    const numberPart =
      input[0]! +
      (parseInt(input[1]!) >= 0 && parseInt(input[1]!) <= 9 ? input[1]! : "");
    const characterPart =
      parseInt(input[1]!) >= 0 && parseInt(input[1]!) <= 9
        ? input[2]
        : input[1];

    if (characterPart === undefined) {
      return numberPattern.test(numberPart);
    } else if (input.length === 2) {
      return (
        numberPattern.test(numberPart) && characterPattern.test(characterPart)
      );
    } else if (input.length === 3 && numberPart.length === 2) {
      return (
        numberPattern.test(numberPart) && characterPattern.test(characterPart)
      );
    }
  }

  // In all other cases, the input is invalid
  return false;
}

export interface TabNoteHandlerParams {
  note: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  noteIndex: number;
  subSection: TabSection;
  setTabData: (updater: (draft: Section[]) => void) => void;
  currentlyCopiedChord: string[] | null;
  setCurrentlyCopiedChord: (chord: string[] | null) => void;
  chordPulse: {
    location: {
      sectionIndex: number;
      subSectionIndex: number;
      chordIndex: number;
    };
    type: "copy" | "paste";
  } | null;
  setChordPulse: (
    pulse: {
      location: {
        sectionIndex: number;
        subSectionIndex: number;
        chordIndex: number;
      };
      type: "copy" | "paste";
    } | null,
  ) => void;
  setIsFocused: (focused: boolean) => void;
}

export function handleTabNoteKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  params: TabNoteHandlerParams,
) {
  const {
    sectionIndex,
    subSectionIndex,
    columnIndex,
    noteIndex,
    subSection,
    setTabData,
    currentlyCopiedChord,
    setCurrentlyCopiedChord,
    setChordPulse,
  } = params;

  const currentNote = document.getElementById(
    `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`,
  );

  if (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "w") {
    e.preventDefault();

    const after = e.key.toLowerCase() === "w";

    const currentColumnData = subSection.data[columnIndex];

    if (currentColumnData && isTabNote(currentColumnData)) {
      const newColumnPalmMuteValue: "" | "-" | "start" | "end" =
        (currentColumnData.palmMute === "start" && after) ||
        (currentColumnData.palmMute === "end" && !after) ||
        currentColumnData.palmMute === "-"
          ? "-"
          : "";

      const newColumn = createTabNote({
        palmMute: newColumnPalmMuteValue,
        noteLength: subSection.baseNoteLength,
      });

      const insertionIndex = after ? columnIndex + 1 : columnIndex;

      setTabData((draft) => {
        const subSection = draft[sectionIndex]?.data[subSectionIndex];
        if (subSection?.type === "tab") {
          subSection.data.splice(insertionIndex, 0, newColumn);
        }
      });

      // Focus the newly created column
      setTimeout(() => {
        const newNoteToFocus = document.getElementById(
          `input-${sectionIndex}-${subSectionIndex}-${insertionIndex}-${noteIndex}`,
        );

        focusAndScrollIntoView(currentNote, newNoteToFocus);
      }, 0);
    }

    return;
  }

  // Change note length with Shift + ArrowUp/ArrowDown
  if (e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();

    setTabData((draft) => {
      const subSection = draft[sectionIndex]?.data[subSectionIndex];
      if (subSection?.type === "tab") {
        const columnData = subSection.data[columnIndex];
        if (columnData && isTabNote(columnData)) {
          const order = noteLengthCycle;
          const current = columnData.noteLength ?? "quarter";
          let idx = order.indexOf(current as NoteLength);
          if (idx === -1) idx = order.indexOf("quarter");

          if (e.key === "ArrowUp" && idx < order.length - 1) idx += 1; // increase resolution
          if (e.key === "ArrowDown" && idx > 0) idx -= 1; // decrease resolution

          const newLength: NoteLength = order[idx] ?? "quarter";
          columnData.noteLength = newLength;
        }
      }
    });

    return;
  }

  // Clear current chord
  if (e.ctrlKey && !e.shiftKey && e.key === "Backspace") {
    e.preventDefault();

    setTabData((draft) => {
      const subSection = draft[sectionIndex]?.data[subSectionIndex];
      if (subSection?.type === "tab") {
        const column = subSection.data[columnIndex];

        // Only clear if not a measure line
        if (column && isTabNote(column)) {
          // Keep palm mute, note length, id, but clear notes and effects
          const palmMuteNode = column.palmMute;
          const id = column.id;

          const clearedNote = createTabNote({
            palmMute: palmMuteNode,
            noteLength: subSection.baseNoteLength,
          });
          clearedNote.id = id;

          subSection.data[columnIndex] = clearedNote;
        }
      }
    });
    return;
  }

  // delete current chord
  if (e.ctrlKey && e.shiftKey && e.key === "Backspace") {
    e.preventDefault();

    const currentColumn = subSection.data[columnIndex];
    // Only delete if not a measure line and not the last column
    if (
      currentColumn &&
      isTabNote(currentColumn) &&
      subSection.data.length > 1
    ) {
      setTabData((draft) => {
        const draftSubSection = draft[sectionIndex]?.data[subSectionIndex];
        if (draftSubSection?.type === "tab") {
          draftSubSection.data.splice(columnIndex, 1);
        }
      });

      // Focus the next column, or previous if at end
      setTimeout(() => {
        const nextIndex =
          columnIndex < subSection.data.length - 1
            ? columnIndex
            : columnIndex - 1;
        const newNoteToFocus = document.getElementById(
          `input-${sectionIndex}-${subSectionIndex}-${nextIndex}-${noteIndex}`,
        );
        focusAndScrollIntoView(currentNote, newNoteToFocus);
      }, 0);
    }

    return;
  }

  // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
  if (e.key === "ArrowDown" && !e.shiftKey) {
    e.preventDefault(); // prevent cursor from moving

    const newNoteToFocus = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${
        noteIndex + 1
      }`,
    );

    focusAndScrollIntoView(currentNote, newNoteToFocus);
    return;
  } else if (e.key === "ArrowUp" && !e.shiftKey) {
    e.preventDefault(); // prevent cursor from moving

    const newNoteToFocus = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${
        noteIndex - 1
      }`,
    );

    focusAndScrollIntoView(currentNote, newNoteToFocus);
    return;
  } else if (e.key === "ArrowLeft") {
    e.preventDefault(); // prevent cursor from moving

    const prevColumn = subSection.data[columnIndex - 1];
    const adjColumnIndex =
      prevColumn && isTabMeasureLine(prevColumn)
        ? columnIndex - 2
        : columnIndex - 1;

    const newNoteToFocus = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`,
    );

    focusAndScrollIntoView(currentNote, newNoteToFocus);
    return;
  } else if (e.key === "ArrowRight") {
    e.preventDefault(); // prevent cursor from moving

    if (columnIndex === subSection.data.length - 1) {
      const newNoteToFocus = document.getElementById(
        `${sectionIndex}${subSectionIndex}ExtendTabButton`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    }

    const nextColumn = subSection.data[columnIndex + 1];
    const adjColumnIndex =
      nextColumn && isTabMeasureLine(nextColumn)
        ? columnIndex + 2
        : columnIndex + 1;

    const newNoteToFocus = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`,
    );

    focusAndScrollIntoView(currentNote, newNoteToFocus);
    return;
  }

  if (
    (e.ctrlKey && e.key === "c") || // Control + C for Windows/Linux
    (e.metaKey && e.key === "c") // Command + C for macOS
  ) {
    e.preventDefault();

    const currentColumn = subSection.data[columnIndex];
    // Only copy if it's a TabNote (not a measure line)
    if (currentColumn && isTabNote(currentColumn)) {
      // Copy string values and effects (indices 1-9 in old format)
      const copiedChord = [
        currentColumn.firstString,
        currentColumn.secondString,
        currentColumn.thirdString,
        currentColumn.fourthString,
        currentColumn.fifthString,
        currentColumn.sixthString,
        currentColumn.chordEffects,
        currentColumn.noteLength,
      ];

      setChordPulse({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: columnIndex,
        },
        type: "copy",
      });
      setCurrentlyCopiedChord(copiedChord);
    }
  } else if (
    currentlyCopiedChord &&
    ((e.ctrlKey && e.key === "v") || // Control + V for Windows/Linux
      (e.metaKey && e.key === "v")) // Command + V for macOS
  ) {
    e.preventDefault();

    setTabData((draft) => {
      const subSection = draft[sectionIndex]?.data[subSectionIndex];
      if (subSection?.type === "tab") {
        const currentColumn = subSection.data[columnIndex];
        if (currentColumn && isTabNote(currentColumn)) {
          // Paste from copied chord data
          currentColumn.firstString = currentlyCopiedChord[0] ?? "";
          currentColumn.secondString = currentlyCopiedChord[1] ?? "";
          currentColumn.thirdString = currentlyCopiedChord[2] ?? "";
          currentColumn.fourthString = currentlyCopiedChord[3] ?? "";
          currentColumn.fifthString = currentlyCopiedChord[4] ?? "";
          currentColumn.sixthString = currentlyCopiedChord[5] ?? "";
          currentColumn.chordEffects = currentlyCopiedChord[6] ?? "";
          currentColumn.noteLength =
            (currentlyCopiedChord[7] as FullNoteLengths) ?? "quarter";
        }
      }
    });

    setChordPulse({
      location: {
        sectionIndex,
        subSectionIndex,
        chordIndex: columnIndex,
      },
      type: "paste",
    });
    return;
  }

  // v/d for downstrum, ^/u for upstrum, and s for slap
  if (
    (e.key.toLowerCase() === "d" ||
      e.key.toLowerCase() === "v" ||
      e.key.toLowerCase() === "u" ||
      e.key === "^" ||
      e.key.toLowerCase() === "s") &&
    noteIndex === 7
  ) {
    setTabData((draft) => {
      const subSection = draft[sectionIndex]?.data[subSectionIndex];
      if (subSection?.type === "tab") {
        const currentColumn = subSection.data[columnIndex];
        if (currentColumn && isTabNote(currentColumn)) {
          if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "v") {
            currentColumn.chordEffects = "v";
          } else if (e.key.toLowerCase() === "u" || e.key === "^") {
            currentColumn.chordEffects = "^";
          } else if (e.key.toLowerCase() === "s") {
            currentColumn.chordEffects = "s";
          }
        }
      }
    });
  }
}

export function handleTabNoteChange(
  e: React.ChangeEvent<HTMLInputElement>,
  params: {
    noteIndex: number;
    sectionIndex: number;
    subSectionIndex: number;
    columnIndex: number;
    subSection: TabSection;
    setTabData: (updater: (draft: Section[]) => void) => void;
  },
) {
  const {
    noteIndex,
    sectionIndex,
    subSectionIndex,
    columnIndex,
    subSection,
    setTabData,
  } = params;

  let value = e.target.value;

  // regular notes / preset chords / measure line
  if (noteIndex !== 7 || value === "|") {
    // wanted to always allow a-g in regular note even if there was a number
    // present for easy placement of major chords
    const chordLetter = [...value].find((char) => /[A-Ga-g]/.test(char)) ?? "";

    const isValidChord =
      chordLetter !== "" && (chordLetter !== "b" || value.length === 1);

    if (isValidChord) {
      const chordArray: string[] =
        chordMappings[chordLetter as keyof typeof chordMappings];

      setTabData((draft) => {
        const subSection = draft[sectionIndex]?.data[subSectionIndex];
        if (subSection?.type === "tab") {
          const currentColumn = subSection.data[columnIndex];
          if (currentColumn && isTabNote(currentColumn)) {
            const chordEffects =
              currentColumn.chordEffects !== "r"
                ? currentColumn.chordEffects
                : "";

            // chordArray is [low E to high E], reversed gives [high E to low E]
            // which matches sixthString to firstString order
            // const reversedChord = chordArray.toReversed();
            currentColumn.firstString = chordArray[5] ?? "";
            currentColumn.secondString = chordArray[4] ?? "";
            currentColumn.thirdString = chordArray[3] ?? "";
            currentColumn.fourthString = chordArray[2] ?? "";
            currentColumn.fifthString = chordArray[1] ?? "";
            currentColumn.sixthString = chordArray[0] ?? "";
            currentColumn.chordEffects = chordEffects;
          }
        }
      });
      return;
    }

    // need to do this after checking for chord letters so that
    // the chord letters can be capitalized for the chord shortcut
    value = value.toLowerCase();

    if (value !== "" && !validNoteInput(value)) return;

    if (value === "|") {
      const prevColumn = subSection.data[columnIndex - 1];
      const nextColumn = subSection.data[columnIndex + 1];
      if (
        columnIndex === 0 ||
        columnIndex === subSection.data.length - 1 ||
        (prevColumn && isTabMeasureLine(prevColumn)) ||
        (nextColumn && isTabMeasureLine(nextColumn))
      ) {
        return;
      }

      setTabData((draft) => {
        const draftSubSection = draft[sectionIndex]?.data[subSectionIndex];
        if (draftSubSection?.type === "tab") {
          const currentColumn = draftSubSection.data[columnIndex];
          if (currentColumn && isTabNote(currentColumn)) {
            const palmMuteNode = currentColumn.palmMute;

            // this technically is fine, but I don't want to implement it now, also might have
            // weird ui side effects by having more space on either side of the measure line than
            // originally planned for
            if (palmMuteNode === "start" || palmMuteNode === "end") return;

            const measureLine = createTabMeasureLine({
              isInPalmMuteSection: palmMuteNode === "-",
            });
            measureLine.id = currentColumn.id;
            draftSubSection.data[columnIndex] = measureLine;
          }
        }
      });

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${
          columnIndex + 1
        }-${noteIndex}`,
      );

      newNoteToFocus?.focus();
      return;
    }
  }

  // chord effects
  else {
    const combinedEffects = /^[v^s]{1}(>|\.|>\.|\.>)?$/;
    const justAccentedAndStaccato = /^(>|\.|>\.|\.>)$/;
    const justRest = /^r$/;
    if (
      value !== "" &&
      !combinedEffects.test(value) &&
      !justAccentedAndStaccato.test(value) &&
      !justRest.test(value)
    )
      return;

    // if note is rest, clear out other note positions
    if (justRest.test(value)) {
      setTabData((draft) => {
        const subSection = draft[sectionIndex]?.data[subSectionIndex];
        if (subSection?.type === "tab") {
          const currentColumn = subSection.data[columnIndex];
          if (currentColumn && isTabNote(currentColumn)) {
            currentColumn.firstString = "";
            currentColumn.secondString = "";
            currentColumn.thirdString = "";
            currentColumn.fourthString = "";
            currentColumn.fifthString = "";
            currentColumn.sixthString = "";
            currentColumn.chordEffects = "r";
          }
        }
      });
      return;
    }
  }

  setTabData((draft) => {
    const subSection = draft[sectionIndex]?.data[subSectionIndex];
    if (subSection?.type === "tab") {
      const currentColumn = subSection.data[columnIndex];
      if (currentColumn && isTabNote(currentColumn)) {
        // if changing from rest to something else, clear out rest
        if (currentColumn.chordEffects === "r" && value !== "r") {
          currentColumn.chordEffects = "";
        }

        // noteIndex: 1-6 are strings, 7 is chordEffects
        if (noteIndex >= 1 && noteIndex <= 6) {
          setStringValue(currentColumn, noteIndex, value);
        } else if (noteIndex === 7) {
          currentColumn.chordEffects = value;
        }
      }
    }
  });
}
