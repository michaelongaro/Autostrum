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
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { LuClipboardPaste } from "react-icons/lu";
import { cloneDeep } from "lodash";

interface MiscellaneousControls {
  type: "section" | "tab" | "chord" | "chordSequence";
  sectionIndex: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
}

function MiscellaneousControls({
  type,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
}: MiscellaneousControls) {
  const {
    chords,
    setChords,
    setChordThatIsBeingEdited,
    tabData,
    setTabData,
    currentlyCopiedData,
    setCurrentlyCopiedData,
  } = useTabStore(
    (state) => ({
      chords: state.chords,
      setChords: state.setChords,
      setChordThatIsBeingEdited: state.setChordThatIsBeingEdited,
      tabData: state.tabData,
      setTabData: state.setTabData,
      currentlyCopiedData: state.currentlyCopiedData,
      setCurrentlyCopiedData: state.setCurrentlyCopiedData,
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
      newTabData.splice(sectionIndex, 1);
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
      const newChordSequence = cloneDeep(
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
        const newSubSection = cloneDeep(
          tabData[sectionIndex]?.data[subSectionIndex] as ChordSection
        );

        setCurrentlyCopiedData({
          type: "chord",
          data: newSubSection,
        });
      } else if (type === "tab") {
        const newSubSection = cloneDeep(
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
        data: cloneDeep(tabData[sectionIndex]!),
      });
    }
  }

  // need to make paste button disabled if either there isn't any data copied
  // or if the data copied is of a different type
  function disablePaste() {
    if (!currentlyCopiedData || currentlyCopiedData.type !== type) {
      return true;
    }

    return false;
  }

  function pasteSection() {
    if (!currentlyCopiedData) return;
    const newTabData = [...tabData];

    if (
      currentlyCopiedData.type === "chordSequence" &&
      sectionIndex &&
      subSectionIndex &&
      chordSequenceIndex
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex]!.data[
        chordSequenceIndex
      ] = currentlyCopiedData.data as ChordSequence;
    } else if (
      currentlyCopiedData.type === "chord" &&
      sectionIndex &&
      subSectionIndex
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] =
        currentlyCopiedData.data as ChordSection;
    } else if (
      currentlyCopiedData.type === "tab" &&
      sectionIndex &&
      subSectionIndex
    ) {
      newTabData[sectionIndex]!.data[subSectionIndex] =
        currentlyCopiedData.data as TabSection;
    } else if (currentlyCopiedData.type === "section" && sectionIndex) {
      // titles of sections need to be unique in order for section progression
      // to not have two completely different sections with the same title

      // TODO: technically should be isolating just the name of the section w/o any numbers
      // I think will have problems if you try to do a letters only regex if the person
      // put numbers specifically in the original title of the section...
      const countOfSection = tabData.filter((section) => {
        return section?.title.includes(currentlyCopiedData!.data.title);
      }).length;

      const uniqueTitle = `${currentlyCopiedData!.data.title} ${
        countOfSection + 1
      }`;

      newTabData[sectionIndex] = {
        title: uniqueTitle,
        data: cloneDeep(currentlyCopiedData.data.data),
      } as Section;
    }

    setTabData(newTabData);
  }

  return (
    <div className="baseFlex w-1/6 !flex-col-reverse !items-end gap-2 lg:!flex-row lg:!justify-end">
      <Button>
        <BsFillPlayFill className="h-5 w-5" />
      </Button>
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
            <IoClose className="h-5 w-5" />
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
