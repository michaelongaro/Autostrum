import { FocusTrap } from "focus-trap-react";
import { motion } from "framer-motion";
import isEqual from "lodash.isequal";
import { useEffect, useState, useCallback } from "react";
import { BsFillPlayFill, BsKeyboard, BsStopFill } from "react-icons/bs";
import { FaTrashAlt } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Button } from "../ui/button";
import useModalScrollbarHandling from "~/hooks/useModalScrollbarHandling";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
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
      for (
        let sectionIndex = 0;
        sectionIndex < newTabData.length;
        sectionIndex++
      ) {
        const section = newTabData[sectionIndex];

        if (!section) continue;

        for (
          let subSectionIndex = 0;
          subSectionIndex < section.data.length;
          subSectionIndex++
        ) {
          const subSection = section.data[subSectionIndex];

          if (subSection?.type === "chord") {
            for (
              let chordSequenceIndex = 0;
              chordSequenceIndex < subSection.data.length;
              chordSequenceIndex++
            ) {
              const chordProgression =
                subSection.data[chordSequenceIndex]?.data;
              const strummingPattern =
                subSection.data[chordSequenceIndex]?.strummingPattern;
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

                // @ts-expect-error undefined checks are done above
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                  // @ts-expect-error undefined checks are done above
                ]!.data = structuredClone(chordProgression.slice(0, newLength));
              } else {
                // new pattern w/ extra empty string elements

                const newChordProgression = [...chordProgression];

                for (let i = 0; i < newLength - oldLength; i++) {
                  newChordProgression.push("");
                }

                // @ts-expect-error undefined checks are done above
                newTabData[sectionIndex].data[subSectionIndex].data[
                  chordSequenceIndex
                  // @ts-expect-error undefined checks are done above
                ]!.data = newChordProgression;
              }

              // updating to new strumming pattern

              // @ts-expect-error undefined checks are done above
              newTabData[sectionIndex].data[subSectionIndex].data[
                chordSequenceIndex
                // @ts-expect-error undefined checks are done above
              ]!.strummingPattern = strummingPatternBeingEdited.value;
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
      className="baseFlex fixed left-0 top-0 z-50 h-[100dvh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (audioMetadata.playing) pauseAudio();
          setStrummingPatternBeingEdited(null);
        }
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          initialFocus: false,
        }}
      >
        <div className="baseVertFlex max-h-[90vh] min-w-[370px] max-w-[90vw] !flex-nowrap !justify-start gap-4 rounded-md bg-pink-400 p-4 shadow-sm transition-all sm:max-h-[90vh] sm:max-w-[700px] sm:p-8">
          <div className="baseFlex w-full !items-start !justify-between gap-8 sm:!flex-col sm:gap-8">
            <div className="baseVertFlex !items-start gap-2 sm:!flex-row sm:!items-center sm:!justify-start">
              <Label>Note length</Label>
              <Select
                onValueChange={handleNoteLengthChange}
                value={strummingPatternBeingEdited.value.noteLength}
              >
                <SelectTrigger className="w-[135px]">
                  <SelectValue placeholder="Select a length" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Note length</SelectLabel>
                    <SelectItem value="1/4th">1/4th</SelectItem>
                    <SelectItem value="1/4th triplet">1/4th triplet</SelectItem>
                    <SelectItem value="1/8th">1/8th</SelectItem>
                    <SelectItem value="1/8th triplet">1/8th triplet</SelectItem>
                    <SelectItem value="1/16th">1/16th</SelectItem>
                    <SelectItem value="1/16th triplet">
                      1/16th triplet
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <div className="baseFlex">
                <Button
                  disabled={editingPalmMuteNodes}
                  style={{
                    borderRadius: editingPalmMuteNodes
                      ? "0.375rem 0 0 0.375rem"
                      : "0.375rem",
                  }}
                  // className="transition-colors transition-opacity"
                  onClick={toggleEditingPalmMuteNodes}
                >
                  PM Editor
                </Button>

                {editingPalmMuteNodes && (
                  <Button
                    className="rounded-l-none rounded-r-md px-2 py-0"
                    onClick={toggleEditingPalmMuteNodes}
                  >
                    <IoClose className="h-6 w-6" />
                  </Button>
                )}
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
                  }}
                  className="baseFlex gap-2"
                  onClick={() =>
                    setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
                  }
                >
                  Delete strums
                  <FaTrashAlt className="hidden h-4 w-4 sm:block" />
                </Button>

                {showingDeleteStrumsButtons && (
                  <Button
                    variant={"destructive"}
                    className="rounded-l-none rounded-r-md px-2 py-0"
                    onClick={() =>
                      setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
                    }
                  >
                    <IoClose className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>

            <div className="baseVertFlex lightestGlassmorphic gap-1 rounded-md px-4 py-3 text-sm xs:px-8 sm:w-auto sm:gap-2 sm:self-center md:px-4">
              <div className="baseFlex w-auto gap-2 font-semibold">
                <BsKeyboard className="h-6 w-6" />
                Hotkeys
              </div>

              <div className="mt-2 grid grid-cols-[45px_5px_70px] !place-items-start gap-2 md:flex md:w-full md:gap-2">
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
                <div className="baseFlex gap-1">
                  <kbd>s</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Slap</p>
                <div className="baseFlex gap-1">
                  <kbd>&gt;</kbd>
                </div>
                <p>-</p>
                <p className="md:mr-4">Accented</p>
                <div className="baseFlex gap-1">
                  <kbd>.</kbd>
                </div>
                <p>-</p>
                <p>Staccato</p>
              </div>
            </div>
          </div>

          <div className="baseFlex !items-start overflow-y-auto">
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
            <div className="baseFlex gap-4">
              <Button
                variant={"ghost"}
                onClick={() => {
                  if (audioMetadata.playing) pauseAudio();
                  setStrummingPatternBeingEdited(null);
                }}
              >
                Close
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
        </div>
      </FocusTrap>
    </motion.div>
  );
}

export default StrummingPatternModal;
