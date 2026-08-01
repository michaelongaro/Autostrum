import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useRef, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { BsPlus } from "react-icons/bs";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { useTabStore, type SectionProgression } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { BsMusicNoteList } from "react-icons/bs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { X } from "lucide-react";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

function SectionProgressionDialog() {
  const {
    sectionProgression,
    setSectionProgression,
    showSectionProgressionDialog,
    setShowSectionProgressionDialog,
    tabData,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    showSectionProgressionDialog: state.showSectionProgressionDialog,
    setShowSectionProgressionDialog: state.setShowSectionProgressionDialog,
    tabData: state.tabData,
  }));

  const [localSectionProgression, setLocalSectionProgression] = useState<
    SectionProgression[]
  >([]);

  const scrollableSectionsRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const lastAddedIdRef = useRef<string | null>(null);
  const pendingScrollRef = useRef(false);

  useEffect(() => {
    if (!showSectionProgressionDialog) return;

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
  }, [sectionProgression, showSectionProgressionDialog]);

  const sections = tabData.map((section) => ({
    id: section.id,
    title: section.title,
  }));

  function addNewSectionToProgression() {
    const newId = crypto.randomUUID();
    const newSectionProgression = [...localSectionProgression];
    newSectionProgression.push({
      id: newId,
      sectionId: "",
      title: "",
      repetitions: 1,
      startSeconds: 0, // will be overwritten by useAutoCompileChords
      endSeconds: 0, // will be overwritten by useAutoCompileChords
    });

    // mark that after the new section enters (animation), we should scroll
    lastAddedIdRef.current = newId;
    pendingScrollRef.current = true;
    setLocalSectionProgression(newSectionProgression);
  }

  // Fallback: if for some reason the animation callback doesn't fire,
  // try to scroll shortly after the list length changes.
  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const t = setTimeout(() => {
      if (pendingScrollRef.current) {
        bottomSentinelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
        pendingScrollRef.current = false;
      }
    }, 300); // a bit longer than the 0.25s animation to ensure final layout
    return () => clearTimeout(t);
  }, [localSectionProgression.length]);

  function handleNewSectionEnterComplete() {
    if (!pendingScrollRef.current) return;
    bottomSentinelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    pendingScrollRef.current = false;
  }

  function closeDialog() {
    pruneAndSanitizeSectionProgression();
    setShowSectionProgressionDialog(false);
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
    <Dialog
      onOpenChange={(open) => {
        setShowSectionProgressionDialog(open);
      }}
      open={showSectionProgressionDialog}
    >
      <VisuallyHidden>
        <DialogTitle>Section progression dialog</DialogTitle>
        <DialogDescription>
          Arrange the order and repetitions of sections in this tab.
        </DialogDescription>
      </VisuallyHidden>

      <DialogContent className="relative min-h-[20rem] min-w-[70vw] w-auto max-w-none gap-0 rounded-lg border p-4 shadow-sm md:min-w-[25rem] md:w-auto">
        <div className="baseVertFlex h-full max-h-[80vh] min-h-[20rem] w-full max-w-[90vw] !justify-between">
          <div className="baseFlex w-full !justify-between">
            <span className="baseFlex gap-2 self-start text-lg font-semibold text-foreground">
              <BsMusicNoteList />
              Section progression
            </span>

            <Button
              variant={"modalClose"}
              onClick={() => setShowSectionProgressionDialog(false)}
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
                scrollbars: {
                  autoHide: "leave",
                  autoHideDelay: 150,
                },
              }}
              defer
              className="w-full"
            >
              <AnimatePresence initial={false} mode="popLayout">
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
                    isNew={section.id === lastAddedIdRef.current}
                    onEnterComplete={handleNewSectionEnterComplete}
                  />
                ))}
              </AnimatePresence>

              {/* Sentinel to scroll into view so we always hit the true bottom */}
              <div
                ref={bottomSentinelRef}
                className="h-0 w-full"
                aria-hidden
              />
            </OverlayScrollbarsComponent>
          </div>

          <div className="baseFlex mt-8 w-full !justify-between gap-4">
            <Button
              variant={"outline"}
              className="baseFlex gap-2 py-4 pl-2.5"
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
              onClick={closeDialog}
              className="px-8"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  // True if this is the most recently added section (used to know when to scroll)
  isNew?: boolean;
  onEnterComplete: () => void;
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
  isNew,
  onEnterComplete,
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
      layout="position"
      initial={{ opacity: 0, height: "auto" }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{
        height: { duration: 0.25 },
        opacity: { duration: 0.2 },
        layout: { duration: 0.25 },
      }}
      onAnimationComplete={() => {
        if (isNew) onEnterComplete();
      }}
      style={{ overflow: "hidden" }}
    >
      <div className="baseVertFlex relative my-2 w-full !items-start gap-2 rounded-lg border bg-secondary p-4 shadow-sm">
        <div className="baseFlex w-full !justify-start gap-2">
          <Label htmlFor={`sectionIndex${index}`}>
            {getOrdinalSuffix(index + 1)} section
          </Label>

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

        <div className="baseVertFlex gap-6 rounded-md py-1 text-foreground sm:!flex-row sm:!justify-between sm:gap-4">
          <div className="baseVertFlex !items-start gap-4 sm:!flex-row">
            <Select value={sectionId} onValueChange={handleSectionChange}>
              <SelectTrigger
                id={`sectionIndex${index}`}
                className="w-[218px] bg-background/50 sm:w-[218px]"
              >
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
              <span className="text-sm">Repeat</span>

              <div className="relative w-12">
                <span className="pointer-events-none absolute bottom-[10px] left-2 text-sm sm:bottom-[9px]">
                  x
                </span>
                <Input
                  className="w-12 bg-background/50 pl-4"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1"
                  value={repetitions === -1 ? "" : repetitions}
                  onChange={handleRepetitionChange}
                />
              </div>

              <div className="baseFlex ml-2 gap-2 sm:!hidden">
                <Button
                  disabled={index === 0}
                  variant="outline"
                  className="!size-10 bg-background/50"
                  onClick={() => moveSectionUp()}
                >
                  <BiUpArrowAlt className="size-5 shrink-0"></BiUpArrowAlt>
                </Button>

                <Button
                  disabled={index === localSectionProgression.length - 1}
                  variant="outline"
                  className="!size-10 bg-background/50"
                  onClick={() => moveSectionDown()}
                >
                  <BiDownArrowAlt className="size-5 shrink-0"></BiDownArrowAlt>
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

          <div className="baseFlex ml-2 !hidden w-full !justify-evenly gap-4 sm:!flex sm:w-auto sm:!flex-row sm:!justify-center">
            <Button
              disabled={index === 0}
              variant="outline"
              size="sm"
              className="size-10 !p-0"
              onClick={() => moveSectionUp()}
            >
              <BiUpArrowAlt className="size-5"></BiUpArrowAlt>
            </Button>
            <Button
              disabled={index === localSectionProgression.length - 1}
              variant="outline"
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
      </div>
    </motion.div>
  );
}
