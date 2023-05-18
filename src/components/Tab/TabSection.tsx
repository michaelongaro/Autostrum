import { useState, useEffect, useMemo } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabColumn from "./TabColumn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";

interface TabSection {
  sectionData: {
    title: string;
    data: string[][];
  };
  sectionIndex: number;
}

function TabSection({ sectionData, sectionIndex }: TabSection) {
  const [sectionTitle, setSectionTitle] = useState(sectionData.title);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = useMemo(() => {
    const newIds = [];

    for (const [index, columnData] of sectionData.data.entries()) {
      if (columnData[8] !== "inlineEffect") {
        newIds.push(`${index}`);
      }
    }

    return newIds;
  }, [sectionData]);

  useEffect(() => {
    if (sectionTitle !== sectionData.title) {
      setSectionTitle(sectionData.title);
    }
  }, [sectionData, sectionTitle]);

  const {
    tuning,
    editingPalmMuteNodes,
    setEditingPalmMuteNodes,
    lastModifiedPalmMuteNode,
    setLastModifiedPalmMuteNode,
    modifyPalmMuteDashes,
    tabData,
    setTabData,
    editing,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      editingPalmMuteNodes: state.editingPalmMuteNodes,
      setEditingPalmMuteNodes: state.setEditingPalmMuteNodes,
      lastModifiedPalmMuteNode: state.lastModifiedPalmMuteNode,
      setLastModifiedPalmMuteNode: state.setLastModifiedPalmMuteNode,
      modifyPalmMuteDashes: state.modifyPalmMuteDashes,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
    }),
    shallow
  );

  // should these functions below be in zustand?
  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setSectionTitle(e.target.value);
    // pretty sure this is still necessary because zustand state is immutable I think
    const newTabData = [...tabData];
    newTabData[sectionIndex]!.title = e.target.value;

    setTabData(newTabData);
  }

  function addNewColumns() {
    const newTabData = [...tabData];

    for (let i = 0; i < 8; i++) {
      newTabData[sectionIndex]!.data.push(
        Array.from({ length: 9 }, (_, index) => {
          if (index === 8) {
            return i % 2 === 0 ? "note" : "inlineEffect";
          } else {
            return "";
          }
        })
      );
    }

    setTabData(newTabData);
  }

  function generateNewColumns() {
    const baseArray = [];
    for (let i = 0; i < 8; i++) {
      baseArray.push(
        Array.from({ length: 9 }, (_, index) => {
          if (index === 8) {
            return i % 2 === 0 ? "note" : "inlineEffect";
          } else {
            return "";
          }
        })
      );
    }

    return baseArray;
  }

  function addNewSection() {
    const newTabData = [...tabData];
    newTabData.splice(sectionIndex + 1, 0, {
      title: `Section ${sectionIndex + 2}`,
      data: generateNewColumns(),
    });

    setTabData(newTabData);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over === null) return;

    const prevTabData = [...tabData];
    let prevSectionData = prevTabData[sectionIndex];

    if (
      prevSectionData !== undefined &&
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      active.id !== over.id
    ) {
      const start = parseInt(active.id);
      const end = parseInt(over.id);

      prevSectionData = {
        ...prevSectionData,
        data: arrayMove(
          prevSectionData.data,
          start,
          end > start ? end + 1 : end // needed to account for shifting indices when moving measure line from left to right
        ),
      };

      prevTabData[sectionIndex] = prevSectionData;

      setTabData(prevTabData);
    }
  }

  return (
    // grid for dark backdrop?
    <div className="baseVertFlex relative h-full w-full !justify-start gap-4 md:p-8">
      <div className="absolute left-4 top-4">
        <Input value={sectionTitle} onChange={updateSectionTitle} />
      </div>

      <div className="baseFlex absolute left-4 top-16 gap-2 md:left-auto md:right-4 md:top-4">
        {/* try to use framer motion to animate sections sliding up/down to their new positions
        (this would mean both sections would need to slide for each click of "up"/"down" ) */}
        <Button
          variant={"secondary"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
          disabled={sectionIndex === 0}
          onClick={() => {
            let newTabData = [...tabData];

            newTabData = arrayMove(newTabData, sectionIndex, sectionIndex - 1);

            setTabData(newTabData);
          }}
        >
          <BiUpArrowAlt className="h-5 w-5" />
        </Button>
        <Button
          variant={"secondary"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
          disabled={sectionIndex === tabData.length - 1}
          onClick={() => {
            let newTabData = [...tabData];

            newTabData = arrayMove(newTabData, sectionIndex, sectionIndex + 1);

            setTabData(newTabData);
          }}
        >
          <BiDownArrowAlt className="h-5 w-5" />
        </Button>
        <Button
          variant={"destructive"}
          className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
          disabled={tabData.length === 1} // maybe allow this later, but currently messes up ui
          onClick={() => {
            const newTabData = [...tabData];

            newTabData.splice(sectionIndex, 1);

            setTabData(newTabData);
          }}
        >
          <IoClose className="h-5 w-5" />
        </Button>
      </div>

      <div className="baseFlex mt-48 w-full !justify-start md:mt-24">
        <div className="baseVertFlex relative h-[284px] gap-[1.35rem] rounded-l-2xl border-2 border-pink-50 p-2">
          <div className="absolute left-0 top-[-7rem] w-[400px]">
            <Button
              onClick={() => {
                if (!editingPalmMuteNodes) {
                  setEditingPalmMuteNodes(true);
                  return;
                } else if (lastModifiedPalmMuteNode) {
                  // if prevValue was "" then can just do hardcoded solution as before
                  if (lastModifiedPalmMuteNode.prevValue === "") {
                    const newTabData = [...tabData];
                    newTabData[sectionIndex]!.data[
                      lastModifiedPalmMuteNode.columnIndex
                    ]![0] = "";
                    setTabData(newTabData);
                  } else {
                    modifyPalmMuteDashes(
                      tabData,
                      setTabData,
                      sectionIndex,
                      lastModifiedPalmMuteNode.columnIndex,
                      "tempRemoveLater",
                      lastModifiedPalmMuteNode.prevValue
                    );
                  }

                  setLastModifiedPalmMuteNode(null);
                }
                setEditingPalmMuteNodes(false);
              }}
            >
              {/* maybe switch to "Add new..." and then "Edit ..." */}
              {editingPalmMuteNodes ? "x" : "Add new palm mute section"}
            </Button>
          </div>

          {/* not sure format that is coming in but need to split better to show sharps and flats */}
          {tuning.split("").map((note, index) => (
            <div key={index}>{note}</div>
          ))}
        </div>

        {/* TODO: when dragging measure line, the first <TabNoteAndEffectCombo /> will
        be shrunk down to 1px width and moved out of the way. I _believe_ that this is due to 
        maybe the dnd thinking that the measure line is actually as wide as the other elems but
        I'm not too sure. 
        
        Also when moving across other measure lines it moves them up out of
        the way when really I just want things to move horizontally/jump to next line if need
        be... Maybe somehow try to increase width of section as a whole? seems like it is doing
        the best it can but just has no space to expand out to. */}
        <DndContext
          sensors={sensors}
          modifiers={[restrictToParentElement]}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {sectionData.data.map((column, index) => (
              <TabColumn
                key={index}
                columnData={column}
                sectionIndex={sectionIndex}
                columnIndex={index}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* any way to not have to hardcode this? */}
        <div className="baseVertFlex h-[284px] rounded-r-2xl border-2 border-pink-50 p-1"></div>

        <Button className="ml-4 rounded-full" onClick={addNewColumns}>
          +
        </Button>
      </div>

      {sectionIndex === tabData.length - 1 && (
        <Button className="mt-12" onClick={addNewSection}>
          Add new section
        </Button>
      )}
    </div>
  );
}

export default TabSection;
