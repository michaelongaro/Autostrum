import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useLayoutEffect } from "react";
import { FaBook } from "react-icons/fa";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import {
  getTabData,
  useTabStore,
  type COLORS,
  type Section,
} from "~/stores/TabStore";
import { Button } from "~/components/ui/button";
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
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import dynamic from "next/dynamic";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import StaticTabMetadata from "~/components/Tab/Static/StaticTabMetadata";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import Logo from "~/components/ui/icons/Logo";
import ExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import { useInView } from "react-intersection-observer";
import { IoMdSettings } from "react-icons/io";
import TabSettings from "~/components/Tab/TabSettings";
import PinnedChordsCarousel from "~/components/Tab/PinnedChordsCarousel";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import { useRouter } from "next/router";
import { createPortal } from "react-dom";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import TabScreenshotPreview from "~/components/Tab/TabScreenshotPreview";

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
);

interface StaticTabProps {
  tab: TabWithArtistMetadata;
}

function StaticTab({ tab }: StaticTabProps) {
  const { asPath } = useRouter();

  const [tabContentIsInView, setTabContentIsInView] = useState(false);
  const [showPinnedChords, setShowPinnedChords] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsPopoverIsOpen, setSettingsPopoverIsOpen] = useState(false);
  const [minifiedTabData, setMinifiedTabData] = useState<Section[]>();

  // used to artificially keep static tab content visible for a split second longer
  // while the playback modal is animating in, avoids jarring disappearance
  const [hideStaticTabContent, setHideStaticTabContent] = useState(false);

  const { ref: tabContentRef } = useInView({
    rootMargin: "-300px 0px -300px 0px",
    threshold: 0,
    onChange: (inView) => {
      setTabContentIsInView(inView);
    },
  });

  const {
    // Hydration setters
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
    setTabData,
    setEditing,
    // Read-only state
    id,
    bpm,
    sectionProgression,
    chords,
    strummingPatterns,
    tabData,
    audioMetadata,
    viewportLabel,
    color,
    theme,
    // Playback controls
    showPlaybackModal,
    setShowPlaybackModal,
    setLooping,
    // UI controls
    setShowGlossaryDialog,
  } = useTabStore((state) => ({
    // Hydration setters
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
    setTabData: state.setTabData,
    setEditing: state.setEditing,
    // Read-only state
    id: state.id,
    bpm: state.bpm,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    tabData: state.tabData,
    audioMetadata: state.audioMetadata,
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
    // Playback controls
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    setLooping: state.setLooping,
    // UI controls
    setShowGlossaryDialog: state.setShowGlossaryDialog,
  }));

  // Hydrate store from tab prop
  useLayoutEffect(() => {
    if (!tab) return;

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
      draft.splice(
        0,
        draft.length,
        // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
        ...tab.tabData,
      );
    });
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setSectionProgression(tab.sectionProgression ?? []);
  }, [tab]);

  useLayoutEffect(() => {
    setEditing(false);
  }, []);

  useEffect(() => {
    if (showPlaybackModal === false) setHideStaticTabContent(false);
  }, [showPlaybackModal]);

  // for screenshot preview, only show first two sections
  useEffect(() => {
    if (id === -1 || minifiedTabData || !asPath.includes("screenshot")) return;

    const tabData = getTabData();
    setMinifiedTabData(tabData.slice(0, 2));
  }, [id, asPath, minifiedTabData]);

  useAutoCompileChords();

  return (
    <motion.div
      key={"staticTabBeingViewed"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex w-full"
    >
      <div
        id={"mainTabComponent"}
        className="baseVertFlex relative w-full border-y bg-background shadow-lg md:rounded-xl md:border"
      >
        <StaticTabMetadata />

        {sectionProgression.length === 0 &&
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

        <Separator className="mt-2 w-full bg-border tablet:w-[96%]" />

        {viewportLabel.includes("mobile") ? (
          <MobileExtraTabMetadata />
        ) : (
          <ExtraTabMetadata />
        )}

        <Separator className="my-2 w-full bg-border tablet:w-[96%]" />

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
                <StaticSectionContainer
                  sectionIndex={index}
                  sectionData={section}
                  color={color}
                  theme={theme}
                  tabDataLength={tabData.length}
                />
              </motion.div>
            ))}

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

      <GlossaryDialog />

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>

      {minifiedTabData &&
        createPortal(
          <div className="size-full overflow-hidden">
            <div
              id="tabPreviewScreenshotLight"
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS["peony" as COLORS]["light" as "light" | "dark"]["screenshot-background"]})`,
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                bpm={bpm}
                color={"peony"}
                theme={"light"}
              />
            </div>

            <div
              id="tabPreviewScreenshotDark"
              style={{
                backgroundColor: `hsl(${SCREENSHOT_COLORS["peony" as COLORS]["dark" as "light" | "dark"]["screenshot-background"]})`,
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                bpm={bpm}
                color={"peony"}
                theme={"dark"}
              />
            </div>
          </div>,
          document.getElementById("mainTabComponent")!,
        )}
    </motion.div>
  );
}

export default StaticTab;
