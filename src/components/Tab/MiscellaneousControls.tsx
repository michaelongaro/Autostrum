import {
  useTabStore,
  type Chord as ChordType,
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

interface MiscellaneousControls {
  type: "section" | "tab" | "chord";
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
  const { chords, setChords, setChordThatIsBeingEdited, tabData, setTabData } =
    useTabStore(
      (state) => ({
        chords: state.chords,
        setChords: state.setChords,
        setChordThatIsBeingEdited: state.setChordThatIsBeingEdited,
        tabData: state.tabData,
        setTabData: state.setTabData,
      }),
      shallow
    );

  // props need to also have type: "section" | "tab" | "chord"
  //
  // try just using DropdownMenuItem instead of buttons and have descriptions like:
  //   Move up, Move down, Delete, Copy, Paste
  //
  // for tabStore create getter + setter for currentlyCopiedData
  //  which will be an object like this {
  // type: "section" | "tab" | "chord",
  // data: TabSection | TabSection | ChordSection | ChordSequence
  //      }
  //     ^ bearing in mind that if you are copying the seciton you will have to add "2", "3", etc since we need to keep titles unique

  /* <Button
  variant={"secondary"}
  className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
  disabled={sectionIndex === 0}
  onClick={() => {
    let newTabData = [...tabData];

    newTabData = arrayMove(newTabData, sectionIndex, sectionIndex - 1);

    setTabData(newTabData);
  }}
>
  <BiUpArrowAlt className="h-5 w-5" />
</Button>; */

  function disableMoveDown() {
    if (chordSequenceIndex && subSectionIndex && sectionIndex) {
      const newChordSequence = tabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      return chordSequenceIndex === newChordSequence.length - 1;
    } else if (subSectionIndex && sectionIndex) {
      const newSubSection = tabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      return subSectionIndex === newSubSection.length - 1;
    } else if (sectionIndex) {
      return sectionIndex === tabData.length - 1;
    }

    return false;
  }

  function disableMoveUp() {
    if (chordSequenceIndex && subSectionIndex && sectionIndex) {
      return chordSequenceIndex === 0;
    } else if (subSectionIndex && sectionIndex) {
      return subSectionIndex === 0;
    } else if (sectionIndex) {
      return sectionIndex === 0;
    }

    return false;
  }

  function moveUp() {
    let newTabData = [...tabData];

    if (chordSequenceIndex && subSectionIndex && sectionIndex) {
      let newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence = arrayMove(
        newChordSequence,
        chordSequenceIndex,
        chordSequenceIndex - 1
      );

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex && sectionIndex) {
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
    } else if (sectionIndex) {
      newTabData = arrayMove(newTabData, sectionIndex, sectionIndex - 1);
    }

    setTabData(newTabData);
  }

  function moveDown() {
    let newTabData = [...tabData];

    if (chordSequenceIndex && subSectionIndex && sectionIndex) {
      let newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence = arrayMove(
        newChordSequence,
        chordSequenceIndex,
        chordSequenceIndex + 1
      );

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex && sectionIndex) {
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
    } else if (sectionIndex) {
      newTabData = arrayMove(newTabData, sectionIndex, sectionIndex + 1);
    }

    setTabData(newTabData);
  }

  function deleteSection() {
    const newTabData = [...tabData];

    if (chordSequenceIndex && subSectionIndex && sectionIndex) {
      const newChordSequence = newTabData[sectionIndex]?.data[subSectionIndex]
        ?.data as ChordSequence[];

      newChordSequence.splice(chordSequenceIndex, 1);

      newTabData[sectionIndex]!.data[subSectionIndex]!.data = newChordSequence;
    } else if (subSectionIndex && sectionIndex) {
      const newSubSection = newTabData[sectionIndex]?.data as (
        | TabSection
        | ChordSection
      )[];

      newSubSection.splice(subSectionIndex, 1);

      newTabData[sectionIndex]!.data = newSubSection;
    } else if (sectionIndex) {
      newTabData.splice(sectionIndex, 1);
    }

    setTabData(newTabData);
  }

  return (
    <div className="baseFlex !justify-start gap-2">
      <Button>
        <BsFillPlayFill className="h-5 w-5" />
      </Button>
      <DropdownMenu
        // onOpenChange={(open) => {
        //   setShowingEffectGlossary(open ? true : false);
        // }}
        modal={false}
        // open={forModal ? true : showingEffectGlossary}
      >
        <DropdownMenuTrigger asChild>
          <Button variant={"secondary"}>
            <AiOutlineEllipsis className="h-6 w-6" />
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
          <DropdownMenuItem className="baseFlex !justify-between gap-2">
            Copy
            <HiOutlineClipboardCopy className="h-5 w-5" />
          </DropdownMenuItem>
          <DropdownMenuItem className="baseFlex !justify-between gap-2">
            Paste
            <LuClipboardPaste className="h-5 w-5" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default MiscellaneousControls;
