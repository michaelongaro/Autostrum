import { useState, useEffect, useMemo } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabColumn from "./TabColumn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { motion } from "framer-motion";
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
import { parse, toString } from "~/utils/tunings";
import { Separator } from "../ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

export interface LastModifiedPalmMuteNodeLocation {
  columnIndex: number;
  prevValue: string;
  currentValue: string;
}

interface TabSection {
  sectionData: {
    title: string;
    data: string[][];
  };
  sectionIndex: number;
}

function TabSection({ sectionData, sectionIndex }: TabSection) {
  const [sectionTitle, setSectionTitle] = useState(sectionData.title);

  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);
  const [reorderingColumns, setReorderingColumns] = useState(false);
  const [showingDeleteColumnsButtons, setShowingDeleteColumnsButtons] =
    useState(false);

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

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

  const { tuning, modifyPalmMuteDashes, tabData, setTabData, editing } =
    useTabStore(
      (state) => ({
        tuning: state.tuning,
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

  function toggleEditingPalmMuteNodes() {
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

      const rawEndValue = parseInt(over.id);

      // the end value is the noteIndex of the combo, so when moving to the right you need
      // to add two to get the correct index

      // below: trying to only add 1 if dropping on a combo, not a measure line
      const end =
        rawEndValue > start &&
        prevSectionData?.data[rawEndValue]?.[8] === "note"
          ? rawEndValue + 1
          : rawEndValue;

      // doesn't make sense to have a measureLine at the start or end of a section
      if (
        prevSectionData?.data[start]?.[8] === "measureLine" &&
        (end === 0 || end === prevSectionData.data.length - 1)
      )
        return;

      const endPalmMuteValue = prevSectionData?.data[end]?.[0];

      prevSectionData = {
        ...prevSectionData,
        data: arrayMove(prevSectionData.data, start, end),
      };

      // have to move the effect column as well if it's a note and the direction is left -> right
      if (prevSectionData.data[end]![8] === "note") {
        prevSectionData = {
          ...prevSectionData,
          data: arrayMove(
            prevSectionData.data,
            rawEndValue < start ? start + 1 : start,
            rawEndValue < start ? rawEndValue + 1 : end
          ),
        };
      }

      // looks like moving at least l -> r past a measure line gets

      prevSectionData.data[end]![0] = endPalmMuteValue ?? "";

      // making sure there are no occurances of two measure lines right next to each other
      for (let i = 0; i < prevSectionData.data.length - 2; i++) {
        if (
          prevSectionData.data[i]?.[8] === "measureLine" &&
          prevSectionData.data[i + 1]?.[8] === "measureLine"
        ) {
          return;
        }
      }

      prevTabData[sectionIndex] = prevSectionData;

      setTabData(prevTabData);
    }
  }

  return (
    <motion.div
      key={`tabSection${sectionIndex}`}
      // layoutId={`tabSection${sectionIndex}`}
      layout
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: aboveMediumViewportWidth
          ? "2rem"
          : editing
          ? "1rem 0.5rem 1rem 0.5rem"
          : "1rem",
      }}
      className="baseVertFlex relative h-full w-full !justify-start"
    >
      <div className="baseFlex w-full !items-start !justify-between">
        <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
          {editing ? (
            <Input
              value={sectionTitle}
              placeholder="Section title"
              onChange={updateSectionTitle}
              className="max-w-[12rem] text-lg font-semibold"
            />
          ) : (
            <p className="text-lg font-semibold">{sectionTitle}</p>
          )}

          {editing && (
            <div className="baseVertFlex !items-start gap-2 lg:!flex-row">
              <div className="baseFlex">
                <Button
                  disabled={editingPalmMuteNodes}
                  style={{
                    borderRadius: editingPalmMuteNodes
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  // should you just manually add these styles to the button component?
                  // not sure of good usecases for having anything but small sized buttons at these viewports..
                  className="h-9 px-3 md:h-10 md:px-4 md:py-2"
                  onClick={toggleEditingPalmMuteNodes}
                >
                  Edit palm mute sections
                </Button>

                {editingPalmMuteNodes && (
                  <Button
                    className="h-9 rounded-l-none rounded-r-md px-3 md:h-10 md:px-4 md:py-2 "
                    onClick={toggleEditingPalmMuteNodes}
                  >
                    x
                  </Button>
                )}
              </div>

              <div className="baseFlex">
                <Button
                  disabled={reorderingColumns}
                  style={{
                    borderRadius: reorderingColumns
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  className="h-9 px-3 md:h-10 md:px-4 md:py-2"
                  onClick={() => {
                    setReorderingColumns(!reorderingColumns);
                    setShowingDeleteColumnsButtons(false);
                  }}
                >
                  Reorder
                </Button>

                {reorderingColumns && (
                  <Button
                    className="h-9 rounded-l-none rounded-r-md px-3 md:h-10 md:px-4 md:py-2"
                    onClick={() => {
                      setReorderingColumns(!reorderingColumns);
                      setShowingDeleteColumnsButtons(false);
                    }}
                  >
                    x
                  </Button>
                )}
              </div>

              <div className="baseFlex">
                <Button
                  disabled={showingDeleteColumnsButtons}
                  style={{
                    borderRadius: showingDeleteColumnsButtons
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  className="h-9 px-3 md:h-10 md:px-4 md:py-2"
                  onClick={() => {
                    setShowingDeleteColumnsButtons(
                      !showingDeleteColumnsButtons
                    );
                    setReorderingColumns(false);
                  }}
                >
                  Delete columns
                </Button>

                {showingDeleteColumnsButtons && (
                  <Button
                    className="h-9 rounded-l-none rounded-r-md px-3 md:h-10 md:px-4 md:py-2"
                    onClick={() => {
                      setShowingDeleteColumnsButtons(
                        !showingDeleteColumnsButtons
                      );
                      setReorderingColumns(false);
                    }}
                  >
                    x
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {editing && (
          <div className="baseVertFlex w-1/6 !justify-end gap-2 2xl:flex-row">
            <Button
              variant={"secondary"}
              className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
              disabled={sectionIndex === 0}
              onClick={() => {
                let newTabData = [...tabData];

                newTabData = arrayMove(
                  newTabData,
                  sectionIndex,
                  sectionIndex - 1
                );

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

                newTabData = arrayMove(
                  newTabData,
                  sectionIndex,
                  sectionIndex + 1
                );

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
        )}
      </div>

      {/* try to use framer motion to animate sections sliding up/down to their new positions
        (this would mean both sections would need to slide for each click of "up"/"down" ) */}

      <div className="baseFlex w-full !justify-start">
        <div
          style={{
            height: editing ? "284px" : "168px",
            gap: editing ? "1.35rem" : "0.05rem",
          }}
          className="baseVertFlex relative rounded-l-2xl border-2 border-pink-50 p-2"
        >
          {toString(parse(tuning), { pad: 1 })
            .split(" ")
            .reverse()
            .map((note, index) => (
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
                editingPalmMuteNodes={editingPalmMuteNodes}
                setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
                reorderingColumns={reorderingColumns}
                showingDeleteColumnsButtons={showingDeleteColumnsButtons}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div
          style={{
            height: editing ? "284px" : "168px",
          }}
          className="rounded-r-2xl border-2 border-pink-50 p-1"
        ></div>
      </div>

      {editing && <Button onClick={addNewColumns}>Extend section</Button>}

      {(!editing && sectionIndex !== tabData.length - 1) ||
        (editing && <Separator />)}

      {editing && sectionIndex === tabData.length - 1 && (
        <Button className="mt-12" onClick={addNewSection}>
          Add new section
        </Button>
      )}
    </motion.div>
  );
}

export default TabSection;
