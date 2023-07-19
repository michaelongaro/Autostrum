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
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { Label } from "@radix-ui/react-label";
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
import { HiOutlineInformationCircle } from "react-icons/hi";
import type { LastModifiedPalmMuteNodeLocation } from "../Tab/TabSection";
import StrummingPatternPalmMuteNode from "../Tab/StrummingPatternPalmMuteNode";
import StrummingPattern from "../Tab/StrummingPattern";
import isEqual from "lodash.isequal";

const backdropVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface StrummingPatternModal {
  strummingPatternThatIsBeingEdited: {
    index: number;
    value: StrummingPatternType;
  };
}

function StrummingPatternModal({
  strummingPatternThatIsBeingEdited,
}: StrummingPatternModal) {
  const innerModalRef = useRef<HTMLDivElement>(null);

  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);
  const [editingPalmMuteNodes, setEditingPalmMuteNodes] = useState(false);
  const [showingDeleteStrumsButtons, setShowingDeleteStrumsButtons] =
    useState(false);

  const [isFocused, setIsFocused] = useState<boolean[]>(
    strummingPatternThatIsBeingEdited.value.strums.map(() => false)
  );

  // whenever adding more strums or deleting strums, immediately edit the isFocused array
  // to either add new false values or delete the strum that was deleted!

  const {
    tuning,
    strummingPatterns,
    setStrummingPatterns,
    setStrummingPatternThatIsBeingEdited,
    modifyStrummingPatternPalmMuteDashes,
    tabData,
    setTabData,
  } = useTabStore(
    (state) => ({
      tuning: state.tuning,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      setStrummingPatternThatIsBeingEdited:
        state.setStrummingPatternThatIsBeingEdited,
      modifyStrummingPatternPalmMuteDashes:
        state.modifyStrummingPatternPalmMuteDashes,
      tabData: state.tabData,
      setTabData: state.setTabData,
    }),
    shallow
  );

  function handleNoteLengthChange(
    value:
      | "1/4th"
      | "1/4th triplet"
      | "1/8th"
      | "1/8th triplet"
      | "1/16th"
      | "1/16th triplet"
  ) {
    const newStrummingPattern = { ...strummingPatternThatIsBeingEdited };

    newStrummingPattern.value.noteLength = value;

    setStrummingPatternThatIsBeingEdited(newStrummingPattern);
  }

  function toggleEditingPalmMuteNodes() {
    if (!editingPalmMuteNodes) {
      setEditingPalmMuteNodes(true);
      return;
    } else if (lastModifiedPalmMuteNode) {
      // if prevValue was "" then can just do hardcoded solution as before
      if (lastModifiedPalmMuteNode.prevValue === "") {
        const newStrummingPattern = {
          ...strummingPatternThatIsBeingEdited,
        };

        newStrummingPattern.value.strums[
          lastModifiedPalmMuteNode.columnIndex
        ]!.palmMute = "";

        setStrummingPatternThatIsBeingEdited(newStrummingPattern);
      } else {
        modifyStrummingPatternPalmMuteDashes(
          strummingPatternThatIsBeingEdited,
          setStrummingPatternThatIsBeingEdited,
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
    // if strumming pattern length has changed, then need to update the children
    // chord sequences in tabData (that use this pattern) to match the new length.

    const newLength = strummingPatternThatIsBeingEdited.value.strums.length;
    const oldLength =
      strummingPatterns[strummingPatternThatIsBeingEdited.index]?.strums
        ?.length;

    if (oldLength !== undefined && newLength !== oldLength) {
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

          if (
            subSection?.type === "chord" &&
            isEqual(
              subSection.strummingPattern,
              strummingPatterns[strummingPatternThatIsBeingEdited.index]
            )
          ) {
            for (
              let chordSequenceIndex = 0;
              chordSequenceIndex < subSection.data.length;
              chordSequenceIndex++
            ) {
              const chordProgression =
                subSection.data[chordSequenceIndex]?.data;
              if (!chordProgression) continue;

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
                newTabData[sectionIndex]?.data[subSectionIndex].data[
                  chordSequenceIndex
                  // @ts-expect-error undefined checks are done above
                ]!.data = newChordProgression;
              }
            }
          }
        }
      }

      setTabData(newTabData);
    }

    const newStrummingPatterns = [...strummingPatterns];

    newStrummingPatterns[strummingPatternThatIsBeingEdited.index] = {
      ...strummingPatternThatIsBeingEdited.value,
    };

    setStrummingPatterns(newStrummingPatterns);
    setStrummingPatternThatIsBeingEdited(null);
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
          setStrummingPatternThatIsBeingEdited(null);
        }
      }}
    >
      <div
        ref={innerModalRef}
        className="baseVertFlex max-h-[90vh] min-w-[300px] max-w-[80vw] !flex-nowrap !justify-start gap-12 overflow-y-auto rounded-md bg-pink-400 p-4 shadow-sm transition-all md:p-8 xl:max-w-[50vw]"
      >
        {/* controls */}
        <div className="baseFlex w-full !justify-start gap-2">
          Note length
          <Select
            onValueChange={handleNoteLengthChange}
            value={strummingPatternThatIsBeingEdited.value.noteLength}
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
              className="h-9 px-3 md:h-10 md:px-4 md:py-2"
              onClick={toggleEditingPalmMuteNodes}
            >
              Edit palm mute sections
            </Button>

            {editingPalmMuteNodes && (
              <Button
                className="h-9 rounded-l-none rounded-r-md px-3 md:h-10 md:px-4 md:py-2 "
                onClick={toggleEditingPalmMuteNodes}
              >
                x
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
              className="h-9 px-3 duration-0 md:h-10 md:px-4 md:py-2"
              onClick={() =>
                setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
              }
            >
              Delete strums
            </Button>

            {showingDeleteStrumsButtons && (
              <Button
                variant={"destructive"}
                className="h-9 rounded-l-none rounded-r-md px-3 md:h-10 md:px-4 md:py-2"
                onClick={() =>
                  setShowingDeleteStrumsButtons(!showingDeleteStrumsButtons)
                }
              >
                x
              </Button>
            )}
          </div>
        </div>

        <div className="baseFlex lightGlassmorphic gap-4 rounded-md p-2 ">
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
          data={strummingPatternThatIsBeingEdited.value}
          mode={"editingStrummingPattern"}
          index={strummingPatternThatIsBeingEdited.index}
          editingPalmMuteNodes={editingPalmMuteNodes}
          setEditingPalmMuteNodes={setEditingPalmMuteNodes}
          showingDeleteStrumsButtons={showingDeleteStrumsButtons}
        />

        <div className="baseVertFlex gap-8">
          <Button className="baseFlex gap-4">
            {/* conditional play/pause icon here */}
            Preview strumming pattern
          </Button>
          <div className="baseFlex gap-4">
            <Button
              variant={"secondary"}
              onClick={() => setStrummingPatternThatIsBeingEdited(null)}
            >
              Close
            </Button>

            {/* should be disabled if lodash isEqual to the strummingPatterns original version */}
            <Button
              disabled={
                strummingPatternThatIsBeingEdited.value.strums.every(
                  (strum) => strum.strum === ""
                ) ||
                isEqual(
                  strummingPatternThatIsBeingEdited.value,
                  strummingPatterns[strummingPatternThatIsBeingEdited.index]
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
