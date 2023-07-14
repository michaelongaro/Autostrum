import { useState, useEffect, useMemo } from "react";
import {
  useTabStore,
  type ChordGroup as ChordGroupType,
  type StrummingPattern,
  ChordSequence,
} from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import TabColumn from "./TabColumn";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { motion } from "framer-motion";
import { BiUpArrowAlt, BiDownArrowAlt } from "react-icons/bi";
import { IoClose } from "react-icons/io5";
import { HiOutlineInformationCircle } from "react-icons/hi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { arrayMove } from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { parse, toString } from "~/utils/tunings";
import { Separator } from "../ui/separator";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import ChordGroup from "./ChordGroup";

interface ChordSection {
  sectionIndex: number;
  sectionData: {
    title: string;
    data: ChordGroupType[];
  };
}

function ChordSection({ sectionIndex, sectionData }: ChordSection) {
  const [sectionTitle, setSectionTitle] = useState(sectionData.title);

  const aboveMediumViewportWidth = useViewportWidthBreakpoint(768);

  useEffect(() => {
    if (sectionTitle !== sectionData.title) {
      setSectionTitle(sectionData.title);
    }
  }, [sectionData, sectionTitle]);

  const { tuning, modifyPalmMuteDashes, tabData, setTabData, editing } =
    useTabStore(
      (state) => ({
        tuning: state.tuning,
        modifyPalmMuteDashes: state.modifyPalmMuteDashes,
        tabData: state.tabData,
        setTabData: state.setTabData,
        editing: state.editing,
      }),
      shallow
    );

  // should these functions below be in zustand?
  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    setSectionTitle(e.target.value);

    const newTabData = [...tabData];
    newTabData[sectionIndex]!.title = e.target.value;

    setTabData(newTabData);
  }

  function addAnotherSection() {
    const newTabData = [...tabData];

    // TODO: will need to do same trick of using first available strumming pattern
    // and if not then do the empty trick.
    // ^^ again I am pretty sure we are doing the "no patterns" overlay on <ChordGroup /> not here,
    // so this will in fact still be clickable.
    newTabData[sectionIndex]!.data.push({
      pattern: {} as StrummingPattern,
      repeat: 1,
      data: [
        {
          repeat: 1,
          data: [],
        },
      ],
    });

    setTabData(newTabData);
  }

  return (
    <motion.div
      key={`tabSection${sectionIndex}`}
      // layoutId={`tabSection${sectionIndex}`}
      layout
      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      style={{
        gap: editing ? "1rem" : "0",
        padding: aboveMediumViewportWidth
          ? "2rem"
          : editing
          ? "1rem 0.5rem 1rem 0.5rem"
          : "1rem",
      }}
      className="baseVertFlex relative h-full w-full !justify-start"
    >
      <div className="baseFlex w-full !items-start !justify-between">
        <div className="baseFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
          {editing ? (
            <Input
              value={sectionTitle}
              placeholder="Section title"
              onChange={updateSectionTitle}
              className="max-w-[12rem] text-lg font-semibold"
            />
          ) : (
            <p className="text-lg font-semibold">{sectionTitle}</p>
          )}

          {editing && (
            <div className="baseVertFlex w-1/6 !justify-end gap-2 2xl:flex-row">
              <Button
                variant={"secondary"}
                className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
                disabled={sectionIndex === 0}
                onClick={() => {
                  let newTabData = [...tabData];

                  newTabData = arrayMove(
                    newTabData,
                    sectionIndex,
                    sectionIndex - 1
                  );

                  setTabData(newTabData);
                }}
              >
                <BiUpArrowAlt className="h-5 w-5" />
              </Button>
              <Button
                variant={"secondary"}
                className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
                disabled={sectionIndex === tabData.length - 1}
                onClick={() => {
                  let newTabData = [...tabData];

                  newTabData = arrayMove(
                    newTabData,
                    sectionIndex,
                    sectionIndex + 1
                  );

                  setTabData(newTabData);
                }}
              >
                <BiDownArrowAlt className="h-5 w-5" />
              </Button>
              <Button
                variant={"destructive"}
                className="h-9 rounded-md px-3 md:h-10 md:px-4 md:py-2"
                disabled={tabData.length === 1} // maybe allow this later, but currently messes up ui
                onClick={() => {
                  const newTabData = [...tabData];

                  newTabData.splice(sectionIndex, 1);

                  setTabData(newTabData);
                }}
              >
                <IoClose className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* try to use framer motion to animate sections sliding up/down to their new positions
        (this would mean both sections would need to slide for each click of "up"/"down" ) */}

      <div className="baseVertFlex relative w-full !justify-start">
        {sectionData.data.map((chordGroup, index) => (
          <ChordGroup
            key={`chordGroup${index}`}
            groupData={chordGroup}
            sectionIndex={sectionIndex}
            groupIndex={index}
          />
        ))}
      </div>

      {editing && (
        <Button onClick={addAnotherSection}>Add another section</Button>
      )}

      {(!editing && sectionIndex !== tabData.length - 1) ||
        (editing && <Separator />)}
    </motion.div>
  );
}

export default ChordSection;
