import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabMeasureLine from "./TabMeasureLine";
import TabNoteAndEffectCombo from "./TabNoteAndEffectCombo";

export interface TabColumn {
  columnData: string[];
  sectionIndex: number;
  columnIndex: number;
}

function TabColumn({ columnData, sectionIndex, columnIndex }: TabColumn) {
  const { editing, tabData, setTabData } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  // Note + effect columns are combined below to allow easier sorting behavior while reordering
  if (tabData[sectionIndex]?.data[columnIndex]?.[8] === "inlineEffect")
    return null;

  return (
    <>
      {columnData.includes("|") ? (
        <TabMeasureLine
          columnData={columnData}
          sectionIndex={sectionIndex}
          columnIndex={columnIndex}
        />
      ) : (
        <TabNoteAndEffectCombo
          noteColumnData={columnData}
          effectColumnData={tabData[sectionIndex]?.data[columnIndex + 1]}
          sectionIndex={sectionIndex}
          noteColumnIndex={columnIndex}
        />
      )}
    </>
  );
}

export default TabColumn;
