import type { Tab as PrismaTab } from "~/generated/client";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { useTabStore } from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import { Separator } from "~/components/ui/separator";
import SectionProgression from "./SectionProgression";
import TabMetadata from "./TabMetadata";
import { HiOutlineLightBulb, HiOutlineInformationCircle } from "react-icons/hi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  Drawer,
  DrawerPortal,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLocalStorageValue } from "@react-hookz/web";
import Chords from "./Chords";
import SectionContainer from "./SectionContainer";
import StrummingPatterns from "./StrummingPatterns";
import dynamic from "next/dynamic";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import ExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import TipsDialog from "~/components/Dialogs/TipsDialog";
import { tuningNotes } from "~/utils/tunings";
import AudioControls from "~/components/AudioControls/AudioControls";
import PinnedChordsCarousel from "~/components/Tab/PinnedChordsCarousel";
import Logo from "~/components/ui/icons/Logo";
import { useInView } from "react-intersection-observer";
import { IoMdSettings } from "react-icons/io";
import TabSettings from "~/components/Tab/TabSettings";

const SectionProgressionModal = dynamic(
  () => import("~/components/modals/SectionProgressionModal"),
);
const ChordModal = dynamic(() => import("~/components/modals/ChordModal"));
const StrummingPatternModal = dynamic(
  () => import("~/components/modals/StrummingPatternModal"),
);
const CustomTuningModal = dynamic(
  () => import("~/components/modals/CustomTuningModal"),
);
const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
);

interface Tab {
  tab?: TabWithArtistMetadata | null;
}

