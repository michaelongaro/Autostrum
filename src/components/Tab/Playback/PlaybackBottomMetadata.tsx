import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import { FaBook, FaListUl } from "react-icons/fa";
import {
  BsFillVolumeDownFill,
  BsFillVolumeMuteFill,
  BsFillVolumeUpFill,
  BsMusicNoteBeamed,
  BsMusicNoteList,
} from "react-icons/bs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { isMobileOnly } from "react-device-detect";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import StrummingPattern from "~/components/Tab/StrummingPattern";
import type { LastModifiedPalmMuteNodeLocation } from "~/components/Tab/TabSection";
import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import Logo from "~/components/ui/icons/Logo";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import { PrettyTuning } from "~/components/ui/PrettyTuning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import { tuningNotesToName } from "~/utils/tunings";
import { Direction, getTrackBackground, Range } from "react-range";
import { IoMdSettings } from "react-icons/io";
import { IoColorPalette } from "react-icons/io5";
import CountIn from "~/components/ui/icons/CountIn";
import PlaybackSectionPicker from "~/components/Tab/Playback/PlaybackSectionPicker";
import { useRouter } from "next/router";
import PlaybackTunerDrawer from "~/components/Tab/Playback/PlaybackTunerDrawer";
import ChordName from "~/components/ui/ChordName";

interface PlaybackBottomMetadata {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
  showBackgroundBlur: boolean;
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
}

