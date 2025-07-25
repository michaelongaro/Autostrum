import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { LiaEllipsisVSolid } from "react-icons/lia";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { FaTrashAlt } from "react-icons/fa";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { LuClipboardPaste } from "react-icons/lu";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  useTabStore,
  type ChordSection,
  type ChordSequence,
  type Section,
  type TabSection,
} from "~/stores/TabStore";
import {
  replaceIdInChordSequence,
  replaceIdInChordSection,
  replaceIdInTabSection,
  replaceIdInSection,
} from "~/utils/replaceWithUniqueIdHelpers";
import isEqual from "lodash.isequal";
import sectionIsEffectivelyEmpty from "~/utils/sectionIsEffectivelyEmpty";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import { Check } from "lucide-react";

interface MiscellaneousControls {
  type: "section" | "tab" | "chord" | "chordSequence";
  sectionIndex: number;
  sectionId: string;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  hidePlayPauseButton?: boolean;
  forSectionContainer?: boolean;
}

function MiscellaneousControls({
  type,
  sectionIndex,
  sectionId,
  subSectionIndex,
  chordSequenceIndex,
  hidePlayPauseButton,
  forSectionContainer,
}: MiscellaneousControls) {
  const {
    id,
    bpm,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
    getTabData,
    setTabData,
    currentlyCopiedData,
    setCurrentlyCopiedData,
    playTab,
    pauseAudio,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    currentInstrument: state.currentInstrument,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    currentlyCopiedData: state.currentlyCopiedData,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
  }));

  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);
  const [showCopyCheckmark, setShowCopyCheckmark] = useState(false);
  const [showPasteCheckmark, setShowPasteCheckmark] = useState(false);

  function disableMoveDown() {
    if (chordSequenceIndex !== undefined && subSectionIndex !== undefined) {
      const chordSequence = getTabData()[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      return chordSequenceIndex === chordSequence.length - 1;
    } else if (subSectionIndex !== undefined) {
      const subSection = getTabData()[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      return subSectionIndex === subSection.length - 1;
    } else {
      return sectionIndex === getTabData().length - 1;
    }
  }

  function disableMoveUp() {
    if (chordSequenceIndex !== undefined && subSectionIndex !== undefined) {
      return chordSequenceIndex === 0;
    } else if (subSectionIndex !== undefined) {
      return subSectionIndex === 0;
    } else {
      return sectionIndex === 0;
    }
  }

  function moveUp() {
    let newTabData = getTabData();

    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      let newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence = arrayMove(
        newChordSequence,
        chordSequenceIndex,
        chordSequenceIndex - 1,
      );

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      let newSubSection = newTabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      newSubSection = arrayMove(
        newSubSection,
        subSectionIndex,
        subSectionIndex - 1,
      );

      newTabData[sectionIndex]!.data = newSubSection;
    } else if (sectionIndex !== undefined) {
      newTabData = arrayMove(newTabData, sectionIndex, sectionIndex - 1);
    }

    setTabData(newTabData);
  }

  function moveDown() {
    let newTabData = getTabData();

    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      let newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence = arrayMove(
        newChordSequence,
        chordSequenceIndex,
        chordSequenceIndex + 1,
      );

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      let newSubSection = newTabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      newSubSection = arrayMove(
        newSubSection,
        subSectionIndex,
        subSectionIndex + 1,
      );

      newTabData[sectionIndex]!.data = newSubSection;
    } else if (sectionIndex !== undefined) {
      newTabData = arrayMove(newTabData, sectionIndex, sectionIndex + 1);
    }

    setTabData(newTabData);
  }

  function copySection() {
    setShowCopyCheckmark(true);

    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      const newChordSequence = structuredClone(
        getTabData()[sectionIndex]?.data[subSectionIndex]?.data[
          chordSequenceIndex
        ] as ChordSequence,
      );

      setCurrentlyCopiedData({
        type: "chordSequence",
        data: newChordSequence,
      });
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      if (type === "chord") {
        const newSubSection = structuredClone(
          getTabData()[sectionIndex]?.data[subSectionIndex] as ChordSection,
        );

        setCurrentlyCopiedData({
          type: "chord",
          data: newSubSection,
        });
      } else if (type === "tab") {
        const newSubSection = replaceIdInTabSection(
          structuredClone(
            getTabData()[sectionIndex]?.data[subSectionIndex] as TabSection,
          ),
        );

        setCurrentlyCopiedData({
          type: "tab",
          data: newSubSection,
        });
      }
    } else if (sectionIndex !== undefined) {
      setCurrentlyCopiedData({
        type: "section",
        data: structuredClone(getTabData()[sectionIndex]!),
      });
    }
  }

  // need to make paste button disabled if either there isn't any data copied
  // or if the data copied is of a different type
  function disablePaste() {
    return !currentlyCopiedData || currentlyCopiedData.type !== type;
  }

  function pasteSection() {
    if (!currentlyCopiedData) return;

    setShowPasteCheckmark(true);

    const newTabData = getTabData();

    if (
      currentlyCopiedData.type === "chordSequence" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined &&
      chordSequenceIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex]!.data[
        chordSequenceIndex
      ] = replaceIdInChordSequence(currentlyCopiedData.data as ChordSequence);
    } else if (
      currentlyCopiedData.type === "chord" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] = replaceIdInChordSection(
        currentlyCopiedData.data as ChordSection,
      );
    } else if (
      currentlyCopiedData.type === "tab" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] = replaceIdInTabSection(
        currentlyCopiedData.data as TabSection,
      );
    } else if (
      currentlyCopiedData.type === "section" &&
      sectionIndex !== undefined
    ) {
      newTabData[sectionIndex] = {
        ...getTabData()[sectionIndex],
        data: replaceIdInSection(currentlyCopiedData.data as Section),
      } as Section;
    }

    setTabData(newTabData);
  }

  function deleteSection() {
    pauseAudio(true);
    setAudioMetadata({
      ...audioMetadata,
      playing: false, // should get set to false by pauseAudio, but isn't hurting anything
      location: null,
    });

    const newTabData = getTabData();

    if (chordSequenceIndex !== undefined && subSectionIndex !== undefined) {
      const newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence.splice(chordSequenceIndex, 1);

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex !== undefined) {
      const newSubSection = newTabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      newSubSection.splice(subSectionIndex, 1);

      newTabData[sectionIndex]!.data = newSubSection;
    } else {
      const newSectionProgression = [...sectionProgression];

      for (let i = newSectionProgression.length - 1; i >= 0; i--) {
        if (
          newSectionProgression[i]?.sectionId === newTabData[sectionIndex]?.id
        ) {
          newSectionProgression.splice(i, 1);
        }
      }

      newTabData.splice(sectionIndex, 1);
      setSectionProgression(newSectionProgression);
    }

    setTabData(newTabData);
  }

  return (
    <div
      className={`baseFlex !items-end gap-2 ${
        forSectionContainer
          ? "w-2/6 !justify-end sm:w-1/6 sm:!flex-row sm:!justify-end"
          : `w-1/6 lg:!justify-end ${type === "tab" || type === "chord" ? "mr-3 mt-0.5 lg:mr-0 lg:mt-0" : "!justify-end"}`
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {!hidePlayPauseButton && (
        <Button
          variant="audio"
          disabled={
            audioMetadata.editingLoopRange ||
            bpm === -1 ||
            !currentInstrument ||
            artificalPlayButtonTimeout ||
            sectionIsEffectivelyEmpty(
              getTabData(),
              sectionIndex,
              subSectionIndex,
            )
          }
          onClick={() => {
            const locationIsEqual = isEqual(audioMetadata.location, {
              sectionIndex,
              subSectionIndex,
              chordSequenceIndex,
            });

            if (audioMetadata.playing && locationIsEqual) {
              pauseAudio();
              setArtificialPlayButtonTimeout(true);

              setTimeout(() => {
                setArtificialPlayButtonTimeout(false);
              }, 300);
            } else {
              if (!locationIsEqual) {
                pauseAudio(true);
              }

              setTimeout(
                () => {
                  void playTab({
                    tabId: id,
                    location: {
                      sectionIndex,
                      subSectionIndex,
                      chordSequenceIndex,
                    },
                  });
                },
                !locationIsEqual ? 50 : 0,
              );
            }
          }}
        >
          <PlayButtonIcon
            uniqueLocationKey={`miscControls${sectionIndex}${
              subSectionIndex ?? ""
            }${chordSequenceIndex ?? ""}`}
            tabId={id}
            currentInstrument={currentInstrument}
            audioMetadata={audioMetadata}
            sectionIndex={sectionIndex}
            subSectionIndex={subSectionIndex}
            chordSequenceIndex={chordSequenceIndex}
          />
        </Button>
      )}

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Miscellaneous controls dropdown trigger"
            variant={"ghost"}
            style={{
              marginRight:
                subSectionIndex === undefined &&
                chordSequenceIndex === undefined
                  ? "2rem"
                  : "0",
            }}
            className="px-0"
          >
            <LiaEllipsisVSolid className="h-8 w-8" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={"bottom"}
          onCloseAutoFocus={(event) => {
            setShowCopyCheckmark(false);
            setShowPasteCheckmark(false);

            event.preventDefault();
            event.stopPropagation();
            // not sure if this does a perfect job of preventing scrolling while
            // sections are moving to their new location post moveUp/Down, but it is
            // better than the default behavior
          }}
        >
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            disabled={disableMoveUp()}
            onClick={moveUp}
          >
            Move up
            <BiUpArrowAlt className="size-5" />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            disabled={disableMoveDown()}
            onClick={moveDown}
          >
            Move down
            <BiDownArrowAlt className="size-5" />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            onClick={copySection}
          >
            Copy
            {showCopyCheckmark ? (
              <Check className="size-5" />
            ) : (
              <HiOutlineClipboardCopy className="size-5" />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            disabled={disablePaste()}
            onClick={pasteSection}
          >
            Paste
            {showPasteCheckmark ? (
              <Check className="size-5" />
            ) : (
              <LuClipboardPaste className="size-5" />
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="baseFlex !justify-between gap-2 focus-within:!bg-destructive focus-within:!text-destructive-foreground active:!bg-destructive active:!text-destructive-foreground"
            onClick={deleteSection}
          >
            Delete
            <FaTrashAlt className="h-4 w-5" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default MiscellaneousControls;
