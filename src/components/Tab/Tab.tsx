import { useEffect } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import SectionProgression from "./SectionProgression";
import SectionProgressionModal from "../modals/SectionProgressionModal";
import EffectGlossaryModal from "../modals/EffectGlossaryModal";
import { Button } from "../ui/button";
import { FaItunesNote } from "react-icons/fa";
import { Separator } from "../ui/separator";
import { v4 as uuid } from "uuid";
import EffectGlossary from "../ui/EffectGlossary";
import type { TabWithLikes } from "~/server/api/routers/tab";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";
import { cloneDeep } from "lodash";
import Chords from "./Chords";
import StrummingPatterns from "./StrummingPatterns";
import ChordModal from "../modals/ChordModal";
import StrummingPatternModal from "../modals/StrummingPatternModal";
import SectionContainer from "./SectionContainer";

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
  const { user, loaded } = useClerk();
  const { userId, isLoaded } = useAuth();

  const {
    setId,
    setCreatedById,
    setCreatedAt,
    setTitle,
    setDescription,
    setGenreId,
    setTuning,
    setBpm,
    setTimeSignature,
    setRecordedAudioUrl,
    setChords,
    strummingPatterns,
    setStrummingPatterns,
    tabData,
    setTabData,
    setSectionProgression,
    setNumberOfLikes,
    editing,
    setEditing,
    setOriginalTabData,
    showSectionProgressionModal,
    showEffectGlossaryModal,
    setShowEffectGlossaryModal,
    chordBeingEdited,
    strummingPatternBeingEdited,
  } = useTabStore(
    (state) => ({
      setId: state.setId,
      setCreatedById: state.setCreatedById,
      setCreatedAt: state.setCreatedAt,
      setTitle: state.setTitle,
      setDescription: state.setDescription,
      setGenreId: state.setGenreId,
      setTuning: state.setTuning,
      setBpm: state.setBpm,
      setTimeSignature: state.setTimeSignature,
      setRecordedAudioUrl: state.setRecordedAudioUrl,
      setChords: state.setChords,
      strummingPatterns: state.strummingPatterns,
      setStrummingPatterns: state.setStrummingPatterns,
      tabData: state.tabData,
      setTabData: state.setTabData,
      setSectionProgression: state.setSectionProgression,
      setNumberOfLikes: state.setNumberOfLikes,
      editing: state.editing,
      setEditing: state.setEditing,
      setOriginalTabData: state.setOriginalTabData,
      showSectionProgressionModal: state.showSectionProgressionModal,
      showEffectGlossaryModal: state.showEffectGlossaryModal,
      setShowEffectGlossaryModal: state.setShowEffectGlossaryModal,
      chordBeingEdited: state.chordBeingEdited,
      strummingPatternBeingEdited: state.strummingPatternBeingEdited,
    }),
    shallow
  );

  useEffect(() => {
    if (!tab) return;

    setOriginalTabData(cloneDeep(tab));

    setId(tab.id);
    setCreatedById(tab.createdById);
    setCreatedAt(tab.createdAt);
    setTitle(tab.title);
    setDescription(tab.description);
    setGenreId(tab.genreId);
    setTuning(tab.tuning);
    setBpm(tab.bpm);
    setTimeSignature(tab.timeSignature);
    setRecordedAudioUrl(tab.recordedAudioUrl);
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
    setBpm,
    setDescription,
    setGenreId,
    setChords,
    setRecordedAudioUrl,
    setStrummingPatterns,
    setTabData,
    setTimeSignature,
    setTitle,
    setOriginalTabData,
    setTuning,
    setNumberOfLikes,
    setSectionProgression,
  ]);

  function addNewSection() {
    const newTabData = [...tabData];

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
      <div className="baseVertFlex lightGlassmorphic relative my-24 w-11/12 gap-4 rounded-md xl:w-8/12">
        <TabMetadata refetchTab={refetchTab} />

        <Separator className="w-[96%]" />

        <SectionProgression />

        <Chords />

        <StrummingPatterns />

        <Separator className="w-[96%]" />

        {/* pretty sure the Layout approach wasn't working, but if you can get it to work then maybe
            it should be inside <SectionContainer /> */}
        {/* <LayoutGroup> */}
        {tabData.map((section, index) => (
          <SectionContainer
            key={index}
            sectionIndex={index}
            sectionData={section}
          />
        ))}
        {/* </LayoutGroup> */}

        {editing && (
          <Button onClick={() => addNewSection()}>Add another section</Button>
        )}
      </div>

      <Button
        className="baseFlex fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full p-0"
        onClick={() => setShowEffectGlossaryModal(true)}
      >
        <FaItunesNote className="m-0 h-4 w-4" />
      </Button>

      <AnimatePresence mode="wait">
        {showSectionProgressionModal && <SectionProgressionModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showEffectGlossaryModal && <EffectGlossaryModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {chordBeingEdited && <ChordModal chordBeingEdited={chordBeingEdited} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {strummingPatternBeingEdited && (
          <StrummingPatternModal
            strummingPatternBeingEdited={cloneDeep(strummingPatternBeingEdited)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Tab;
