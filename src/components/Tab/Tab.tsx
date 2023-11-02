import type { Tab } from "@prisma/client";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import { v4 as uuid } from "uuid";
import { shallow } from "zustand/shallow";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { useTabStore } from "~/stores/TabStore";
import EffectGlossaryModal from "../modals/EffectGlossaryModal";
import SectionProgressionModal from "../modals/SectionProgressionModal";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import SectionProgression from "./SectionProgression";
import TabMetadata from "./TabMetadata";
import { HiOutlineLightBulb, HiOutlineInformationCircle } from "react-icons/hi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useLocalStorageValue } from "@react-hookz/web";
import AudioRecorderModal from "../modals/AudioRecorderModal";
import ChordModal from "../modals/ChordModal";
import StrummingPatternModal from "../modals/StrummingPatternModal";
import Chords from "./Chords";
import SectionContainer from "./SectionContainer";
import StrummingPatterns from "./StrummingPatterns";
import CustomTuningModal from "../modals/CustomTuningModal";

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
    scale: 0.85,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};
// not sure of best way to avoid having the same name for interface and component

export interface RefetchTab {
  refetchTab: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
    // @ts-expect-error asdf
  ) => Promise<QueryObserverResult<TData, TError>>;
}
interface ITab extends Partial<RefetchTab> {
  tab: TabWithLikes | undefined | null;
}

