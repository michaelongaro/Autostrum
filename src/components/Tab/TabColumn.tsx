import { memo, type Dispatch, type SetStateAction } from "react";
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

export default memo(TabColumn, (prevProps, nextProps) => {
  const { columnData: prevColumnData, ...restPrev } = prevProps;
  const { columnData: nextColumnData, ...restNext } = nextProps;

  // Custom comparison for tabData related prop
  if (
    JSON.parse(JSON.stringify(prevColumnData)) !==
    JSON.parse(JSON.stringify(nextColumnData))
  ) {
    return false; // props are not equal, so component should re-render
  }

  // Default shallow comparison for other props using Object.is()
  const allKeys = new Set([...Object.keys(restPrev), ...Object.keys(restNext)]);
  for (const key of allKeys) {
    // @ts-expect-error we know that these keys are in the objects
    if (!Object.is(restPrev[key], restNext[key])) {
      return false; // props are not equal, so component should re-render
    }
  }

  return true;
});
