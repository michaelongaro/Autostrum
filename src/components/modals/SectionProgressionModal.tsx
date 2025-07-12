import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { BsPlus } from "react-icons/bs";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { useTabStore, type SectionProgression } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { X } from "lucide-react";

function SectionProgressionModal() {
  const {
    tabData,
    sectionProgression,
    setSectionProgression,
    setShowSectionProgressionModal,
  } = useTabStore((state) => ({
    tabData: state.tabData,
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    setShowSectionProgressionModal: state.setShowSectionProgressionModal,
  }));

  const [localSectionProgression, setLocalSectionProgression] = useState<
    SectionProgression[]
  >([]);

  const scrollableSectionsRef = useRef<HTMLDivElement>(null);

  useModalScrollbarHandling();

  useEffect(() => {
    const baseSectionProgression =
      sectionProgression.length === 0
        ? [
            {
              id: crypto.randomUUID(),
              sectionId: "",
              title: "",
              repetitions: 1,
              startSeconds: 0, // will be overwritten by useAutoCompileChords
              endSeconds: 0, // will be overwritten by useAutoCompileChords
            },
          ]
        : structuredClone(sectionProgression);

    setLocalSectionProgression(baseSectionProgression);
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
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowSectionProgressionModal(false);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="modalGradient min-h-[20rem] min-w-[70vw] rounded-md p-4 shadow-sm md:min-w-[25rem]"
        >
          <div className="baseVertFlex h-full max-h-[80vh] min-h-[20rem] w-full max-w-[90vw] !justify-between">
            <div className="baseFlex w-full !justify-between">
              <span className="self-start text-lg font-semibold text-foreground">
                Section progression
              </span>

              <Button
                variant={"ghost"}
                onClick={() => setShowSectionProgressionModal(false)}
                className="baseFlex size-8 rounded-sm !p-0 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="size-5" />
              </Button>
            </div>

            <div
              ref={scrollableSectionsRef}
              className="baseVertFlex mt-4 max-h-[60vh] w-full !justify-start px-4 md:max-h-[65vh]"
            >
              <OverlayScrollbarsComponent
                options={{
                  scrollbars: { autoHide: "leave", autoHideDelay: 150 },
                }}
                defer
                className="w-full"
              >
                <AnimatePresence initial={false}>
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
                </AnimatePresence>
              </OverlayScrollbarsComponent>
            </div>

            <div className="baseFlex mt-8 w-full !justify-between gap-4">
              <Button
                variant={"secondary"}
                className="baseFlex gap-2 py-4"
                onClick={addNewSectionToProgression}
              >
                <BsPlus className="size-6" />
                <span>Add section</span>
              </Button>

              <Button
                disabled={
                  localSectionProgression.some(
                    (section) => section.title === "",
                  ) || isEqual(localSectionProgression, sectionProgression)
                }
                onClick={closeModal}
                className="px-8"
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

export default SectionProgressionModal;

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
    newSectionProgression[index - 1] = newSectionProgression[index]!;
    newSectionProgression[index] = temp!;
    setLocalSectionProgression(newSectionProgression);
  }

  function moveSectionDown() {
    const newSectionProgression = [...localSectionProgression];
    const temp = newSectionProgression[index + 1];
    newSectionProgression[index + 1] = newSectionProgression[index]!;
    newSectionProgression[index] = temp!;
    setLocalSectionProgression(newSectionProgression);
  }

  return (
    <motion.div
      key={`sectionProgression${id}`}
      layout={"position"}
      initial={{ opacity: 0, height: 0, margin: 0 }}
      animate={{
        opacity: 1,
        height: "auto",
        marginTop: "0.5rem",
        marginBottom: "0.5rem",
      }}
      exit={{ opacity: 0, height: 0, margin: 0 }}
      transition={{ duration: 0.2 }}
      className="baseVertFlex relative w-full gap-2"
    >
      <div className="baseFlex w-full !justify-start gap-2">
        <span>{getOrdinalSuffix(index + 1)} section</span>

        {/* TODO: consider implementing this later, you will have to do some local calculations */}
        {/* <div className="baseFlex gap-2">
          <span className="text-gray">
            {formatSecondsToMinutes(
              localSectionProgression[index]!.startSeconds,
            )}
          </span>
          <span className="text-gray">-</span>
          <span className="text-gray">
            {formatSecondsToMinutes(localSectionProgression[index]!.endSeconds)}
          </span>
        </div> */}
      </div>

      {/* bg-secondary mx-1 text-secondary-foreground shadow-md */}
      <div className="baseVertFlex gap-6 rounded-md py-1 text-foreground xs:!flex-row xs:!justify-between xs:gap-4">
        <div className="baseVertFlex gap-4 xs:!flex-row">
          <Select
            value={sectionId === "" ? undefined : sectionId}
            onValueChange={(id) => handleSectionChange(id)}
          >
            <SelectTrigger className="w-[218px] xs:w-[218px]">
              <SelectValue
                placeholder="Select a section"
                className="overflow-x-hidden truncate"
              >
                {title || "Select a section"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {sections.map((section) => {
                return (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="baseFlex gap-2">
            <span>Repeat</span>

            <div className="relative w-12">
              <span className="absolute bottom-[10px] left-2 text-sm sm:bottom-[9px]">
                x
              </span>
              <Input
                className="w-12 pl-4"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1"
                value={repetitions === -1 ? "" : repetitions}
                onChange={handleRepetitionChange}
              />
            </div>

            <div className="baseFlex gap-2 xs:!hidden">
              <Button
                disabled={index === 0}
                variant="secondary"
                className="!h-10"
                onClick={() => moveSectionUp()}
              >
                <BiUpArrowAlt className="size-5"></BiUpArrowAlt>
              </Button>

              <Button
                disabled={index === localSectionProgression.length - 1}
                variant="secondary"
                className="!h-10"
                onClick={() => moveSectionDown()}
              >
                <BiDownArrowAlt className="size-5"></BiDownArrowAlt>
              </Button>

              <Button
                variant={"destructive"}
                disabled={localSectionProgression.length === 1}
                onClick={deleteSection}
                className="!h-10 !px-3"
              >
                <FaTrashAlt className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="baseFlex !hidden w-full !justify-evenly gap-4 xs:!flex xs:w-auto xs:!flex-row xs:!justify-center">
          <Button
            disabled={index === 0}
            variant="secondary"
            size="sm"
            className="size-10 !p-0"
            onClick={() => moveSectionUp()}
          >
            <BiUpArrowAlt className="size-5"></BiUpArrowAlt>
          </Button>
          <Button
            disabled={index === localSectionProgression.length - 1}
            variant="secondary"
            size="sm"
            className="size-10 !p-0"
            onClick={() => moveSectionDown()}
          >
            <BiDownArrowAlt className="size-5"></BiDownArrowAlt>
          </Button>

          <Button
            variant={"destructive"}
            disabled={localSectionProgression.length === 1}
            onClick={deleteSection}
            className="!size-10 !p-0"
          >
            <FaTrashAlt className="size-4 text-destructive-foreground" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