function PlaybackBottomMetadata({
  tabProgressValue,
  setTabProgressValue,
  showBackgroundBlur,
  setShowBackgroundBlur,
}: PlaybackBottomMetadata) {
  const { asPath } = useRouter();

  const {
    capo,
    tuning,
    audioMetadata,
    playbackMetadata,
    viewportLabel,
    setShowGlossaryDialog,
    countInTimer,
    pauseAudio,
    enterPlaybackLoopRangeEditor,
  } = useTabStore((state) => ({
    capo: state.capo,
    tuning: state.tuning,
    audioMetadata: state.audioMetadata,
    playbackMetadata: state.playbackMetadata,
    viewportLabel: state.viewportLabel,
    setShowGlossaryDialog: state.setShowGlossaryDialog,
    countInTimer: state.countInTimer,
    pauseAudio: state.pauseAudio,
    enterPlaybackLoopRangeEditor: state.enterPlaybackLoopRangeEditor,
  }));

  // Close settings popover on device orientation change
  useEffect(() => {
    const closePopover = () => {
      setShowBackgroundBlur(false);
    };

    window.addEventListener("orientationchange", closePopover);
    screen.orientation?.addEventListener("change", closePopover);

    return () => {
      window.removeEventListener("orientationchange", closePopover);
      screen.orientation?.removeEventListener("change", closePopover);
      setShowBackgroundBlur(false);
    };
  }, [setShowBackgroundBlur]);

  if (playbackMetadata === null) return;

  return (
    <>
      {viewportLabel.includes("Landscape") ? (
        <div className="baseFlex w-full !justify-between gap-4 px-4 pb-2">
          <div className="baseFlex gap-4">
            <div className="baseVertFlex !items-start">
              <p className="text-sm font-medium">Tuning</p>
              <div>
                {tuningNotesToName[
                  tuning.toLowerCase() as keyof typeof tuningNotesToName
                ] ?? <PrettyTuning tuning={tuning} displayWithFlex />}
              </div>
            </div>

            <div className="baseVertFlex !items-start">
              <p className="text-sm font-medium">Capo</p>
              {capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}
            </div>

            <PlaybackTunerDrawer />
          </div>

          <div className="baseFlex gap-4">
            <PlaybackSectionPicker />

            <MobileSettingsPopover
              showBackgroundBlur={showBackgroundBlur}
              setShowBackgroundBlur={setShowBackgroundBlur}
            />

            {!asPath.includes("/tools") && <MobileMenuDialog />}

            <Button
              variant={"outline"}
              className="size-9 !p-0"
              onClick={() => {
                pauseAudio();
                setShowGlossaryDialog(true);
              }}
            >
              <FaBook className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="baseFlex w-full px-4 py-4">
          {viewportLabel.includes("mobile") ? (
            <div className="baseFlex gap-4">
              <MobileSettingsPopover
                showBackgroundBlur={showBackgroundBlur}
                setShowBackgroundBlur={setShowBackgroundBlur}
              />

              {!asPath.includes("/tools") && <MobileMenuDialog />}

              <Button
                variant={"outline"}
                aria-label="Edit loop range"
                disabled={audioMetadata.playing || countInTimer.showing}
                className="size-9 p-1"
                onClick={() => enterPlaybackLoopRangeEditor()}
              >
                <CgArrowsShrinkH className="h-6 w-6" />
              </Button>

              <Button
                variant={"outline"}
                className="size-9 !p-0"
                onClick={() => {
                  pauseAudio();
                  setShowGlossaryDialog(true);
                }}
              >
                <FaBook className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="baseFlex w-full">
              <DesktopSettings
                tabProgressValue={tabProgressValue}
                setTabProgressValue={setTabProgressValue}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default PlaybackBottomMetadata;

interface MobileSettingsPopover {
  showBackgroundBlur: boolean;
  setShowBackgroundBlur: Dispatch<SetStateAction<boolean>>;
}

function MobileSettingsPopover({
  showBackgroundBlur,
  setShowBackgroundBlur,
}: MobileSettingsPopover) {
  const {
    currentInstrumentName,
    setCurrentInstrumentName,
    audioMetadata,
    pauseAudio,
    countInTimer,
    loopDelay,
    setLoopDelay,
    viewportLabel,
    updateMasterVolumeGainNode,
  } = useTabStore((state) => ({
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
    viewportLabel: state.viewportLabel,
    updateMasterVolumeGainNode: state.updateMasterVolumeGainNode,
  }));

  const volume = useGetLocalStorageValues().volume;
  const countIn = useGetLocalStorageValues().countIn;
  const colorCodedChords = useGetLocalStorageValues().colorCodedChords;
  const localStorageVolume = useLocalStorageValue("autostrum-volume");
  const localStorageCountIn = useLocalStorageValue("autostrum-count-in");
  const localStorageColorCodedChords = useLocalStorageValue(
    "autostrum-color-coded-chords",
  );

  const [open, setOpen] = useState(false);

  // FYI: I really dislike this approach, and would have preferred to use the native
  // onOpenChange prop from <Popover>, however for whatever reason it would not work
  // properly on mobile, so I have this workaround instead.
  useEffect(() => {
    if (showBackgroundBlur === false) {
      setOpen(false);
    }
  }, [showBackgroundBlur]);

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            setOpen((prev) => !prev);
            setShowBackgroundBlur((prev) => !prev);
            if (audioMetadata.playing) pauseAudio();
          }}
          style={{
            backgroundColor: open ? "hsl(var(--background))" : "transparent",
          }}
          className="z-50 !h-9"
        >
          <IoMdSettings className="size-5" />
          <span className="ml-0 hidden mobilePortrait:ml-2 mobilePortrait:block">
            Settings
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={viewportLabel.includes("Landscape") ? "left" : "top"}
        className="baseVertFlex size-full w-[450px] gap-4 mobilePortrait:w-[300px]"
      >
        <div className="baseVertFlex w-full !items-start gap-2">
          <span className="text-sm font-medium">Instrument</span>

          <div className="grid w-full grid-cols-2 grid-rows-2 gap-2 mobilePortrait:grid-cols-1 mobilePortrait:grid-rows-4">
            <Button
              variant={
                currentInstrumentName === "acoustic_guitar_nylon"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("acoustic_guitar_nylon");
              }}
            >
              Acoustic guitar - Nylon
            </Button>

            <Button
              variant={
                currentInstrumentName === "acoustic_guitar_steel"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("acoustic_guitar_steel");
              }}
            >
              Acoustic guitar - Steel
            </Button>

            <Button
              variant={
                currentInstrumentName === "electric_guitar_clean"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("electric_guitar_clean");
              }}
            >
              Electric guitar - Clean
            </Button>

            <Button
              variant={
                currentInstrumentName === "electric_guitar_jazz"
                  ? "default"
                  : "outline"
              }
              onClick={() => {
                setCurrentInstrumentName("electric_guitar_jazz");
              }}
            >
              Electric guitar - Jazz
            </Button>
          </div>
        </div>

        <div
          className={`${viewportLabel.includes("Landscape") ? "baseFlex gap-8" : "baseVertFlex !items-start gap-2"} w-full`}
        >
          <span className="shrink-0 text-sm font-medium">Loop delay</span>

          <div className="baseFlex w-full !justify-start gap-2">
            <Button
              variant={loopDelay === 0 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(0);
              }}
              className="w-full"
            >
              0s
            </Button>

            <Button
              variant={loopDelay === 1 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(1);
              }}
              className="w-full"
            >
              1s
            </Button>

            <Button
              variant={loopDelay === 2 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(2);
              }}
              className="w-full"
            >
              2s
            </Button>

            <Button
              variant={loopDelay === 3 ? "default" : "outline"}
              disabled={countInTimer.showing}
              onClick={() => {
                setLoopDelay(3);
              }}
              className="w-full"
            >
              3s
            </Button>
          </div>
        </div>

        <div className="baseFlex w-full !justify-between gap-2">
          <Label htmlFor="colorCodedChordsMobile" className="baseFlex gap-2">
            <IoColorPalette className="size-4" />
            Color-coded chords
          </Label>

          <Switch
            id="colorCodedChordsMobile"
            checked={colorCodedChords}
            onCheckedChange={(value) => {
              localStorageColorCodedChords.set(String(value));
            }}
          />
        </div>

        <div className="baseFlex w-full !justify-between gap-2">
          <Label htmlFor="countInMobile" className="baseFlex gap-2">
            <CountIn className="size-4" />
            Count in
          </Label>

          <Switch
            id="countInMobile"
            checked={countIn}
            onCheckedChange={(value) => {
              localStorageCountIn.set(String(value));
            }}
          />
        </div>

        {/* gives tablet users ability to still control volume */}
        {!isMobileOnly && (
          <div className="baseFlex w-full !items-start !justify-between gap-2">
            <span className="text-sm font-medium">Volume</span>
            <div className="baseFlex w-full max-w-48 gap-2 md:justify-self-end">
              <AnimatePresence mode="popLayout" initial={false}>
                {volume === 0 && (
                  <motion.div
                    key="muteIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeMuteFill
                      size={"1.5rem"}
                      className="shrink-0"
                    />
                  </motion.div>
                )}
                {volume > 0 && volume < 1 ? (
                  <motion.div
                    key="lowVolumeIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeDownFill
                      size={"1.5rem"}
                      className="shrink-0"
                    />
                  </motion.div>
                ) : null}
                {volume >= 1 ? (
                  <motion.div
                    key="highVolumeIcon"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="baseFlex"
                  >
                    <BsFillVolumeUpFill size={"1.5rem"} className="shrink-0" />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Range
                label="Slider to control the playback volume"
                min={0}
                max={100}
                step={1}
                values={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                onChange={(values) => {
                  const volume = values[0]! / 50; // 100 felt too quiet/narrow of a volume range
                  localStorageVolume.set(`${volume}`);
                  updateMasterVolumeGainNode(volume);
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
                      margin: "0 0.35rem",
                    }}
                  >
                    <div
                      ref={props.ref}
                      style={{
                        height: "8px",
                        borderRadius: "4px",
                        filter: disabled ? "brightness(0.75)" : "none",
                        alignSelf: "center",
                        background: getTrackBackground({
                          values: [volume * 50],
                          colors: [
                            "hsl(var(--primary))",
                            "hsl(var(--gray)/0.75)",
                          ],
                          min: 0,
                          max: 100,
                        }),
                      }}
                      className={`relative w-full`}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ props }) => {
                  const { key, ...restOfProps } = props;
                  return (
                    <div
                      key={key}
                      {...restOfProps}
                      className="!z-20 size-[18px] rounded-full border bg-primary"
                    />
                  );
                }}
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PracticeMenuPane({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="baseVertFlex min-h-full w-full px-4 py-4">{children}</div>
    </div>
  );
}

function MobileMenuDialog() {
  const {
    sectionProgression,
    currentInstrument,
    chords,
    strummingPatterns,
    audioMetadata,
    previewMetadata,
    chordDisplayMode,
    playPreview,
    pauseAudio,
  } = useTabStore((state) => ({
    sectionProgression: state.sectionProgression,
    currentInstrument: state.currentInstrument,
    chords: state.chords,
    strummingPatterns: state.strummingPatterns,
    audioMetadata: state.audioMetadata,
    previewMetadata: state.previewMetadata,
    chordDisplayMode: state.chordDisplayMode,
    playPreview: state.playPreview,
    pauseAudio: state.pauseAudio,
  }));

  const [activeTabName, setActiveTabName] = useState<
    "Section progression" | "Chords" | "Strumming patterns"
  >("Section progression");

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [carouselContentApi, setCarouselContentApi] =
    useState<CarouselApi | null>(null);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] = useState<
    boolean[]
  >([]);
  // this is hacky dummy state so that the <StrummingPattern /> can render the palm mute node
  // as expected without actually having access to that state. Works fine for this case because
  // we are only ever rendering the static palm mute data visually and never modifying it.
  const [lastModifiedPalmMuteNode, setLastModifiedPalmMuteNode] =
    useState<LastModifiedPalmMuteNodeLocation | null>(null);

  useEffect(() => {
    if (!carouselApi || !carouselContentApi) return;

    function handleContentSelect() {
      if (!carouselApi || !carouselContentApi) return;

      const currentIndex = carouselContentApi.selectedScrollSnap();

      switch (currentIndex) {
        case 0:
          carouselApi.scrollTo(0);
          setActiveTabName("Section progression");
          break;
        case 1:
          carouselApi.scrollTo(1);
          setActiveTabName("Chords");
          break;
        case 2:
          carouselApi.scrollTo(2);
          setActiveTabName("Strumming patterns");
          break;
        default:
          carouselApi.scrollTo(0);
          setActiveTabName("Section progression");
      }
    }

    carouselContentApi.on("select", handleContentSelect);

    return () => {
      carouselContentApi.off("select", handleContentSelect);
    };
  }, [carouselApi, carouselContentApi]);

  function selectPracticeMenuPane(index: number) {
    if (audioMetadata.playing || previewMetadata.playing) {
      pauseAudio();
    }

    carouselApi?.scrollTo(index);
    carouselContentApi?.scrollTo(index);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            if (audioMetadata.playing) pauseAudio();
          }}
          className="!h-9"
        >
          <FaListUl className="size-[18px]" />
          <span className="ml-0 hidden mobilePortrait:ml-3 mobilePortrait:block">
            Menu
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="baseVertFlex flex h-dvh max-h-dvh w-full max-w-none gap-0 !justify-start overflow-hidden !rounded-none border-none p-0 pt-12">
        <div className="baseFlex h-12 w-full shrink-0 !justify-start">
          <Carousel
            setApi={setCarouselApi}
            opts={{
              dragFree: true,
            }}
            className="baseFlex w-full"
          >
            <CarouselContent className="pl-3">
              <CarouselItem className="baseFlex basis-auto">
                <Button
                  variant={"text"}
                  onClick={() => selectPracticeMenuPane(0)}
                  className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Section progression" ? "" : "opacity-50 hover:opacity-100"}`}
                >
                  <BsMusicNoteList className="size-4" />
                  Section progression
                  {activeTabName === "Section progression" && (
                    <motion.span
                      layoutId="mobilePracticeMenuActiveTabUnderline"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                      className="absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground"
                    />
                  )}
                </Button>
              </CarouselItem>

              <CarouselItem className="baseFlex basis-auto">
                <Button
                  variant={"text"}
                  onClick={() => selectPracticeMenuPane(1)}
                  className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Chords" ? "" : "opacity-50 hover:opacity-100"}`}
                >
                  <BsMusicNoteBeamed className="size-4" />
                  Chords
                  {activeTabName === "Chords" && (
                    <motion.span
                      layoutId="mobilePracticeMenuActiveTabUnderline"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                      className="absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground"
                    />
                  )}
                </Button>
              </CarouselItem>

              <CarouselItem className="baseFlex basis-auto">
                <Button
                  variant={"text"}
                  onClick={() => selectPracticeMenuPane(2)}
                  className={`baseFlex relative gap-2 text-nowrap !px-0 font-medium ${activeTabName === "Strumming patterns" ? "" : "opacity-50 hover:opacity-100"}`}
                >
                  <Logo className="z-0 size-4" />
                  Strumming patterns
                  {activeTabName === "Strumming patterns" && (
                    <motion.span
                      layoutId="mobilePracticeMenuActiveTabUnderline"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                      className="absolute bottom-0 left-0 z-0 h-[2px] w-full rounded-full bg-foreground"
                    />
                  )}
                </Button>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>

        <div className="min-h-0 w-full flex-1 overflow-hidden">
          <Carousel
            setApi={setCarouselContentApi}
            opts={{
              align: "start",
            }}
            className="h-full w-full"
          >
            <CarouselContent className="ml-0 h-full">
              <CarouselItem className="h-full min-h-0 basis-full overflow-hidden pl-0">
                <PracticeMenuPane>
                  {sectionProgression.length === 0 ? (
                    <p className="text-lg font-semibold text-gray">
                      No section progression found.
                    </p>
                  ) : (
                    <div className="baseVertFlex w-fit max-w-full gap-2">
                      {sectionProgression.map((section) => (
                        <div
                          key={section.id}
                          className="baseFlex w-full !justify-start gap-2"
                        >
                          <div className="baseFlex w-24 gap-2">
                            <span className="text-gray">
                              {formatSecondsToMinutes(section.startSeconds)}
                            </span>
                            <span className="text-gray">-</span>
                            <span className="text-gray">
                              {formatSecondsToMinutes(section.endSeconds)}
                            </span>
                          </div>

                          <div className="baseFlex gap-2">
                            <span className="text-nowrap font-semibold">
                              {section.title}
                            </span>
                            {section.repetitions > 1 && (
                              <p>({section.repetitions}x)</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PracticeMenuPane>
              </CarouselItem>

              <CarouselItem className="h-full min-h-0 basis-full overflow-hidden pl-0">
                <PracticeMenuPane>
                  {chords.length > 0 ? (
                    <div className="baseFlex w-full flex-wrap gap-8">
                      {chords.map((chord, index) => (
                        <div key={chord.id} className="baseFlex">
                          <div className="baseVertFlex gap-3">
                            <div className="baseFlex w-full !justify-between border-b py-2">
                              <ChordName
                                name={chord.name}
                                color={chord.color}
                                truncate={false}
                                showFullName={true}
                                isHighlighted={
                                  chordDisplayMode === "color"
                                    ? false
                                    : previewMetadata.indexOfPattern ===
                                          index &&
                                        previewMetadata.playing &&
                                        previewMetadata.type === "chord"
                                      ? true
                                      : false
                                }
                              />

                              {/* preview chord button */}
                              <Button
                                variant={"audio"}
                                disabled={
                                  !currentInstrument ||
                                  (previewMetadata.indexOfPattern === index &&
                                    previewMetadata.playing &&
                                    previewMetadata.type === "chord")
                                }
                                size={"sm"}
                                onClick={() => {
                                  if (
                                    audioMetadata.playing ||
                                    previewMetadata.playing
                                  ) {
                                    pauseAudio();
                                  }

                                  setTimeout(
                                    () => {
                                      void playPreview({
                                        data: chord.frets,
                                        index,
                                        type: "chord",
                                      });
                                    },
                                    audioMetadata.playing ||
                                      previewMetadata.playing
                                      ? 50
                                      : 0,
                                  );
                                }}
                                className="baseFlex mr-3 h-6 w-10 rounded-sm"
                              >
                                <PlayButtonIcon
                                  uniqueLocationKey={`chordPreview${index}`}
                                  currentInstrument={currentInstrument}
                                  previewMetadata={previewMetadata}
                                  indexOfPattern={index}
                                  previewType="chord"
                                />
                              </Button>
                            </div>

                            <div className="h-36">
                              <ChordDiagram originalFrets={chord.frets} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      No chords were specified for this tab.
                    </div>
                  )}
                </PracticeMenuPane>
              </CarouselItem>

              <CarouselItem className="h-full min-h-0 basis-full overflow-hidden pl-0">
                <PracticeMenuPane>
                  {strummingPatterns.length > 0 ? (
                    <div className="baseVertFlex gap-10">
                      {strummingPatterns.map((pattern, index) => (
                        <div key={pattern.id} className="shrink-0 overflow-hidden">
                          <div className="baseVertFlex !items-start">
                            <Button
                              variant={"audio"}
                              size={"sm"}
                              disabled={
                                !currentInstrument ||
                                artificalPlayButtonTimeout[index]
                              }
                              onClick={() => {
                                if (
                                  previewMetadata.playing &&
                                  index === previewMetadata.indexOfPattern &&
                                  previewMetadata.type === "strummingPattern"
                                ) {
                                  pauseAudio();
                                  setArtificalPlayButtonTimeout((prev) => {
                                    const prevArtificalPlayButtonTimeout = [
                                      ...prev,
                                    ];
                                    prevArtificalPlayButtonTimeout[index] =
                                      true;
                                    return prevArtificalPlayButtonTimeout;
                                  });

                                  setTimeout(() => {
                                    setArtificalPlayButtonTimeout((prev) => {
                                      const prevArtificalPlayButtonTimeout = [
                                        ...prev,
                                      ];
                                      prevArtificalPlayButtonTimeout[index] =
                                        false;
                                      return prevArtificalPlayButtonTimeout;
                                    });
                                  }, 300);
                                } else {
                                  if (
                                    audioMetadata.playing ||
                                    previewMetadata.playing
                                  ) {
                                    pauseAudio();
                                  }

                                  setTimeout(
                                    () => {
                                      void playPreview({
                                        data: pattern,
                                        index,
                                        type: "strummingPattern",
                                      });
                                    },
                                    audioMetadata.playing ||
                                      previewMetadata.playing
                                      ? 50
                                      : 0,
                                  );
                                }
                              }}
                              className="baseFlex ml-2 h-6 w-20 gap-2 rounded-b-none"
                            >
                              <p>
                                {previewMetadata.playing &&
                                index === previewMetadata.indexOfPattern &&
                                previewMetadata.type === "strummingPattern"
                                  ? "Stop"
                                  : "Play"}
                              </p>
                              <PlayButtonIcon
                                uniqueLocationKey={`strummingPatternPreview${index}`}
                                currentInstrument={currentInstrument}
                                previewMetadata={previewMetadata}
                                indexOfPattern={index}
                                previewType="strummingPattern"
                              />
                            </Button>
                            <div className="baseFlex border-b-none rounded-md border-2">
                              <StrummingPattern
                                data={pattern}
                                mode="viewingWithHighlights"
                                index={index}
                                lastModifiedPalmMuteNode={
                                  lastModifiedPalmMuteNode
                                }
                                setLastModifiedPalmMuteNode={
                                  setLastModifiedPalmMuteNode
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center">
                      No strumming patterns were specified for this tab.
                    </div>
                  )}
                </PracticeMenuPane>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DesktopSettings {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function DesktopSettings({
  tabProgressValue,
  setTabProgressValue,
}: DesktopSettings) {
  const {
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    audioMetadata,
    pauseAudio,
    countInTimer,
    loopDelay,
    setLoopDelay,
    enterPlaybackLoopRangeEditor,
    updateMasterVolumeGainNode,
  } = useTabStore((state) => ({
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    audioMetadata: state.audioMetadata,
    pauseAudio: state.pauseAudio,
    countInTimer: state.countInTimer,
    loopDelay: state.loopDelay,
    setLoopDelay: state.setLoopDelay,
    enterPlaybackLoopRangeEditor: state.enterPlaybackLoopRangeEditor,
    updateMasterVolumeGainNode: state.updateMasterVolumeGainNode,
  }));

  const [volumePopoverIsOpen, setVolumePopoverIsOpen] = useState(false);

  const volume = useGetLocalStorageValues().volume;
  const countIn = useGetLocalStorageValues().countIn;
  const colorCodedChords = useGetLocalStorageValues().colorCodedChords;
  const localStorageVolume = useLocalStorageValue("autostrum-volume");
  const localStorageCountIn = useLocalStorageValue("autostrum-count-in");
  const localStorageColorCodedChords = useLocalStorageValue(
    "autostrum-color-coded-chords",
  );

  return (
    <div className="baseFlex w-full !items-end gap-4">
      <div className="baseVertFlex !items-start gap-2">
        <Label htmlFor="instrument">Instrument</Label>
        <Select
          disabled={countInTimer.showing || audioMetadata.editingLoopRange}
          value={currentInstrumentName}
          onValueChange={(value) => {
            pauseAudio();

            setCurrentInstrumentName(
              value as
                | "acoustic_guitar_nylon"
                | "acoustic_guitar_steel"
                | "electric_guitar_clean"
                | "electric_guitar_jazz",
            );
          }}
        >
          <SelectTrigger id="instrument" className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"acoustic_guitar_nylon"}>
              Acoustic guitar - Nylon
            </SelectItem>

            <SelectItem value={"acoustic_guitar_steel"}>
              Acoustic guitar - Steel
            </SelectItem>

            <SelectItem value={"electric_guitar_clean"}>
              Electric guitar - Clean
            </SelectItem>

            <SelectItem value={"electric_guitar_jazz"}>
              Electric guitar - Jazz
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label htmlFor="speed">Speed</Label>
        <PlaybackSpeedPopover
          id="speed"
          disabled={countInTimer.showing || audioMetadata.editingLoopRange}
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={(newPlaybackSpeed) => {
            pauseAudio();

            // Normalize the progress value to 1x speed
            const normalizedProgress = tabProgressValue * playbackSpeed;

            // Adjust the progress value to the new playback speed
            const adjustedProgress = normalizedProgress / newPlaybackSpeed;

            // Set the new progress value
            setTabProgressValue(adjustedProgress);
            setPlaybackSpeed(newPlaybackSpeed);
          }}
          triggerClassName="w-[85px]"
          side="top"
        />
      </div>

      <div className="baseVertFlex !items-start gap-2">
        <Label htmlFor="loopDelay">Loop delay</Label>
        <Select
          disabled={countInTimer.showing}
          value={`${loopDelay}s`}
          onValueChange={(value) => {
            pauseAudio();

            setLoopDelay(Number(value[0]));
          }}
        >
          <SelectTrigger id="loopDelay" className="w-20">
            <SelectValue>{`${loopDelay}s`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"0s"}>0 seconds</SelectItem>
            <SelectItem value={"1s"}>1 second</SelectItem>
            <SelectItem value={"2s"}>2 seconds</SelectItem>
            <SelectItem value={"3s"}>3 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              aria-label="Enter the loop range editor"
              disabled={audioMetadata.playing || countInTimer.showing}
              className="baseFlex size-10 p-0 hover:bg-accent/90 hover:!text-primary-foreground active:!bg-accent"
              onClick={() => {
                enterPlaybackLoopRangeEditor();
              }}
            >
              <CgArrowsShrinkH className="size-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"bottom"}>
            <p>Edit loop range</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              aria-label="Toggle count-in"
              disabled={audioMetadata.playing || countInTimer.showing}
              className={`baseFlex size-10 p-0 hover:bg-accent/90 hover:!text-primary-foreground active:!bg-accent ${countIn ? "bg-accent/90 text-primary-foreground" : ""}`}
              onClick={() => {
                localStorageCountIn.set(String(!countIn));
              }}
            >
              <CountIn className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"bottom"}>
            <p>Count in</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={"outline"}
              aria-label="Toggle color-coded chords"
              className={`baseFlex size-10 p-0 hover:bg-accent/90 hover:!text-primary-foreground active:!bg-accent ${colorCodedChords ? "bg-accent/90 text-primary-foreground" : ""}`}
              onClick={() => {
                localStorageColorCodedChords.set(String(!colorCodedChords));
              }}
            >
              <IoColorPalette className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={"bottom"}>
            <p>Color-coded chords</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={100}>
        <Tooltip open={volumePopoverIsOpen ? false : undefined}>
          <TooltipTrigger asChild>
            {/* for whatever reason, this wrapper <div> is required to get tooltip
                text to show */}
            <div className="baseFlex">
              <Popover
                open={volumePopoverIsOpen}
                onOpenChange={setVolumePopoverIsOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="size-10 !p-0 hover:bg-accent/90 hover:!text-primary-foreground active:!bg-accent"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {volume === 0 && (
                        <motion.div
                          key="muteIcon"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="baseFlex"
                        >
                          <BsFillVolumeMuteFill
                            size={"1.5rem"}
                            className="shrink-0"
                          />
                        </motion.div>
                      )}
                      {volume > 0 && volume < 1 ? (
                        <motion.div
                          key="lowVolumeIcon"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="baseFlex"
                        >
                          <BsFillVolumeDownFill
                            size={"1.5rem"}
                            className="shrink-0"
                          />
                        </motion.div>
                      ) : null}
                      {volume >= 1 ? (
                        <motion.div
                          key="highVolumeIcon"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          className="baseFlex"
                        >
                          <BsFillVolumeUpFill
                            size={"1.5rem"}
                            className="shrink-0"
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="baseVertFlex h-40 w-[54px] gap-2 pb-2 pt-4"
                  side="top"
                >
                  <Range
                    label="Slider to control the playback volume"
                    direction={Direction.Up}
                    min={0}
                    max={100}
                    step={1}
                    values={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                    onChange={(values) => {
                      const volume = values[0]! / 50; // 100 felt too quiet/narrow of a volume range
                      localStorageVolume.set(`${volume}`);
                      updateMasterVolumeGainNode(volume);
                    }}
                    renderTrack={({ props, children }) => (
                      <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                          ...props.style,
                          display: "flex",
                          width: "100%",
                          height: "100%",
                          justifyContent: "center",
                          margin: "0.25rem 0",
                        }}
                      >
                        <div
                          ref={props.ref}
                          style={{
                            width: "8px",
                            borderRadius: "4px",
                            alignSelf: "center",
                            background: getTrackBackground({
                              values: [volume * 50],
                              colors: [
                                "hsl(var(--primary))",
                                "hsl(var(--gray)/0.75)",
                              ],
                              min: 0,
                              max: 100,
                              direction: Direction.Up,
                            }),
                          }}
                          className={`relative h-full`}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    renderThumb={({ props }) => {
                      const { key, ...restOfProps } = props;
                      return (
                        <div
                          key={key}
                          {...restOfProps}
                          className="!z-20 size-[18px] rounded-full border bg-primary"
                        />
                      );
                    }}
                  />
                  <span>{Math.floor(volume * 50)}%</span>
                </PopoverContent>
              </Popover>
            </div>
          </TooltipTrigger>

          <TooltipContent side={"bottom"}>
            <span>Volume</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
