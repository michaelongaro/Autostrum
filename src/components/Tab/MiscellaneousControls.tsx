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
import {
  useSectionData,
  useSubSectionData,
  useTabDataLength,
} from "~/hooks/useTabDataSelectors";

interface MiscellaneousControls {
  type: "section" | "tab" | "chord" | "chordSequence";
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  hidePlayPauseButton?: boolean;
  forSectionContainer?: boolean;
}

function MiscellaneousControls({
  type,
  sectionIndex,
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
    currentlyCopiedData,
    setCurrentlyCopiedData,
    playTab,
    pauseAudio,
    setTabData,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    currentInstrument: state.currentInstrument,
    currentlyCopiedData: state.currentlyCopiedData,
    setCurrentlyCopiedData: state.setCurrentlyCopiedData,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    setTabData: state.setTabData,
  }));

  const section = useSectionData(sectionIndex);
  const subSection = useSubSectionData(sectionIndex, subSectionIndex || 0);
  const tabDataLength = useTabDataLength();

  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);
  const [showCopyCheckmark, setShowCopyCheckmark] = useState(false);
  const [showPasteCheckmark, setShowPasteCheckmark] = useState(false);

  function disableMoveDown() {
    if (chordSequenceIndex !== undefined && subSectionIndex !== undefined) {
      const chordSequence = subSection?.data as ChordSequence[];

      return chordSequenceIndex === chordSequence.length - 1;
    } else if (subSectionIndex !== undefined) {
      return subSectionIndex === subSection.data.length - 1;
    } else {
      return sectionIndex === tabDataLength - 1;
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
    setTabData((draft) => {
      if (
        chordSequenceIndex !== undefined &&
        subSectionIndex !== undefined &&
        sectionIndex !== undefined
      ) {
        const chordSequence = draft[sectionIndex]?.data[subSectionIndex]
          ?.data as ChordSequence[];

        const movedSequence = arrayMove(
          chordSequence,
          chordSequenceIndex,
          chordSequenceIndex - 1,
        );

        draft[sectionIndex]!.data[subSectionIndex]!.data = movedSequence;
      } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
        const subSection = draft[sectionIndex]!.data;

        const movedSubSection = arrayMove(
          subSection,
          subSectionIndex,
          subSectionIndex - 1,
        );

        draft[sectionIndex]!.data = movedSubSection;
      } else if (sectionIndex !== undefined) {
        const movedSections = arrayMove(draft, sectionIndex, sectionIndex - 1);
        return movedSections;
      }
    });
  }

  function moveDown() {
    setTabData((draft) => {
      if (
        chordSequenceIndex !== undefined &&
        subSectionIndex !== undefined &&
        sectionIndex !== undefined
      ) {
        const chordSequence = draft[sectionIndex]?.data[subSectionIndex]
          ?.data as ChordSequence[];

        const movedSequence = arrayMove(
          chordSequence,
          chordSequenceIndex,
          chordSequenceIndex + 1,
        );

        draft[sectionIndex]!.data[subSectionIndex]!.data = movedSequence;
      } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
        const subSection = draft[sectionIndex]!.data;

        const movedSubSection = arrayMove(
          subSection,
          subSectionIndex,
          subSectionIndex + 1,
        );

        draft[sectionIndex]!.data = movedSubSection;
      } else if (sectionIndex !== undefined) {
        const movedSections = arrayMove(draft, sectionIndex, sectionIndex + 1);
        return movedSections;
      }
    });
  }

  function copySection() {
    setShowCopyCheckmark(true);

    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      const newChordSequence = structuredClone(
        subSection.data[chordSequenceIndex] as ChordSequence,
      );

      setCurrentlyCopiedData({
        type: "chordSequence",
        data: newChordSequence,
      });
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      if (type === "chord") {
        const newSubSection = structuredClone(subSection as ChordSection);

        setCurrentlyCopiedData({
          type: "chord",
          data: newSubSection,
        });
      } else if (type === "tab") {
        const newSubSection = replaceIdInTabSection(
          structuredClone(subSection as TabSection),
        );

        setCurrentlyCopiedData({
          type: "tab",
          data: newSubSection,
        });
      }
    } else if (sectionIndex !== undefined) {
      setCurrentlyCopiedData({
        type: "section",
        data: structuredClone(section),
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

    setTabData((draft) => {
      if (
        currentlyCopiedData.type === "chordSequence" &&
        sectionIndex !== undefined &&
        subSectionIndex !== undefined &&
        chordSequenceIndex !== undefined
      ) {
        draft[sectionIndex]!.data[subSectionIndex]!.data[chordSequenceIndex] =
          replaceIdInChordSequence(currentlyCopiedData.data as ChordSequence);
      } else if (
        currentlyCopiedData.type === "chord" &&
        sectionIndex !== undefined &&
        subSectionIndex !== undefined
      ) {
        draft[sectionIndex]!.data[subSectionIndex] = replaceIdInChordSection(
          currentlyCopiedData.data as ChordSection,
        );
      } else if (
        currentlyCopiedData.type === "tab" &&
        sectionIndex !== undefined &&
        subSectionIndex !== undefined
      ) {
        draft[sectionIndex]!.data[subSectionIndex] = replaceIdInTabSection(
          currentlyCopiedData.data as TabSection,
        );
      } else if (
        currentlyCopiedData.type === "section" &&
        sectionIndex !== undefined
      ) {
        draft[sectionIndex] = {
          ...section,
          data: replaceIdInSection(currentlyCopiedData.data as Section),
        } as Section;
      }
    });
  }

  function deleteSection() {
    pauseAudio(true);
    setAudioMetadata({
      ...audioMetadata,
      playing: false, // should get set to false by pauseAudio, but isn't hurting anything
      location: null,
    });

    setTabData((draft) => {
      if (chordSequenceIndex !== undefined && subSectionIndex !== undefined) {
        const chordSequenceData = draft[sectionIndex]?.data[subSectionIndex]
          ?.data as ChordSequence[];

        chordSequenceData.splice(chordSequenceIndex, 1);
      } else if (subSectionIndex !== undefined) {
        const subSectionData = draft[sectionIndex]!.data;

        subSectionData.splice(subSectionIndex, 1);
      } else {
        const newSectionProgression = [...sectionProgression];

        for (let i = newSectionProgression.length - 1; i >= 0; i--) {
          if (newSectionProgression[i]?.sectionId === draft[sectionIndex]?.id) {
            newSectionProgression.splice(i, 1);
          }
        }

        if (sectionIndex === 0) {
          draft.length = 0; // Clearing the entire array
          draft.push({
            id: crypto.randomUUID(),
            title: "Section 1",
            data: [],
          });
        } else {
          draft.splice(sectionIndex, 1);
        }

        setSectionProgression(newSectionProgression);
      }
    });
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
            sectionIsEffectivelyEmpty(section, subSectionIndex)
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
