import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import { useTabStoreApi, useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { IoSettingsSharp } from "react-icons/io5";
import { BsFillPlayFill } from "react-icons/bs";
import { X } from "lucide-react";
import { HiOutlineSparkles } from "react-icons/hi2";
import {
  formatTuningInput,
  getDisplayTuningNotes,
  isValidScientificTuningNote,
  normalizeCustomTuningInput,
  normalizeTuningValue,
  stripTuningOctaves,
  tuningNotes,
} from "~/utils/tunings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Label } from "~/components/ui/label";
import { useEditorHistoryState } from "~/hooks/useEditorHistoryState";

function CustomTuningEditor({
  presentation = "dialog",
}: {
  presentation?: "dialog" | "inline";
}) {
  const store = useTabStoreApi();
  const {
    previewMetadata,
    playPreview,
    tuning,
    setTuning,
    setShowCustomTuningDialog,
  } = useTabStore((state) => ({
    previewMetadata: state.previewMetadata,
    playPreview: state.playPreview,
    tuning: state.tuning,
    setTuning: state.setTuning,
    setShowCustomTuningDialog: state.setShowCustomTuningDialog,
  }));

  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewSessionRef = useRef({ requestId: 0, playing: false });

  const [tuningDraft, setTuningDraft, history] = useEditorHistoryState<{
    newTuning: string[];
    quickTuningInput: string;
    inputMode: "auto" | "manual";
  }>(
    () => ({
      newTuning: tuningNotes.includes(tuning)
        ? ["", "", "", "", "", ""]
        : getDisplayTuningNotes(tuning),
      quickTuningInput: tuningNotes.includes(tuning)
        ? ""
        : stripTuningOctaves(tuning),
      inputMode: tuningNotes.includes(tuning) ? "auto" : "manual",
    }),
    () => {
      const session = previewSessionRef.current;
      session.requestId++;
      if (session.playing) store.getState().pauseAudio();
      session.playing = false;
      setIsPreviewing(false);
    },
  );
  const { newTuning, quickTuningInput, inputMode } = tuningDraft;
  function setNewTuning(newTuning: string[]) {
    setTuningDraft((draft) => ({ ...draft, newTuning }));
  }
  function setQuickTuningInput(quickTuningInput: string) {
    setTuningDraft((draft) => ({ ...draft, quickTuningInput }));
  }
  function setInputMode(inputMode: "auto" | "manual") {
    setTuningDraft((draft) => ({ ...draft, inputMode }));
  }

  const placeholderNotes = ["E2", "A2", "D3", "G3", "B3", "E4"];

  const [showInvalidInputPerIndex, setShowInvalidInputPerIndex] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const [showInvalidQuickInput, setShowInvalidQuickInput] = useState(false);

  const [highlightedNoteInputIndex, setHighlightedNoteInputIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    const session = previewSessionRef.current;

    return () => {
      session.requestId++;

      if (session.playing) {
        store.getState().pauseAudio();
        session.playing = false;
      }
    };
  }, [store]);

  const normalizedQuickTuning = normalizeCustomTuningInput(quickTuningInput);
  const normalizedManualTuning = newTuning.every(isValidScientificTuningNote)
    ? normalizeCustomTuningInput(newTuning.join(" "))
    : null;
  const activeTuning =
    inputMode === "auto" ? normalizedQuickTuning : normalizedManualTuning;
  const displayedQuickTuning = formatTuningInput(quickTuningInput);
  let quickNoteIndex = -1;
  const quickInputSegments = displayedQuickTuning
    .split(/(\s+)/)
    .map((text) => ({
      text,
      noteIndex: /^\S+$/.test(text) ? ++quickNoteIndex : null,
    }));

  function handleSaveCustomTuning() {
    if (!activeTuning) {
      if (inputMode === "auto") {
        setShowInvalidQuickInput(true);
      } else {
        setShowInvalidInputPerIndex(
          newTuning.map((note) => !isValidScientificTuningNote(note)),
        );
      }

      return;
    }

    setTuning(activeTuning.join(" "));
    setShowCustomTuningDialog(false);
  }

  function handleConvertQuickTuningInput() {
    const normalizedTuning = normalizeCustomTuningInput(quickTuningInput);

    if (!normalizedTuning) {
      setShowInvalidQuickInput(true);

      return;
    }

    setShowInvalidQuickInput(false);
    setNewTuning(normalizedTuning);
    setInputMode("manual");
  }

  function handleInputModeChange(mode: "auto" | "manual") {
    if (mode === inputMode) return;

    if (mode === "auto") {
      setQuickTuningInput(stripTuningOctaves(newTuning.join(" ")).trim());
      setShowInvalidQuickInput(false);
    } else if (normalizedQuickTuning) {
      setNewTuning(normalizedQuickTuning);
      setShowInvalidInputPerIndex([false, false, false, false, false, false]);
    }

    setInputMode(mode);
  }

  async function handlePreviewNotes() {
    if (!activeTuning) return;

    const session = previewSessionRef.current;
    const requestId = ++session.requestId;
    session.playing = true;
    setIsPreviewing(true);

    try {
      await playPreview({
        data: ["0", "0", "0", "0", "0", "0"],
        index: -1,
        type: "chord",
        customTuning: activeTuning.join(" "),
        customBpm: "40",
        forTuningPreview: true,
        isPreviewValid: () => session.requestId === requestId,
        onTuningPreviewNote: (noteIndex) => {
          if (session.requestId === requestId) {
            setHighlightedNoteInputIndex(noteIndex);
          }
        },
      });
    } finally {
      if (session.requestId === requestId) {
        session.playing = false;
        setIsPreviewing(false);
        setHighlightedNoteInputIndex(null);
      }
    }
  }

  const content = (
    <>
      {presentation === "dialog" && (
        <div className="baseFlex w-full !justify-between gap-2">
          <div className="baseFlex gap-2">
            <IoSettingsSharp className="h-5 w-5" />
            <p className="text-lg font-semibold">Custom tuning editor</p>
          </div>

          <Button
            variant={"modalClose"}
            onClick={() => {
              setShowCustomTuningDialog(false);
            }}
          >
            <X className="size-5" />
          </Button>
        </div>
      )}

      <div className="baseFlex gap-3">
        <Label>Mode</Label>
        <div className="baseFlex relative isolate overflow-y-hidden rounded-md border">
          <Button
            disabled={isPreviewing}
            aria-pressed={inputMode === "auto"}
            variant="toggle"
            size="sm"
            style={{
              color:
                inputMode === "auto"
                  ? "hsl(var(--primary-foreground))"
                  : "hsl(var(--foreground))",
            }}
            className="baseFlex relative w-[55px] gap-2 border-none text-xs xs:text-sm"
            onClick={() => {
              handleInputModeChange("auto");
            }}
          >
            Auto
          </Button>

          <Button
            disabled={isPreviewing}
            aria-pressed={inputMode === "manual"}
            variant="toggle"
            size="sm"
            style={{
              color:
                inputMode === "manual"
                  ? "hsl(var(--primary-foreground))"
                  : "hsl(var(--foreground))",
            }}
            className="baseFlex relative w-[72px] gap-2 border-none text-xs xs:text-sm"
            onClick={() => {
              handleInputModeChange("manual");
            }}
          >
            Manual
          </Button>

          <div
            style={{
              width: inputMode === "auto" ? "55px" : "72px",
              transform:
                inputMode === "auto" ? "translateX(0)" : "translateX(55px)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className={`absolute inset-0 !z-[-1] bg-primary ${inputMode === "auto" ? "rounded-l-sm" : "rounded-r-sm"}`}
          ></div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {inputMode === "auto" ? (
          <motion.div
            key={"CustomTuningDialog-Auto"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="baseVertFlex h-[170px] w-[332px] gap-8"
          >
            <div className="baseVertFlex max-w-[23rem] !items-start gap-2 rounded-lg border bg-secondary p-2 text-sm shadow-sm sm:max-w-[30rem]">
              <div className="baseFlex !items-start gap-4 px-4 sm:gap-2">
                <HiOutlineInformationCircle className="mt-1 size-5" />
                <p className="max-w-[14rem]">
                  Enter six notes and we will choose valid octaves for you.
                </p>
              </div>
              <div className="baseFlex ml-9 px-4 text-xs text-foreground/70 sm:ml-7">
                <p>Leave a space between each note.</p>
              </div>
            </div>

            <div className="baseFlex w-72 gap-4">
              <div className="relative min-w-0 flex-1">
                <Input
                  aria-label="Auto tuning"
                  placeholder="C# B E F# A# E"
                  maxLength={17}
                  value={displayedQuickTuning}
                  invalid={showInvalidQuickInput}
                  readOnly={isPreviewing}
                  className={
                    highlightedNoteInputIndex !== null
                      ? "text-transparent caret-transparent"
                      : undefined
                  }
                  onChange={(e) => {
                    const nextValue = e.target.value.toLowerCase();
                    setQuickTuningInput(nextValue);

                    if (
                      showInvalidQuickInput &&
                      normalizeCustomTuningInput(nextValue)
                    ) {
                      setShowInvalidQuickInput(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isPreviewing) {
                      e.preventDefault();
                      handleConvertQuickTuningInput();
                    }
                  }}
                />

                {highlightedNoteInputIndex !== null && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 text-base"
                  >
                    {quickInputSegments.map(({ text, noteIndex }, index) => (
                      <span
                        key={index}
                        data-tuning-preview-note={noteIndex ?? undefined}
                        className={
                          noteIndex === highlightedNoteInputIndex
                            ? "text-primary"
                            : "text-foreground"
                        }
                      >
                        {text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                disabled={isPreviewing || quickTuningInput.length < 6}
                variant="outline"
                className="baseFlex h-10 gap-2"
                onClick={handleConvertQuickTuningInput}
              >
                <HiOutlineSparkles />
                Convert
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={"CustomTuningDialog-Manual"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="baseVertFlex h-[170px] w-[332px] gap-8"
          >
            <div className="baseVertFlex max-w-[23rem] gap-2 rounded-lg border bg-secondary p-2 text-sm shadow-sm sm:max-w-[30rem]">
              <div className="baseFlex gap-4 px-4 sm:gap-2">
                <HiOutlineInformationCircle className="size-5" />
                <p className="max-w-[14rem] sm:max-w-[20rem] sm:text-center">
                  Scientific Pitch Notation is required.
                </p>
              </div>
              <div className="baseFlex mt-2 gap-2 sm:gap-6">
                <div className="baseVertFlex gap-2">
                  <div className="grid w-full grid-cols-3 place-items-center gap-4 text-sm font-semibold">
                    <span>A-G</span>
                    <span>(# / ♭)</span>
                    <span>0-8</span>
                  </div>
                  <div className="grid w-full grid-cols-3 place-items-center gap-4 text-xs">
                    <span>Root note</span>
                    <span>(Accidental)</span>
                    <span>Octave</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="baseFlex gap-1 xs:gap-2">
              {newTuning.map((value, index) => (
                <Input
                  key={index}
                  placeholder={placeholderNotes[index]}
                  aria-label={`String ${6 - index} note`}
                  maxLength={3}
                  value={formatTuningInput(value)}
                  invalid={showInvalidInputPerIndex[index]}
                  readOnly={isPreviewing}
                  style={{
                    color:
                      highlightedNoteInputIndex === index
                        ? "hsl(var(--primary))"
                        : "hsl(var(--foreground))",
                  }}
                  className="w-[52px] p-2 text-center"
                  onChange={(e) => {
                    if (e.target.value.length > 3) return;

                    const newTuningValues = [...newTuning];
                    newTuningValues[index] = e.target.value.toLowerCase();
                    setNewTuning(newTuningValues);
                    setQuickTuningInput(
                      stripTuningOctaves(newTuningValues.join(" ")).trim(),
                    );

                    if (
                      showInvalidInputPerIndex[index] &&
                      isValidScientificTuningNote(newTuningValues[index])
                    ) {
                      setShowInvalidInputPerIndex((invalidInputs) =>
                        invalidInputs.map((invalid, inputIndex) =>
                          inputIndex === index ? false : invalid,
                        ),
                      );
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="baseFlex w-full !justify-between">
        <Button
          disabled={!activeTuning || isPreviewing || previewMetadata.playing}
          variant={"audio"}
          className="baseFlex gap-2"
          onClick={() => void handlePreviewNotes()}
        >
          <BsFillPlayFill className="h-6 w-6" />
          Preview notes
        </Button>

        <Button
          disabled={
            !activeTuning ||
            normalizeTuningValue(tuning) === activeTuning.join(" ")
          }
          onClick={handleSaveCustomTuning}
          className="px-8"
        >
          Save
        </Button>
      </div>
    </>
  );
  return (
    <div
      data-tab-editor-history="local"
      {...history.scopeProps}
      className={
        presentation === "inline"
          ? "baseVertFlex w-full max-w-sm gap-8 rounded-lg border bg-background p-4 shadow-sm"
          : "baseVertFlex w-full gap-8"
      }
    >
      {content}
    </div>
  );
}

function CustomTuningDialog({
  presentation = "dialog",
}: {
  presentation?: "dialog" | "inline";
}) {
  const { showCustomTuningDialog, setShowCustomTuningDialog } = useTabStore(
    (state) => ({
      showCustomTuningDialog: state.showCustomTuningDialog,
      setShowCustomTuningDialog: state.setShowCustomTuningDialog,
    }),
  );

  if (presentation === "inline")
    return <CustomTuningEditor presentation="inline" />;

  return (
    <Dialog
      open={showCustomTuningDialog}
      onOpenChange={setShowCustomTuningDialog}
    >
      <DialogContent className="baseVertFlex max-w-[95vw] gap-8 rounded-lg border p-4 shadow-sm xl:w-96">
        <VisuallyHidden>
          <DialogTitle>Custom tuning dialog</DialogTitle>
          <DialogDescription>
            Users can quickly enter the notes of their desired tuning, or enter
            the full Scientific Pitch Notation for more control.
          </DialogDescription>
        </VisuallyHidden>
        <CustomTuningEditor />
      </DialogContent>
    </Dialog>
  );
}

export default CustomTuningDialog;
