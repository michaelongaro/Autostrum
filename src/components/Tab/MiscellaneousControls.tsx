import { arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import { AiOutlineEllipsis } from "react-icons/ai";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { FaTrashAlt } from "react-icons/fa";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { LuClipboardPaste } from "react-icons/lu";
import { shallow } from "zustand/shallow";
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

interface MiscellaneousControls {
  type: "section" | "tab" | "chord" | "chordSequence";
  sectionIndex: number;
  sectionId: string;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  hidePlayPauseButton?: boolean;
}

function MiscellaneousControls({
  type,
  sectionIndex,
  sectionId,
  subSectionIndex,
  chordSequenceIndex,
  hidePlayPauseButton,
}: MiscellaneousControls) {
  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);

  const {
    id,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
    previewMetadata,
    currentInstrument,
    getTabData,
    setTabData,
    currentlyCopiedData,
    setCurrentlyCopiedData,
    playTab,
    pauseAudio,
  } = useTabStore(
    (state) => ({
      id: state.id,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      audioMetadata: state.audioMetadata,
      previewMetadata: state.previewMetadata,
      currentInstrument: state.currentInstrument,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      currentlyCopiedData: state.currentlyCopiedData,
      setCurrentlyCopiedData: state.setCurrentlyCopiedData,
      playTab: state.playTab,
      pauseAudio: state.pauseAudio,
    }),
    shallow
  );

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
        chordSequenceIndex - 1
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
        subSectionIndex - 1
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
        chordSequenceIndex + 1
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
        subSectionIndex + 1
      );

      newTabData[sectionIndex]!.data = newSubSection;
    } else if (sectionIndex !== undefined) {
      newTabData = arrayMove(newTabData, sectionIndex, sectionIndex + 1);
    }

    setTabData(newTabData);
  }

  function deleteSection() {
    const newTabData = getTabData();

    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      const newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence.splice(chordSequenceIndex, 1);

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      const newSubSection = newTabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      newSubSection.splice(subSectionIndex, 1);

      newTabData[sectionIndex]!.data = newSubSection;
    } else if (sectionIndex !== undefined) {
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

  // concept mostly working below but still not getting new memory reference... just throw into chatgpt

  function copySection() {
    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      const newChordSequence = replaceIdInChordSequence(
        structuredClone(
          getTabData()[sectionIndex]?.data[subSectionIndex]?.data[
            chordSequenceIndex
          ] as ChordSequence
        )
      );

      setCurrentlyCopiedData({
        type: "chordSequence",
        data: newChordSequence,
      });
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      if (type === "chord") {
        const newSubSection = replaceIdInChordSection(
          structuredClone(
            getTabData()[sectionIndex]?.data[subSectionIndex] as ChordSection
          )
        );

        setCurrentlyCopiedData({
          type: "chord",
          data: newSubSection,
        });
      } else if (type === "tab") {
        const newSubSection = replaceIdInTabSection(
          structuredClone(
            getTabData()[sectionIndex]?.data[subSectionIndex] as TabSection
          )
        );

        setCurrentlyCopiedData({
          type: "tab",
          data: newSubSection,
        });
      }
    } else if (sectionIndex !== undefined) {
      setCurrentlyCopiedData({
        type: "section",
        data: replaceIdInSection(structuredClone(getTabData()[sectionIndex]!)),
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
    const newTabData = getTabData();

    if (
      currentlyCopiedData.type === "chordSequence" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined &&
      chordSequenceIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex]!.data[
        chordSequenceIndex
      ] = currentlyCopiedData.data as ChordSequence;
    } else if (
      currentlyCopiedData.type === "chord" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] =
        currentlyCopiedData.data as ChordSection;
    } else if (
      currentlyCopiedData.type === "tab" &&
      sectionIndex !== undefined &&
      subSectionIndex !== undefined
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] =
        currentlyCopiedData.data as TabSection;
    } else if (
      currentlyCopiedData.type === "section" &&
      sectionIndex !== undefined
    ) {
      // titles of sections need to be unique in order for section progression
      // to not have two completely different sections with the same title

      // TODO: technically should be isolating just the name of the section w/o any numbers
      // I think will have problems if you try to do a letters only regex if the person
      // put numbers specifically in the original title of the section...
      const countOfSection = getTabData().filter((section) => {
        return section?.title.includes(currentlyCopiedData.data.title);
      }).length;

      const uniqueTitle = `${currentlyCopiedData.data.title} ${
        countOfSection + 1
      }`;

      newTabData[sectionIndex] = {
        id: sectionId,
        title: uniqueTitle,
        data: structuredClone(currentlyCopiedData.data.data),
      } as Section;
    }

    setTabData(newTabData);
  }

  return (
    <div className="baseFlex w-1/6 !flex-col-reverse !items-end gap-2 lg:!flex-row lg:!justify-end">
      {!hidePlayPauseButton && (
        <Button
          variant="playPause"
          disabled={
            !currentInstrument ||
            audioMetadata.type === "Artist recording" ||
            artificalPlayButtonTimeout ||
            sectionIsEffectivelyEmpty(
              getTabData(),
              sectionIndex,
              subSectionIndex
            )
          }
          onClick={() => {
            if (
              audioMetadata.playing &&
              isEqual(audioMetadata.location, {
                sectionIndex,
                subSectionIndex,
                chordSequenceIndex,
              })
            ) {
              pauseAudio();
              setArtificialPlayButtonTimeout(true);

              setTimeout(() => {
                setArtificialPlayButtonTimeout(false);
              }, 300);
            } else {
              if (audioMetadata.playing || previewMetadata.playing) {
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
                audioMetadata.playing || previewMetadata.playing ? 50 : 0
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
          <Button variant={"secondary"} className="px-2">
            <AiOutlineEllipsis className="h-8 w-8" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={"bottom"}
          onCloseAutoFocus={(event) => {
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
            <BiUpArrowAlt className="h-5 w-5" />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            disabled={disableMoveDown()}
            onClick={moveDown}
          >
            Move down
            <BiDownArrowAlt className="h-5 w-5" />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2 focus-within:!bg-[rgb(255,0,0)] focus-within:!text-pink-50"
            onClick={deleteSection}
          >
            Delete
            <FaTrashAlt className="h-4 w-5" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            onClick={copySection}
          >
            Copy
            <HiOutlineClipboardCopy className="h-5 w-5" />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="baseFlex !justify-between gap-2"
            disabled={disablePaste()}
            onClick={pasteSection}
          >
            Paste
            <LuClipboardPaste className="h-5 w-5" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default MiscellaneousControls;
