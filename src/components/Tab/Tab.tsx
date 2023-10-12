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
  }

  return (
    <>
      <div className="baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md md:my-24 xl:w-8/12">
        <TabMetadata refetchTab={refetchTab} customTuning={customTuning} />

        <Separator className="w-[96%]" />

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
        </div>

        <Separator className="w-[96%]" />

        {tabData.map((section, index) => (
          <motion.div
            key={section.id}
            {...(editing &&
              !preventFramerLayoutShift && { layout: "position" })}
            variants={opacityAndScaleVariants}
            // initial="closed"
            // animate="expanded"
            // exit="closed"
            transition={{
              layout: {
                type: "spring",
                bounce: 0.15,
                duration: 1,
              },
            }}
            className="baseVertFlex w-full"
          >
            <SectionContainer sectionIndex={index} sectionData={section} />
          </motion.div>
        ))}

        {editing && (
          <Button onClick={() => addNewSection()} className="mb-12">
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
