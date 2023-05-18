import React, { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { FaTrashAlt } from "react-icons/fa";
import { Button } from "../ui/button";

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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RxDragHandleDots2 } from "react-icons/rx";
import { Select } from "../ui/select";
import { SelectTrigger } from "../ui/select";
import { SelectValue } from "../ui/select";
import { SelectContent } from "../ui/select";
import { SelectGroup } from "../ui/select";
import { SelectLabel } from "../ui/select";
import { SelectItem } from "../ui/select";
import { Input } from "../ui/input";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const modalVariants = {
  expanded: {
    width: "90vw",
    maxWidth: 600,
    height: "90vh",
    maxHeight: 600,
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const sectionVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0,
  },
};

function SectionProgressionModal() {
  // TODO: maybe create custom hook that will return boolean for aboveMediumViewportWidth
  const [aboveMediumViewportWidth, setAboveMediumViewportWidth] =
    useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setAboveMediumViewportWidth(true);
      } else {
        setAboveMediumViewportWidth(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    editing,
    tabData,
    sectionProgression,
    setSectionProgression,
    setShowSectionProgressionModal,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }),
    shallow
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionTitles = useMemo(() => {
    return tabData.map((section) => section.title);
  }, [tabData]);

  const sectionIds = useMemo(() => {
    return tabData.map((_, index) => `${index}`);
  }, [tabData]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over === null) return;

    let newSectionProgression = [...sectionProgression];

    if (
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      active.id !== over.id
    ) {
      const start = parseInt(active.id);
      const end = parseInt(over.id);

      (newSectionProgression = arrayMove(newSectionProgression, start, end)),
        setSectionProgression(newSectionProgression);
    }
  }

  function addNewSectionToProgression() {
    const newSectionProgression = [...sectionProgression];
    newSectionProgression.push(["", 1]);
    setSectionProgression(newSectionProgression);
  }

  function closeModal() {
    pruneAndSanitizeSectionProgression();
    setShowSectionProgressionModal(false);
  }

  function pruneAndSanitizeSectionProgression() {
    const newSectionProgression = [...sectionProgression];
    const prunedSectionProgression = [];

    for (const section of newSectionProgression) {
      if (section[0] !== "") {
        if (section[1] < 1) {
          section[1] = 1;
        }
        prunedSectionProgression.push(section);
      }
    }

    setSectionProgression(prunedSectionProgression);
  }

  return (
    <motion.div
      key={"sectionProgressionModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={closeModal}
    >
      <motion.div
        key={"innerSectionProgressionModal"}
        className="absolute rounded-md bg-pink-300 p-4 opacity-100 shadow-lg"
        variants={modalVariants}
        initial="closed"
        animate="expanded"
        exit="closed"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant={"secondary"}
          size={aboveMediumViewportWidth ? "default" : "sm"}
          className="absolute right-2 top-2"
          onClick={closeModal}
        >
          <IoClose className="h-5 w-5" />
        </Button>
        <div className="baseVertFlex gap-4">
          <div className="mb-4 text-xl font-semibold text-pink-800 ">
            Section progression
          </div>

          <div className="baseVertFlex max-h-[90vh] w-full !flex-nowrap !justify-start gap-4 overflow-y-auto pb-8 pr-4 md:max-h-[500px] md:w-3/4">
            {/* maybe need a drag overlay for this to work properly */}
            <DndContext
              sensors={sensors}
              modifiers={[restrictToFirstScrollableAncestor]}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionIds}
                strategy={verticalListSortingStrategy}
              >
                {sectionProgression.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <>
                      {sectionProgression.map((section, index) => (
                        <Section
                          key={index}
                          index={index}
                          title={section[0]}
                          repetitions={section[1]}
                          titles={sectionTitles}
                        />
                      ))}
                    </>
                  </AnimatePresence>
                ) : (
                  <Section
                    index={0}
                    title={sectionTitles[0] ?? "Section 1"}
                    repetitions={1}
                    titles={sectionTitles}
                  />
                )}
              </SortableContext>
            </DndContext>
            <Button
              className="rounded-full"
              onClick={addNewSectionToProgression}
            >
              +
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SectionProgressionModal;

interface Section {
  titles: string[];
  index: number;
  title: string;
  repetitions: number;
}

function Section({ titles, index, title, repetitions }: Section) {
  console.log(titles, index, title, repetitions);

  const {
    editing,
    tabData,
    sectionProgression,
    setSectionProgression,
    setShowSectionProgressionModal,
  } = useTabStore(
    (state) => ({
      editing: state.editing,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    }),
    shallow
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } =
    // hoping that columnIndex is fine here. if you can drag across sections we will need to modify.
    useSortable({ id: `${index}` });

  const style: CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;

    e.preventDefault();

    const newSectionProgression = [...sectionProgression];
    const prevValue = newSectionProgression[index]![1];

    // changes number to string for easier manipulation; removes the last digit
    let stringifiedPrevValue = prevValue.toString();
    if (stringifiedPrevValue === "-1") return;
    stringifiedPrevValue = stringifiedPrevValue.slice(0, -1);

    newSectionProgression[index]![1] =
      stringifiedPrevValue.length === 0 ? -1 : parseInt(stringifiedPrevValue);

    setSectionProgression(newSectionProgression);
  }

  function handleChange(value: string, type: "title" | "repetitions") {
    const sanitizedValue = parseInt(value);
    if (type === "repetitions") {
      if (
        sanitizedValue < 0 ||
        sanitizedValue > 99 ||
        Number.isNaN(sanitizedValue)
      )
        return;
    }

    const newSectionProgression = [...sectionProgression];
    if (type === "title") newSectionProgression[index]![0] = value;
    else newSectionProgression[index]![1] = sanitizedValue;
    setSectionProgression(newSectionProgression);
  }

  function deleteSection() {
    const newSectionProgression = [...sectionProgression];
    newSectionProgression.splice(index, 1);
    setSectionProgression(newSectionProgression);
  }

  return (
    <motion.div
      // I think this key is the culprit for the exit animation not playing properly
      key={`sectionProgression${title}${repetitions}${index}`}
      variants={sectionVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      className="baseFlex w-full gap-2"
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="hover:box-shadow-md cursor-grab rounded-md text-pink-50 active:cursor-grabbing"
      >
        <RxDragHandleDots2 className="h-8 w-6" />
      </div>

      <div
        ref={setNodeRef}
        style={style}
        className="baseFlex w-3/4 gap-4 rounded-md bg-pink-500 p-4 md:w-11/12 "
      >
        <Select
          value={title === "" ? undefined : title}
          onValueChange={(value) => handleChange(value, "title")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a section" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sections</SelectLabel>

              {titles.map((title, index) => {
                return (
                  <SelectItem key={`${title}${index}`} value={title}>
                    {title}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="baseFlex gap-2">
          x
          <Input
            className="max-w-[3rem]"
            type="text"
            autoComplete="off"
            placeholder="1"
            value={repetitions === -1 ? "" : repetitions}
            onKeyDown={handleKeyDown}
            onChange={(e) => handleChange(e.target.value, "repetitions")}
          />
        </div>

        <Button
          variant={"destructive"}
          size={"sm"}
          onClick={deleteSection}
          disabled={sectionProgression.length === 1}
        >
          <FaTrashAlt className="h-5 w-5 text-pink-50" />
        </Button>
      </div>
    </motion.div>
  );
}
