import { AnimatePresence } from "framer-motion";
import debounce from "lodash.debounce";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { BsPlus } from "react-icons/bs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
  type Section,
  type StrummingPattern,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import { Separator } from "~/components/ui/separator";
import ChordSection from "./ChordSection";
import MiscellaneousControls from "./MiscellaneousControls";
import TabSection from "./TabSection";

interface SectionContainer {
  sectionIndex: number;
  sectionData: Section;
  currentlyPlayingSectionIndex: number;
  currentlyPlayingSubSectionIndex: number;
  forceCloseSectionAccordions: boolean;
  setForceCloseSectionAccordions: Dispatch<SetStateAction<boolean>>;
}

function SectionContainer({
  sectionData,
  sectionIndex,
  currentlyPlayingSectionIndex,
  currentlyPlayingSubSectionIndex,
  forceCloseSectionAccordions,
  setForceCloseSectionAccordions,
}: SectionContainer) {
  const [accordionOpen, setAccordionOpen] = useState("opened");
  const [localTitle, setLocalTitle] = useState(sectionData.title);

  const {
    bpm,
    strummingPatterns,
    tabData,
    getTabData,
    setTabData,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
  } = useTabStore((state) => ({
    bpm: state.bpm,
    strummingPatterns: state.strummingPatterns,
    tabData: state.tabData,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    sectionProgression: state.sectionProgression,
    setSectionProgression: state.setSectionProgression,
    audioMetadata: state.audioMetadata,
  }));

  useEffect(() => {
    if (forceCloseSectionAccordions) {
      setAccordionOpen("closed");
      setForceCloseSectionAccordions(false);
    }
  }, [forceCloseSectionAccordions, setForceCloseSectionAccordions]);

  useEffect(() => {
    if (
      audioMetadata.playing &&
      currentlyPlayingSectionIndex === sectionIndex
    ) {
      setAccordionOpen("opened");
    }
  }, [audioMetadata.playing, currentlyPlayingSectionIndex, sectionIndex]);

  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value.length > 25) return;

    setLocalTitle(e.target.value);

    // in general app slows down w/ size of tab increasing, but it's especially
    // noticeable when updating the title of a section since it can be
    // updated faster than the tab data (in general)
    debounce(() => {
      const newTabData = getTabData();
      const newSectionProgression = [...sectionProgression];

      newTabData[sectionIndex]!.title = e.target.value;

      for (const section of newSectionProgression) {
        if (section.sectionId === newTabData[sectionIndex]!.id) {
          section.title = e.target.value;
        }
      }

      setTabData(newTabData);
      setSectionProgression(newSectionProgression);
    }, 1000)();
  }

  function generateNewColumns(): TabSectionType {
    const baseArray = [];
    for (let i = 0; i < 8; i++) {
      baseArray.push(
        Array.from({ length: 10 }, (_, index) => {
          if (index === 8) {
            return "1/4th";
          } else if (index === 9) {
            return crypto.randomUUID();
          } else {
            return "";
          }
        }),
      );
    }

    return {
      id: crypto.randomUUID(),
      type: "tab",
      bpm: -1,
      repetitions: 1,
      data: baseArray,
    };
  }

  function getDefaultStrummingPattern(): ChordSectionType {
    if (strummingPatterns.length > 0) {
      return {
        id: crypto.randomUUID(),
        type: "chord",
        bpm: -1,
        repetitions: 1,
        data: [
          {
            id: crypto.randomUUID(),
            bpm: -1,
            strummingPattern: strummingPatterns[0]!,
            repetitions: 1,
            data: new Array<string>(strummingPatterns[0]!.strums.length).fill(
              "",
            ),
          },
        ],
      };
    }

    // "fake" value for when there are no strumming patterns that exist
    return {
      id: crypto.randomUUID(),
      type: "chord",
      bpm: -1,
      repetitions: 1,
      data: [
        {
          id: crypto.randomUUID(),
          bpm,
          strummingPattern: {} as StrummingPattern,
          repetitions: 1,
          data: [],
        },
      ],
    };
  }

  function addNewBlock(type: "tab" | "chord") {
    const newTabData = getTabData();

    const newBlockData =
      type === "tab" ? generateNewColumns() : getDefaultStrummingPattern();

    newTabData[sectionIndex]?.data.push(newBlockData);

    setTabData(newTabData);
  }

  return (
    <div
      style={{
        paddingBottom: sectionIndex === tabData.length - 1 ? "2rem" : 0,
      }}
      className="baseVertFlex w-full gap-4 px-2 md:px-7"
    >
      <Accordion
        type="single"
        collapsible
        value={accordionOpen}
        onValueChange={(value) => {
          setAccordionOpen(value === "opened" ? value : "closed");
        }}
        className="w-full"
      >
        <AccordionItem value="opened" className="baseVertFlex w-full">
          <>
            <div className="baseFlex w-full">
              <div className="baseVertFlex w-4/6 !items-start gap-2 sm:w-5/6 sm:!flex-row sm:!justify-start">
                <div
                  className="baseFlex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Label className="text-lg font-semibold">Title</Label>
                  <Input
                    value={localTitle}
                    placeholder="Section title"
                    onChange={updateSectionTitle}
                    className="w-[10rem] font-semibold xs:w-[15rem]"
                  />
                </div>
              </div>

              <MiscellaneousControls
                type={"section"}
                sectionIndex={sectionIndex}
                sectionId={sectionData.id}
                forSectionContainer={true}
              />
            </div>
          </>

          <AccordionTrigger
            showUnderline={false}
            editingSectionContainer={true}
            viewingSectionContainer={false}
            className="w-full"
          ></AccordionTrigger>

          <AccordionContent animated={true} className="w-full pt-4">
            {/* map over tab/chord subSections */}
            <div
              id={`sectionIndex${sectionIndex}`}
              className="baseVertFlex w-full gap-4"
            >
              {sectionData.data.map((subSection, index) => (
                <div
                  key={subSection.id}
                  className="baseVertFlex w-full !items-start pb-2"
                >
                  <AnimatePresence mode="wait">
                    {subSection.type === "chord" ? (
                      <ChordSection
                        sectionId={sectionData.id}
                        sectionIndex={sectionIndex}
                        subSectionIndex={index}
                        subSectionData={subSection}
                      />
                    ) : (
                      <TabSection
                        sectionId={sectionData.id}
                        sectionIndex={sectionIndex}
                        subSectionIndex={index}
                        subSectionData={subSection}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="baseFlex mb-4 mt-8 gap-4">
              <Button
                onClick={() => addNewBlock("tab")}
                className="baseFlex pl-3"
              >
                <BsPlus className="mr-1 h-5 w-5" />
                Tab block
              </Button>
              <Button
                onClick={() => addNewBlock("chord")}
                className="baseFlex pl-3"
              >
                <BsPlus className="mr-1 h-5 w-5" />
                Strumming block
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="bg-border" />
    </div>
  );
}

export default SectionContainer;
