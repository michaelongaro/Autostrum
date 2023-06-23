import { useEffect } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import TabSection from "./TabSection";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { AnimatePresence, LayoutGroup } from "framer-motion";

import SectionProgression from "./SectionProgression";
import SectionProgressionModal from "../modals/SectionProgressionModal";
import EffectGlossaryModal from "../modals/EffectGlossaryModal";
import { Button } from "../ui/button";
import { FaItunesNote } from "react-icons/fa";
import { Separator } from "../ui/separator";
import EffectGlossary from "../ui/EffectGlossary";
import type { TabWithLikes } from "~/server/api/routers/tab";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";

// not sure of best way to avoid having the same name for interface and component
export interface ITabSection {
  title: string;
  data: string[][];
}

export interface RefetchTab {
  refetchTab: <TPageData>(
    options?: RefetchOptions & RefetchQueryFilters<TPageData>
    // @ts-expect-error asdf
  ) => Promise<QueryObserverResult<TData, TError>>;
}
interface ITab extends RefetchTab {
  tab: TabWithLikes | undefined | null;
}

function Tab({ tab, refetchTab }: ITab) {
  const { user, loaded } = useClerk();
  const { userId, isLoaded } = useAuth();

  const {
    setId,
    setCreatedById,
    setTitle,
    setDescription,
    setGenreId,
    setTuning,
    setBpm,
    setTimeSignature,
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
  } = useTabStore(
    (state) => ({
      setId: state.setId,
      setCreatedById: state.setCreatedById,
      setTitle: state.setTitle,
      setDescription: state.setDescription,
      setGenreId: state.setGenreId,
      setTuning: state.setTuning,
      setBpm: state.setBpm,
      setTimeSignature: state.setTimeSignature,
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
    }),
    shallow
  );

  useEffect(() => {
    if (!tab) return;

    setOriginalTabData(tab);

    setId(tab.id);
    setCreatedById(tab.createdById);
    setTitle(tab.title);
    setDescription(tab.description ?? "");
    setGenreId(tab.genreId);
    setTuning(tab.tuning);
    setBpm(tab.bpm);
    setTimeSignature(tab.timeSignature);
    setNumberOfLikes(tab.numberOfLikes);

    // @ts-expect-error asdf
    setTabData(tab.tabData);
    // @ts-expect-error asdf
    setSectionProgression(tab.sectionProgression ?? []);
  }, [
    tab,
    setId,
    setCreatedById,
    setBpm,
    setDescription,
    setGenreId,
    setTabData,
    setTimeSignature,
    setTitle,
    setOriginalTabData,
    setTuning,
    setNumberOfLikes,
    setSectionProgression,
  ]);

  return (
    <>
      <div className="baseVertFlex lightGlassmorphic relative my-24 w-11/12 gap-4 rounded-md xl:w-8/12">
        <TabMetadata refetchTab={refetchTab} />

        <Separator className="w-[96%]" />

        <div className="baseVertFlex gap-2 md:flex-row-reverse">
          <div className="hidden md:block">
            <EffectGlossary />
          </div>

          <SectionProgression />
        </div>

        {/* Actual tab below */}
        <LayoutGroup>
          {tabData.map((section, index) => (
            <TabSection
              key={index}
              sectionData={{
                title: section.title,
                data: section.data,
              }}
              sectionIndex={index}
            />
          ))}
        </LayoutGroup>
      </div>

      {/* scroll to top button above this? */}

      <Button
        className="fixed bottom-4 right-4 z-20 block h-12 w-12 rounded-full p-4 md:hidden"
        onClick={() => setShowEffectGlossaryModal(true)}
      >
        <FaItunesNote className="h-4 w-4" />
      </Button>

      <AnimatePresence mode="wait">
        {showSectionProgressionModal && <SectionProgressionModal />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showEffectGlossaryModal && <EffectGlossaryModal />}
      </AnimatePresence>
    </>
  );
}

export default Tab;
