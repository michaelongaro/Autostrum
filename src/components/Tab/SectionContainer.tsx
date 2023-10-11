import { AnimatePresence, motion } from "framer-motion";
import isEqual from "lodash.isequal";
import debounce from "lodash.debounce";
import { useState } from "react";
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
import sectionIsEffectivelyEmpty from "~/utils/sectionIsEffectivelyEmpty";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";
import { Separator } from "../ui/separator";
import ChordSection from "./ChordSection";
import MiscellaneousControls from "./MiscellaneousControls";
import TabSection from "./TabSection";
const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.5,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};
interface SectionContainer {
  sectionIndex: number;
  sectionData: Section;
}

function SectionContainer({ sectionData, sectionIndex }: SectionContainer) {
  const [localTitle, setLocalTitle] = useState(sectionData.title);
  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);

  const {
    id,
    bpm,
    strummingPatterns,
    tabData,
    getTabData,
    setTabData,
    editing,
    sectionProgression,
    setSectionProgression,
    audioMetadata,
    currentInstrument,
    currentlyPlayingMetadata,
    currentChordIndex,
    preventFramerLayoutShift,
    playTab,
    pauseAudio,
  } = useTabStore(
    (state) => ({
      id: state.id,
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      editing: state.editing,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      audioMetadata: state.audioMetadata,
      currentInstrument: state.currentInstrument,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      preventFramerLayoutShift: state.preventFramerLayoutShift,
      playTab: state.playTab,
      pauseAudio: state.pauseAudio,
    }),
    shallow
  );

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
      bpm: bpm ?? 75,
      repetitions: 1,
      data: baseArray,
    };
  }

  function getDefaultStrummingPattern(): ChordSectionType {
    if (strummingPatterns.length > 0) {
      return {
        id: uuid(),
        type: "chord",
        bpm: bpm ?? 75,
        repetitions: 1,
        data: [
          {
            id: uuid(),
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

    // "fake" value for when there are no strumming patterns that exist
    return {
      id: uuid(),
      type: "chord",
      bpm: bpm ?? 75,
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
      {editing && (
        <div className="baseFlex w-full !items-start">
          <div className="baseVertFlex w-5/6 !items-start gap-2 lg:!flex-row lg:!justify-start">
            <div className="baseFlex gap-2">
              <Label className="text-lg font-semibold">Title</Label>
              <Input
                value={localTitle}
                placeholder="Section title"
                onChange={updateSectionTitle}
                className="max-w-[10rem] font-semibold sm:max-w-[12rem]"
              />
            </div>
          </div>

          <MiscellaneousControls
            type={"section"}
            sectionIndex={sectionIndex}
            sectionId={sectionData.id}
          />
        </div>
      )}

      {!editing && (
        <div className="baseFlex w-full !justify-start gap-4">
          <div className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2">
            <p className="text-lg font-semibold md:text-xl">
              {sectionData.title}
            </p>

            <Button
              variant="playPause"
              disabled={
                !currentInstrument ||
                audioMetadata.type === "Artist recording" ||
                currentlyPlayingMetadata?.length === 0 ||
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
              className="h-8 md:h-auto"
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

      {/* map over tab/chord subSections */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sectionData.id}
          {...(editing && !preventFramerLayoutShift && { layout: "position" })}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          exit="closed"
          transition={{
            layout: {
              type: "spring",
              bounce: 0.15,
              duration: 1,
            },
          }}
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
                          currentlyPlayingMetadata?.[currentChordIndex]
                            ?.location?.sectionIndex === sectionIndex &&
                          currentlyPlayingMetadata?.[currentChordIndex]
                            ?.location?.subSectionIndex === index
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
        </motion.div>
      </AnimatePresence>

      {editing && (
        <div className="baseFlex my-4 gap-4">
          <Button onClick={() => addNewBlock("tab")} className="baseFlex pl-3">
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

      {((!editing && sectionIndex < tabData.length - 1) || editing) && (
        <Separator />
      )}
    </div>
  );
}

export default SectionContainer;