function Tab({ tab }: Tab) {
  const [customTuning, setCustomTuning] = useState<string | null>(null);
  const [isPublishingOrUpdating, setIsPublishingOrUpdating] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [tabContentIsInView, setTabContentIsInView] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsPopoverIsOpen, setSettingsPopoverIsOpen] = useState(false);
  // used to artificially keep static tab content visible for a split second longer
  // while the playback modal is animating in, avoids jarring disappearance
  const [hideStaticTabContent, setHideStaticTabContent] = useState(false);

  // true when creating new section, results in way less cpu/ram usage for arguably worse ux
  const [forceCloseSectionAccordions, setForceCloseSectionAccordions] =
    useState(false);

  const localStorageTabData = useLocalStorageValue("autostrum-tabData");

  const [showPinnedChords, setShowPinnedChords] = useState(false);

  const {
    setId,
    setCreatedByUserId,
    setCreatedAt,
    setUpdatedAt,
    setTitle,
    setArtistId,
    setArtistName,
    setArtistIsVerified,
    setDescription,
    setGenre,
    setTuning,
    setBpm,
    setCapo,
    setKey,
    setDifficulty,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    editing,
    setOriginalTabData,
    showSectionProgressionModal,
    setShowGlossaryDialog,
    chordBeingEdited,
    strummingPatternBeingEdited,
    showCustomTuningModal,
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionProgression,
    chords,
    strummingPatterns,
    showPlaybackModal,
    viewportLabel,
    color,
    theme,
    showingAudioControls,
    snapshotTabInLocalStorage,
    setSnapshotTabInLocalStorage,
    getStringifiedTabData,
    tabData,
    setTabData,
    audioMetadata,
    setShowPlaybackModal,
    setLooping,
  } = useTabStore((state) => ({
    setId: state.setId,
    setCreatedByUserId: state.setCreatedByUserId,
    setCreatedAt: state.setCreatedAt,
    setUpdatedAt: state.setUpdatedAt,
    setTitle: state.setTitle,
    setArtistId: state.setArtistId,
    setArtistName: state.setArtistName,
    setArtistIsVerified: state.setArtistIsVerified,
    setDescription: state.setDescription,
    setGenre: state.setGenre,
    setTuning: state.setTuning,
    setBpm: state.setBpm,
    setCapo: state.setCapo,
    setKey: state.setKey,
    setDifficulty: state.setDifficulty,
    setChords: state.setChords,
    setStrummingPatterns: state.setStrummingPatterns,
    setSectionProgression: state.setSectionProgression,
    editing: state.editing,
    setOriginalTabData: state.setOriginalTabData,
    showSectionProgressionModal: state.showSectionProgressionModal,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
    chordBeingEdited: state.chordBeingEdited,
    strummingPatternBeingEdited: state.strummingPatternBeingEdited,
    showCustomTuningModal: state.showCustomTuningModal,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    showPlaybackModal: state.showPlaybackModal,
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
    showingAudioControls: state.showingAudioControls,
    snapshotTabInLocalStorage: state.snapshotTabInLocalStorage,
    setSnapshotTabInLocalStorage: state.setSnapshotTabInLocalStorage,
    getStringifiedTabData: state.getStringifiedTabData,
    tabData: state.tabData,
    setTabData: state.setTabData,
    audioMetadata: state.audioMetadata,
    setShowPlaybackModal: state.setShowPlaybackModal,
    setLooping: state.setLooping,
  }));

  useEffect(() => {
    if (!tab) return;

    setOriginalTabData(structuredClone(tab));

    setId(tab.id);
    setCreatedByUserId(tab.createdByUserId);
    setCreatedAt(tab.createdAt);
    setUpdatedAt(tab.updatedAt);
    setTitle(tab.title);
    setArtistId(tab.artistId);
    setArtistName(tab.artistName);
    setArtistIsVerified(tab.artistIsVerified);
    setDescription(tab.description);
    setGenre(tab.genre);
    setTuning(tab.tuning);
    setBpm(tab.bpm);
    setCapo(tab.capo);
    setKey(tab.key);
    setDifficulty(tab.difficulty);

    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setChords(tab.chords);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setStrummingPatterns(tab.strummingPatterns);
    setTabData((draft) => {
      // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
      draft.splice(0, draft.length, ...tab.tabData);
    });
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setSectionProgression(tab.sectionProgression ?? []);

    setCustomTuning(tuningNotes.includes(tab.tuning) ? null : tab.tuning);
  }, [tab]);

  useEffect(() => {
    if (!localStorageTabData.value || tabData.length > 0) return;

    // not sure of best way to check/validate types of localStorageTabData.value here..

    const {
      title,
      description,
      genre,
      tuning,
      bpm,
      capo,
      chords,
      strummingPatterns,
      tabData: localStorageTabDataValue, // avoids name conflict with actual tabData
      sectionProgression,
    } = JSON.parse(localStorageTabData.value as string) as PrismaTab;

    setTitle(title);
    setDescription(description);
    setGenre(genre);
    setTuning(tuning);
    setBpm(bpm);
    setCapo(capo);
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
    tabData.length,
    setBpm,
    setCapo,
    setDescription,
    setGenre,
    setChords,
    setStrummingPatterns,
    setTabData,
    setTitle,
    setOriginalTabData,
    setTuning,
    setSectionProgression,
  ]);

  useEffect(() => {
    if (snapshotTabInLocalStorage) {
      localStorageTabData.set(getStringifiedTabData(tabData));
      setSnapshotTabInLocalStorage(false);
    }
  }, [
    tabData,
    snapshotTabInLocalStorage,
    localStorageTabData,
    getStringifiedTabData,
    setSnapshotTabInLocalStorage,
  ]);

  useEffect(() => {
    if (showPlaybackModal === false) setHideStaticTabContent(false);
  }, [showPlaybackModal]);

  useAutoCompileChords();

  const { ref: tabContentRef } = useInView({
    rootMargin: "-300px 0px -300px 0px",
    threshold: 0,
    onChange: (inView) => {
      setTabContentIsInView(inView);
    },
  });

  function addNewSection() {
    setTabData((draft) => {
      draft.push({
        id: crypto.randomUUID(),
        title: `Section ${draft.length + 1}`,
        data: [],
      });
    });

    setForceCloseSectionAccordions(true);
  }

  return (
    <motion.div
      key={"fullTabBeingViewed"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <div
        id={"mainTabComponent"}
        style={{
          transition: "filter 0.5s ease-in-out",
        }}
        className={`baseVertFlex relative w-full border-y bg-background shadow-lg md:rounded-xl md:border ${
          isPublishingOrUpdating ? "pointer-events-none brightness-90" : ""
        }`}
      >
        <TabMetadata
          customTuning={customTuning}
          setIsPublishingOrUpdating={setIsPublishingOrUpdating}
        />

        {!editing &&
          sectionProgression.length === 0 &&
          chords.length === 0 &&
          strummingPatterns.length === 0 && (
            <div className="baseFlex relative h-10 w-full">
              <Button
                variant={"secondary"}
                className="baseFlex gap-2 lg:absolute lg:right-7 lg:top-0"
                onClick={() => setShowGlossaryDialog(true)}
              >
                <FaBook className="h-4 w-4" />
                Glossary
              </Button>
            </div>
          )}

        <Separator
          className={`mt-2 bg-border ${editing ? "w-[96%]" : "w-full tablet:w-[96%]"}`}
        />

        {editing ? (
          <div className="baseVertFlex relative mb-4 mt-6 w-full gap-4 tablet:mb-0 tablet:mt-4">
            <SectionProgression />
            <Chords />
            <StrummingPatterns />

            <div className="baseFlex gap-4">
              <Button
                variant={"secondary"}
                className="baseFlex gap-2 lg:absolute lg:left-7 lg:top-0"
                onClick={() => setShowTipsModal(true)}
              >
                <HiOutlineInformationCircle className="size-4" />
                Tips
              </Button>

              <Button
                variant={"secondary"}
                className="baseFlex gap-2 lg:absolute lg:right-7 lg:top-0"
                onClick={() => setShowGlossaryDialog(true)}
              >
                <FaBook className="size-4" />
                Glossary
              </Button>

              <Popover>
                <PopoverTrigger className="baseFlex size-8 rounded-md transition-all hover:bg-primary-foreground/20 hover:text-yellow-300 active:hover:bg-primary-foreground/10 sm:absolute sm:bottom-0 sm:right-4 lg:right-6">
                  <HiOutlineLightBulb className="h-5 w-5" />
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  className="baseVertFlex w-72 gap-2 p-2 text-sm shadow-lg"
                >
                  <div className="baseFlex gap-2 font-semibold">
                    <HiOutlineInformationCircle className="size-4" />
                    Tip
                  </div>
                  <p>
                    If performance degrades while playing generated audio, try
                    minimizing sections that aren&apos;t being played or opt to
                    listen in preview mode.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <>
            {viewportLabel.includes("mobile") ? (
              <MobileExtraTabMetadata />
            ) : (
              <ExtraTabMetadata />
            )}
          </>
        )}

        <Separator
          className={`my-2 bg-border ${editing ? "w-[96%]" : "w-full tablet:w-[96%]"}`}
        />

        <div
          ref={tabContentRef}
          className="baseVertFlex relative mt-2 size-full scroll-m-24 !justify-start gap-4"
        >
          <PinnedChordsCarousel
            chords={chords}
            showPinnedChords={showPinnedChords}
          />

          {!hideStaticTabContent &&
            tabData.map((section, index) => (
              <motion.div
                key={section.id}
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
                    currentlyPlayingSectionIndex={
                      currentlyPlayingMetadata?.[currentChordIndex]?.location
                        .sectionIndex ?? 0
                    }
                    forceCloseSectionAccordions={
                      forceCloseSectionAccordions &&
                      index !== tabData.length - 1
                    }
                    setForceCloseSectionAccordions={
                      setForceCloseSectionAccordions
                    }
                    tabDataLength={tabData.length}
                  />
                ) : (
                  <StaticSectionContainer
                    sectionIndex={index}
                    sectionData={section}
                    color={color}
                    theme={theme}
                    tabDataLength={tabData.length}
                  />
                )}
              </motion.div>
            ))}

          {editing && (
            <Button onClick={addNewSection} className="mb-12 px-8">
              Add section
            </Button>
          )}

          <div
            id="stickyBottomControls"
            style={{
              opacity:
                audioMetadata.fullCurrentlyPlayingMetadataLength > 0 &&
                tabContentIsInView
                  ? 1
                  : 0,
              transition: "opacity 0.2s ease-in-out",
            }}
            className="baseFlex sticky bottom-4 mb-4 gap-4 tablet:bottom-6"
          >
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={"secondary"}
                    className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                    onClick={() => setShowGlossaryDialog(true)}
                  >
                    <FaBook className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Glossary</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="audio"
              className="baseFlex gap-3 !rounded-full bg-audio px-8 py-6 text-lg shadow-lg hover:brightness-90 tablet:px-10 tablet:text-xl"
              onClick={() => {
                setShowPlaybackModal(true);
                setTimeout(() => {
                  setHideStaticTabContent(true);
                }, 500);
              }}
            >
              <Logo className="size-[18px] tablet:size-5" />
              Practice
            </Button>

            {viewportLabel.includes("mobile") ? (
              <Drawer
                open={drawerOpen}
                onOpenChange={(open) => {
                  setDrawerOpen(open);
                }}
              >
                <DrawerTrigger asChild>
                  <Button
                    variant={"secondary"}
                    className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                  >
                    <IoMdSettings className="size-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerPortal>
                  <DrawerContent className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-2 rounded-t-2xl p-4 pb-6">
                    <VisuallyHidden>
                      <DrawerTitle>Tab settings</DrawerTitle>
                      <DrawerDescription>
                        Change the tab zoom, whether chords are pinned, and
                        whether left-hand chord diagrams are shown.
                      </DrawerDescription>
                    </VisuallyHidden>

                    <div className="baseFlex gap-2 font-medium">
                      <IoMdSettings className="size-4" />
                      Tab settings
                    </div>
                    <Separator className="mb-2 w-full bg-primary" />

                    <TabSettings
                      showPinnedChords={showPinnedChords}
                      setShowPinnedChords={setShowPinnedChords}
                    />
                  </DrawerContent>
                </DrawerPortal>
              </Drawer>
            ) : (
              <TooltipProvider delayDuration={150}>
                <Tooltip open={settingsPopoverIsOpen ? false : undefined}>
                  <TooltipTrigger asChild>
                    <div className="baseFlex">
                      <Popover
                        open={settingsPopoverIsOpen}
                        onOpenChange={setSettingsPopoverIsOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant={"secondary"}
                            className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                          >
                            <IoMdSettings className="size-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="baseVertFlex p-3" side="top">
                          <TabSettings
                            showPinnedChords={showPinnedChords}
                            setShowPinnedChords={setShowPinnedChords}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side={"top"}>
                    <span>Settings</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

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

      <TipsDialog
        showTipsDialog={showTipsModal}
        setShowTipsDialog={setShowTipsModal}
      />

      <GlossaryDialog />

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

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>

      {editing && showingAudioControls && <AudioControls />}
    </motion.div>
  );
}

export default Tab;
