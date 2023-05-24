import type { Dispatch, SetStateAction } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabMeasureLine from "./TabMeasureLine";
import TabNoteAndEffectCombo from "./TabNoteAndEffectCombo";
import { type LastModifiedPalmMuteNodeLocation } from "./TabSection";

export interface TabColumn {
  columnData: string[];
  sectionIndex: number;
  columnIndex: number;
  editingPalmMuteNodes: boolean;
  setEditingPalmMuteNodes: Dispatch<SetStateAction<boolean>>;
  lastModifiedPalmMuteNode: LastModifiedPalmMuteNodeLocation | null;
  setLastModifiedPalmMuteNode: Dispatch<
    SetStateAction<LastModifiedPalmMuteNodeLocation | null>
  >;
  reorderingColumns: boolean;
  showingDeleteColumnsButtons: boolean;
}

function TabColumn({
  columnData,
  sectionIndex,
  columnIndex,

  editingPalmMuteNodes,
  setEditingPalmMuteNodes,
  lastModifiedPalmMuteNode,
  setLastModifiedPalmMuteNode,
  reorderingColumns,
  showingDeleteColumnsButtons,
}: TabColumn) {
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
          reorderingColumns={reorderingColumns}
          showingDeleteColumnsButtons={showingDeleteColumnsButtons}
        />
      ) : (
        <TabNoteAndEffectCombo
          noteColumnData={columnData}
          effectColumnData={tabData[sectionIndex]?.data[columnIndex + 1]}
          sectionIndex={sectionIndex}
          noteColumnIndex={columnIndex}
          editingPalmMuteNodes={editingPalmMuteNodes}
          setEditingPalmMuteNodes={setEditingPalmMuteNodes}
          lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
          setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
          reorderingColumns={reorderingColumns}
          showingDeleteColumnsButtons={showingDeleteColumnsButtons}
        />
      )}
    </>
  );
}

export default TabColumn;
