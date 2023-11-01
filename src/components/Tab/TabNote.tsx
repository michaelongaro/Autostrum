import { memo, useState } from "react";
import { shallow } from "zustand/shallow";
import { useTabStore } from "~/stores/TabStore";
import { Input } from "../ui/input";
import focusAndScrollIntoView from "~/utils/focusAndScrollIntoView";

interface TabNote {
  note: string;
  sectionIndex: number;
  subSectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

function TabNote({
  note,
  sectionIndex,
  subSectionIndex,
  columnIndex,
  noteIndex,
}: TabNote) {
  const {
    editing,
    getTabData,
    setTabData,
    currentlyCopiedChord,
    setCurrentlyCopiedChord,
    setChordPulse,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      currentlyCopiedChord: state.currentlyCopiedChord,
      setCurrentlyCopiedChord: state.setCurrentlyCopiedChord,
      setChordPulse: state.setChordPulse,
    }),
    shallow
  );

  const [isFocused, setIsFocused] = useState(false);

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

  // there's a chance you can make this spacing work, but as you know it comes with a lot of headaches..
  // function formatNoteAndEffect(value: string) {
  //   const characterPattern = /^[hp\/\\\\~]$/;

  //   if (value.includes("~")) {
  //     return <div>{note}</div>;
  //   } else if (value.length > 0 && characterPattern.test(value.at(-1)!)) {
  //     return (
  //       <div className="baseFlex gap-2">
  //         {note.substring(0, note.length - 1)}
  //         <div>{value.at(-1)}</div>
  //       </div>
  //     );
  //   }

  //   return <div>{note}</div>;
  // }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();

    const currentNote = document.getElementById(
      `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`
    );

    // tab arrow key navigation (limited to current section, so sectionIdx will stay constant)
    if (e.key === "ArrowDown") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${
          noteIndex + 1
        }`
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); // prevent cursor from moving

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${
          noteIndex - 1
        }`
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); // prevent cursor from moving

      const adjColumnIndex =
        getTabData()[sectionIndex]!.data[subSectionIndex]!.data[
          columnIndex - 1
        ]?.[noteIndex] === "|"
          ? columnIndex - 2
          : columnIndex - 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    } else if (e.key === "ArrowRight") {
      e.preventDefault(); // prevent cursor from moving

      if (
        columnIndex ===
        getTabData()[sectionIndex]!.data[subSectionIndex]!.data.length - 1
      ) {
        const newNoteToFocus = document.getElementById(
          `${sectionIndex}${subSectionIndex}ExtendTabButton`
        );

        focusAndScrollIntoView(currentNote, newNoteToFocus);
        return;
      }

      const adjColumnIndex =
        getTabData()[sectionIndex]!.data[subSectionIndex].data[
          columnIndex + 1
        ]?.[noteIndex] === "|"
          ? columnIndex + 2
          : columnIndex + 1;

      const newNoteToFocus = document.getElementById(
        `input-${sectionIndex}-${subSectionIndex}-${adjColumnIndex}-${noteIndex}`
      );

      focusAndScrollIntoView(currentNote, newNoteToFocus);
      return;
    }

    const newTabData = getTabData();

    if (
      (e.ctrlKey && e.key === "c") || // Control + C for Windows/Linux
      (e.metaKey && e.key === "c") // Command + C for macOS
    ) {
      e.preventDefault();

      const copiedChord = newTabData[sectionIndex]!.data[subSectionIndex].data[
        columnIndex
      ]!.slice(1, 8);

      setChordPulse({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: columnIndex,
        },
        type: "copy",
      });
      setCurrentlyCopiedChord(copiedChord as string[]);
    } else if (
      currentlyCopiedChord &&
      ((e.ctrlKey && e.key === "v") || // Control + V for Windows/Linux
        (e.metaKey && e.key === "v")) // Command + V for macOS
    ) {
      e.preventDefault();

      const palmMuteNode =
        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0];
      const id =
        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![9];

      newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex] = [
        palmMuteNode ?? "",
        ...currentlyCopiedChord,
        "note",
        id,
      ];

      setChordPulse({
        location: {
          sectionIndex,
          subSectionIndex,
          chordIndex: columnIndex,
        },
        type: "paste",
      });
      setTabData(newTabData);
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
      if (e.key.toLowerCase() === "d" || e.key.toLowerCase() === "v") {
        newTabData[sectionIndex]!.data[subSectionIndex]!.data[columnIndex]![
          noteIndex
        ] = "v";
      } else if (e.key.toLowerCase() === "u" || e.key === "^") {
        newTabData[sectionIndex]!.data[subSectionIndex]!.data[columnIndex]![
          noteIndex
        ] = "^";
      } else if (e.key.toLowerCase() === "s") {
        newTabData[sectionIndex]!.data[subSectionIndex]!.data[columnIndex]![
          noteIndex
        ] = "s";
      }

      setTabData(newTabData);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;

    // regular notes
    if (noteIndex !== 7) {
      // wanted to always allow a-g in regular note even if there was a number
      // present for easy placement of major chords
      let valueHasAChordLetter = false;
      let chordLetter = "";
      for (let i = 0; i < value.length; i++) {
        if ("abcdefgABCDEFG".includes(value.charAt(i))) {
          valueHasAChordLetter = true;
          chordLetter = value.charAt(i);
          break;
        }
      }
      if (valueHasAChordLetter) {
        let ableToOverwrite = true;

        let chordArray: string[] = [];

        if (chordLetter === "A") {
          chordArray = ["", "0", "2", "2", "2", "0"];
        } else if (chordLetter === "a") {
          chordArray = ["", "0", "2", "2", "1", "0"];
        } else if (chordLetter === "B" && value === "B") {
          chordArray = ["", "2", "4", "4", "4", "2"];
        } else if (chordLetter === "b" && value === "b") {
          chordArray = ["", "2", "4", "4", "3", "2"];
        } else if (chordLetter === "C") {
          chordArray = ["", "3", "2", "0", "1", "0"];
        } else if (chordLetter === "c") {
          chordArray = ["", "3", "5", "5", "4", "3"];
        } else if (chordLetter === "D") {
          chordArray = ["", "", "0", "2", "3", "2"];
        } else if (chordLetter === "d") {
          chordArray = ["", "", "0", "2", "3", "1"];
        } else if (chordLetter === "E") {
          chordArray = ["0", "2", "2", "1", "0", "0"];
        } else if (chordLetter === "e") {
          chordArray = ["0", "2", "2", "0", "0", "0"];
        } else if (chordLetter === "F") {
          chordArray = ["1", "3", "3", "2", "1", "1"];
        } else if (chordLetter === "f") {
          chordArray = ["1", "3", "3", "1", "1", "1"];
        } else if (chordLetter === "G") {
          chordArray = ["3", "2", "0", "0", "0", "3"];
        } else if (chordLetter === "g") {
          chordArray = ["3", "5", "5", "3", "3", "3"];
        } else {
          ableToOverwrite = false;
        }

        if (ableToOverwrite) {
          const newTabData = getTabData();
          const palmMuteNode =
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              columnIndex
            ]![0];
          const chordEffects =
            newTabData[sectionIndex]!.data[subSectionIndex]!.data[
              columnIndex
            ]![7];
          const id =
            newTabData[sectionIndex]!.data[subSectionIndex].data[
              columnIndex
            ]![9];

          newTabData[sectionIndex]!.data[subSectionIndex]!.data[columnIndex] = [
            palmMuteNode ?? "",
            ...chordArray.reverse(),
            chordEffects ?? "",
            "note",
            id,
          ];

          setTabData(newTabData);
          return;
        }
      }

      // need to do this after checking for chord letters so that
      // the chord letters can be capitalized for the chord shortcut
      value = value.toLowerCase();

      if (value !== "" && !validNoteInput(value)) return;

      if (value === "|") {
        if (
          columnIndex === 0 ||
          columnIndex ===
            getTabData()[sectionIndex]!.data[subSectionIndex]!.data.length -
              1 ||
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            columnIndex - 1
          ]?.[8] === "measureLine" ||
          getTabData()[sectionIndex]!.data[subSectionIndex].data[
            columnIndex + 1
          ]?.[8] === "measureLine"
        ) {
          return;
        }

        const newTabData = getTabData();
        const palmMuteNode =
          newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0];
        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![0];
        const id =
          newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![9];

        newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex] = [
          palmMuteNode ?? "",
          "|",
          "|",
          "|",
          "|",
          "|",
          "|",
          "",
          "measureLine",
          id,
        ];

        setTabData(newTabData);

        const newNoteToFocus = document.getElementById(
          `input-${sectionIndex}-${subSectionIndex}-${
            columnIndex + 1
          }-${noteIndex}`
        );

        newNoteToFocus?.focus();
        return;
      }
    }

    // chord effects
    else {
      const chordEffects = /^[v^s]{1}(>|\.|>\.|\.>)?$/;
      if (value !== "" && !chordEffects.test(value)) return;
    }

    const newTabData = getTabData();

    newTabData[sectionIndex]!.data[subSectionIndex].data[columnIndex]![
      noteIndex
    ] = value;

    setTabData(newTabData);
  }

  return (
    <>
      {editing ? (
        <Input
          id={`input-${sectionIndex}-${subSectionIndex}-${columnIndex}-${noteIndex}`}
          style={{
            width: noteIndex !== 7 ? "37px" : "30px",
            height: noteIndex !== 7 ? "37px" : "30px",
            borderWidth: note.length > 0 && !isFocused ? "2px" : "1px",
          }}
          className="rounded-full p-0 text-center shadow-sm shadow-pink-600"
          onFocus={(e) => {
            setIsFocused(true);

            // focuses end of the input (better ux when navigating with arrow keys)
            e.target.setSelectionRange(
              e.target.value.length,
              e.target.value.length
            );
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          type="text"
          autoComplete="off"
          value={note}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
        />
      ) : (
        <div className="baseFlex w-[35px]">
          <div className="my-3 h-[1px] flex-[1] bg-pink-50/50"></div>
          {/* {formatNoteAndEffect(note)} */}
          <div>{note}</div>
          <div className="my-3 h-[1px] flex-[1] bg-pink-50/50"></div>
        </div>
      )}
    </>
  );
}

export default memo(TabNote);
