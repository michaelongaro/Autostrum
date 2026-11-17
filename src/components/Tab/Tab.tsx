import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { FaBook } from "react-icons/fa";
import { HiOutlineInformationCircle, HiOutlineLightBulb } from "react-icons/hi";
import { IoMdSettings } from "react-icons/io";
import { useInView } from "react-intersection-observer";
import AudioControls from "~/components/AudioControls/AudioControls";
import AudioControlsStickyBounds from "~/components/AudioControls/AudioControlsStickyBounds";
import ChordDialog from "~/components/Dialogs/ChordDialog";
import CustomTuningDialog from "~/components/Dialogs/CustomTuningDialog";
import GlossaryDialog from "~/components/Dialogs/GlossaryDialog";
import SectionProgressionDialog from "~/components/Dialogs/SectionProgressionDialog";
import StrummingPatternDialog from "~/components/Dialogs/StrummingPatternDialog";
import TipsDialog from "~/components/Dialogs/TipsDialog";
import DesktopExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import PinnedTabChrome, {
  getSectionScrollMarginTop,
} from "~/components/Tab/PinnedTabChrome";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import TabSettings from "~/components/Tab/TabSettings";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import Logo from "~/components/ui/icons/Logo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { VisuallyHidden } from "~/components/ui/visually-hidden";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import useSectionNavigationVisibility from "~/hooks/useSectionNavigationVisibility";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import { useSectionIds } from "~/hooks/useTabDataSelectors";
import { useTabEditorHistory } from "~/hooks/useTabEditorHistory";
import { useAppPreferencesStore } from "~/stores/AppPreferencesStore";
import { useTabStoreShallow, useTabStoreApi } from "~/stores/TabStore";
import { cn } from "~/utils/cn";
import { primePlaybackUserGesture } from "~/utils/primePlaybackUserGesture";
import Chords from "./Chords";
import SectionContainer from "./SectionContainer";
import SectionProgression from "./SectionProgression";
import StrummingPatterns from "./StrummingPatterns";
import TabMetadata from "./TabMetadata";

import PlaybackModal from "~/components/Tab/Playback/PlaybackModal";

