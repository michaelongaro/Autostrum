import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { BsPlus } from "react-icons/bs";
import { v4 as uuid } from "uuid";
import { shallow } from "zustand/shallow";
import { useTabStore, type SectionProgression } from "~/stores/TabStore";
import { Button } from "../ui/button";

import { useSortable } from "@dnd-kit/sortable";
import isEqual from "lodash.isequal";
import { RxDragHandleDots2 } from "react-icons/rx";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const backdropVariants = {
  expanded: {
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
  const [localSectionProgression, setLocalSectionProgression] = useState<
    SectionProgression[]
  >([]);

  const scrollableSectionsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setLocalSectionProgression(structuredClone(sectionProgression));
  }, [sectionProgression]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sections = useMemo(() => {
    return tabData.map((section) => ({ id: section.id, title: section.title }));
  }, [tabData]);

  const sectionProgressionIds = useMemo(() => {
    return localSectionProgression.map((section) => section.id);
  }, [localSectionProgression]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over === null) return;

    let newSectionProgression = [...localSectionProgression];

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

      newSectionProgression = arrayMove(
        newSectionProgression,
        startIndex,
        endIndex
      );

      setLocalSectionProgression(newSectionProgression);
    }
  }

  function addNewSectionToProgression() {
    const newSectionProgression = [...localSectionProgression];
    newSectionProgression.push({
      id: uuid(),
      sectionId: "",
      title: "",
      repetitions: 1,
    });
    setLocalSectionProgression(newSectionProgression);

    // making sure the new section is rendered before scrolling to
    // the bottom of the sections list
    setTimeout(() => {
      if (scrollableSectionsRef.current) {
        scrollableSectionsRef.current.scrollTo({
          top: scrollableSectionsRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 0);
  }

  function closeModal() {
    pruneAndSanitizeSectionProgression();
    setShowSectionProgressionModal(false);
  }

  function pruneAndSanitizeSectionProgression() {
    const newSectionProgression = [...localSectionProgression];
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
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowSectionProgressionModal(false);
        }
      }}
    >
      <div className="min-h-[25rem] min-w-[70vw] rounded-md bg-pink-400 p-2 shadow-sm md:min-w-[25rem] md:p-4">
        <div className="baseVertFlex h-full max-h-[90vh] min-h-[25rem] w-full max-w-[90vw] !flex-nowrap !justify-between gap-8">
          <div className="baseFlex lightGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
            <p className="text-lg font-semibold">Section progression</p>
          </div>

          <div
            ref={scrollableSectionsRef}
            className="baseVertFlex max-h-[70vh] w-full !flex-nowrap !justify-start gap-4 overflow-y-auto overflow-x-hidden p-4 md:max-h-[70vh] md:w-3/4"
          >
            <DndContext
              sensors={sensors}
              modifiers={[
                restrictToFirstScrollableAncestor,
                restrictToVerticalAxis,
              ]}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionProgressionIds}
                strategy={verticalListSortingStrategy}
              >
                {localSectionProgression.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <>
                      {localSectionProgression.map((section, index) => (
                        <Section
                          key={section.id}
                          id={section.id}
                          index={index}
                          title={section.title}
                          repetitions={section.repetitions}
                          sections={sections}
                          localSectionProgression={localSectionProgression}
                          setLocalSectionProgression={
                            setLocalSectionProgression
                          }
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
          </div>

          {localSectionProgression.length > 0 && (
            <Button
              className="rounded-full p-2"
              onClick={addNewSectionToProgression}
            >
              <BsPlus className="h-6 w-6" />
            </Button>
          )}

          <div className="baseFlex gap-2">
            <Button
              variant={"secondary"}
              onClick={() => setShowSectionProgressionModal(false)}
            >
              Close
            </Button>

            <Button
              disabled={isEqual(localSectionProgression, sectionProgression)}
              onClick={closeModal}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SectionProgressionModal;

const initialStyles = {
  x: 0,
  y: 0,
  scale: 1,
  opacity: 1,
  filter: "drop-shadow(0px 5px 5px transparent)",
};

interface Section {
  id: string;
  sections: {
    id: string;
    title: string;
  }[];
  title: string;
  repetitions: number;
  index: number;
  localSectionProgression: SectionProgression[];
  setLocalSectionProgression: React.Dispatch<
    React.SetStateAction<SectionProgression[]>
  >;
}

function Section({
  id,
  title,
  repetitions,
  index,
  sections,
  localSectionProgression,
  setLocalSectionProgression,
}: Section) {
  const [hoveringOnHandle, setHoveringOnHandle] = useState(false);
  const [grabbingHandle, setGrabbingHandle] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, transition: null });

  function handleSectionChange(stringifiedIndex: string) {
    const newIndex = parseInt(stringifiedIndex);
    const newSectionProgression = [...localSectionProgression];

    newSectionProgression[index]!.sectionId = sections[newIndex]!.id;
    newSectionProgression[index]!.title = sections[newIndex]!.title;
    setLocalSectionProgression(newSectionProgression);
  }

  function handleRepetitionChange(e: React.ChangeEvent<HTMLInputElement>) {
    let sanitizedValue = -1;

    if (e.target.value.length !== 0) {
      const regex = /^[1-9][0-9]?$/;
      if (!regex.test(e.target.value)) return;
      sanitizedValue = parseInt(e.target.value);
    }

    const newSectionProgression = [...localSectionProgression];
    newSectionProgression[index]!.repetitions = sanitizedValue;
    setLocalSectionProgression(newSectionProgression);
  }

  function deleteSection() {
    const newSectionProgression = [...localSectionProgression];
    newSectionProgression.splice(index, 1);
    setLocalSectionProgression(newSectionProgression);
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
              filter: isDragging
                ? "drop-shadow(0px 5px 5px rgba(0, 0, 0, 0.25)"
                : "drop-shadow(0px 5px 5px transparent)",
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
      className="baseFlex relative w-fit !flex-nowrap gap-2"
    >
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="relative cursor-grab rounded-md active:cursor-grabbing"
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
      <div className="baseFlex w-full gap-4 rounded-md bg-pink-500 p-4 px-8 sm:px-4 md:w-fit ">
        <Select
          value={title === "" ? undefined : title}
          onValueChange={(value) => handleSectionChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a section">
              {title === "" ? "Select a section" : title}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Sections</SelectLabel>

              {sections.map((section, idx) => {
                return (
                  <SelectItem key={`${section.id}`} value={`${idx}`}>
                    {section.title}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="baseFlex gap-2">
          x
          <Input
            className="max-w-[2.6rem]"
            type="text"
            autoComplete="off"
            placeholder="1"
            value={repetitions === -1 ? "" : repetitions}
            onChange={handleRepetitionChange}
          />
        </div>

        <Button variant={"destructive"} size={"sm"} onClick={deleteSection}>
          <FaTrashAlt className="h-5 w-5 text-pink-50" />
        </Button>
      </div>
    </motion.div>
  );
}
