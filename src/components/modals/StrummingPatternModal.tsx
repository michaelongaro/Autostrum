import { FocusTrap } from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useState, useCallback } from "react";
import { BsFillPlayFill, BsKeyboard, BsStopFill } from "react-icons/bs";
import { FaTrashAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { Label } from "~/components/ui/label";
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
} from "~/stores/TabStore";
import { traverseToRemoveHangingStrummingPatternPairNode } from "~/utils/palmMuteHelpers";
import StrummingPattern from "../Tab/StrummingPattern";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import { Button } from "~/components/ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";
import {
  EigthNote,
  QuarterNote,
  SixteenthNote,
} from "~/utils/bpmIconRenderingHelpers";
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
      delay: 0.1,
      duration: 0.2,
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
  hidden: { x: "-100%", width: 0, opacity: 0, zIndex: -1 },
  visible: {
    x: 0,
    width: "auto",
    opacity: 1,
    zIndex: 1,
    transition: {
      delay: 0,
      duration: 0.2,
    },
  },
  exit: {
    x: "-100%",
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
  const [pmNodeOpacities, setPMNodeOpacities] = useState<string[]>([]);

  const [showingDeleteStrumsButtons, setShowingDeleteStrumsButtons] =
    useState(false);
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const {
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    getTabData,
    setTabData,
    previewMetadata,
    audioMetadata,
    playPreview,
    pauseAudio,
  } = useTabStore((state) => ({
    strummingPatterns: state.strummingPatterns,
    setStrummingPatterns: state.setStrummingPatterns,
    setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    previewMetadata: state.previewMetadata,
    audioMetadata: state.audioMetadata,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
  }));

  const getPMNodeOpacities = useCallback(() => {
    if (lastModifiedPalmMuteNode === null) {
      return new Array(strummingPatternBeingEdited.value.strums.length).fill(
        "1",
      ) as string[];
    }

    const newOpacities = new Array(
      strummingPatternBeingEdited.value.strums.length,
    ).fill("0.25") as string[];

    // added new "PM Start" node
    if (lastModifiedPalmMuteNode.prevValue === "") {
      let nearestStartNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strummingPatternBeingEdited.value.strums.length;
        i++
      ) {
        if (strummingPatternBeingEdited.value.strums[i]?.palmMute === "start")
          break;
        nearestStartNodeIndex++;
      }

      newOpacities.fill(
        "1",
        lastModifiedPalmMuteNode.columnIndex,
        nearestStartNodeIndex,
      );
    }
    // removed "PM Start" node
    else if (lastModifiedPalmMuteNode.prevValue === "start") {
      let pairEndNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strummingPatternBeingEdited.value.strums.length;
        i++
      ) {
        if (strummingPatternBeingEdited.value.strums[i]?.palmMute === "end")
          break;
        pairEndNodeIndex++;
      }

      let nearestPrevEndNodeIndex = lastModifiedPalmMuteNode.columnIndex - 1;
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        if (strummingPatternBeingEdited.value.strums[i]?.palmMute === "end") {
          nearestPrevEndNodeIndex = i + 1;
          break;
        }
        if (nearestPrevEndNodeIndex !== 0) nearestPrevEndNodeIndex--;
      }

      newOpacities.fill("1", nearestPrevEndNodeIndex, pairEndNodeIndex + 1);
    }
    // removed "PM End" node
    else if (lastModifiedPalmMuteNode.prevValue === "end") {
      let pairStartNodeIndex = lastModifiedPalmMuteNode.columnIndex - 1;
      for (let i = lastModifiedPalmMuteNode.columnIndex - 1; i >= 0; i--) {
        if (strummingPatternBeingEdited.value.strums[i]?.palmMute === "start") {
          pairStartNodeIndex = i;
          break;
        }
      }

      let nearestNextStartNodeIndex = lastModifiedPalmMuteNode.columnIndex + 1;
      for (
        let i = lastModifiedPalmMuteNode.columnIndex + 1;
        i < strummingPatternBeingEdited.value.strums.length;
        i++
      ) {
        if (strummingPatternBeingEdited.value.strums[i]?.palmMute === "start") {
          nearestNextStartNodeIndex = i;
          break;
        }
      }

      newOpacities.fill("1", pairStartNodeIndex, nearestNextStartNodeIndex);
    }

    return newOpacities;
  }, [strummingPatternBeingEdited.value.strums, lastModifiedPalmMuteNode]);

  useEffect(() => {
    if (editingPalmMuteNodes) {
      setPMNodeOpacities(getPMNodeOpacities());
    }
  }, [editingPalmMuteNodes, lastModifiedPalmMuteNode, getPMNodeOpacities]);

  useModalScrollbarHandling();

  function handleNoteLengthChange(
    value:
      | "1/4th"
      | "1/4th triplet"
      | "1/8th"
      | "1/8th triplet"
      | "1/16th"
      | "1/16th triplet",
  ) {
    const newStrummingPattern = structuredClone(strummingPatternBeingEdited);

    newStrummingPattern.value.noteLength = value;

    setStrummingPatternBeingEdited(newStrummingPattern);
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
      const newTabData = getTabData();
      for (const [sectionIndex, section] of newTabData.entries()) {
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
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                ].data = structuredClone(chordProgression.slice(0, newLength));
              } else {
                // new pattern w/ extra empty string elements
                const newChordProgression = [...chordProgression];
                for (let i = 0; i < newLength - oldLength; i++) {
                  newChordProgression.push("");
                }
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                ].data = newChordProgression;
              }

              // updating to new strumming pattern
              newTabData[sectionIndex].data[subSectionIndex].data[
                chordSequenceIndex
              ].strummingPattern = strummingPatternBeingEdited.value;
            }
          }
        }
      }

      setTabData(newTabData);
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
          initialFocus: false,
        }}
      >
        <div
          tabIndex={-1}
          className="baseVertFlex modalGradient max-h-[90vh] min-w-[370px] max-w-[90vw] !justify-start gap-4 rounded-md p-4 text-foreground shadow-sm transition-all sm:max-w-[700px]"
        >
          <div className="baseFlex w-full !items-start !justify-between sm:!flex-col sm:gap-8">
            <div className="baseFlex w-full !items-start !justify-between">
              <div className="baseVertFlex !items-start gap-2 sm:!flex-row sm:!items-center sm:!justify-start">
                <Label>Note length</Label>
                <Select
                  onValueChange={handleNoteLengthChange}
                  value={strummingPatternBeingEdited.value.noteLength}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select a length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1/4th">
                      <div className="baseFlex gap-2">
                        <QuarterNote className="" />
                        1/4th
                      </div>
                    </SelectItem>
                    <SelectItem value="1/4th triplet">
                      <div className="baseFlex gap-2">
                        <QuarterNote />
                        1/4th triplet
                      </div>
                    </SelectItem>
                    <SelectItem value="1/8th">
                      <div className="baseFlex gap-2">
                        <EigthNote />
                        1/8th
                      </div>
                    </SelectItem>
                    <SelectItem value="1/8th triplet">
                      <div className="baseFlex gap-2">
                        <EigthNote />
                        1/8th triplet
                      </div>
                    </SelectItem>
                    <SelectItem value="1/16th">
                      <div className="baseFlex gap-2">
                        <SixteenthNote />
                        1/16th
                      </div>
                    </SelectItem>
                    <SelectItem value="1/16th triplet">
                      <div className="baseFlex gap-2">
                        <SixteenthNote />
                        1/16th triplet
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
                    className="baseFlex gap-2 whitespace-nowrap"
                    onClick={() =>
                      setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
                    }
                  >
                    Delete strums
                    <FaTrashAlt className="hidden h-4 w-4 sm:block" />
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

              <Button
                variant={"ghost"}
                onClick={() => {
                  if (audioMetadata.playing) pauseAudio();
                  setStrummingPatternBeingEdited(null);
                }}
                className="baseFlex size-8 rounded-sm !p-0 text-foreground opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="baseVertFlex gap-1 rounded-md border bg-secondary px-4 py-3 text-sm shadow-sm xs:px-8 sm:w-auto sm:gap-2 sm:self-center md:px-4">
              <div className="baseFlex w-auto gap-2 font-semibold">
                <BsKeyboard className="h-6 w-6" />
                Hotkeys
              </div>

              <div className="mt-2 grid grid-cols-[46px_5px_70px] !place-items-start gap-2 md:flex md:w-full md:!place-items-end md:gap-2">
                <div className="baseFlex gap-1">
                  <kbd>v</kbd> / <kbd>d</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Downstrum</p>
                <div className="baseFlex gap-1">
                  <kbd>^</kbd> / <kbd>u</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Upstrum</p>
                <div className="place-self-end">
                  <kbd>s</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Slap</p>
                <div className="place-self-end">
                  <kbd>&gt;</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Accented</p>
                <div className="place-self-end">
                  <kbd>.</kbd>
                </div>
                <p>-</p>
                <p>Staccato</p>
              </div>
            </div>
          </div>

          <div className="baseVertFlex max-h-[40vh] !items-start !justify-start">
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
                pmNodeOpacities={pmNodeOpacities}
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
              className="baseFlex gap-4"
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
            >
              Save
            </Button>
          </div>
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default StrummingPatternModal;
