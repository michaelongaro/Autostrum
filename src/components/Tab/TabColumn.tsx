import type { Dispatch, SetStateAction } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabMeasureLine from "./TabMeasureLine";
import TabNotesColumn from "./TabNotesColumn";
import { type LastModifiedPalmMuteNodeLocation } from "./TabSection";

export interface TabColumn {
  columnData: string[];
  sectionIndex: number;
  subSectionIndex: number;
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
  subSectionIndex,
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

  return (
    <>
      {columnData.includes("|") ? (
        <TabMeasureLine
          columnData={columnData}
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
          columnIndex={columnIndex}
          reorderingColumns={reorderingColumns}
          showingDeleteColumnsButtons={showingDeleteColumnsButtons}
        />
      ) : (
        <TabNotesColumn
          sectionIndex={sectionIndex}
          subSectionIndex={subSectionIndex}
          columnIndex={columnIndex}
          columnData={columnData}
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
