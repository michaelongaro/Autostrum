import type { Tab } from "@prisma/client";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import type { TabWithLikes } from "~/server/api/routers/tab";
import { useTabStore } from "~/stores/TabStore";
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
import Chords from "./Chords";
import SectionContainer from "./SectionContainer";
import StrummingPatterns from "./StrummingPatterns";
import PlaybackDialog from "~/components/Tab/Playback/PlaybackDialog";
import dynamic from "next/dynamic";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";

const EffectGlossaryModal = dynamic(
  () => import("~/components/modals/EffectGlossaryModal"),
);
const SectionProgressionModal = dynamic(
  () => import("~/components/modals/SectionProgressionModal"),
);
const AudioRecorderModal = dynamic(
  () => import("~/components/modals/AudioRecorderModal"),
);
const ChordModal = dynamic(() => import("~/components/modals/ChordModal"));
const StrummingPatternModal = dynamic(
  () => import("~/components/modals/StrummingPatternModal"),
);
const CustomTuningModal = dynamic(
  () => import("~/components/modals/CustomTuningModal"),
);

export interface RefetchTab {
  refetchTab: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>,
    // @ts-expect-error asdf
  ) => Promise<QueryObserverResult<TData, TError>>;
}

const opacityVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};
interface ITab extends Partial<RefetchTab> {
  tab: TabWithLikes | undefined | null;
}

function Tab({ tab, refetchTab }: ITab) {
  const [customTuning, setCustomTuning] = useState<string | null>(null);
  const [isPostingOrSaving, setIsPostingOrSaving] = useState(false);

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
    audioMetadata,
    showPlaybackDialog,
  } = useTabStore((state) => ({
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
    audioMetadata: state.audioMetadata,
    showPlaybackDialog: state.showPlaybackDialog,
  }));

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

    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setChords(tab.chords);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setStrummingPatterns(tab.strummingPatterns);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setTabData(tab.tabData);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
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
          id: crypto.randomUUID(),
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
    } = JSON.parse(localStorageTabData.value as string) as Tab;

    setTitle(title);
    setDescription(description);
    setGenreId(genreId);
    setTuning(tuning);
    setBpm(bpm);
    setTimeSignature(timeSignature);
    setCapo(capo);
    setMusicalKey(musicalKey);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setChords(chords);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setStrummingPatterns(strummingPatterns);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setTabData(localStorageTabDataValue);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
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
      id: crypto.randomUUID(),
      title: `Section ${tabData.length + 1}`,
      data: [],
    };
    newTabData.push(newSectionData);

    setTabData(newTabData);
    setForceCloseSectionAccordions(true);
  }

  return (
    <motion.div
      key={"fullTabBeingViewed"}
      variants={opacityVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <div
        id={"mainTabComponent"}
        style={{
          transition: "filter 0.5s ease-in-out",
        }}
        className={`baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md md:my-24 xl:w-8/12 ${
          isPostingOrSaving
            ? "pointer-events-none brightness-90"
            : "brightness-100"
        }`}
      >
        <TabMetadata
          refetchTab={refetchTab}
          customTuning={customTuning}
          setIsPostingOrSaving={setIsPostingOrSaving}
        />

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
                <PopoverTrigger className="baseFlex absolute bottom-5 right-3 mr-1 h-8 w-8 rounded-md transition-all hover:bg-white/20 hover:text-yellow-300 active:hover:bg-white/10 sm:bottom-3 sm:right-7">
                  <HiOutlineLightBulb className="h-5 w-5" />
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

        <div className="baseVertFlex relative size-full gap-4">
          {!showPlaybackDialog &&
            tabData.map((section, index) => (
              <motion.div
                key={section.id}
                // TODO: I don't know why the spring transition only occurs when
                // the section has something in it (not empty)... doesn't seem like that
                // should make a difference but it does for some reason
                {...(editing &&
                  !preventFramerLayoutShift &&
                  !forceCloseSectionAccordions && { layout: "position" })}
                transition={{
                  layout: {
                    type: "spring",
                    bounce: 0.15,
                    duration: 1,
                  },
                }}
                className="baseFlex w-full"
              >
                {editing ? (
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
                      forceCloseSectionAccordions &&
                      index !== tabData.length - 1
                    }
                    setForceCloseSectionAccordions={
                      setForceCloseSectionAccordions
                    }
                  />
                ) : (
                  <StaticSectionContainer
                    sectionIndex={index}
                    sectionData={section}
                  />
                )}
              </motion.div>
            ))}

          {editing && (
            <Button onClick={addNewSection} className="mb-12">
              Add another section
            </Button>
          )}

          {!editing && audioMetadata.fullCurrentlyPlayingMetadataLength > 0 && (
            <PlaybackDialog />
          )}
        </div>
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
              strummingPatternBeingEdited,
            )}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Tab;
