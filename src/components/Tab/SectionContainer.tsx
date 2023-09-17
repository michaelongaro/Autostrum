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
import { v4 as uuid } from "uuid";
import ChordSection from "./ChordSection";
import { Separator } from "../ui/separator";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import MiscellaneousControls from "./MiscellaneousControls";
import { Label } from "~/components/ui/label";
import useSound from "~/hooks/useSound";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import isEqual from "lodash.isequal";
import { BsMusicNote } from "react-icons/bs";
import sectionIsEffectivelyEmpty from "~/utils/sectionIsEffectivelyEmpty";
import PlayButtonIcon from "../AudioControls/PlayButtonIcon";

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
  const [artificalPlayButtonTimeout, setArtificialPlayButtonTimeout] =
    useState(false);

  const { playTab, pauseAudio } = useSound();

  const {
    bpm,
    strummingPatterns,
    tabData,
    setTabData,
    editing,
    chords,
    sectionProgression,
    setSectionProgression,
    tuning,
    capo,
    setChords,
    setChordBeingEdited,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
    currentlyPlayingMetadata,
    currentChordIndex,
    playbackSpeed,
  } = useTabStore(
    (state) => ({
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
      chords: state.chords,
      sectionProgression: state.sectionProgression,
      setSectionProgression: state.setSectionProgression,
      tuning: state.tuning,
      capo: state.capo,
      setChords: state.setChords,
      setChordBeingEdited: state.setChordBeingEdited,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      currentInstrument: state.currentInstrument,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      playbackSpeed: state.playbackSpeed,
    }),
    shallow
  );

  function updateSectionTitle(e: React.ChangeEvent<HTMLInputElement>) {
    const newTabData = [...tabData];
    const newSectionProgression = [...sectionProgression];

    newTabData[sectionIndex]!.title = e.target.value;

    for (const section of newSectionProgression) {
      if (section.sectionId === newTabData[sectionIndex]!.id) {
        section.title = e.target.value;
      }
    }

    setTabData(newTabData);
    setSectionProgression(newSectionProgression);
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
    const newTabData = [...tabData];

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
                value={sectionData.title}
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
            <p className="text-xl font-semibold">{sectionData.title}</p>

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
                if (
                  audioMetadata.playing &&
                  isEqual(audioMetadata.location, {
                    sectionIndex,
                  })
                ) {
                  setArtificialPlayButtonTimeout(true);

                  setTimeout(() => {
                    setArtificialPlayButtonTimeout(false);
                  }, 300);
                  void pauseAudio();
                } else {
                  setAudioMetadata({
                    ...audioMetadata,
                    location: {
                      sectionIndex,
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
                    },
                    resetToStart: !isEqual(audioMetadata.location, {
                      sectionIndex,
                    }),
                  });
                }
              }}
            >
              <PlayButtonIcon
                uniqueLocationKey={`sectionContainer${sectionIndex}`}
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
          layout={"position"}
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
              {!editing &&
                (subSection.type === "tab" || subSection.repetitions > 1) && (
                  <div className="baseFlex ml-4 gap-3 rounded-t-md bg-pink-500 px-2 py-1 !shadow-sm">
                    {subSection.type === "tab" && (
                      <div className="baseFlex gap-1">
                        <BsMusicNote className="h-4 w-4" />
                        {subSection.bpm}
                      </div>
                    )}

                    {subSection.repetitions > 1 && (
                      <div className="baseFlex gap-3">
                        {subSection.type === "tab" && (
                          <Separator
                            className="h-4 w-[1px]"
                            orientation="vertical"
                          />
                        )}

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
        <div className="baseFlex my-4 gap-2">
          <Button onClick={() => addNewBlock("tab")}>Add tab block</Button>
          <Button onClick={() => addNewBlock("chord")}>Add chord block</Button>
        </div>
      )}

      {((!editing && sectionIndex < tabData.length - 1) || editing) && (
        <Separator />
      )}
    </div>
  );
}

export default SectionContainer;
