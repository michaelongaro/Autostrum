import {
  useTabStore,
  type Chord as ChordType,
  type Section,
  type TabSection,
  type ChordSection,
  type ChordSequence,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { arrayMove } from "@dnd-kit/sortable";
import { BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { AiOutlineEllipsis } from "react-icons/ai";
import { FaTrashAlt } from "react-icons/fa";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { LuClipboardPaste } from "react-icons/lu";

import useSound from "~/hooks/useSound";

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
  const { playTab, pauseTab } = useSound();

  const {
    chords,
    sectionProgression,
    setSectionProgression,
    tuning,
    bpm,
    capo,
    setChords,
    setChordBeingEdited,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
    tabData,
    setTabData,
    currentlyCopiedData,
    setCurrentlyCopiedData,
    playbackSpeed,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      tuning: state.tuning,
      bpm: state.bpm,
      capo: state.capo,
      setChords: state.setChords,
      setChordBeingEdited: state.setChordBeingEdited,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      currentInstrument: state.currentInstrument,
      tabData: state.tabData,
      setTabData: state.setTabData,
      currentlyCopiedData: state.currentlyCopiedData,
      setCurrentlyCopiedData: state.setCurrentlyCopiedData,
      playbackSpeed: state.playbackSpeed,
    }),
    shallow
  );

  // for tabStore create getter + setter for currentlyCopiedData
  //  which will be an object like this {
  // type: "section" | "tab" | "chord",
  // data: TabSection | TabSection | ChordSection | ChordSequence
  //      }
  //     ^ bearing in mind that if you are copying the seciton you will have to add "2", "3", etc since we need to keep titles unique

  function disableMoveDown() {
    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      const newChordSequence = tabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      return chordSequenceIndex === newChordSequence.length - 1;
    } else if (subSectionIndex !== undefined && sectionIndex) {
      const newSubSection = tabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      return subSectionIndex === newSubSection.length - 1;
    } else if (sectionIndex !== undefined) {
      return sectionIndex === tabData.length - 1;
    }

    return false;
  }

  function disableMoveUp() {
    if (
      chordSequenceIndex !== undefined &&
      subSectionIndex !== undefined &&
      sectionIndex !== undefined
    ) {
      return chordSequenceIndex === 0;
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      return subSectionIndex === 0;
    } else if (sectionIndex !== undefined) {
      return sectionIndex === 0;
    }

    return false;
  }

  function moveUp() {
    let newTabData = [...tabData];

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
    let newTabData = [...tabData];

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
    const newTabData = [...tabData];

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
      const newChordSequence = structuredClone(
        tabData[sectionIndex]?.data[subSectionIndex]?.data[
          chordSequenceIndex
        ] as ChordSequence
      );

      setCurrentlyCopiedData({
        type: "chordSequence",
        data: newChordSequence,
      });
    } else if (subSectionIndex !== undefined && sectionIndex !== undefined) {
      if (type === "chord") {
        const newSubSection = structuredClone(
          tabData[sectionIndex]?.data[subSectionIndex] as ChordSection
        );

        setCurrentlyCopiedData({
          type: "chord",
          data: newSubSection,
        });
      } else if (type === "tab") {
        const newSubSection = structuredClone(
          tabData[sectionIndex]?.data[subSectionIndex] as TabSection
        );

        setCurrentlyCopiedData({
          type: "tab",
          data: newSubSection,
        });
      }
    } else if (sectionIndex !== undefined) {
      // const countOfSection = tabData.filter((section) => {
      //   return section?.title.includes(tabData[sectionIndex]!.title);
      // }).length;

      // const newSection = {
      //   title: `${tabData[sectionIndex]!.title} ${countOfSection + 1}`,
      //   data: cloneDeep(tabData[sectionIndex]!.data),
      // } as Section;

      setCurrentlyCopiedData({
        type: "section",
        data: structuredClone(tabData[sectionIndex]!),
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
    const newTabData = [...tabData];

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
      const countOfSection = tabData.filter((section) => {
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
            !currentInstrument || audioMetadata.type === "Artist recorded"
          }
          onClick={() => {
            if (audioMetadata.playing) {
              void pauseTab();
            } else {
              setAudioMetadata({
                ...audioMetadata,
                location: {
                  sectionIndex,
                  subSectionIndex,
                  chordSequenceIndex,
                },
              });

              void playTab({
                tabData,
                rawSectionProgression: sectionProgression,
                tuningNotes: tuning,
                baselineBpm: bpm,
                chords,
                capo,
                playbackSpeed,
                location: {
                  sectionIndex,
                  subSectionIndex,
                  chordSequenceIndex,
                },
              });
            }
          }}
        >
          {audioMetadata.type === "Generated" &&
          audioMetadata.playing &&
          audioMetadata.location?.sectionIndex === sectionIndex &&
          audioMetadata.location?.subSectionIndex === subSectionIndex &&
          audioMetadata.location?.chordSequenceIndex === chordSequenceIndex ? (
            <BsFillPauseFill className="h-5 w-5" />
          ) : (
            <BsFillPlayFill className="h-5 w-5" />
          )}
        </Button>
      )}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant={"secondary"} className="px-2">
            <AiOutlineEllipsis className="h-8 w-8" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent side={"bottom"}>
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
