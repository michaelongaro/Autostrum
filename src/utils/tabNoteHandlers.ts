// ~/utils/tabNoteHandlers.ts
import type { Section } from "~/stores/TabStore";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";

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
  tabData: Section[];
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
    tabData,
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

    const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];

    if (currentSubSection?.type === "tab") {
      const currentColumnData = currentSubSection.data[columnIndex];

      if (currentColumnData) {
        const newColumnPalmMuteValue =
          (currentColumnData[0] === "start" && after) ||
          (currentColumnData[0] === "end" && !after) ||
          currentColumnData[0] === "-"
            ? "-"
            : "";

        const newColumnData = [
          newColumnPalmMuteValue,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "1/4th",
          crypto.randomUUID(),
        ];

        const insertionIndex = after ? columnIndex + 1 : columnIndex;

        setTabData((draft) => {
          const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
          if (currentSubSection?.type === "tab") {
            currentSubSection.data.splice(insertionIndex, 0, newColumnData);
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
    }

    return;
  }

  // Change note length hotkeys
  if (["j", "k", "l"].includes(e.key.toLowerCase())) {
    e.preventDefault();

    let noteLength: "1/4th" | "1/8th" | "1/16th" = "1/4th";

    if (e.key.toLowerCase() === "k") noteLength = "1/8th";
    if (e.key.toLowerCase() === "l") noteLength = "1/16th";

    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
      if (currentSubSection?.type === "tab") {
        const columnData = currentSubSection.data[columnIndex];
        if (columnData) {
          columnData[8] = noteLength;
        }
      }
    });

    return;
  }

  // Clear current chord
  if (e.ctrlKey && !e.shiftKey && e.key === "Backspace") {
    e.preventDefault();

    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
      if (currentSubSection?.type === "tab") {
        const column = currentSubSection.data[columnIndex];

        // Only clear if not a measure line
        if (column && column[8] !== "measureLine") {
          // Keep palm mute, note length, id, but clear notes and effects
          const palmMuteNode = column[0];
          const noteLengthModifier = column[8];
          const id = column[9];

          currentSubSection.data[columnIndex] = [
            palmMuteNode ?? "",
            "",
            "",
            "",
            "",
            "",
            "",
            "", // notes
            noteLengthModifier ?? "1/4th",
            id ?? crypto.randomUUID(),
          ];
        }
      }
    });
    return;
  }

  // delete current chord
  if (e.ctrlKey && e.shiftKey && e.key === "Backspace") {
    e.preventDefault();

    const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];

    if (currentSubSection?.type === "tab") {
      // Only delete if not a measure line and not the last column
      if (
        currentSubSection.data[columnIndex]?.[8] !== "measureLine" &&
        currentSubSection.data.length > 1
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
            columnIndex < currentSubSection.data.length - 1
              ? columnIndex
              : columnIndex - 1;
          const newNoteToFocus = document.getElementById(
            `input-${sectionIndex}-${subSectionIndex}-${nextIndex}-${noteIndex}`,
          );
          focusAndScrollIntoView(currentNote, newNoteToFocus);
        }, 0);
      }
    }
    return;
  }

  // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
  if (e.key === "ArrowDown") {
    e.preventDefault(); // prevent cursor from moving

    const newNoteToFocus = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${
        noteIndex + 1
      }`,
    );

    focusAndScrollIntoView(currentNote, newNoteToFocus);
    return;
  } else if (e.key === "ArrowUp") {
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

    const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];

    if (currentSubSection?.type === "tab") {
      const adjColumnIndex =
        currentSubSection.data[columnIndex - 1]?.[noteIndex] === "|"
          ? columnIndex - 2
          : columnIndex - 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
    }
    return;
  } else if (e.key === "ArrowRight") {
    e.preventDefault(); // prevent cursor from moving

    const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];

    if (currentSubSection?.type === "tab") {
      if (columnIndex === currentSubSection.data.length - 1) {
        const newNoteToFocus = document.getElementById(
          `${sectionIndex}${subSectionIndex}ExtendTabButton`,
        );

        focusAndScrollIntoView(currentNote, newNoteToFocus);
        return;
      }

      const adjColumnIndex =
        currentSubSection.data[columnIndex + 1]?.[noteIndex] === "|"
          ? columnIndex + 2
          : columnIndex + 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`,
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
    }
    return;
  }

  if (
    (e.ctrlKey && e.key === "c") || // Control + C for Windows/Linux
    (e.metaKey && e.key === "c") // Command + C for macOS
  ) {
    e.preventDefault();

    const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];
    if (currentSubSection?.type === "tab") {
      const copiedChord = currentSubSection.data[columnIndex]?.slice(1, 9);

      setChordPulse({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: columnIndex,
        },
        type: "copy",
      });
      setCurrentlyCopiedChord(copiedChord as string[]);
    }
  } else if (
    currentlyCopiedChord &&
    ((e.ctrlKey && e.key === "v") || // Control + V for Windows/Linux
      (e.metaKey && e.key === "v")) // Command + V for macOS
  ) {
    e.preventDefault();

    setTabData((draft) => {
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
      if (currentSubSection?.type === "tab") {
        const currentColumn = currentSubSection.data[columnIndex];
        if (currentColumn) {
          const palmMuteNode = currentColumn[0];
          const id = currentColumn[9];

          currentSubSection.data[columnIndex] = [
            palmMuteNode ?? "",
            ...currentlyCopiedChord,
            id ?? crypto.randomUUID(),
          ];
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
      const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
      if (currentSubSection?.type === "tab") {
        const currentColumn = currentSubSection.data[columnIndex];
        if (currentColumn) {
          if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "v") {
            currentColumn[noteIndex] = "v";
          } else if (e.key.toLowerCase() === "u" || e.key === "^") {
            currentColumn[noteIndex] = "^";
          } else if (e.key.toLowerCase() === "s") {
            currentColumn[noteIndex] = "s";
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
    tabData: Section[];
    setTabData: (updater: (draft: Section[]) => void) => void;
  },
) {
  const {
    noteIndex,
    sectionIndex,
    subSectionIndex,
    columnIndex,
    tabData,
    setTabData,
  } = params;

  let value = e.target.value;

  // regular notes
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
        const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
        if (currentSubSection?.type === "tab") {
          const currentColumn = currentSubSection.data[columnIndex];
          if (currentColumn) {
            const palmMuteNode = currentColumn[0];
            const chordEffects = currentColumn[7];
            const noteLengthModifier = currentColumn[8];
            const id = currentColumn[9];

            currentSubSection.data[columnIndex] = [
              palmMuteNode ?? "",
              ...chordArray.toReversed(),
              chordEffects ?? "",
              noteLengthModifier ?? "1/4th",
              id ?? crypto.randomUUID(),
            ];
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
      const currentSubSection = tabData[sectionIndex]?.data[subSectionIndex];

      if (currentSubSection?.type === "tab") {
        if (
          columnIndex === 0 ||
          columnIndex === currentSubSection.data.length - 1 ||
          currentSubSection.data[columnIndex - 1]?.[8] === "measureLine" ||
          currentSubSection.data[columnIndex + 1]?.[8] === "measureLine"
        ) {
          return;
        }

        setTabData((draft) => {
          const draftSubSection = draft[sectionIndex]?.data[subSectionIndex];
          if (draftSubSection?.type === "tab") {
            const currentColumn = draftSubSection.data[columnIndex];
            if (currentColumn) {
              const palmMuteNode = currentColumn[0];
              const id = currentColumn[9];

              // this technically is fine, but I don't want to implement it now, also might have
              // weird ui side effects by having more space on either side of the measure line than
              // originally planned for
              if (palmMuteNode === "start" || palmMuteNode === "end") return;

              draftSubSection.data[columnIndex] = [
                palmMuteNode ?? "",
                "|",
                "|",
                "|",
                "|",
                "|",
                "|",
                "",
                "measureLine",
                id ?? crypto.randomUUID(),
              ];
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
  }

  // chord effects
  else {
    const combinedEffects = /^[v^s]{1}(>|\.|>\.|\.>)?$/;
    const justAccentedAndStaccato = /^(>|\.|>\.|\.>)$/;
    if (
      value !== "" &&
      !combinedEffects.test(value) &&
      !justAccentedAndStaccato.test(value)
    )
      return;
  }

  setTabData((draft) => {
    const currentSubSection = draft[sectionIndex]?.data[subSectionIndex];
    if (currentSubSection?.type === "tab") {
      const currentColumn = currentSubSection.data[columnIndex];
      if (currentColumn) {
        currentColumn[noteIndex] = value;
      }
    }
  });
}
