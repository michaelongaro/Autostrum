import { useEffect } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { v4 as uuid } from "uuid";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import SectionProgression from "./SectionProgression";
import SectionProgressionModal from "../modals/SectionProgressionModal";
import EffectGlossaryModal from "../modals/EffectGlossaryModal";
import { Button } from "../ui/button";
import { FaItunesNote } from "react-icons/fa";
import { FaBook } from "react-icons/fa";
import { Separator } from "../ui/separator";
import EffectGlossary from "../ui/EffectGlossary";
import type { TabWithLikes } from "~/server/api/routers/tab";
import type {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
} from "@tanstack/react-query";

import Chords from "./Chords";
import StrummingPatterns from "./StrummingPatterns";
import ChordModal from "../modals/ChordModal";
import StrummingPatternModal from "../modals/StrummingPatternModal";
import SectionContainer from "./SectionContainer";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";

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

  const isAboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

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
      setUpdatedAt: state.setUpdatedAt,
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
    setUpdatedAt,
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

  useEffect(() => {
    if (!tab && tabData.length === 0)
      setTabData([
        {
          id: uuid(),
          title: "Section 1",
          data: [],
        },
      ]);
  }, [tab, tabData, setTabData]);

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
      <div className="baseVertFlex lightGlassmorphic relative my-12 w-11/12 gap-4 rounded-md md:my-24 xl:w-8/12">
        <TabMetadata refetchTab={refetchTab} />

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

        {/* pretty sure the Layout approach wasn't working, but if you can get it to work then maybe
            it should be inside <SectionContainer /> */}
        {/* <LayoutGroup> */}
        {tabData.map((section, index) => (
          <SectionContainer
            key={section.id}
            sectionIndex={index}
            sectionData={section}
          />
        ))}
        {/* </LayoutGroup> */}

        {editing && (
          <Button onClick={() => addNewSection()} className="mb-12">
            Add another section
          </Button>
        )}
      </div>

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
