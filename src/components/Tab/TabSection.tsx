import React from "react";
import { type ITabSection } from "./Tab";
import TabColumn from "./TabColumn";

interface TabSection {
  tuning: string;
  sectionData: {
    title: string;
    data: string[][];
  };
  setTabData: React.Dispatch<React.SetStateAction<ITabSection[]>>;
  sectionIndex: number;
}

function TabSection({
  tuning,
  sectionData,
  setTabData,
  sectionIndex,
}: TabSection) {
  return (
    <div className="baseFlex h-full">
      <div className="baseVertFlex gap-4 rounded-l-2xl border-2 border-pink-50 p-2">
        {tuning.split("").map((note, index) => (
          <div key={index}>{note}</div>
        ))}
      </div>

      {sectionData.data.map((column, index) => (
        <TabColumn
          key={index}
          columnData={column}
          setTabData={setTabData}
          sectionIndex={sectionIndex}
          columnIndex={index}
        />
      ))}

      {/* any way to not have to hardcode this? */}
      <div className="baseVertFlex h-[244px] rounded-r-2xl border-2 border-pink-50 p-1"></div>
    </div>
  );
}

export default TabSection;
