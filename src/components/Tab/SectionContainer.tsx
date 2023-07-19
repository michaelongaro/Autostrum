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

interface SectionContainer {
  sectionIndex: number;
  subSectionData: Section;
}

function SectionContainer({ subSectionData, sectionIndex }: SectionContainer) {
  const { strummingPatterns, tabData, setTabData, editing } = useTabStore(
    (state) => ({
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
      repetitions: 1,
      data: baseArray,
    };
  }

  function getDefaultStrummingPattern(): ChordSectionType {
    if (strummingPatterns.length > 0) {
      return {
        type: "chord",
        strummingPattern: strummingPatterns[0]!,
        repetitions: 1,
        data: [
          {
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
      strummingPattern: {} as StrummingPattern,
      repetitions: 1,
      data: [
        {
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
    // lightestGlassmorphic rounded-md should conditionally (viewing only) go on <TabSection /> and <ChordSection /> topmost parent divs
    <div className="baseVertFlex w-full gap-2 px-7 ">
      {editing ? (
        <div className="baseFlex w-full !justify-between">
          <Input
            value={tabData[sectionIndex]?.title}
            placeholder="Section title"
            onChange={updateSectionTitle}
            className="max-w-[12rem] text-lg font-semibold"
          />
          <MiscellaneousControls type={"section"} sectionIndex={sectionIndex} />
        </div>
      ) : (
        <div className="baseFlex !justify-start gap-2">
          <p className="text-lg font-semibold">
            {tabData[sectionIndex]?.title}
          </p>
          <div>filler for play/pause btn</div>
        </div>
      )}

      {/* map over tab/chord subSections */}
      <div className="baseVertFlex w-full gap-2">
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
