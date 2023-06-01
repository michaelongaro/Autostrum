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
import { Separator } from "@radix-ui/react-select";
import EffectGlossary from "../ui/EffectGlossary";

// not sure of best way to avoid having the same name for interface and component
export interface ITabSection {
  title: string;
  data: string[][];
}

function Tab({ tab }: { tab: Tab | undefined | null }) {
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
    editing,
    setEditing,
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
      editing: state.editing,
      setEditing: state.setEditing,
      showSectionProgressionModal: state.showSectionProgressionModal,
      showEffectGlossaryModal: state.showEffectGlossaryModal,
      setShowEffectGlossaryModal: state.setShowEffectGlossaryModal,
    }),
    shallow
  );

  useEffect(() => {
    if (!tab) return;

    setId(tab.id);
    setCreatedById(tab.createdById);
    setTitle(tab.title);
    setDescription(tab.description ?? "");
    setGenreId(tab.genreId);
    setTuning(tab.tuning);
    setBpm(tab.bpm);
    setTimeSignature(tab.timeSignature);

    // @ts-expect-error asdf
    setTabData(tab.tabData);
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
    setTuning,
  ]);

  return (
    <>
      <div className="baseVertFlex lightGlassmorphic relative mb-24 mt-24 w-11/12 gap-4 rounded-md xl:w-8/12">
        <TabMetadata />

        <Separator className="h-[1px] w-full bg-pink-50" />

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
