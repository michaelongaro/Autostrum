import { useEffect, Fragment } from "react";
import type { Tab } from "@prisma/client";
import { useClerk, useAuth } from "@clerk/nextjs";
import TabMetadata from "./TabMetadata";
import TabSection from "./TabSection";
import {
  type ChordGroup,
  type StrummingPattern,
  useTabStore,
} from "~/stores/TabStore";
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
import Chords from "./Chords";
import StrummingPatterns from "./StrummingPatterns";
import ChordModal from "../modals/ChordModal";
import StrummingPatternModal from "../modals/StrummingPatternModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import ChordSection from "./ChordSection";

// not sure of best way to avoid having the same name for interface and component
export interface ITabSection {
  title: string;
  type: "tab";
  data: string[][];
}

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
    setTitle,
    setDescription,
    setGenreId,
    setTuning,
    setBpm,
    setTimeSignature,
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
    chordThatIsBeingEdited,
    strummingPatternThatIsBeingEdited,
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
      chordThatIsBeingEdited: state.chordThatIsBeingEdited,
      strummingPatternThatIsBeingEdited:
        state.strummingPatternThatIsBeingEdited,
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
    setBpm,
    setDescription,
    setGenreId,
    setChords,
    setStrummingPatterns,
    setTabData,
    setTimeSignature,
    setTitle,
    setOriginalTabData,
    setTuning,
    setNumberOfLikes,
    setSectionProgression,
  ]);

  function generateNewColumns() {
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

    return baseArray;
  }

  function getDefaultStrummingPattern(): ChordGroup[] {
    if (strummingPatterns.length > 0) {
      return [
        {
          pattern: strummingPatterns[0]!,
          repeat: 1,
          data: [
            {
              repeat: 1,
              data: new Array<string>(strummingPatterns[0]!.strums.length).fill(
                ""
              ),
            },
          ],
        },
      ];
    }

    // "fake" value for when there are no strumming patterns that exist
    return [
      {
        // need to also set it back to this empty value when deleting affected strumming patterns
        // since we definitely don't want to take out an entire section just because we deleted
        // a strumming pattern
        pattern: {} as StrummingPattern,
        repeat: 1,
        data: [
          {
            repeat: 1,
            data: [],
          },
        ],
      },
    ];
  }

  function addNewSection(type: "tab" | "chord") {
    const newTabData = [...tabData];

    const newSectionData =
      type === "tab"
        ? {
            title: `Section ${tabData.length + 1}`,
            type: "tab" as const,
            data: generateNewColumns(),
          }
        : {
            title: `Section ${tabData.length + 1}`,
            type: "chord" as const,
            data: getDefaultStrummingPattern(),
          };

    // need to get the first strumming pattern from strummingPatterns, and then use
    // it as a base to then create blank chordSequence of proper length. repeat will be 1

    // have function to automatically default to 1st strumming pattern if it exists, and create
    // "" filled chordSequnece w/ repeat 1

    // otherwise just do repeat 1, chordSequence [] and data [] if no strumming patterns exist

    // ^^^ leaving open this "problem" is totally fine because we need to render the chord component
    // in some way, and inside <ChordGroup /> there will be an effect that listens for changes to
    // strummingPatterns, and if it changes. if that specific section has [] and [] for values, it will
    // instantly use that new strumming pattern and drop the probable blur effect across the component
    // that you were thinking of adding.

    // ^^ I believe the opposite should happen too: aka there was a strumming pattern tied to a section
    // but the pattern was deleted above, it should instantly go to [] and [] and blur the component
    // if there are no more strumming patterns left to default back to. There are more intricacies
    // to this for the inner components so think about those too

    // also side note inside last value of strumming pattern select,
    // have a "create new strumming pattern" that will open a modal to create a new one
    // this is a copy and paste from w/e you did normally to create a new strumming pattern

    newTabData.splice(tabData.length + 1, 0, newSectionData);

    setTabData(newTabData);
  }

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

        <Chords />

        <StrummingPatterns />

        <Separator className="w-[96%]" />

        <LayoutGroup>
          {tabData.map((section, index) => (
            <Fragment key={index}>
              {section.type === "chord" ? (
                <ChordSection
                  key={index}
                  sectionIndex={index}
                  sectionData={{
                    title: section.title,
                    data: section.data,
                  }}
                />
              ) : (
                <TabSection
                  key={index}
                  sectionIndex={index}
                  sectionData={{
                    title: section.title,
                    data: section.data,
                  }}
                />
              )}
            </Fragment>
          ))}
        </LayoutGroup>

        {editing && (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="my-4">Add new section</Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="baseVertFlex gap-2">
                <p className="text-lg">Select a type</p>
                <div className="baseFlex gap-2">
                  <Button onClick={() => addNewSection("tab")}>Tab</Button>
                  <Button onClick={() => addNewSection("chord")}>Chord</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
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

      {/* add/edit chord modal here */}

      <AnimatePresence mode="wait">
        {chordThatIsBeingEdited && (
          <ChordModal chordThatIsBeingEdited={chordThatIsBeingEdited} />
        )}
      </AnimatePresence>

      {/* add/edit strumming pattern modal here */}
      <AnimatePresence mode="wait">
        {strummingPatternThatIsBeingEdited && (
          <StrummingPatternModal
            strummingPatternThatIsBeingEdited={
              strummingPatternThatIsBeingEdited
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Tab;