function Tab() {
  const store = useTabStoreApi();
  const [isPublishingOrUpdating, setIsPublishingOrUpdating] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [tabContentIsInView, setTabContentIsInView] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsPopoverIsOpen, setSettingsPopoverIsOpen] = useState(false);
  const [showPinnedChords, setShowPinnedChords] = useState(false);
  const [pressingOnZoomSlider, setPressingOnZoomSlider] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  const [sectionHeights, setSectionHeights] = useState<Record<string, number>>(
    {},
  );
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabDataSectionRef = useRef<HTMLDivElement>(null);

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

  const {
    id,
    setShowGlossaryDialog,
    chords,
    showPlaybackModal,
    showingAudioControls,
    setTabData,
    fullTabMetadataLength,
    setShowPlaybackModal,
    editing,
  } = useTabStoreShallow((state) => ({
    id: state.id,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
    chords: state.chords,
    showPlaybackModal: state.showPlaybackModal,
    showingAudioControls: state.showingAudioControls,
    setTabData: state.setTabData,
    fullTabMetadataLength: state.audioMetadata.fullTabMetadataLength,
    setShowPlaybackModal: state.setShowPlaybackModal,
    editing: state.editing,
  }));
  const { viewportLabel, color, theme } = useAppPreferencesStore((state) => ({
    viewportLabel: state.viewportLabel,
    color: state.color,
    theme: state.theme,
  }));

  // IDs only — nested note edits must not re-render the entire tab tree.
  const sectionIds = useSectionIds();
  const tabDataLength = sectionIds.length;

  const showSectionNavigation = useSectionNavigationVisibility({
    sectionCount: tabDataLength,
    drawerOpen,
    showPlaybackModal,
    resetKey: id,
    showPinnedChords,
    // Preview/viewing path only — editing uses a different section tree.
    enabled: !editing,
  });

  const showPinnedChordsBar = showPinnedChords && chords.length > 0;
  const sectionScrollMarginTop = getSectionScrollMarginTop({
    showSectionNavigation,
    showPinnedChordsBar,
  });

  useAutoCompileChords();
  useSpacebarAudioControl({ useHoveredChordLocation: true });
  useTabEditorHistory(isPublishingOrUpdating);

  const { ref: tabContentRef } = useInView({
    rootMargin: "-300px 0px -300px 0px",
    threshold: 0,
    onChange: (inView) => {
      setTabContentIsInView(inView);
    },
  });

  function addNewSection() {
    const newSectionId = crypto.randomUUID();

    setTabData((draft) => {
      draft.push({
        id: newSectionId,
        title: `Section ${draft.length + 1}`,
        data: [],
      });
    });
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
      {/* Clip the sliding audio controls at the editor edge without creating a
          scroll container, which would prevent viewport-based sticky positioning. */}
      <div
        id={"mainTabComponent"}
        data-tab-editor-history="document"
        style={{
          transition: "filter 0.5s ease-in-out",
        }}
        className={cn(
          "baseVertFlex relative w-full border-y bg-background shadow-lg md:rounded-xl md:border",
          editing && "overflow-clip",
          isPublishingOrUpdating && "pointer-events-none brightness-90",
        )}
      >
        <TabMetadata setIsPublishingOrUpdating={setIsPublishingOrUpdating} />

        <Separator
          className={`mt-2 bg-border ${editing ? "w-[calc(100%-16px)] md:w-[calc(100%-56px)]" : "h-px w-[calc(100%-16px)] w-full lg:mb-4 lg:h-[2px] lg:w-[calc(100%-56px)]"}`}
        />

        {editing ? (
          <div className="baseVertFlex relative mb-4 mt-6 w-full gap-4 lg:mb-0 lg:mt-4">
            <SectionProgression />
            <Chords />
            <StrummingPatterns />

            <div className="baseFlex gap-4">
              <Button
                variant={"secondary"}
                className="baseFlex mt-2 gap-2 lg:absolute lg:left-7 lg:top-0 lg:mt-0"
                onClick={() => setShowTipsModal(true)}
              >
                <HiOutlineInformationCircle className="size-4" />
                Tips
              </Button>

              <Button
                variant={"secondary"}
                className="baseFlex mt-2 gap-2 lg:absolute lg:right-7 lg:top-0 lg:mt-0"
                onClick={() => setShowGlossaryDialog(true)}
              >
                <FaBook className="size-4" />
                Glossary
              </Button>

              <Popover>
                <PopoverTrigger
                  aria-label="Editor tips"
                  className="baseFlex mt-2 size-8 rounded-md transition-all hover:bg-primary-foreground/20 hover:text-yellow-300 active:hover:bg-primary-foreground/10 sm:absolute sm:bottom-0 sm:right-4 lg:right-6 lg:mt-0"
                >
                  <HiOutlineLightBulb className="h-5 w-5" />
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="baseVertFlex gap-2 p-2 text-sm shadow-lg"
                >
                  <div className="baseFlex gap-2 font-semibold">
                    <HiOutlineInformationCircle className="size-4" />
                    Tip
                  </div>
                  <p>
                    If performance degrades while playing back your tab, try
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
              <DesktopExtraTabMetadata />
            )}
          </>
        )}

        <Separator
          className={`bg-border ${editing ? "my-2 w-[calc(100%-16px)] md:w-[calc(100%-56px)]" : `h-px w-[calc(100%-16px)] lg:h-[2px] lg:w-[calc(100%-56px)] ${showSectionNavigation ? "mt-2" : "my-2"}`}`}
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

          {/* Keep bottom padding stable; each entering section animates its own gap. */}
          <div
            ref={tabDataSectionRef}
            className={cn(
              "baseVertFlex w-full !justify-start",
              editing ? "pb-8" : "gap-4",
            )}
          >
            {editing ? (
              <AnimatePresence initial={false}>
                {sectionIds.map((sectionId, index) => (
                  <motion.div
                    key={sectionId}
                    layout={"position"}
                    layoutDependency={index}
                    initial={{ height: 0, marginTop: 0 }}
                    animate={{
                      height: "auto",
                      marginTop: index === 0 ? 0 : 16,
                    }}
                    exit={{ height: 0, marginTop: 0 }}
                    transition={{
                      ease: "easeInOut",
                      duration: prefersReducedMotion ? 0 : 0.35,
                    }}
                    style={{
                      overflow: "hidden",
                    }}
                    className="w-full"
                  >
                    {/* Keep focus rings inside the height-animation clip. */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0,
                      }}
                      style={{ transformOrigin: "center top" }}
                      className="baseFlex w-full py-0.5"
                    >
                      <SectionContainer sectionIndex={index} />
                    </motion.div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <>
                {sectionIds.map((sectionId, index) =>
                  showPlaybackModal ? (
                    <div
                      key={`staticSectionWrapperFiller-${sectionId}`}
                      style={{ height: sectionHeights[sectionId] ?? 0 }}
                      className="w-full"
                    />
                  ) : (
                    <div
                      key={`staticSectionWrapper-${sectionId}`}
                      ref={(el) => measureSectionHeight(sectionId, el)}
                      className="w-full"
                    >
                      <StaticSectionContainer
                        sectionIndex={index}
                        color={color}
                        theme={theme}
                        tabDataLength={tabDataLength}
                        scrollMarginTop={sectionScrollMarginTop}
                      />
                    </div>
                  ),
                )}
              </>
            )}
          </div>

          {editing && (
            <Button onClick={addNewSection} className="mb-8 px-8">
              Add section
            </Button>
          )}

          {editing && showingAudioControls && (
            <AudioControlsStickyBounds tabDataSectionRef={tabDataSectionRef}>
              <AudioControls />
            </AudioControlsStickyBounds>
          )}

          {!editing && (
            <div
              id="stickyBottomControls"
              style={{
                opacity:
                  fullTabMetadataLength > 0 && tabContentIsInView ? 1 : 0,
                transition: "opacity 0.2s ease-in-out",
              }}
              className="baseFlex sticky bottom-4 mb-4 gap-4 lg:bottom-6"
            >
              <TooltipProvider delay={150}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Glossary"
                        variant={"secondary"}
                        className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                        onClick={() => setShowGlossaryDialog(true)}
                      >
                        <FaBook className="size-4" />
                      </Button>
                    }
                  />
                  <TooltipContent side={"top"}>
                    <span>Glossary</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="audio"
                className="baseFlex gap-3 !rounded-full bg-audio px-8 py-6 text-lg shadow-lg hover:brightness-90 lg:px-10 lg:text-xl"
                onClick={() => {
                  primePlaybackUserGesture(store.getState());
                  setShowPlaybackModal(true);
                }}
              >
                <Logo className="size-[18px] lg:size-5" />
                Practice
              </Button>

              {viewportLabel.includes("mobile") ? (
                <Drawer
                  open={drawerOpen}
                  swipeDisabled={pressingOnZoomSlider}
                  disablePointerDismissal={pressingOnZoomSlider}
                  onOpenChange={(open) => {
                    setDrawerOpen(open);

                    if (!open) setPressingOnZoomSlider(false);
                  }}
                >
                  <DrawerTrigger
                    aria-label="Tab settings"
                    render={
                      <Button
                        variant={"secondary"}
                        className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                      >
                        <IoMdSettings className="size-5" />
                      </Button>
                    }
                  />

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
                </Drawer>
              ) : (
                <TooltipProvider delay={150}>
                  <Tooltip open={settingsPopoverIsOpen ? false : undefined}>
                    <TooltipTrigger
                      render={
                        <div className="baseFlex">
                          <Popover
                            open={settingsPopoverIsOpen}
                            onOpenChange={setSettingsPopoverIsOpen}
                          >
                            <PopoverTrigger
                              render={
                                <Button
                                  aria-label="Tab settings"
                                  variant={"secondary"}
                                  className="baseFlex !size-11 gap-2 !rounded-full border !p-0 shadow-lg"
                                >
                                  <IoMdSettings className="size-5" />
                                </Button>
                              }
                            />
                            <PopoverContent
                              className="baseVertFlex p-3"
                              side="top"
                            >
                              <TabSettings
                                showPinnedChords={showPinnedChords}
                                setShowPinnedChords={setShowPinnedChords}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      }
                    />
                    <TooltipContent side={"top"}>
                      <span>Settings</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>

      <CustomTuningDialog />

      <GlossaryDialog />

      <SectionProgressionDialog />

      <ChordDialog />

      <StrummingPatternDialog />

      <TipsDialog
        showTipsDialog={showTipsModal}
        setShowTipsDialog={setShowTipsModal}
      />

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </motion.div>
  );
}

export default Tab;
