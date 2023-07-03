import { useState } from "react";
import { Input } from "../ui/input";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface TabNote {
  note: string;
  sectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

function TabNote({ note, sectionIndex, columnIndex, noteIndex }: TabNote) {
  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  const [isFocused, setIsFocused] = useState(false);

  function validNoteInput(input: string) {
    // If input is '|' or 'x', it's valid
    if (input === "|" || input === "x") {
      return true;
    }

    // Regex pattern to match a fret number between 0 and 22
    const numberPattern = /^(?:[0-9]|1[0-9]|2[0-2])$/;

    // Regex pattern to match any *one* effect of:
    // "h", "p", "/", "\", "~", ">", ".", "s", "b", "x"
    const characterPattern = /^[hp\/\\\\~>.sb]$/;

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
    if (e.key !== "Backspace" && e.key !== "ArrowDown" && e.key !== "ArrowUp")
      return;

    e.preventDefault();

    if (e.key === "Backspace") {
      const newTabData = [...tabData];
      const prevValue = newTabData[sectionIndex]!.data[columnIndex]![noteIndex];
      if (prevValue === "" || prevValue === undefined) return;

      newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = prevValue.slice(
        0,
        -1
      );

      setTabData(newTabData);
    } else if (e.key === "ArrowDown" && noteIndex === 7) {
      const newTabData = [...tabData];
      newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = "v";

      setTabData(newTabData);
    } else if (e.key === "ArrowUp" && noteIndex === 7) {
      const newTabData = [...tabData];
      newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = "^";

      setTabData(newTabData);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toLowerCase();

    console.log(value);

    // regular notes
    if (noteIndex !== 7) {
      // wanted to always allow a-g in regular note even if there was a number
      // present for easy placement of major chords
      let valueHasAMajorChordLetter = false;
      let majorChordLetter = "";
      for (let i = 0; i < value.length; i++) {
        if ("abcdefg".includes(value.charAt(i))) {
          valueHasAMajorChordLetter = true;
          majorChordLetter = value.charAt(i);
          break;
        }
      }
      if (valueHasAMajorChordLetter) {
        let ableToOverwrite = true;

        let chordArray: string[] = [];
        if (majorChordLetter === "a") {
          chordArray = ["", "0", "2", "2", "2", "0"];
        }
        // conflict between major chord "b" and bend effect "b", compromise being
        // that the this shortcut only works when input is otherwise empty
        else if (majorChordLetter === "b" && value === "b") {
          chordArray = ["", "2", "4", "4", "4", "2"];
        } else if (majorChordLetter === "c") {
          chordArray = ["", "3", "2", "0", "1", "0"];
        } else if (majorChordLetter === "d") {
          chordArray = ["", "", "0", "2", "3", "2"];
        } else if (majorChordLetter === "e") {
          chordArray = ["0", "2", "2", "1", "0", "0"];
        } else if (majorChordLetter === "f") {
          chordArray = ["1", "3", "3", "2", "1", "1"];
        } else if (majorChordLetter === "g") {
          chordArray = ["3", "2", "0", "0", "0", "3"];
        } else {
          ableToOverwrite = false;
        }

        if (ableToOverwrite) {
          const newTabData = [...tabData];
          const palmMuteNode = newTabData[sectionIndex]!.data[columnIndex]![0];
          const chordEffects = newTabData[sectionIndex]!.data[columnIndex]![7];

          newTabData[sectionIndex]!.data[columnIndex] = [
            palmMuteNode ?? "",
            ...chordArray.reverse(),
            chordEffects ?? "",
            "note",
          ];

          setTabData(newTabData);
          return;
        }
      }

      if (value !== "" && !validNoteInput(value)) return;

      if (value === "|") {
        if (
          columnIndex === 0 ||
          columnIndex === tabData[sectionIndex]!.data.length - 2 ||
          tabData[sectionIndex]!.data[columnIndex - 1]?.[8] === "measureLine" ||
          tabData[sectionIndex]!.data[columnIndex + 1]?.[8] === "measureLine"
        ) {
          return;
        }

        const newTabData = [...tabData];
        const palmMuteNode = newTabData[sectionIndex]!.data[columnIndex]![0];

        newTabData[sectionIndex]!.data[columnIndex] = [
          palmMuteNode ?? "",
          "|",
          "|",
          "|",
          "|",
          "|",
          "|",
          "",
          "measureLine",
        ];

        setTabData(newTabData);
        return;
      }
    }

    // chord effects
    else {
      if (value !== "" && value !== "v" && value !== "^") return;
    }

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = value;

    setTabData(newTabData);
  }

  return (
    <>
      {editing ? (
        <Input
          style={{
            width: `${noteIndex !== 7 ? "2.35rem" : "1.75rem"}`,
            height: `${noteIndex !== 7 ? "2.35rem" : "1.75rem"}`,
            borderWidth: `${note.length > 0 && !isFocused ? "2px" : "1px"}`,
          }}
          className={`rounded-full p-0 text-center 
          ${note.length > 0 ? "shadow-md" : "shadow-sm"}
          `}
          onFocus={() => {
            setIsFocused(true);
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

export default TabNote;
