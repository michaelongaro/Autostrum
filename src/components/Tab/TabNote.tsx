import React from "react";
import { type ITabSection } from "./Tab";
import { Input } from "../ui/input";

interface TabNote {
  note: string;
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
  columnIndex: number;
  noteIndex: number;
}

function TabNote({
  note,
  setTabData,
  sectionIndex,
  columnIndex,
  noteIndex,
}: TabNote) {
  // need handling for all cases obv

  return (
    <Input
      id="note"
      className="h-8 w-8 rounded-full p-2 text-center"
      type="text"
      value={note === "-1" ? "" : note}
      onChange={(e) => {
        // sanitization here

        setTabData((prevTabData) => {
          const newTabData = [...prevTabData];
          newTabData[sectionIndex]!.data[columnIndex]![noteIndex] =
            e.target.value;
          return newTabData;
        });
      }}
    />
  );
}

export default TabNote;
