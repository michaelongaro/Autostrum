import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useState, useCallback } from "react";
import { BsFillPlayFill, BsKeyboard, BsStopFill } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { Label } from "~/components/ui/label";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
  type ChordSequence,
} from "~/stores/TabStore";
import { traverseToRemoveHangingStrummingPatternPairNode } from "~/utils/palmMuteHelpers";
import StrummingPattern from "../Tab/StrummingPattern";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "~/components/ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import {
  EighthNote,
  HalfNote,
  QuarterNote,
  SixteenthNote,
  WholeNote,
} from "~/utils/noteLengthIcons";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { X } from "lucide-react";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

const xVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0,
      duration: 0.25,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      delay: 0,
    },
  },
};

const containerVariants = {
  hidden: { width: 0, opacity: 0, zIndex: -1 },
  visible: {
    width: "auto",
    opacity: 1,
    zIndex: 1,
    transition: {
      duration: 0.2,
    },
  },
  exit: {
    width: 0,
    opacity: 0,
    zIndex: -1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
};

interface StrummingPatternModal {
  strummingPatternBeingEdited: {
    index: number;
    value: StrummingPatternType;
  };
}

function StrummingPatternModal({
  strummingPatternBeingEdited,
}: StrummingPatternModal) {
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);
  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);

  const [showNoteLengthChangeDialog, setShowNoteLengthChangeDialog] =
    useState(false);
  const [noteLengthChangeType, setNoteLengthChangeType] = useState<
    "onlyUnchanged" | "all"
  >("onlyUnchanged");
  const [proposedNoteLength, setProposedNoteLength] = useState<
    "whole" | "half" | "quarter" | "eighth" | "sixteenth" | null
  >(null);

  const [showingDeleteStrumsButtons, setShowingDeleteStrumsButtons] =
    useState(false);
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    previewMetadata,
    audioMetadata,
    playPreview,
    pauseAudio,
    setTabData,
  } = useTabStore((state) => ({
    strummingPatterns: state.strummingPatterns,
    setStrummingPatterns: state.setStrummingPatterns,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    previewMetadata: state.previewMetadata,
    audioMetadata: state.audioMetadata,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
    setTabData: state.setTabData,
  }));

  useModalScrollbarHandling();

  function handleBaseNoteLengthChange(
    value: "whole" | "half" | "quarter" | "eighth" | "sixteenth",
  ) {
    setProposedNoteLength(value);
    setShowNoteLengthChangeDialog(true);
  }

  function toggleEditingPalmMuteNodes() {
    if (!editingPalmMuteNodes) {
      setEditingPalmMuteNodes(true);
      return;
    } else if (lastModifiedPalmMuteNode) {
      // if only had a hanging "start" node, then just revert
      // start node to being empty
      if (lastModifiedPalmMuteNode.prevValue === "") {
        const newStrummingPattern = structuredClone(
          strummingPatternBeingEdited,
        );

        newStrummingPattern.value.strums[
          lastModifiedPalmMuteNode.columnIndex
        ]!.palmMute = "";

        setStrummingPatternBeingEdited(newStrummingPattern);
      }
      // otherwise need to traverse to find + remove pair node
      else {
        traverseToRemoveHangingStrummingPatternPairNode({
          strummingPatternBeingEdited,
          setStrummingPatternBeingEdited,
          startColumnIndex: lastModifiedPalmMuteNode.columnIndex,
          pairNodeToRemove:
            lastModifiedPalmMuteNode.prevValue === "start" ? "end" : "start",
        });
      }

      setLastModifiedPalmMuteNode(null);
    }
    setEditingPalmMuteNodes(false);
  }

  function handleSaveStrummingPattern() {
    // updating chord sequences that use this strumming pattern

    const newLength = strummingPatternBeingEdited.value.strums.length;
    const oldLength =
      strummingPatterns[strummingPatternBeingEdited.index]?.strums?.length;

    if (oldLength !== undefined) {
      setTabData((draft) => {
        for (const [sectionIndex, section] of draft.entries()) {
          if (!section) continue;

          for (const [subSectionIndex, subSection] of section.data.entries()) {
            if (subSection?.type === "chord") {
              for (const [
                chordSequenceIndex,
                chordSequence,
              ] of subSection.data.entries()) {
                const chordProgression = chordSequence?.data;
                const strummingPattern = chordSequence?.strummingPattern;
                if (
                  !chordProgression ||
                  !strummingPattern ||
                  !isEqual(
                    strummingPattern,
                    strummingPatterns[strummingPatternBeingEdited.index],
                  )
                )
                  continue;

                // pattern.data is what we need to update
                if (newLength < oldLength) {
                  // delete the last elements
                  (
                    draft[sectionIndex]!.data[subSectionIndex]!.data[
                      chordSequenceIndex
                    ]! as ChordSequence
                  ).data = chordProgression.slice(0, newLength);
                } else {
                  // new pattern w/ extra empty string elements
                  const newChordProgression = [...chordProgression];
                  for (let i = 0; i < newLength - oldLength; i++) {
                    newChordProgression.push("");
                  }
                  (
                    draft[sectionIndex]!.data[subSectionIndex]!.data[
                      chordSequenceIndex
                    ]! as ChordSequence
                  ).data = newChordProgression;
                }

                // updating to new strumming pattern
                (
                  draft[sectionIndex]!.data[subSectionIndex]!.data[
                    chordSequenceIndex
                  ]! as ChordSequence
                ).strummingPattern = strummingPatternBeingEdited.value;
              }
            }
          }
        }
      });
    }

    const newStrummingPatterns = structuredClone(strummingPatterns);

    newStrummingPatterns[strummingPatternBeingEdited.index] = structuredClone({
      ...strummingPatternBeingEdited.value,
    });

    if (audioMetadata.playing) pauseAudio();

    setStrummingPatterns(newStrummingPatterns);
    setStrummingPatternBeingEdited(null);
  }

  return (
    <motion.div
      key={"StrummingPatternModalBackdrop"}
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/60 backdrop-blur-sm"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (audioMetadata.playing) pauseAudio();
          setStrummingPatternBeingEdited(null);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true, // to click on the effect dialog "x"
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex modalGradient relative max-h-[90vh] min-w-[370px] max-w-[90vw] !justify-start gap-4 rounded-lg border p-4 text-foreground shadow-sm transition-all sm:max-w-[800px]"
        >
          <Button
            variant={"modalClose"}
            onClick={() => {
              if (audioMetadata.playing) pauseAudio();
              setStrummingPatternBeingEdited(null);
            }}
          >
            <X className="size-5" />
          </Button>

          <div className="baseFlex mt-2 w-full !items-start !justify-between md:mt-0 md:!flex-col md:gap-8">
            <div className="baseFlex w-full !items-start !justify-between">
              <div className="baseVertFlex !items-start gap-2 md:!flex-row md:!items-center md:!justify-start">
                <Label htmlFor="noteLength">Note length</Label>
                <Select
                  onValueChange={handleBaseNoteLengthChange}
                  value={strummingPatternBeingEdited.value.baseNoteLength}
                >
                  <SelectTrigger id="noteLength" className="w-[150px]">
                    <SelectValue placeholder="Select a length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whole">
                      <div className="baseFlex gap-2">
                        <WholeNote />
                        Whole
                      </div>
                    </SelectItem>
                    <SelectItem value="half">
                      <div className="baseFlex gap-2">
                        <HalfNote />
                        Half
                      </div>
                    </SelectItem>
                    <SelectItem value="quarter">
                      <div className="baseFlex gap-2">
                        <QuarterNote />
                        Quarter
                      </div>
                    </SelectItem>
                    <SelectItem value="eighth">
                      <div className="baseFlex gap-2">
                        <EighthNote />
                        Eighth
                      </div>
                    </SelectItem>
                    <SelectItem value="sixteenth">
                      <div className="baseFlex gap-2">
                        <SixteenthNote />
                        Sixteenth
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="baseFlex">
                  <Button
                    disabled={editingPalmMuteNodes}
                    style={{
                      borderRadius: editingPalmMuteNodes
                        ? "0.375rem 0 0 0.375rem"
                        : "0.375rem",
                      transitionDelay: "0.1s",
                    }}
                    onClick={toggleEditingPalmMuteNodes}
                  >
                    PM Editor
                  </Button>

                  <AnimatePresence>
                    {editingPalmMuteNodes && (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{
                          ease: "easeInOut",
                        }}
                      >
                        <Button
                          className="rounded-l-none rounded-r-md px-2 py-0"
                          onClick={toggleEditingPalmMuteNodes}
                        >
                          <motion.div
                            variants={xVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{
                              ease: "easeInOut",
                            }}
                          >
                            <IoClose className="h-6 w-6" />
                          </motion.div>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* toggle delete strums */}
                <div className="baseFlex">
                  <Button
                    variant={"destructive"}
                    disabled={showingDeleteStrumsButtons}
                    style={{
                      borderRadius: showingDeleteStrumsButtons
                        ? "0.375rem 0 0 0.375rem"
                        : "0.375rem",
                      transitionDelay: "0.1s",
                    }}
                    className="baseFlex whitespace-nowrap"
                    onClick={() =>
                      setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
                    }
                  >
                    Delete strums
                  </Button>

                  <AnimatePresence>
                    {showingDeleteStrumsButtons && (
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{
                          ease: "easeInOut",
                        }}
                      >
                        <Button
                          variant={"destructive"}
                          className="rounded-l-none rounded-r-md px-2 py-0"
                          onClick={() =>
                            setShowingDeleteStrumsButtons(
                              !showingDeleteStrumsButtons,
                            )
                          }
                        >
                          <motion.div
                            variants={xVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{
                              ease: "easeInOut",
                            }}
                          >
                            <IoClose className="h-6 w-6" />
                          </motion.div>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="baseVertFlex mt-[22px] gap-1 rounded-lg border bg-secondary px-4 py-3 text-sm shadow-sm xs:px-8 md:mt-0 md:w-auto md:gap-2 md:self-center md:px-4">
              <div className="baseFlex w-auto gap-2 font-semibold">
                <BsKeyboard className="h-6 w-6" />
                Hotkeys
              </div>

              <div className="mt-2 grid grid-cols-[46px_5px_70px] !place-items-start gap-2 md:flex md:w-full md:!place-items-end md:gap-2">
                <div className="baseFlex gap-1">
                  <kbd>↓</kbd> / <kbd>v</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Downstrum</p>

                <div className="baseFlex gap-1">
                  <kbd>↑</kbd> / <kbd>^</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Upstrum</p>

                <div className="place-self-end">
                  <kbd>&gt;</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Accented</p>

                <div className="place-self-end">
                  <kbd>.</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Staccato</p>

                <div className="place-self-end">
                  <kbd>s</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Slap</p>

                <div className="place-self-end">
                  <kbd>r</kbd>
                </div>
                <p>-</p>
                <p>Rest</p>
              </div>
            </div>
          </div>

          <div className="baseVertFlex max-h-[35vh] !items-start !justify-start">
            <OverlayScrollbarsComponent
              options={{
                scrollbars: { autoHide: "leave", autoHideDelay: 150 },
              }}
              defer
              className="w-full"
            >
              {/* editing inputs of strumming pattern */}
              <StrummingPattern
                data={strummingPatternBeingEdited.value}
                mode={"editingStrummingPattern"}
                index={strummingPatternBeingEdited.index}
                editingPalmMuteNodes={editingPalmMuteNodes}
                setEditingPalmMuteNodes={setEditingPalmMuteNodes}
                showingDeleteStrumsButtons={showingDeleteStrumsButtons}
                lastModifiedPalmMuteNode={lastModifiedPalmMuteNode}
                setLastModifiedPalmMuteNode={setLastModifiedPalmMuteNode}
              />
            </OverlayScrollbarsComponent>
          </div>

          <div className="baseFlex mt-4 w-full !justify-between gap-8">
            <Button
              disabled={
                artificalPlayButtonTimeout ||
                strummingPatternBeingEdited.value.strums.every(
                  (strum) => strum.strum === "",
                )
              }
              variant={"audio"}
              className="baseFlex gap-2"
              onClick={() => {
                if (
                  previewMetadata.playing &&
                  strummingPatternBeingEdited.index ===
                    previewMetadata.indexOfPattern &&
                  previewMetadata.type === "strummingPattern"
                ) {
                  setArtificalPlayButtonTimeout(true);

                  setTimeout(() => {
                    setArtificalPlayButtonTimeout(false);
                  }, 300);
                  pauseAudio();
                } else {
                  void playPreview({
                    data: strummingPatternBeingEdited.value,
                    index: strummingPatternBeingEdited.index,
                    type: "strummingPattern",
                  });
                }
              }}
            >
              <>
                {previewMetadata.playing &&
                previewMetadata.type === "strummingPattern" ? (
                  <BsStopFill className="h-6 w-6" />
                ) : (
                  <BsFillPlayFill className="h-6 w-6" />
                )}
                Preview
              </>
            </Button>

            {/* should be disabled if lodash isEqual to the strummingPatterns original version */}
            <Button
              disabled={
                strummingPatternBeingEdited.value.strums.every(
                  (strum) => strum.strum === "",
                ) ||
                isEqual(
                  strummingPatternBeingEdited.value,
                  strummingPatterns[strummingPatternBeingEdited.index],
                )
              }
              onClick={handleSaveStrummingPattern}
              className="px-12"
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>

      <AlertDialog
        open={showNoteLengthChangeDialog}
        onOpenChange={setShowNoteLengthChangeDialog}
      >
        <VisuallyHidden>
          <AlertDialogTitle>Default note length adjustment</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;re about to change the default note length for this
            strumming pattern. You can either just change the note length for
            strums that haven't been modified, or you can choose to update all
            strum note lengths to the new default.
          </AlertDialogDescription>
        </VisuallyHidden>

        <AlertDialogContent className="baseVertFlex modalGradient max-h-[90dvh] max-w-[350px] !justify-start gap-8 overflow-y-auto rounded-lg text-foreground sm:max-w-[500px]">
          <div className="baseVertFlex !items-start gap-4">
            <h2 className="text-lg font-semibold">
              Default note length adjustment
            </h2>
            <p className="text-sm">
              Please choose how you would like to update the note lengths of the
              strums in this pattern.
            </p>
          </div>

          <div className="baseVertFlex w-full gap-4 sm:!flex-row">
            <Button
              variant={"outline"}
              className={`h-20 w-full ${noteLengthChangeType === "onlyUnchanged" ? "bg-secondary-hover" : ""}`}
              onClick={() => {
                setNoteLengthChangeType("onlyUnchanged");
              }}
            >
              Only update strums that haven&apos;t had their note lengths
              modified.
            </Button>

            <Button
              variant={"outline"}
              className={`h-20 w-full ${noteLengthChangeType === "all" ? "bg-secondary-hover" : ""}`}
              onClick={() => {
                setNoteLengthChangeType("all");
              }}
            >
              Update all strum note lengths to match the new default.
            </Button>
          </div>

          <div className="baseFlex w-full !justify-end gap-4">
            <Button
              variant={"secondary"}
              onClick={() => setShowNoteLengthChangeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (proposedNoteLength === null) return;

                const newStrummingPattern = structuredClone(
                  strummingPatternBeingEdited,
                );

                for (const [
                  index,
                  strum,
                ] of newStrummingPattern.value.strums.entries()) {
                  if (
                    noteLengthChangeType === "all" ||
                    (noteLengthChangeType === "onlyUnchanged" &&
                      strum.noteLengthModified === false)
                  ) {
                    newStrummingPattern.value.strums[index]!.noteLength =
                      proposedNoteLength;

                    newStrummingPattern.value.strums[
                      index
                    ]!.noteLengthModified = false;
                  }
                }

                newStrummingPattern.value.baseNoteLength = proposedNoteLength;

                setStrummingPatternBeingEdited(newStrummingPattern);
                setShowNoteLengthChangeDialog(false);
              }}
            >
              Save
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

export default StrummingPatternModal;
