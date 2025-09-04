import type { Tab as PrismaTab } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FaBook } from "react-icons/fa";
import type { TabWithArtistMetadata } from "~/server/api/routers/tab";
import { useTabStore } from "~/stores/TabStore";
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
import SectionProgression from "./SectionProgression";
import TabMetadata from "./TabMetadata";
import { HiOutlineLightBulb, HiOutlineInformationCircle } from "react-icons/hi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useLocalStorageValue } from "@react-hookz/web";
import Chords from "./Chords";
import SectionContainer from "./SectionContainer";
import StrummingPatterns from "./StrummingPatterns";
import dynamic from "next/dynamic";
import StaticSectionContainer from "~/components/Tab/Static/StaticSectionContainer";
import EffectGlossaryDialog from "~/components/Dialogs/EffectGlossaryDialog";
import Logo from "~/components/ui/icons/Logo";
import ExtraTabMetadata from "~/components/Tab/DesktopExtraTabMetadata";
import MobileExtraTabMetadata from "~/components/Tab/MobileExtraTabMetadata";
import { useInView } from "react-intersection-observer";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import TipsDialog from "~/components/Dialogs/TipsDialog";
import { IoMdSettings } from "react-icons/io";
import { Label } from "~/components/ui/label";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { Switch } from "~/components/ui/switch";
import { getTrackBackground, Range } from "react-range";
import { tuningNotes } from "~/utils/tunings";

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

  // true when creating new section, results in way less cpu/ram usage for arguably worse ux
  const [forceCloseSectionAccordions, setForceCloseSectionAccordions] =
    useState(false);

  const { ref: tabContentRef } = useInView({
    rootMargin: "-300px 0px -300px 0px",
    threshold: 0,
    onChange: (inView) => {
      setTabContentIsInView(inView);
    },
  });

  const localStorageTabData = useLocalStorageValue("autostrum-tabData");

  const [showPinnedChords, setShowPinnedChords] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    tabData,
    getTabData,
    setTabData,
    setSectionProgression,
    editing,
    setOriginalTabData,
    showSectionProgressionModal,
    setShowEffectGlossaryDialog,
    chordBeingEdited,
    strummingPatternBeingEdited,
    showCustomTuningModal,
    currentlyPlayingMetadata,
    currentChordIndex,
    sectionProgression,
    chords,
    strummingPatterns,
    audioMetadata,
    showPlaybackModal,
    viewportLabel,
    setShowPlaybackModal,
    setLooping,
    color,
    theme,
    setMobileHeaderModal,
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
    tabData: state.tabData,
    getTabData: state.getTabData,
    setTabData: state.setTabData,
    setSectionProgression: state.setSectionProgression,
    editing: state.editing,
    setOriginalTabData: state.setOriginalTabData,
    showSectionProgressionModal: state.showSectionProgressionModal,
    setShowEffectGlossaryDialog: state.setShowEffectGlossaryDialog,
    chordBeingEdited: state.chordBeingEdited,
    strummingPatternBeingEdited: state.strummingPatternBeingEdited,
    showCustomTuningModal: state.showCustomTuningModal,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    currentChordIndex: state.currentChordIndex,
    sectionProgression: state.sectionProgression,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    audioMetadata: state.audioMetadata,
    showPlaybackModal: state.showPlaybackModal,
    viewportLabel: state.viewportLabel,
    setShowPlaybackModal: state.setShowPlaybackModal,
    setLooping: state.setLooping,
    color: state.color,
    theme: state.theme,
    setMobileHeaderModal: state.setMobileHeaderModal,
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
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setTabData(tab.tabData);
    // @ts-expect-error can't specify type from prisma Json value, but we know* it's correct
    setSectionProgression(tab.sectionProgression ?? []);

    setCustomTuning(tuningNotes.includes(tab.tuning) ? null : tab.tuning);
  }, [tab]);

  useEffect(() => {
    if (!tab && tabData.length === 0) {
      setTabData([
        {
          id: crypto.randomUUID(),
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
    tabData,
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

  function addNewSection() {
    const newTabData = getTabData();

    const newSectionData = {
      id: crypto.randomUUID(),
      title: `Section ${tabData.length + 1}`,
      data: [],
    };
    newTabData.push(newSectionData);

    setTabData(newTabData);
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
                onClick={() => setShowEffectGlossaryDialog(true)}
              >
                <FaBook className="h-4 w-4" />
                Effect glossary
              </Button>
            </div>
          )}

        <Separator
          className={`mt-2 bg-border ${editing ? "w-[96%]" : "w-full tablet:w-[96%]"}`}
        />
        {editing ? (
          <div className="baseVertFlex relative mb-4 mt-6 w-full gap-4 sm:mb-0 sm:mt-4">
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
                onClick={() => setShowEffectGlossaryDialog(true)}
              >
                <FaBook className="size-4" />
                Effect glossary
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
          <AnimatePresence mode="wait">
            {showPinnedChords && chords.length > 0 && (
              <motion.div
                key={"stickyPinnedChords"}
                // FYI: tried to animate height too, however idk if it's possible/easy
                // given that this is a sticky element. (worked fine when not sticky)
                initial={{
                  opacity: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                animate={{
                  opacity: 1,
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                }}
                exit={{
                  opacity: 0,
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
                transition={{ duration: 0.25 }}
                className="baseFlex sticky left-0 top-20 z-10 w-[calc(100%-3.45rem)] rounded-xl border bg-background shadow-lg"
              >
                <Carousel
                  opts={{
                    dragFree: true,
                    align: "start",
                  }}
                  className="baseFlex max-w-[90%]"
                >
                  <CarouselContent>
                    {chords.map((chord) => (
                      <CarouselItem
                        key={chord.id}
                        className="baseVertFlex basis-[96px] gap-2 text-foreground md:basis-[134px]"
                      >
                        <span className="text-sm font-medium">
                          {chord.name}
                        </span>
                        <div className="h-[80px] tablet:h-[118px]">
                          <ChordDiagram originalFrets={chord.frets} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </motion.div>
            )}
          </AnimatePresence>

          {!showPlaybackModal &&
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
                    sectionData={section}
                    currentlyPlayingSectionIndex={
                      currentlyPlayingMetadata?.[currentChordIndex]?.location
                        .sectionIndex ?? 0
                    }
                    currentlyPlayingSubSectionIndex={
                      currentlyPlayingMetadata?.[currentChordIndex]?.location
                        .subSectionIndex ?? 0
                    }
                    forceCloseSectionAccordions={
                      forceCloseSectionAccordions &&
                      index !== tabData.length - 1
                    }
                    setForceCloseSectionAccordions={
                      setForceCloseSectionAccordions
                    }
                  />
                ) : (
                  <StaticSectionContainer
                    sectionIndex={index}
                    sectionData={section}
                    color={color}
                    theme={theme}
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
                !editing &&
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
                    onClick={() => setShowEffectGlossaryDialog(true)}
                  >
                    <FaBook className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={"top"}>
                  <span>Effect glossary</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="audio"
              className="baseFlex gap-3 !rounded-full bg-audio px-8 py-6 text-lg shadow-lg hover:brightness-90 tablet:px-10 tablet:text-xl"
              onClick={() => {
                setShowPlaybackModal(true);
                setLooping(true);
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
                  setMobileHeaderModal({
                    showing: open,
                    zIndex: open ? 49 : 48,
                  });
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
                  <DrawerContent className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-2 rounded-t-2xl bg-secondary p-4 pb-6">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Popover>
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
                  </TooltipTrigger>
                  <TooltipContent side={"top"}>
                    <span>Tab settings</span>
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

      <EffectGlossaryDialog />

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
    </motion.div>
  );
}

export default Tab;

interface TabSettings {
  showPinnedChords: boolean;
  setShowPinnedChords: (show: boolean) => void;
}

function TabSettings({ showPinnedChords, setShowPinnedChords }: TabSettings) {
  const localStorageZoom = useLocalStorageValue("autostrum-zoom");
  const localStorageLeftHandChordDiagrams = useLocalStorageValue(
    "autostrum-left-hand-chord-diagrams",
  );

  const zoom = useGetLocalStorageValues().zoom;
  const leftHandChordDiagrams =
    useGetLocalStorageValues().leftHandChordDiagrams;

  // used for range marking conditional background color
  const indexToZoom = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5];

  return (
    <div className="baseVertFlex w-full gap-2">
      <div className="baseFlex w-full !justify-between gap-2 text-sm font-medium">
        <Label id="tabZoomSlider">Zoom</Label>
        <span>{zoom}x</span>
      </div>

      <div className="baseFlex w-full">
        <Range
          labelledBy="tabZoomSlider"
          step={0.1}
          min={0.5}
          max={1.5}
          values={[zoom]}
          renderMark={({ props, index }) => (
            <div
              {...props}
              key={props.key}
              style={{
                ...props.style,
                marginTop: "0px",
                height: "12px",
                width: "2px",
                borderRadius: "25%",
                backgroundColor:
                  indexToZoom[index]! <= zoom
                    ? "hsl(var(--primary))"
                    : "#939098",
              }}
            />
          )}
          onChange={(values) => {
            localStorageZoom.set(`${values[0]}`);
          }}
          renderTrack={({ props, children, disabled }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  borderRadius: "0px",
                  filter: disabled ? "brightness(0.75)" : "none",
                  background: getTrackBackground({
                    values: [zoom],
                    colors: ["hsl(var(--primary))", "#939098"],
                    min: 0.5,
                    max: 1.5,
                  }),
                  alignSelf: "center",
                }}
                className="w-full"
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}`}
              style={{
                ...props.style,
              }}
              className="z-10 size-[18px] rounded-full border bg-primary"
            />
          )}
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2 text-xs font-medium">
        <span>0.5x</span>
        <span>1x</span>
        <span>1.5x</span>
      </div>

      <div className="baseFlex mt-2 w-full !justify-between gap-2">
        <Label htmlFor="pinChords">Pin chords</Label>
        <Switch
          id="pinChords"
          checked={showPinnedChords}
          onCheckedChange={(value) => {
            setShowPinnedChords(value);
          }}
        />
      </div>

      <div className="baseFlex w-full !justify-between gap-2">
        <Label htmlFor="leftHandChordDiagrams">Left-hand chord diagrams</Label>

        <Switch
          id="leftHandChordDiagrams"
          checked={leftHandChordDiagrams}
          onCheckedChange={(value) =>
            localStorageLeftHandChordDiagrams.set(String(value))
          }
        />
      </div>
    </div>
  );
}
