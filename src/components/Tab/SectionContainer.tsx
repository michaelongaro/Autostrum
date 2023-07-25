import { Fragment, useState, useEffect } from "react";
import { shallow } from "zustand/shallow";
import {
  useTabStore,
  type Section,
  type ChordSection as ChordSectionType,
  type StrummingPattern,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import TabSection from "./TabSection";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import ChordSection from "./ChordSection";
import { Separator } from "../ui/separator";
import MiscellaneousControls from "./MiscellaneousControls";
import { Label } from "@radix-ui/react-label";

interface SectionContainer {
  sectionIndex: number;
  subSectionData: Section;
}

function SectionContainer({ subSectionData, sectionIndex }: SectionContainer) {
  const { bpm, strummingPatterns, tabData, setTabData, editing } = useTabStore(
    (state) => ({
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
    }),
    shallow
  );

  // pretty sure this isn't necessary
  // useEffect(() => {
  //   if (sectionTitle !== subSectionData.title) {
  //     setSectionTitle(subSectionData.title);
  //   }
  // }, [subSectionData, sectionTitle]);

  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    const newTabData = [...tabData];

    newTabData[sectionIndex]!.title = e.target.value;

    setTabData(newTabData);
  }

  function generateNewColumns(): TabSectionType {
    const baseArray = [];
    for (let i = 0; i < 8; i++) {
      baseArray.push(
        Array.from({ length: 9 }, (_, index) => {
          if (index === 8) {
            return "note";
          } else {
            return "";
          }
        })
      );
    }

    return {
      type: "tab",
      bpm: bpm ?? 75,
      repetitions: 1,
      data: baseArray,
    };
  }

  function getDefaultStrummingPattern(): ChordSectionType {
    if (strummingPatterns.length > 0) {
      return {
        type: "chord",
        repetitions: 1,
        data: [
          {
            bpm,
            strummingPattern: strummingPatterns[0]!,
            repetitions: 1,
            data: new Array<string>(strummingPatterns[0]!.strums.length).fill(
              ""
            ),
          },
        ],
      };
    }

    // "fake" value for when there are no strumming strumming patterns that exist
    return {
      type: "chord",
      repetitions: 1,
      data: [
        {
          bpm,
          strummingPattern: {} as StrummingPattern,
          repetitions: 1,
          data: [],
        },
      ],
    };
  }

  function addNewBlock(type: "tab" | "chord") {
    const newTabData = [...tabData];

    const newBlockData =
      type === "tab" ? generateNewColumns() : getDefaultStrummingPattern();

    newTabData[sectionIndex]?.data.push(newBlockData);

    // TODO: also side note inside last value of strumming pattern select,
    // have a "create new strumming pattern" that will open a modal to create a new one
    // this is a copy and paste from w/e you did normally to create a new strumming pattern

    setTabData(newTabData);
  }

  return (
    <div className="baseVertFlex w-full gap-2 px-7">
      {editing && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
            <div className="baseFlex gap-2">
              <Label className="text-lg font-semibold">Title</Label>
              <Input
                value={tabData[sectionIndex]?.title}
                placeholder="Section title"
                onChange={updateSectionTitle}
                className="max-w-[10rem] font-semibold sm:max-w-[12rem]"
              />
            </div>
          </div>

          <MiscellaneousControls type={"section"} sectionIndex={sectionIndex} />
        </div>
      )}

      {!editing && (
        <div className="baseFlex !justify-start gap-2">
          <p className="text-lg font-semibold">
            {tabData[sectionIndex]?.title}
          </p>
          <div>filler for play/pause btn</div>
        </div>
      )}

      {/* map over tab/chord subSections */}
      <div className="baseVertFlex w-full gap-4">
        {subSectionData.data.map((subSection, index) => (
          <Fragment key={index}>
            {subSection.type === "chord" ? (
              <ChordSection
                sectionIndex={sectionIndex}
                subSectionIndex={index}
                subSectionData={subSection}
              />
            ) : (
              <TabSection
                sectionIndex={sectionIndex}
                subSectionIndex={index}
                subSectionData={subSection}
              />
            )}
          </Fragment>
        ))}
      </div>

      {editing && (
        <div className="baseFlex my-4 gap-2">
          <Button onClick={() => addNewBlock("tab")}>Add tab block</Button>
          <Button onClick={() => addNewBlock("chord")}>Add chord block</Button>
        </div>
      )}

      {(!editing && sectionIndex !== tabData.length - 1) ||
        (editing && <Separator />)}
    </div>
  );
}

export default SectionContainer;
