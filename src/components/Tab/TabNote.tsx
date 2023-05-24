import { Input } from "../ui/input";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";

interface TabNote {
  note: string;
  inlineEffect: boolean;
  sectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

function TabNote({
  note,
  inlineEffect,
  sectionIndex,
  columnIndex,
  noteIndex,
}: TabNote) {
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
    if (prevValue === "" || prevValue === undefined) return;

    newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = prevValue.slice(
      0,
      -1
    );

    setTabData(newTabData);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // regular notes
    if (!inlineEffect && noteIndex !== 7) {
      // Check if the value is between 0 and 22, a "|", or an "x"
      const isValid = /^(?:(?:[0-1]?[0-9]|2[0-2])|[|x])$/g.test(value);
      if (value !== "" && !isValid) return;

      if (value === "|") {
        if (
          columnIndex === 0 ||
          columnIndex === tabData[sectionIndex]!.data.length - 2 ||
          tabData[sectionIndex]!.data[columnIndex - 1]?.[8] === "measureLine" ||
          tabData[sectionIndex]!.data[columnIndex + 1]?.[8] === "measureLine"
        ) {
          return;
        }

        console.log(columnIndex);

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
          "measureLine", // add more annotations [8]
        ];

        // deleting the inlineEffect column
        newTabData[sectionIndex]!.data.splice(columnIndex + 1, 1);

        setTabData(newTabData);
        return;
      }
    }

    // below the line effects
    else if (!inlineEffect && noteIndex === 7) {
      // Check if the value is contains at most one of each of the following characters: . ^ v > s
      // and that it doesn't contain both a ^ and a v
      let isValid = true;
      const validCharacters = [".", "^", "v", ">", "s"];

      value.split("").reduce((acc, curr) => {
        if (acc[curr]) {
          acc[curr]++;
          isValid = false;
        } else if (curr === "^" && value.includes("v")) {
          isValid = false;
        } else if (curr === "v" && value.includes("^")) {
          isValid = false;
        } else if (!acc[curr] && validCharacters.includes(curr)) {
          acc[curr] = 1;
        } else {
          isValid = false;
        }
        return acc;
      }, {} as { [key: string]: number });

      if (value !== "" && !isValid) return;
    }

    // inline effects
    else if (inlineEffect && noteIndex !== 7) {
      // Check if the value is one of the following characters: h p / \ ~
      const isValid = /^[hp\/\\\\~]$/.test(value);
      if (value !== "" && !isValid) return;
    }

    const newTabData = [...tabData];

    newTabData[sectionIndex]!.data[columnIndex]![noteIndex] = value;

    setTabData(newTabData);
  }

  return (
    <Input
      id="note"
      style={{
        height: `${!inlineEffect ? "2.35rem" : "1.35rem"}`,
        width: `${
          !inlineEffect ? (noteIndex === 7 ? "3rem" : "2.35rem") : "1.4rem"
        }`,
        fontSize: `${!inlineEffect ? "1rem" : "0.875rem"}`,
        lineHeight: `${!inlineEffect ? "1.5rem" : "1.25rem"}`,
        padding: `${!inlineEffect ? "0.5rem" : "0"}`,
        margin: !inlineEffect ? "0" : "0.5rem 0",
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
