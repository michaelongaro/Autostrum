import { AnimatePresence, motion } from "framer-motion";
import { useState, useRef } from "react";
import { FaBook } from "react-icons/fa";
import { useTabStore, type Section } from "~/stores/TabStore";
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
import DesktopExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import { useInView } from "react-intersection-observer";
import { IoMdSettings } from "react-icons/io";
import TabSettings from "~/components/Tab/TabSettings";
import PinnedTabChrome, {
  getSectionScrollMarginTop,
} from "~/components/Tab/PinnedTabChrome";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useSectionNavigationVisibility from "~/hooks/useSectionNavigationVisibility";
import { useRouter } from "next/router";
import TabScreenshotPreview from "~/components/Tab/TabScreenshotPreview";
import { primePlaybackUserGesture } from "~/utils/primePlaybackUserGesture";

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
);

function StaticTab() {
  const { asPath } = useRouter();

  const [sectionHeights, setSectionHeights] = useState<Record<string, number>>(
    {},
  );

  const [tabContentIsInView, setTabContentIsInView] = useState(false);
  const [showPinnedChords, setShowPinnedChords] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pressingOnZoomSlider, setPressingOnZoomSlider] = useState(false);
  const [settingsPopoverIsOpen, setSettingsPopoverIsOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function measureSectionHeight(
    sectionId: string,
    element: HTMLDivElement | null,
  ) {
    if (element && !sectionHeights[sectionId]) {
      sectionRefs.current[sectionId] = element;
      const height = element.getBoundingClientRect().height;
      if (height > 0) {
        setSectionHeights((prev) => ({ ...prev, [sectionId]: height }));
      }
    }
  }

  const { ref: tabContentRef } = useInView({
    rootMargin: "-30% 0px -30% 0px",
    threshold: 0,
    onChange: (inView) => {
      setTabContentIsInView(inView);
    },
  });

  const {
    // Read-only state
    id,
    bpm,
    chords,
    tabData,
    audioMetadata,
    viewportLabel,
    color,
    theme,
    // Playback controls
    showPlaybackModal,
    setShowPlaybackModal,
    // UI controls
    setShowGlossaryDialog,
  } = useTabStore((state) => ({
    // Read-only state
    id: state.id,
    bpm: state.bpm,
    chords: state.chords,
    tabData: state.tabData,
    audioMetadata: state.audioMetadata,
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
    // Playback controls
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    // UI controls
    setShowGlossaryDialog: state.setShowGlossaryDialog,
  }));

  useAutoCompileChords();

  const showSectionNavigation = useSectionNavigationVisibility({
    sectionCount: tabData.length,
    drawerOpen,
    showPlaybackModal,
    resetKey: id,
    showPinnedChords,
  });

  const showPinnedChordsBar = showPinnedChords && chords.length > 0;
  const sectionScrollMarginTop = getSectionScrollMarginTop({
    showSectionNavigation,
    showPinnedChordsBar,
  });

  const minifiedTabData: Section[] | undefined =
    id === -1 || !asPath.includes("screenshot")
      ? undefined
      : tabData.slice(0, 2);

  return (
    <div className="baseVertFlex w-full">
      <div
        id={"mainTabComponent"}
        className="baseVertFlex relative w-full border-y bg-background shadow-lg md:rounded-xl md:border"
      >
        <StaticTabMetadata />

        <Separator className="mt-2 w-full bg-border tablet:mb-4 tablet:w-[96%]" />

        {viewportLabel.includes("mobile") ? (
          <MobileExtraTabMetadata />
        ) : (
          <DesktopExtraTabMetadata />
        )}

        <Separator
          className={`w-full bg-border tablet:w-[96%] ${showSectionNavigation ? "mt-2" : "my-2"}`}
        />

        <div
          ref={tabContentRef}
          className={`baseVertFlex relative size-full scroll-m-24 !justify-start gap-4 ${showSectionNavigation ? "" : "mt-2"}`}
        >
          <PinnedTabChrome
            showSectionNavigation={showSectionNavigation}
            chords={chords}
            showPinnedChords={showPinnedChords}
          />

          {tabData.map((section, index) =>
            showPlaybackModal ? (
              <div
                key={section.id}
                style={{ height: sectionHeights[section.id] ?? 0 }}
                className="w-full"
              />
            ) : (
              <div
                key={section.id}
                ref={(el) => measureSectionHeight(section.id, el)}
                className="baseFlex w-full"
              >
                <StaticSectionContainer
                  sectionIndex={index}
                  sectionData={section}
                  color={color}
                  theme={theme}
                  tabDataLength={tabData.length}
                  virtualized={true}
                  scrollMarginTop={sectionScrollMarginTop}
                />
              </div>
            ),
          )}

          <AnimatePresence>
            {audioMetadata.fullTabMetadataLength > 0 && tabContentIsInView && (
              <motion.div
                id="stickyBottomControls"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                }}
                className="baseFlex sticky bottom-4 top-4 mb-4 gap-4 tablet:bottom-6"
              >
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={"secondary"}
                        className="baseFlex !size-11 gap-2 !rounded-full border !p-0 !shadow-md"
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
                    // Unlock AudioContext + preload the modal chunk inside this
                    // gesture so the first Play is not blocked on Safari resume/lazy JS.
                    primePlaybackUserGesture();
                    setShowPlaybackModal(true);
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
                    dismissible={!pressingOnZoomSlider}
                    // Scaling the background breaks position:sticky on the
                    // section nav; keep the page unscaled so it stays visible.
                    shouldScaleBackground={false}
                  >
                    <DrawerTrigger asChild>
                      <Button
                        variant={"secondary"}
                        className="baseFlex !size-11 gap-2 !rounded-full border !p-0 !shadow-md"
                      >
                        <IoMdSettings className="size-5" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerPortal>
                      <DrawerContent className="baseVertFlex z-50 !items-start gap-2 p-4 pb-6">
                        <VisuallyHidden>
                          <DrawerTitle>Tab settings</DrawerTitle>
                          <DrawerDescription>
                            Change the tab zoom, whether chords and section
                            navigation are pinned, and whether left-hand chord
                            diagrams are shown.
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
                          setPressingOnZoomSlider={setPressingOnZoomSlider}
                        />
                      </DrawerContent>
                    </DrawerPortal>
                  </Drawer>
                ) : (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip open={settingsPopoverIsOpen ? false : undefined}>
                      <TooltipTrigger asChild>
                        {/* for whatever reason, this wrapper <div> is required to get tooltip
                            text to show */}
                        <div className="baseFlex">
                          <Popover
                            open={settingsPopoverIsOpen}
                            onOpenChange={setSettingsPopoverIsOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant={"secondary"}
                                className="baseFlex !size-11 gap-2 !rounded-full border !p-0 !shadow-md"
                              >
                                <IoMdSettings className="size-5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="baseVertFlex p-3"
                              side="top"
                            >
                              <TabSettings
                                showPinnedChords={showPinnedChords}
                                setShowPinnedChords={setShowPinnedChords}
                                setPressingOnZoomSlider={
                                  setPressingOnZoomSlider
                                }
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {minifiedTabData && (
          <div className="size-full overflow-hidden">
            <div
              id="tabPreviewScreenshotLight"
              data-color="maple"
              data-theme="light"
              style={{
                backgroundColor: "hsl(var(--screenshot-background))",
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                bpm={bpm}
                color={"maple"}
                theme={"light"}
              />
            </div>

            <div
              id="tabPreviewScreenshotDark"
              data-color="maple"
              data-theme="dark"
              style={{
                backgroundColor: "hsl(var(--screenshot-background))",
              }}
              className="baseFlex h-[615px] w-[1318px] grayscale"
            >
              <TabScreenshotPreview
                tabData={minifiedTabData}
                bpm={bpm}
                color={"maple"}
                theme={"dark"}
              />
            </div>
          </div>
        )}
      </div>

      <GlossaryDialog />

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </div>
  );
}

export default StaticTab;
