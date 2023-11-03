import { AnimatePresence } from "framer-motion";
import isEqual from "lodash.isequal";
import debounce from "lodash.debounce";
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { BsMusicNote } from "react-icons/bs";
import { v4 as uuid } from "uuid";
import { shallow } from "zustand/shallow";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { BsPlus } from "react-icons/bs";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
  type Section,
  type StrummingPattern,
  type TabSection as TabSectionType,
} from "~/stores/TabStore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import sectionIsEffectivelyEmpty from "~/utils/sectionIsEffectivelyEmpty";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import { Separator } from "../ui/separator";
import ChordSection from "./ChordSection";
import MiscellaneousControls from "./MiscellaneousControls";
import TabSection from "./TabSection";
import { Freeze } from "react-freeze";
import { MemoizedPreviewSubSectionContainer } from "./TabPreview";

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
  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);

  const {
    id,
    bpm,
    chords,
    strummingPatterns,
    tabData,
    getTabData,
    setTabData,
    tuning,
    editing,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
    currentInstrument,
    playTab,
    pauseAudio,
  } = useTabStore(
    (state) => ({
      id: state.id,
      bpm: state.bpm,
      chords: state.chords,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      tuning: state.tuning,
      editing: state.editing,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      audioMetadata: state.audioMetadata,
      currentInstrument: state.currentInstrument,
      playTab: state.playTab,
      pauseAudio: state.pauseAudio,
    }),
    shallow
  );

  useEffect(() => {
    setAccordionOpen("opened");
  }, [editing]);

  useEffect(() => {
    if (forceCloseSectionAccordions) {
      setAccordionOpen("closed");
      setForceCloseSectionAccordions(false);
    }
  }, [forceCloseSectionAccordions, setForceCloseSectionAccordions]);

  useEffect(() => {
    if (
      audioMetadata.playing &&
      audioMetadata.type === "Generated" &&
      currentlyPlayingSectionIndex === sectionIndex
    ) {
      setAccordionOpen("opened");
    }
  }, [
    audioMetadata.playing,
    audioMetadata.type,
    currentlyPlayingSectionIndex,
    sectionIndex,
  ]);

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
            return "note";
          } else if (index === 9) {
            return uuid();
          } else {
            return "";
          }
        })
      );
    }

    return {
      id: uuid(),
      type: "tab",
      bpm: -1,
      repetitions: 1,
      data: baseArray,
    };
  }

  function getDefaultStrummingPattern(): ChordSectionType {
    if (strummingPatterns.length > 0) {
      return {
        id: uuid(),
        type: "chord",
        bpm: -1,
        repetitions: 1,
        data: [
          {
            id: uuid(),
            bpm: -1,
            strummingPattern: strummingPatterns[0]!,
            repetitions: 1,
            data: new Array<string>(strummingPatterns[0]!.strums.length).fill(
              ""
            ),
          },
        ],
      };
    }

    // "fake" value for when there are no strumming patterns that exist
    return {
      id: uuid(),
      type: "chord",
      bpm: -1,
      repetitions: 1,
      data: [
        {
          id: uuid(),
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
      >
        <AccordionItem value="opened">
          <>
            {editing && (
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
                      className="max-w-[8rem] font-semibold sm:max-w-[12rem]"
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
            )}

            {!editing && (
              <div className="baseFlex w-full !justify-start gap-4">
                <div
                  className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-lg font-semibold md:text-xl">
                    {sectionData.title}
                  </p>

                  <Button
                    variant="playPause"
                    disabled={
                      bpm === -1 ||
                      !currentInstrument ||
                      audioMetadata.type === "Artist recording" ||
                      // currentlyPlayingMetadata?.length === 0 || be careful on this one, need to test if fine to leave commented out
                      sectionIsEffectivelyEmpty(tabData, sectionIndex) ||
                      artificalPlayButtonTimeout
                    }
                    onClick={() => {
                      const locationIsEqual = isEqual(audioMetadata.location, {
                        sectionIndex,
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
                              },
                            });
                          },
                          !locationIsEqual ? 50 : 0
                        );
                      }
                    }}
                    className="h-8 md:h-9"
                  >
                    <PlayButtonIcon
                      uniqueLocationKey={`sectionContainer${sectionIndex}`}
                      tabId={id}
                      currentInstrument={currentInstrument}
                      audioMetadata={audioMetadata}
                      sectionIndex={sectionIndex}
                    />
                  </Button>
                </div>
              </div>
            )}
          </>
          <AccordionTrigger
            showUnderline={false}
            editingSectionContainer={editing}
            viewingSectionContainer={editing === false}
          ></AccordionTrigger>

          <AccordionContent
            animated={
              // I tried to get animations to conditionally work, but
              // wasn't successful w/o harsh side effects
              false
            }
            className="pt-4"
          >
            {/* map over tab/chord subSections */}
            <div
              id={`sectionIndex${sectionIndex}`}
              className="baseVertFlex w-full"
            >
              {sectionData.data.map((subSection, index) => (
                <div
                  key={subSection.id}
                  className="baseVertFlex w-full !items-start pb-2"
                >
                  {!editing && (
                    <div className="baseFlex ml-2 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
                      <div className="baseFlex gap-1">
                        <BsMusicNote className="h-3 w-3" />
                        {subSection.bpm === -1 ? bpm : subSection.bpm} BPM
                      </div>

                      {subSection.repetitions > 1 && (
                        <div className="baseFlex gap-3">
                          <Separator
                            className="h-4 w-[1px]"
                            orientation="vertical"
                          />

                          <p
                            className={`${
                              audioMetadata.type === "Generated" &&
                              audioMetadata.playing &&
                              currentlyPlayingSectionIndex === sectionIndex &&
                              currentlyPlayingSubSectionIndex === index
                                ? "animate-colorOscillate"
                                : ""
                            }
                    `}
                          >
                            Repeat x{subSection.repetitions}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <Freeze
                    freeze={
                      !editing &&
                      ((subSection.type === "chord" &&
                        (currentlyPlayingSectionIndex !== sectionIndex ||
                          currentlyPlayingSubSectionIndex !== index)) ||
                        subSection.type === "tab")
                    }
                    placeholder={
                      <MemoizedPreviewSubSectionContainer
                        baselineBpm={bpm}
                        tuning={tuning}
                        sectionIndex={sectionIndex}
                        subSectionIndex={index}
                        subSectionData={subSection}
                        currentSubSectionisPlaying={
                          currentlyPlayingSectionIndex === sectionIndex &&
                          currentlyPlayingSubSectionIndex === index
                        }
                        chords={chords}
                      />
                    }
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
                  </Freeze>
                </div>
              ))}
            </div>

            {editing && (
              <div className="baseFlex my-4 gap-4">
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
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {((!editing && sectionIndex < tabData.length - 1) || editing) && (
        <Separator />
      )}
    </div>
  );
}

export default SectionContainer;
