import React, { useState, useEffect, useMemo, type CSSProperties } from "react";
import { type SectionProgression, useTabStore } from "~/stores/TabStore";
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
import { v4 as uuid } from "uuid";

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

function reassignIndicies(array: SectionProgression[]) {
  return array.map((item, index) => {
    return { ...item, index };
  });
}

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
    return sectionProgression.map((section) => section.id);
  }, [sectionProgression]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over === null) return;

    let newSectionProgression = [...sectionProgression];

    if (
      typeof active.id === "string" &&
      typeof over.id === "string" &&
      active.id !== over.id
    ) {
      const startIndex = newSectionProgression.findIndex(
        (section) => section.id === active.id
      );
      const endIndex = newSectionProgression.findIndex(
        (section) => section.id === over.id
      );

      // need to adjust all affected index values as well

      console.log(startIndex, endIndex);

      newSectionProgression = arrayMove(
        newSectionProgression,
        startIndex,
        endIndex
      );

      console.log(newSectionProgression);
      newSectionProgression = reassignIndicies(newSectionProgression);
      console.log(newSectionProgression);

      setSectionProgression(newSectionProgression);
    }
  }

  function addNewSectionToProgression() {
    const newSectionProgression = [...sectionProgression];
    newSectionProgression.push({
      id: uuid(),
      title: "",
      repetitions: 1,
      index: newSectionProgression.length,
    });
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
      if (section.title !== "") {
        section.repetitions = section.repetitions < 0 ? 1 : section.repetitions;

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

          <div className="baseVertFlex max-h-[90vh] w-full !flex-nowrap !justify-start gap-4 overflow-y-auto overflow-x-hidden p-4 md:max-h-[500px] md:w-3/4">
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
                      {sectionProgression.map((section) => (
                        <Section
                          key={section.id}
                          id={section.id}
                          index={section.index}
                          title={section.title}
                          repetitions={section.repetitions}
                          titles={sectionTitles}
                        />
                      ))}
                    </>
                  </AnimatePresence>
                ) : (
                  <Button onClick={addNewSectionToProgression}>
                    Add first section
                  </Button>
                )}
              </SortableContext>
            </DndContext>
            {sectionProgression.length > 0 && (
              <Button
                className="rounded-full p-4"
                onClick={addNewSectionToProgression}
              >
                +
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SectionProgressionModal;

const initialStyles = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
};

interface Section {
  id: string;
  titles: string[];
  index: number;
  title: string;
  repetitions: number;
}

function Section({ id, title, repetitions, index, titles }: Section) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);

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
  } = useSortable({ id, transition: null });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Backspace") return;

    e.preventDefault();

    const newSectionProgression = [...sectionProgression];
    const prevValue = newSectionProgression[index]!.repetitions;

    // changes number to string for easier manipulation; removes the last digit
    let stringifiedPrevValue = prevValue.toString();
    if (stringifiedPrevValue === "-1") return;
    stringifiedPrevValue = stringifiedPrevValue.slice(0, -1);

    newSectionProgression[index]!.repetitions =
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
    if (type === "title") newSectionProgression[index]!.title = value;
    else newSectionProgression[index]!.repetitions = sanitizedValue;
    setSectionProgression(newSectionProgression);
  }

  function deleteSection() {
    let newSectionProgression = [...sectionProgression];
    newSectionProgression.splice(index, 1);
    newSectionProgression = reassignIndicies(newSectionProgression);
    setSectionProgression(newSectionProgression);
  }

  return (
    <motion.div
      key={`sectionProgression${id}`}
      ref={setNodeRef}
      layoutId={id}
      style={initialStyles}
      initial="closed"
      animate={
        transform
          ? {
              x: transform.x,
              y: transform.y,
              opacity: 1,
              scale: isDragging ? 1.05 : 1,
              zIndex: isDragging ? 1 : 0,
              boxShadow: isDragging
                ? "0 0 0 1px rgba(63, 63, 68, 0.05), 0px 15px 15px 0 rgba(34, 33, 81, 0.25)"
                : undefined,
            }
          : initialStyles
      }
      exit="closed"
      transition={{
        duration: !isDragging ? 0.25 : 0,
        easings: {
          type: "spring",
        },
        x: {
          duration: !isDragging ? 0.3 : 0,
        },
        y: {
          duration: !isDragging ? 0.3 : 0,
        },
        scale: {
          duration: 0.25,
        },
        zIndex: {
          delay: isDragging ? 0 : 0.25,
        },
      }}
      variants={sectionVariants}
      className="baseFlex relative w-fit gap-2"
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute left-2 cursor-grab rounded-md text-pink-50 active:cursor-grabbing md:-left-8"
        onMouseEnter={() => setHoveringOnHandle(true)}
        onMouseDown={() => setGrabbingHandle(true)}
        onMouseLeave={() => setHoveringOnHandle(false)}
        onMouseUp={() => setGrabbingHandle(false)}
      >
        <RxDragHandleDots2 className="h-8 w-6" />
        <div
          style={{
            opacity: hoveringOnHandle ? (grabbingHandle ? 0.5 : 1) : 0,
          }}
          className="absolute bottom-0 left-1/2 right-1/2 h-8 -translate-x-1/2 rounded-md bg-pink-200/30 p-4 transition-all"
        ></div>
      </div>
      <div className="baseFlex w-full gap-4 rounded-md bg-pink-500 p-4 md:w-fit ">
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

        <Button variant={"destructive"} size={"sm"} onClick={deleteSection}>
          <FaTrashAlt className="h-5 w-5 text-pink-50" />
        </Button>
      </div>
    </motion.div>
  );
}
