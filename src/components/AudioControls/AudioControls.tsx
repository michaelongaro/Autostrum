import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { isMobileOnly } from "react-device-detect";
import {
  BsFillVolumeDownFill,
  BsFillVolumeMuteFill,
  BsFillVolumeUpFill,
} from "react-icons/bs";
import { CgArrowsShrinkH } from "react-icons/cg";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { IoSettingsOutline } from "react-icons/io5";
import { RiArrowGoBackFill } from "react-icons/ri";
import { TiArrowLoop } from "react-icons/ti";
import { Drawer } from "vaul";
import { AudioProgressSlider } from "~/components/ui/AudioProgressSlider";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Toggle } from "~/components/ui/toggle";
import { VerticalSlider } from "~/components/ui/verticalSlider";
import useAutoscrollToCurrentChord from "~/hooks/useAutoscrollToCurrentChord";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import scrollChordIntoView from "~/utils/scrollChordIntoView";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import { returnTransitionToTabSlider } from "~/utils/tabSliderHelpers";
import { LoopingRangeSlider } from "~/components/ui/LoopingRangeSlider";
import PlayButtonIcon from "./PlayButtonIcon";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.5,
  },
};

function AudioControls() {
  const { asPath } = useRouter();

  const [tabProgressValue, setTabProgressValue] = useState(0);
  const [wasPlayingBeforeScrubbing, setWasPlayingBeforeScrubbing] =
    useState(false);

  const [previousChordIndex, setPreviousChordIndex] = useState(0);
  const [previousTabId, setPreviousTabId] = useState(0);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const [visibility, setVisibility] = useState<"expanded" | "minimized">(
    "expanded",
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHandleDisabled, setDrawerHandleDisabled] = useState(false);

  const oneSecondIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const localStorageVolume = useLocalStorageValue("autostrumVolume");
  const localStorageAutoscroll = useLocalStorageValue("autostrumAutoscroll");
  const localStorageLooping = useLocalStorageValue("autostrumLooping");

  const volume = useGetLocalStorageValues().volume;
  const autoscrollEnabled = useGetLocalStorageValues().autoscroll;
  const looping = useGetLocalStorageValues().looping;

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useAutoscrollToCurrentChord({ autoscrollEnabled });

  const {
    id,
    bpm,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    masterVolumeGainNode,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    previewMetadata,
    currentInstrument,
    tabData,
    playTab,
    pauseAudio,
    fetchingFullTabData,
    countInTimer,
    setCountInTimer,
    mobileHeaderModal,
    setMobileHeaderModal,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
    currentInstrumentName: state.currentInstrumentName,
    setCurrentInstrumentName: state.setCurrentInstrumentName,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    masterVolumeGainNode: state.masterVolumeGainNode,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    tabData: state.tabData,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    fetchingFullTabData: state.fetchingFullTabData,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
  }));

  useEffect(() => {
    if (!mobileHeaderModal.showing) {
      setDrawerOpen(false);
    }
  }, [mobileHeaderModal.showing]);

  useEffect(() => {
    if (!masterVolumeGainNode) return;

    masterVolumeGainNode.gain.value = volume;
  }, [volume, masterVolumeGainNode]);

  useEffect(() => {
    if (currentChordIndex === 0) {
      setPreviousChordIndex(0);
      setTabProgressValue(0);
    } else {
      setPreviousChordIndex(currentChordIndex - 1);
    }
  }, [currentChordIndex]);

  // didn't want to clutter up below effect with more conditions, this just covers
  // resetting the tab progress value when the tab that is playing changes
  useEffect(() => {
    if (audioMetadata.tabId !== previousTabId) {
      setPreviousTabId(audioMetadata.tabId);

      if (oneSecondIntervalRef.current) {
        clearInterval(oneSecondIntervalRef.current);
        oneSecondIntervalRef.current = null;
      }

      setTabProgressValue(0);
    }
  }, [audioMetadata.tabId, previousTabId]);

  useEffect(() => {
    if (audioMetadata.playing && !oneSecondIntervalRef.current) {
      returnTransitionToTabSlider();

      // feels hacky, but need to have it moving towards one *as soon*
      // as the play button is pressed, otherwise it will wait a full second
      // before starting to increment.
      if (tabProgressValue === 0) setTabProgressValue(1);
      else setTabProgressValue(tabProgressValue + 1);

      oneSecondIntervalRef.current = setInterval(() => {
        setTabProgressValue((prev) => prev + 1);
      }, 1000);
    } else if (
      (!audioMetadata.playing ||
        (currentChordIndex === 0 && previousChordIndex !== 0)) &&
      oneSecondIntervalRef.current
    ) {
      clearInterval(oneSecondIntervalRef.current);
      oneSecondIntervalRef.current = null;

      if (currentChordIndex === 0) {
        setTabProgressValue(0);
      } else {
        const currentElapsedSeconds =
          currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ?? 0;

        if (currentElapsedSeconds === 0) {
          setTabProgressValue(0);
          setCurrentChordIndex(0);
        }
      }
    }
  }, [
    currentlyPlayingMetadata,
    audioMetadata.playing,
    currentChordIndex,
    previousChordIndex,
    tabProgressValue,
    setCurrentChordIndex,
  ]);

  useEffect(() => {
    setCurrentChordIndex(0);
    setTabProgressValue(0);
  }, [audioMetadata.editingLoopRange, setCurrentChordIndex]);

  function handlePlayButtonClick() {
    const isViewingTabPath =
      asPath.includes("/tab") && !asPath.includes("edit");
    const delayPlayStart = isViewingTabPath ? 3000 : 0;
    const delayForStoreStateToUpdate = previewMetadata.playing ? 50 : 0;

    if (audioMetadata.playing) {
      pauseAudio();
      setArtificalPlayButtonTimeout(true);
      setTimeout(() => setArtificalPlayButtonTimeout(false), 300);
    } else {
      if (isViewingTabPath) {
        if (
          currentlyPlayingMetadata?.[currentChordIndex] &&
          autoscrollEnabled
        ) {
          scrollChordIntoView({
            location: currentlyPlayingMetadata[currentChordIndex].location,
          });
        }
        setCountInTimer({
          ...countInTimer,
          showing: true,
        });
      }
      if (previewMetadata.playing) pauseAudio();

      setTimeout(() => {
        setTimeout(() => {
          void playTab({ tabId: id, location: audioMetadata.location });
        }, delayForStoreStateToUpdate);

        if (isViewingTabPath) {
          setCountInTimer({
            ...countInTimer,
            showing: false,
          });
        }
      }, delayPlayStart);
    }
  }

  const dynamicBottomValue = useMemo(() => {
    let bottomValue = "1rem";

    if (visibility === "minimized") {
      if (aboveLargeViewportWidth) {
        bottomValue = "-6.15rem";
      } else {
        bottomValue = "-2.85rem";
      }
    } else if (visibility === "expanded") {
      if (aboveLargeViewportWidth) {
        bottomValue = "1rem";
      } else {
        bottomValue = "0.5rem";
      }
    }

    return bottomValue;
  }, [aboveLargeViewportWidth, visibility]);

  const disablePlayButton = useMemo(() => {
    if (
      countInTimer.showing ||
      artificalPlayButtonTimeout ||
      fetchingFullTabData ||
      audioMetadata.editingLoopRange
    )
      return true;

    return (
      bpm === -1 ||
      currentlyPlayingMetadata === null ||
      currentlyPlayingMetadata.length === 0 ||
      !currentInstrument ||
      // idk why this last condition is going over my head right now, make sure it makes sense before commit
      // maybe doesn't hurt anything, but could be covering some of the statements above,
      // so maybe try to leverage it's "complete"ness of it's check through the tab?
      (tabIsEffectivelyEmpty(tabData) && !audioMetadata.location)
    );
  }, [
    countInTimer.showing,
    bpm,
    fetchingFullTabData,
    audioMetadata.location,
    audioMetadata.editingLoopRange,
    currentInstrument,
    tabData,
    artificalPlayButtonTimeout,
    currentlyPlayingMetadata,
  ]);

  const mainAudioControlsVariants = {
    expanded: {
      opacity: 1,
      bottom: dynamicBottomValue,
    },
    closed: {
      opacity: 0,
      bottom: aboveLargeViewportWidth ? "-8rem" : "-4rem",
    },
  };

  return (
    <motion.div
      key={"audioControls"}
      style={{
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className="baseFlex fixed z-40 w-[100vw]"
      variants={mainAudioControlsVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
    >
      <div className="baseVertFlex audioControlsBoxShadow h-full w-[95vw] max-w-[800px] rounded-xl bg-pink-600 p-2 transition-opacity lg:rounded-full lg:px-10 lg:py-2 xl:w-10/12">
        <AnimatePresence mode="sync">
          {aboveLargeViewportWidth && visibility === "minimized" && (
            <motion.div
              key={"audioControlsTopLayer"}
              style={{ overflow: "hidden" }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 30, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="baseFlex"
            >
              <Button
                variant="ghost"
                className="mb-2 h-5 w-8 p-0"
                onClick={() => setVisibility("expanded")}
              >
                <GoChevronUp className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* mobile top layer: return to tab, v/^ chevron, audio slider */}
        {!aboveLargeViewportWidth && (
          <div className="grid w-full grid-cols-12 place-items-center">
            {/* return to tab, v/^ chevron */}
            {/* conditional "move selected section back to entire tab" */}

            {/* not sure if this will work, just want  */}
            <div className="baseFlex col-span-5 w-full">
              <AnimatePresence mode="wait">
                {audioMetadata.location !== null &&
                  visibility === "expanded" && (
                    <motion.div
                      key={"returnToEntireTabButton"}
                      variants={opacityAndScaleVariants}
                      initial="closed"
                      animate="expanded"
                      exit="closed"
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        variant="ghost" // or secondary maybe
                        onClick={() => {
                          setCountInTimer({
                            ...countInTimer,
                            forSectionContainer: null,
                          });

                          setArtificalPlayButtonTimeout(true);

                          setTimeout(() => {
                            setArtificalPlayButtonTimeout(false);
                          }, 300);

                          pauseAudio(true);

                          setAudioMetadata({
                            ...audioMetadata,
                            playing: false,
                            location: null,
                            startLoopIndex: 0,
                            endLoopIndex: -1,
                            editingLoopRange: false,
                          });
                        }}
                        className="baseFlex h-[28px] !flex-nowrap gap-2 !py-0 px-1"
                      >
                        <RiArrowGoBackFill className="h-3.5 w-3.5" />
                        <p className="text-xs">Play whole tab</p>
                      </Button>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* v/^ chevron */}
            <Button
              variant={"ghost"}
              className="col-span-2 h-7 w-7 p-0"
              onClick={() =>
                setVisibility(
                  visibility === "minimized" ? "expanded" : "minimized",
                )
              }
            >
              {visibility === "minimized" ? (
                <GoChevronUp className="h-5 w-5" />
              ) : (
                <GoChevronDown className="h-5 w-5" />
              )}
            </Button>

            {audioMetadata.editingLoopRange ? (
              <div className="baseFlex col-span-5 w-full !flex-nowrap">
                <Button
                  className="baseFlex !flex-nowrap gap-2 text-[0.6rem]"
                  onClick={() => {
                    setAudioMetadata({
                      ...audioMetadata,
                      editingLoopRange: false,
                    });
                  }}
                >
                  <CgArrowsShrinkH className="h-5 w-5" />
                  Save looping range
                </Button>
              </div>
            ) : (
              <>
                {!isMobileOnly && (
                  <div
                    className={`baseFlex col-span-5 w-full !flex-nowrap gap-2 md:w-1/2 md:justify-self-end ${
                      visibility === "minimized" ? "opacity-0" : "opacity-100"
                    } transition-opacity`}
                  >
                    <AnimatePresence mode="popLayout">
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

                    <Slider
                      value={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) =>
                        localStorageVolume.set(`${value[0]! / 50}`)
                      } // 100 felt too quiet/narrow of a volume range
                    ></Slider>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* desktop top layer: instrument, speed  + volume slider */}
        {aboveLargeViewportWidth && (
          <div className="baseFlex w-full !justify-between">
            {/* instrument, speed selects*/}
            <div className="baseFlex gap-2">
              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Instrument</Label>
                <Select
                  disabled={
                    countInTimer.showing || audioMetadata.editingLoopRange
                  }
                  value={currentInstrumentName}
                  onValueChange={(value) => {
                    pauseAudio();

                    setCurrentInstrumentName(
                      value as
                        | "acoustic_guitar_nylon"
                        | "acoustic_guitar_steel"
                        | "electric_guitar_clean"
                        | "electric_guitar_jazz"
                        | "acoustic_grand_piano"
                        | "electric_grand_piano",
                    );
                  }}
                >
                  <SelectTrigger>
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

                    <SelectItem value={"acoustic_grand_piano"}>
                      Grand piano - Acoustic
                    </SelectItem>

                    <SelectItem value={"electric_grand_piano"}>
                      Grand piano - Electric
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Speed</Label>
                <Select
                  disabled={
                    countInTimer.showing || audioMetadata.editingLoopRange
                  }
                  value={`${playbackSpeed}x`}
                  onValueChange={(value) => {
                    pauseAudio();

                    const newPlaybackSpeed = Number(
                      value.slice(0, value.length - 1),
                    ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                    // Normalize the progress value to 1x speed
                    const normalizedProgress = tabProgressValue * playbackSpeed;

                    // Adjust the progress value to the new playback speed
                    const adjustedProgress =
                      normalizedProgress / newPlaybackSpeed;

                    // Set the new progress value
                    setTabProgressValue(adjustedProgress);
                    setPlaybackSpeed(newPlaybackSpeed);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"0.25x"}>0.25x</SelectItem>
                    <SelectItem value={"0.5x"}>0.5x</SelectItem>
                    <SelectItem value={"0.75x"}>0.75x</SelectItem>
                    <SelectItem value={"1x"}>1x</SelectItem>
                    <SelectItem value={"1.25x"}>1.25x</SelectItem>
                    <SelectItem value={"1.5x"}>1.5x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* conditional "move selected section back to entire tab" */}
            <AnimatePresence mode="wait">
              {audioMetadata.location !== null && (
                <motion.div
                  key={"mobileReturnToEntireTabButton"}
                  variants={opacityAndScaleVariants}
                  initial="closed"
                  animate="expanded"
                  exit="closed"
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="ghost" // or secondary maybe
                    disabled={countInTimer.showing}
                    onClick={() => {
                      setCountInTimer({
                        ...countInTimer,
                        forSectionContainer: null,
                      });

                      setArtificalPlayButtonTimeout(true);

                      setTimeout(() => {
                        setArtificalPlayButtonTimeout(false);
                      }, 300);

                      pauseAudio(true);

                      setAudioMetadata({
                        ...audioMetadata,
                        playing: false,
                        location: null,
                        startLoopIndex: 0,
                        endLoopIndex: -1,
                        editingLoopRange: false,
                      });
                    }}
                    className="baseFlex gap-2"
                  >
                    <RiArrowGoBackFill className="h-4 w-4" />
                    <p>Play whole tab</p>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* autoscroll toggle + volume slider*/}
            <div className="baseFlex gap-2">
              <Toggle
                variant={"outline"}
                pressed={autoscrollEnabled}
                onPressedChange={(value) =>
                  localStorageAutoscroll.set(String(value))
                }
              >
                Autoscroll
              </Toggle>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="p-2">
                    <AnimatePresence mode="popLayout">
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
                  className="baseVertFlex h-36 w-12 !flex-nowrap gap-2 p-2"
                  side="top"
                >
                  <VerticalSlider
                    value={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) =>
                      localStorageVolume.set(`${value[0]! / 50}`)
                    } // 100 felt too quiet/narrow of a volume range
                  ></VerticalSlider>
                  <p>{Math.floor(volume * 50)}%</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* bottom layer: play/pause, loop, slider*/}
        <div className="baseFlex mt-2 w-full !flex-nowrap gap-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={handlePlayButtonClick}
            className="!h-9"
          >
            <PlayButtonIcon
              uniqueLocationKey="audioControls"
              tabId={id}
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
              forceShowLoadingSpinner={fetchingFullTabData}
              showCountInTimer={countInTimer.showing}
            />
          </Button>

          <div className="baseFlex w-9/12 !flex-nowrap gap-2">
            <p>
              {formatSecondsToMinutes(
                Math.min(
                  tabProgressValue,
                  currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0,
                ),
              )}
            </p>

            {audioMetadata.editingLoopRange ? (
              <LoopingRangeSlider
                value={[
                  audioMetadata.startLoopIndex,
                  audioMetadata.endLoopIndex === -1
                    ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1 // could be jank with total tab length of one or two..
                    : audioMetadata.endLoopIndex,
                ]}
                min={0}
                max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
                step={1}
                onValueChange={(value) => {
                  const tabLength =
                    audioMetadata.fullCurrentlyPlayingMetadataLength - 1;

                  const newStartLoopIndex = value[0]!;
                  const newEndLoopIndex =
                    value[1] === tabLength ? -1 : value[1]!;

                  if (
                    newStartLoopIndex !== audioMetadata.startLoopIndex ||
                    newEndLoopIndex !== audioMetadata.endLoopIndex
                  ) {
                    setAudioMetadata({
                      ...audioMetadata,
                      startLoopIndex: newStartLoopIndex,
                      endLoopIndex: newEndLoopIndex,
                    });
                  }
                }}
              />
            ) : (
              <AudioProgressSlider
                value={[tabProgressValue]}
                min={0}
                // radix-slider thumb protrudes from lefthand side of the
                // track if max has a value of 0...
                max={
                  currentlyPlayingMetadata
                    ? currentlyPlayingMetadata.at(-1)?.elapsedSeconds
                    : 1
                }
                step={1}
                disabled={disablePlayButton}
                style={{
                  pointerEvents: disablePlayButton ? "none" : "auto",
                }}
                onPointerDown={() => {
                  setWasPlayingBeforeScrubbing(audioMetadata.playing);
                  if (audioMetadata.playing) pauseAudio();
                }}
                onPointerUp={() => {
                  if (!wasPlayingBeforeScrubbing) return;

                  // waiting; playTab() needs to have currentChordIndex
                  // updated before it's called so it plays from the correct chord
                  setTimeout(() => {
                    void playTab({
                      tabId: id,
                      location: audioMetadata.location,
                    });

                    setArtificalPlayButtonTimeout(true);

                    setTimeout(() => {
                      setArtificalPlayButtonTimeout(false);
                    }, 300);
                  }, 50);
                }}
                onValueChange={(value) => {
                  setTabProgressValue(value[0]!);

                  if (!currentlyPlayingMetadata) return;

                  let newCurrentChordIndex = -1;

                  for (let i = 0; i < currentlyPlayingMetadata.length; i++) {
                    const metadata = currentlyPlayingMetadata[i]!;

                    if (metadata.elapsedSeconds === value[0]) {
                      newCurrentChordIndex = i;
                      break;
                    }
                  }

                  if (newCurrentChordIndex !== -1) {
                    setCurrentChordIndex(newCurrentChordIndex);
                  }
                }}
              />
            )}

            <p>
              {formatSecondsToMinutes(
                currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0,
              )}
            </p>
          </div>

          {/* conceptually: what should you do if user toggles looping while playing already... */}

          {aboveLargeViewportWidth ? (
            <>
              {/* probably have a tooltip for this + loop so that it is clear what they do? */}
              {(asPath.includes("/tab") || asPath.includes("/create")) && (
                <Toggle
                  variant={"outline"}
                  aria-label="Edit loop range"
                  disabled={
                    !looping || audioMetadata.playing || countInTimer.showing
                  }
                  pressed={audioMetadata.editingLoopRange}
                  className="h-8 w-8 p-1"
                  onPressedChange={(value) =>
                    setAudioMetadata({
                      ...audioMetadata,
                      editingLoopRange: value,
                    })
                  }
                >
                  <CgArrowsShrinkH className="h-6 w-6" />
                </Toggle>
              )}

              <Toggle
                variant={"outline"}
                aria-label="Loop toggle"
                disabled={audioMetadata.playing || countInTimer.showing}
                pressed={looping}
                className="h-8 w-8 p-1"
                onPressedChange={(value) => {
                  setAudioMetadata({
                    ...audioMetadata,
                    startLoopIndex: 0,
                    endLoopIndex: -1,
                    editingLoopRange: false,
                  });

                  localStorageLooping.set(String(value));
                }}
              >
                <TiArrowLoop className="h-6 w-6" />
              </Toggle>

              <Button
                variant={"ghost"}
                className="h-8 w-8 p-0"
                onClick={() => setVisibility("minimized")}
              >
                <GoChevronDown className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Drawer.Root
              open={drawerOpen}
              onOpenChange={(open) => {
                if (open && audioMetadata.playing) {
                  pauseAudio();
                }

                setDrawerOpen(open);
                setMobileHeaderModal({
                  showing: open,
                  zIndex: open ? 49 : 48,
                });
              }}
              // ideally we would have modal={true}, but currently radix-ui
              // dialogs cause horrible forced reflows which caused 3-5+ seconds
              // of the main thread being fully blocked... using this with the main
              // drawback being that it scrolls up to the top of the page when opened
              modal={false}
              dismissible={!drawerHandleDisabled}
            >
              <Drawer.Trigger asChild>
                <Button
                  disabled={audioMetadata.editingLoopRange}
                  size="sm"
                  variant={"outline"}
                  className="px-2 py-1"
                >
                  <IoSettingsOutline className="h-5 w-5" />
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Content
                  style={{
                    textShadow: "none",
                  }}
                  className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-4 rounded-t-2xl bg-pink-100 p-4 pb-6 text-pink-950"
                >
                  <div className="mx-auto mb-2 h-1 w-12 flex-shrink-0 rounded-full bg-gray-300" />

                  <Label className="baseFlex gap-2">
                    <IoSettingsOutline className="size-4" />
                    Audio settings
                  </Label>
                  <Separator className="mb-2 w-full bg-pink-600" />

                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Instrument</Label>
                    <Select
                      disabled={countInTimer.showing}
                      onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
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
                      <SelectTrigger className="w-48 border-ring">
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

                        <SelectItem value={"acoustic_grand_piano"}>
                          Grand piano - Acoustic
                        </SelectItem>

                        <SelectItem value={"electric_grand_piano"}>
                          Grand piano - Electric
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Speed</Label>
                    <Select
                      disabled={countInTimer.showing}
                      onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                      value={`${playbackSpeed}x`}
                      onValueChange={(value) => {
                        pauseAudio();

                        const newPlaybackSpeed = Number(
                          value.slice(0, value.length - 1),
                        ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                        // Normalize the progress value to 1x speed
                        const normalizedProgress =
                          tabProgressValue * playbackSpeed;

                        // Adjust the progress value to the new playback speed
                        const adjustedProgress =
                          normalizedProgress / newPlaybackSpeed;

                        // Set the new progress value
                        setTabProgressValue(adjustedProgress);
                        setPlaybackSpeed(newPlaybackSpeed);
                      }}
                    >
                      <SelectTrigger className="w-[85px] border-ring">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={"0.25x"}>0.25x</SelectItem>
                        <SelectItem value={"0.5x"}>0.5x</SelectItem>
                        <SelectItem value={"0.75x"}>0.75x</SelectItem>
                        <SelectItem value={"1x"}>1x</SelectItem>
                        <SelectItem value={"1.25x"}>1.25x</SelectItem>
                        <SelectItem value={"1.5x"}>1.5x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Autoscroll</Label>
                    <Switch
                      id="autoscroll"
                      checked={autoscrollEnabled}
                      onCheckedChange={(value) =>
                        localStorageAutoscroll.set(String(value))
                      }
                    />
                  </div>

                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Loop</Label>
                    <Switch
                      id="loop"
                      disabled={audioMetadata.playing || countInTimer.showing}
                      checked={looping}
                      onCheckedChange={(value) => {
                        setAudioMetadata({
                          ...audioMetadata,
                          startLoopIndex: 0,
                          endLoopIndex: -1,
                          editingLoopRange: false,
                        });

                        localStorageLooping.set(String(value));
                      }}
                    />
                  </div>

                  {(asPath.includes("/tab") || asPath.includes("/create")) && (
                    <div className="baseFlex w-full">
                      <Button
                        disabled={
                          tabData.length === 0 ||
                          tabData[0]?.data.length === 0 ||
                          countInTimer.showing ||
                          !looping
                        }
                        onClick={() => {
                          setAudioMetadata({
                            ...audioMetadata,
                            editingLoopRange: true,
                          });

                          setDrawerOpen(false);
                        }}
                        className="baseFlex !flex-nowrap gap-2"
                      >
                        <CgArrowsShrinkH className="h-5 w-5" />
                        Edit loop range
                      </Button>
                    </div>
                  )}
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AudioControls;
