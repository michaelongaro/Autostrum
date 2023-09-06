import { useState, useRef } from "react";
import {
  useTabStore,
  type StrummingPattern as StrummingPatternType,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { motion } from "framer-motion";
import { parse, toString } from "~/utils/tunings";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { BsFillPlayFill, BsStopFill } from "react-icons/bs";
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
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { HiOutlineInformationCircle } from "react-icons/hi";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import StrummingPattern from "../Tab/StrummingPattern";
import isEqual from "lodash.isequal";
import useSound from "~/hooks/useSound";

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
  const [showingDeleteStrumsButtons, setShowingDeleteStrumsButtons] =
    useState(false);
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const innerModalRef = useRef<HTMLDivElement>(null);
  const {
    tuning,
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternBeingEdited,
    modifyStrummingPatternPalmMuteDashes,
    tabData,
    setTabData,
    previewMetadata,
    audioMetadata,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternBeingEdited: state.setStrummingPatternBeingEdited,
      modifyStrummingPatternPalmMuteDashes:
        state.modifyStrummingPatternPalmMuteDashes,
      tabData: state.tabData,
      setTabData: state.setTabData,
      previewMetadata: state.previewMetadata,
      audioMetadata: state.audioMetadata,
    }),
    shallow
  );

  const { playPreview, pauseAudio } = useSound();

  function handleNoteLengthChange(
    value:
      | "1/4th"
      | "1/4th triplet"
      | "1/8th"
      | "1/8th triplet"
      | "1/16th"
      | "1/16th triplet"
  ) {
    const newStrummingPattern = { ...strummingPatternBeingEdited };

    newStrummingPattern.value.noteLength = value;

    setStrummingPatternBeingEdited(newStrummingPattern);
  }

  function toggleEditingPalmMuteNodes() {
    if (!editingPalmMuteNodes) {
      setEditingPalmMuteNodes(true);
      return;
    } else if (lastModifiedPalmMuteNode) {
      // if prevValue was "" then can just do hardcoded solution as before
      if (lastModifiedPalmMuteNode.prevValue === "") {
        const newStrummingPattern = {
          ...strummingPatternBeingEdited,
        };

        newStrummingPattern.value.strums[
          lastModifiedPalmMuteNode.columnIndex
        ]!.palmMute = "";

        setStrummingPatternBeingEdited(newStrummingPattern);
      } else {
        modifyStrummingPatternPalmMuteDashes(
          strummingPatternBeingEdited,
          setStrummingPatternBeingEdited,
          lastModifiedPalmMuteNode.columnIndex,
          "tempRemoveLater",
          lastModifiedPalmMuteNode.prevValue
        );
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
      const newTabData = [...tabData];
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
                  strummingPatterns[strummingPatternBeingEdited.index]
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
                ]!.data = [...chordProgression.slice(0, newLength)]; // hoping "..." is enough to give new memory reference
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

    const newStrummingPatterns = [...strummingPatterns];

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
      className="baseFlex fixed left-0 top-0 z-50 h-[100vh] w-[100vw] bg-black/50"
      variants={backdropVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (audioMetadata.playing) pauseAudio();
          setStrummingPatternBeingEdited(null);
        }
      }}
    >
      <div
        ref={innerModalRef}
        className="baseVertFlex max-h-[90vh] min-w-[300px] max-w-[80vw] !flex-nowrap !justify-start gap-12 overflow-y-auto rounded-md bg-pink-400 p-4 shadow-sm transition-all md:p-8 xl:max-w-[50vw]"
      >
        {/* controls */}
        <div className="baseFlex w-full !justify-start gap-2">
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
                <SelectItem value="1/16th triplet">1/16th triplet</SelectItem>
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
              Edit palm mute sections
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
              // className="transition-colors transition-opacity"
              onClick={() =>
                setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
              }
            >
              Delete strums
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

        <div className="baseFlex lightestGlassmorphic gap-2 rounded-md p-2 text-sm ">
          <HiOutlineInformationCircle className="mr-2 h-6 w-6" />
          <div className="baseFlex gap-2">
            <span className="font-semibold">v / d</span>
            <p>-</p>
            <p>Downstrum</p>
          </div>
          <div className="baseFlex gap-2">
            <span className="font-semibold">^ / u</span>
            <p>-</p>
            <p>Upstrum</p>
          </div>
          <div className="baseFlex gap-2">
            <p className="font-semibold">s</p>
            <p>-</p>
            <p>Slap</p>
          </div>
          <div className="baseFlex gap-2">
            <p className="font-semibold">&gt;</p>
            <p>-</p>
            <p>Accented</p>
          </div>
        </div>

        {/* editing inputs of strumming pattern */}
        <StrummingPattern
          data={strummingPatternBeingEdited.value}
          mode={"editingStrummingPattern"}
          index={strummingPatternBeingEdited.index}
          editingPalmMuteNodes={editingPalmMuteNodes}
          setEditingPalmMuteNodes={setEditingPalmMuteNodes}
          showingDeleteStrumsButtons={showingDeleteStrumsButtons}
        />

        <div className="baseVertFlex gap-8">
          <Button
            disabled={artificalPlayButtonTimeout}
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
              Preview strumming pattern
            </>
          </Button>
          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => setStrummingPatternBeingEdited(null)}
            >
              Close
            </Button>

            {/* should be disabled if lodash isEqual to the strummingPatterns original version */}
            <Button
              disabled={
                strummingPatternBeingEdited.value.strums.every(
                  (strum) => strum.strum === ""
                ) ||
                isEqual(
                  strummingPatternBeingEdited.value,
                  strummingPatterns[strummingPatternBeingEdited.index]
                )
              }
              onClick={handleSaveStrummingPattern}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default StrummingPatternModal;
