import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { BsPlus } from "react-icons/bs";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { useTabStore, type SectionProgression } from "~/stores/TabStore";
import { Button } from "../ui/button";
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
    scale: 0.75,
  },
};

function SectionProgressionDialog() {
  const [localSectionProgression, setLocalSectionProgression] = useState<
    SectionProgression[]
  >([]);

  const scrollableSectionsRef = useRef<HTMLDivElement>(null);

  const {
    tabData,
    sectionProgression,
    setSectionProgression,
    setShowSectionProgressionModal,
    setPreventFramerLayoutShift,
  } = useTabStore((state) => ({
    tabData: state.tabData,
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    setShowSectionProgressionModal: state.setShowSectionProgressionModal,
    setPreventFramerLayoutShift: state.setPreventFramerLayoutShift,
  }));

  useEffect(() => {
    setPreventFramerLayoutShift(true);

    setTimeout(() => {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");
    }, 50);

    return () => {
      setPreventFramerLayoutShift(false);

      setTimeout(() => {
        const offsetY = Math.abs(
          parseInt(`${document.body.style.top || 0}`, 10),
        );
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, offsetY || 0);
      }, 50);
    };
  }, [setPreventFramerLayoutShift]);

  useEffect(() => {
    setLocalSectionProgression(structuredClone(sectionProgression));
  }, [sectionProgression]);

  const sections = useMemo(() => {
    return tabData.map((section) => ({ id: section.id, title: section.title }));
  }, [tabData]);

  function addNewSectionToProgression() {
    const newSectionProgression = [...localSectionProgression];
    newSectionProgression.push({
      id: crypto.randomUUID(),
      sectionId: "",
      title: "",
      repetitions: 1,
      startSeconds: 0, // will be overwritten by useAutoCompileChords
      endSeconds: 0, // will be overwritten by useAutoCompileChords
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
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowSectionProgressionModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div className="min-h-[20rem] min-w-[70vw] rounded-md bg-pink-400 p-4 shadow-sm md:min-w-[25rem]">
          <div className="baseVertFlex h-full max-h-[80vh] min-h-[20rem] w-full max-w-[90vw] !justify-between">
            <div className="baseFlex lightestGlassmorphic gap-2 rounded-md p-2 px-8 text-pink-100">
              <p className="text-lg font-semibold">Section progression</p>
            </div>

            <div
              ref={scrollableSectionsRef}
              className="baseVertFlex mt-8 max-h-[70vh] w-full !justify-start gap-4 overflow-y-auto overflow-x-hidden p-4 px-12 md:max-h-[70vh]"
            >
              {localSectionProgression.length > 0 ? (
                <AnimatePresence mode="wait">
                  <>
                    {localSectionProgression.map((section, index) => (
                      <Section
                        key={section.id}
                        index={index}
                        id={section.id}
                        sectionId={section.sectionId}
                        title={section.title}
                        repetitions={section.repetitions}
                        sections={sections}
                        localSectionProgression={localSectionProgression}
                        setLocalSectionProgression={setLocalSectionProgression}
                      />
                    ))}
                  </>
                </AnimatePresence>
              ) : (
                <Button onClick={addNewSectionToProgression}>
                  Add first section
                </Button>
              )}
            </div>

            {localSectionProgression.length > 0 && (
              <Button
                className="mt-5 rounded-full px-2"
                onClick={addNewSectionToProgression}
              >
                <BsPlus className="h-6 w-6 p-0" />
              </Button>
            )}

            <div className="baseFlex mt-5 gap-4">
              <Button
                variant={"ghost"}
                onClick={() => setShowSectionProgressionModal(false)}
              >
                Close
              </Button>

              <Button
                disabled={
                  localSectionProgression.every(
                    (section) => section.title === "",
                  ) || isEqual(localSectionProgression, sectionProgression)
                }
                onClick={closeModal}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default SectionProgressionDialog;

interface Section {
  id: string;
  sections: {
    id: string;
    title: string;
  }[];
  sectionId: string;
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
  sectionId,
  title,
  repetitions,
  index,
  sections,
  localSectionProgression,
  setLocalSectionProgression,
}: Section) {
  function handleSectionChange(sectionId: string) {
    const indexOfSection = sections.findIndex(
      (section) => section.id === sectionId,
    );
    const newSectionProgression = [...localSectionProgression];

    newSectionProgression[index]!.sectionId = sectionId;
    newSectionProgression[index]!.title = sections[indexOfSection]!.title;
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

  function moveSectionUp() {
    const newSectionProgression = [...localSectionProgression];
    const temp = newSectionProgression[index - 1];
    newSectionProgression[index - 1] = newSectionProgression[index];
    newSectionProgression[index] = temp;
    setLocalSectionProgression(newSectionProgression);
  }

  function moveSectionDown() {
    const newSectionProgression = [...localSectionProgression];
    const temp = newSectionProgression[index + 1];
    newSectionProgression[index + 1] = newSectionProgression[index];
    newSectionProgression[index] = temp;
    setLocalSectionProgression(newSectionProgression);
  }

  return (
    <motion.div
      key={`sectionProgression${id}`}
      layout={"position"}
      initial="closed"
      animate="expanded"
      exit="closed"
      variants={sectionVariants}
      className="baseFlex relative w-full gap-2"
    >
      <div className="baseVertFlex gap-2">
        <Button
          disabled={index === 0}
          variant="secondary"
          size="sm"
          className="px-2"
          onClick={() => moveSectionUp()}
        >
          <BiUpArrowAlt className="h-5 w-5"></BiUpArrowAlt>
        </Button>
        <Button
          disabled={index === localSectionProgression.length - 1}
          variant="secondary"
          size="sm"
          className="px-2"
          onClick={() => moveSectionDown()}
        >
          <BiDownArrowAlt className="h-5 w-5"></BiDownArrowAlt>
        </Button>
      </div>
      <div className="baseVertFlex lightestGlassmorphic w-full gap-4 rounded-md px-8 py-4 xs:!flex-row sm:px-4">
        <Select
          value={sectionId === "" ? undefined : sectionId}
          onValueChange={(id) => handleSectionChange(id)}
        >
          <SelectTrigger className="w-full xs:w-[175px]">
            <SelectValue placeholder="Select a section">
              {title || "Select a section"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup className="max-h-60 overflow-y-auto">
              <SelectLabel>Sections</SelectLabel>

              {sections.map((section) => {
                return (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="baseFlex gap-4 xs:!flex-row xs:!items-center">
          <div className="baseFlex gap-2">
            <span>Repeat</span>

            <div className="relative w-12">
              <span className="absolute bottom-[9px] left-2 text-sm">x</span>
              <Input
                className="w-12 pl-4"
                type="text"
                autoComplete="off"
                placeholder="1"
                value={repetitions === -1 ? "" : repetitions}
                onChange={handleRepetitionChange}
              />
            </div>
          </div>

          <Button variant={"destructive"} onClick={deleteSection}>
            <FaTrashAlt className="size-4 text-pink-100" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
