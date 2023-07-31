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
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import MiscellaneousControls from "./MiscellaneousControls";
import { Label } from "@radix-ui/react-label";
import useSound from "~/hooks/useSound";

interface SectionContainer {
  sectionIndex: number;
  subSectionData: Section;
}

function SectionContainer({ subSectionData, sectionIndex }: SectionContainer) {
  const { playTab, pauseTab } = useSound();

  const {
    bpm,
    strummingPatterns,
    tabData,
    setTabData,
    editing,
    chords,
    sectionProgression,
    tuning,
    capo,
    setChords,
    setChordBeingEdited,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
  } = useTabStore(
    (state) => ({
      bpm: state.bpm,
      strummingPatterns: state.strummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
      editing: state.editing,
      chords: state.chords,
      sectionProgression: state.sectionProgression,
      tuning: state.tuning,
      capo: state.capo,
      setChords: state.setChords,
      setChordBeingEdited: state.setChordBeingEdited,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      currentInstrument: state.currentInstrument,
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
    <div
      style={{
        paddingBottom: sectionIndex === tabData.length - 1 ? "2rem" : 0,
      }}
      className="baseVertFlex w-full gap-2 px-7"
    >
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
        <div className="baseFlex w-full !justify-start gap-4">
          <div className="baseFlex gap-4 rounded-md bg-pink-600 px-4 py-2">
            <p className="text-xl font-semibold">
              {tabData[sectionIndex]?.title}
            </p>

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
                    },
                  });

                  void playTab({
                    tabData,
                    rawSectionProgression: sectionProgression,
                    tuningNotes: tuning,
                    baselineBpm: bpm,
                    chords,
                    capo,
                    location: {
                      sectionIndex,
                    },
                  });
                }
              }}
            >
              {audioMetadata.type === "Generated" &&
              audioMetadata.playing &&
              audioMetadata.location?.sectionIndex === sectionIndex ? (
                <BsFillPauseFill className="h-5 w-5" />
              ) : (
                <BsFillPlayFill className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* map over tab/chord subSections */}
      <div className="baseVertFlex w-full gap-4">
        {subSectionData.data.map((subSection, index) => (
          <div key={index} className="baseVertFlex w-full !items-start pb-2">
            {!editing && subSection.repetitions > 1 && (
              <p className="rounded-t-md bg-pink-500 p-2 !shadow-sm">
                Repeat x{subSection.repetitions}
              </p>
            )}
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
          </div>
        ))}
      </div>

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