function Tab({ tab, refetchTab }: ITab) {
  const [customTuning, setCustomTuning] = useState("");

  // true when creating new section, results in way less cpu/ram usage for arguably worse ux
  const [forceCloseSectionAccordions, setForceCloseSectionAccordions] =
    useState(false);

  const localStorageTabData = useLocalStorageValue("tabData");

  const {
    setId,
    setCreatedById,
    setCreatedAt,
    setUpdatedAt,
    setTitle,
    setDescription,
    setGenreId,
    setTuning,
    setBpm,
    setCapo,
    setTimeSignature,
    setMusicalKey,
    setHasRecordedAudio,
    setChords,
    setStrummingPatterns,
    tabData,
    getTabData,
    setTabData,
    setSectionProgression,
    setNumberOfLikes,
    editing,
    setOriginalTabData,
    showAudioRecorderModal,
    showSectionProgressionModal,
    showEffectGlossaryModal,
    setShowEffectGlossaryModal,
    chordBeingEdited,
    strummingPatternBeingEdited,
    showCustomTuningModal,
    preventFramerLayoutShift,
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionProgression,
    chords,
    strummingPatterns,
  } = useTabStore(
    (state) => ({
      setId: state.setId,
      setCreatedById: state.setCreatedById,
      setCreatedAt: state.setCreatedAt,
      setUpdatedAt: state.setUpdatedAt,
      setTitle: state.setTitle,
      setDescription: state.setDescription,
      setGenreId: state.setGenreId,
      setTuning: state.setTuning,
      setBpm: state.setBpm,
      setCapo: state.setCapo,
      setTimeSignature: state.setTimeSignature,
      setMusicalKey: state.setMusicalKey,
      setHasRecordedAudio: state.setHasRecordedAudio,
      setChords: state.setChords,
      setStrummingPatterns: state.setStrummingPatterns,
      tabData: state.tabData,
      getTabData: state.getTabData,
      setTabData: state.setTabData,
      setSectionProgression: state.setSectionProgression,
      setNumberOfLikes: state.setNumberOfLikes,
      editing: state.editing,
      setOriginalTabData: state.setOriginalTabData,
      showAudioRecorderModal: state.showAudioRecorderModal,
      showSectionProgressionModal: state.showSectionProgressionModal,
      showEffectGlossaryModal: state.showEffectGlossaryModal,
      setShowEffectGlossaryModal: state.setShowEffectGlossaryModal,
      chordBeingEdited: state.chordBeingEdited,
      strummingPatternBeingEdited: state.strummingPatternBeingEdited,
      showCustomTuningModal: state.showCustomTuningModal,
      preventFramerLayoutShift: state.preventFramerLayoutShift,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      currentChordIndex: state.currentChordIndex,
      sectionProgression: state.sectionProgression,
      chords: state.chords,
      strummingPatterns: state.strummingPatterns,
    }),
    shallow
  );

  useEffect(() => {
    if (!tab) return;

    setOriginalTabData(structuredClone(tab));

    setId(tab.id);
    setCreatedById(tab.createdById);
    setCreatedAt(tab.createdAt);
    setUpdatedAt(tab.updatedAt);
    setTitle(tab.title);
    setDescription(tab.description);
    setGenreId(tab.genreId);
    setTuning(tab.tuning);
    setBpm(tab.bpm);
    setCapo(tab.capo);
    setTimeSignature(tab.timeSignature);
    setMusicalKey(tab.musicalKey);
    setHasRecordedAudio(tab.hasRecordedAudio);
    setNumberOfLikes(tab.numberOfLikes);

    // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
    setChords(tab.chords);
    // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
    setStrummingPatterns(tab.strummingPatterns);
    // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
    setTabData(tab.tabData);
    // @ts-expect-error can't specify type from prisma Json value, but we know it's correct
    setSectionProgression(tab.sectionProgression ?? []);
  }, [
    tab,
    setId,
    setCreatedById,
    setCreatedAt,
    setUpdatedAt,
    setBpm,
    setCapo,
    setDescription,
    setGenreId,
    setChords,
    setHasRecordedAudio,
    setStrummingPatterns,
    setTabData,
    setTimeSignature,
    setMusicalKey,
    setTitle,
    setOriginalTabData,
    setTuning,
    setNumberOfLikes,
    setSectionProgression,
  ]);

  useEffect(() => {
    if (!tab && tabData.length === 0) {
      setTabData([
        {
          id: uuid(),
          title: "Section 1",
          data: [],
        },
      ]);
    }
  }, [tab, tabData, setTabData]);

  useEffect(() => {
    if (!localStorageTabData.value || tabData.length > 0) return;

    // not sure of best way to check/validate types of localStorageTabData.value here..

    const {
      title,
      description,
      genreId,
      tuning,
      bpm,
      timeSignature,
      capo,
      musicalKey,
      chords,
      strummingPatterns,
      tabData: localStorageTabDataValue, // avoids name conflict with actual tabData
      sectionProgression,
    } = JSON.parse(localStorageTabData.value as string);

    setTitle(title);
    setDescription(description);
    setGenreId(genreId);
    setTuning(tuning);
    setBpm(bpm);
    setTimeSignature(timeSignature);
    setCapo(capo);
    setMusicalKey(musicalKey);
    setChords(chords);
    setStrummingPatterns(strummingPatterns);
    setTabData(localStorageTabDataValue);
    setSectionProgression(sectionProgression ?? []);

    localStorageTabData.remove();
  }, [
    localStorageTabData,
    tabData,
    setBpm,
    setCapo,
    setDescription,
    setGenreId,
    setChords,
    setStrummingPatterns,
    setTabData,
    setTimeSignature,
    setMusicalKey,
    setTitle,
    setOriginalTabData,
    setTuning,
    setSectionProgression,
  ]);

  function addNewSection() {
    const newTabData = getTabData();

    const newSectionData = {
      id: uuid(),
      title: `Section ${tabData.length + 1}`,
      data: [],
    };
    newTabData.push(newSectionData);

    setTabData(newTabData);
    setForceCloseSectionAccordions(true);
  }

  return (
    <>
      <div
        id={"mainTabComponent"}
        className="baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md md:my-24 xl:w-8/12"
      >
        <TabMetadata refetchTab={refetchTab} customTuning={customTuning} />

        {!editing &&
          sectionProgression.length === 0 &&
          chords.length === 0 &&
          strummingPatterns.length === 0 && (
            <div className="baseFlex relative h-10 w-full">
              <Button
                variant={"secondary"}
                className="baseFlex !flex-nowrap gap-2 lg:absolute lg:right-7 lg:top-0"
                onClick={() => setShowEffectGlossaryModal(true)}
              >
                Effect glossary
                <FaBook className="h-4 w-4" />
              </Button>
            </div>
          )}

        <Separator className="w-[96%]" />

        {(editing ||
          sectionProgression.length > 0 ||
          chords.length > 0 ||
          strummingPatterns.length > 0) && (
          <div className="baseVertFlex relative w-full gap-4">
            <SectionProgression />

            <Chords />

            <StrummingPatterns />

            <Button
              variant={"secondary"}
              className="baseFlex !flex-nowrap gap-2 lg:absolute lg:right-7 lg:top-0"
              onClick={() => setShowEffectGlossaryModal(true)}
            >
              Effect glossary
              <FaBook className="h-4 w-4" />
            </Button>

            {editing && (
              <Popover>
                <PopoverTrigger className="baseFlex absolute bottom-5 right-3 mr-1 h-8 w-8 rounded-md transition-all hover:bg-white/20 hover:text-yellow-300 active:hover:bg-white/10 sm:bottom-3 sm:right-7 ">
                  <HiOutlineLightBulb className="h-5 w-5 " />
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  className="baseVertFlex w-72 gap-2 p-2 text-sm shadow-lg"
                >
                  <div className="baseFlex gap-2 font-semibold">
                    <HiOutlineInformationCircle className="h-4 w-4" />
                    Tip
                  </div>
                  <p>
                    If performance degrades while playing generated audio, try
                    minimizing sections that aren&apos;t being played or opt to
                    listen in preview mode.
                  </p>
                </PopoverContent>
              </Popover>
            )}
            <Separator className="w-[96%]" />
          </div>
        )}

        {tabData.map((section, index) => (
          <motion.div
            key={section.id}
            // TODO: I don't know why the spring transition only occurs when
            // the section has something in it (not empty)... doesn't seem like that
            // should make a difference but it does for some reason
            {...(editing &&
              !preventFramerLayoutShift &&
              !forceCloseSectionAccordions && { layout: "position" })}
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
            <SectionContainer
              sectionIndex={index}
              sectionData={section}
              currentlyPlayingSectionIndex={
                currentlyPlayingMetadata?.[currentChordIndex]?.location
                  .sectionIndex ?? 0
              }
              currentlyPlayingSubSectionIndex={
                currentlyPlayingMetadata?.[currentChordIndex]?.location
                  .subSectionIndex ?? 0
              }
              forceCloseSectionAccordions={
                forceCloseSectionAccordions && index !== tabData.length - 1
              }
              setForceCloseSectionAccordions={setForceCloseSectionAccordions}
            />
          </motion.div>
        ))}

        {editing && (
          <Button onClick={addNewSection} className="mb-12">
            Add another section
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAudioRecorderModal && <AudioRecorderModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showCustomTuningModal && (
          <CustomTuningModal
            customTuning={customTuning}
            setCustomTuning={setCustomTuning}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showSectionProgressionModal && <SectionProgressionModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showEffectGlossaryModal && <EffectGlossaryModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {chordBeingEdited && (
          <ChordModal chordBeingEdited={structuredClone(chordBeingEdited)} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {strummingPatternBeingEdited && (
          <StrummingPatternModal
            strummingPatternBeingEdited={structuredClone(
              strummingPatternBeingEdited
            )}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Tab;
