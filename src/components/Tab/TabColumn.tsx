import TabMeasureLine from "./TabMeasureLine";
import TabNoteAndEffectCombo from "./TabNoteAndEffectCombo";

export interface TabColumn {
  id: number;
  columnData: string[];
  sectionIndex: number;
  columnIndex: number;
}

function TabColumn({ id, columnData, sectionIndex, columnIndex }: TabColumn) {
  return (
    <>
      {columnData.includes("|") ? (
        <TabMeasureLine
          id={id}
          columnData={columnData}
          sectionIndex={sectionIndex}
          columnIndex={columnIndex}
        />
      ) : (
        <TabNoteAndEffectCombo
          id={id}
          columnData={columnData}
          sectionIndex={sectionIndex}
          columnIndex={columnIndex}
        />
      )}
    </>
  );
}

export default TabColumn;
