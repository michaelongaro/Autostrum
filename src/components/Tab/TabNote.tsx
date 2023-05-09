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
  // need handling for all cases obv

  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;

    e.preventDefault();

    const newTabData = [...tabData];
    const prevValue = newTabData[sectionIndex]!.data[columnIndex]![noteIndex];
    if (prevValue === "" || prevValue === undefined) return newTabData;

    newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = prevValue.slice(
      0,
      -1
    );

    setTabData(newTabData);
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

    const newTabData = [...tabData];
    // const prevValue = newTabData[sectionIndex]!.data[columnIndex]![noteIndex];

    newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = value;

    setTabData(newTabData);
  }

  return (
    <Input
      id="note"
      style={{
        height: `${columnIndex % 2 === 0 ? "2.35rem" : "1.35rem"}`,
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
        margin: columnIndex % 2 === 0 ? "0" : "0.5rem 0",
      }}
      className=" rounded-full p-2 text-center"
      type="text"
      autoComplete="off"
      value={note}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
    />
  );
}

export default TabNote;
