import { useMemo } from "react";
import { type ITabSection } from "./Tab";
import { Input } from "../ui/input";

interface TabNote {
  note: string;
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  columnIndex: number;
  noteIndex: number;
  editing: boolean;
}

function TabNote({
  note,
  setTabData,
  sectionIndex,
  columnIndex,
  noteIndex,
  editing,
}: TabNote) {
  // need handling for all cases obv

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;

    e.preventDefault();

    setTabData((prevTabData) => {
      const newTabData = [...prevTabData];
      const prevValue = newTabData[sectionIndex]!.data[columnIndex]![noteIndex];
      if (prevValue === "" || prevValue === undefined) return newTabData;

      newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = prevValue.slice(
        0,
        -1
      );
      return newTabData;
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // maybe better to have all of the logic within setter below so that we can access
    // the previous value and do some logic on it

    const inputChar = e.target.value.slice(-1);
    let value = e.target.value;

    // regular notes
    if (columnIndex % 2 === 0 && noteIndex !== 7) {
      const isNumber = /^\d+$/.test(value); // Check if the value is a number
      if (
        value !== "" &&
        !(isNumber && parseInt(value) >= 0 && parseInt(value) <= 22)
      )
        return;
    }

    // below the line effects
    else if (columnIndex % 2 === 0 && noteIndex === 7) {
      const allowedChars = [".", "^", "v", ">", "s"];

      if (!allowedChars.includes(inputChar)) return;

      if (
        (value.includes("^") && inputChar === "v") ||
        (value.includes("v") && inputChar === "^")
      )
        return;

      // can have multiple, but no repeats
      value = Array.from(new Set(value.split(""))).join("");
    }

    // inline effects
    else if (columnIndex % 2 === 1 && noteIndex !== 7) {
      const allowedChars = ["x", "h", "p", "/", "\\", "~"];
      if (!allowedChars.includes(inputChar)) return;

      // only allow one at a time
      value = Array.from(new Set(value.split("")))
        .join("")
        .slice(0, 1);
    }

    setTabData((prevTabData) => {
      const newTabData = [...prevTabData];
      // const prevValue = newTabData[sectionIndex]!.data[columnIndex]![noteIndex];

      newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = value;
      return newTabData;
    });
  }

  // seems kind of hacky, but it al
  const margin = useMemo(() => {
    if (columnIndex % 2 === 0) {
      return "0";
    } else {
      if (noteIndex === 1) {
        return "0.81rem 0";
      }

      return "0.75rem 0";
    }
  }, [columnIndex, noteIndex]);

  return (
    <Input
      id="note"
      style={{
        height: `${columnIndex % 2 === 0 ? "2.35rem" : "1.4rem"}`,
        width: `${
          columnIndex % 2 === 0
            ? noteIndex === 7
              ? "3.35rem"
              : "2.35rem"
            : "1.4rem"
        }`,
        fontSize: `${columnIndex % 2 === 0 ? "1rem" : "0.875rem"}`,
        lineHeight: `${columnIndex % 2 === 0 ? "1.5rem" : "1.25rem"}`,
        padding: `${columnIndex % 2 === 0 ? "0.5rem" : "0"}`,
        // borderWidth: `${
        //   columnIndex % 2 === 0 && (noteIndex < 0 || noteIndex > 7)
        //     ? "2px"
        //     : "1px"
        // }`,
        margin: margin,
      }}
      className="rounded-full p-2 text-center"
      type="text"
      autoComplete="off"
      value={note}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
    />
  );
}

export default TabNote;
