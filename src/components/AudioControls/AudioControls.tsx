import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { isMobileOnly } from "react-device-detect";
import {
  BsFillVolumeDownFill,
  BsFillVolumeMuteFill,
  BsFillVolumeUpFill,
} from "react-icons/bs";
import { CgArrowsShrinkH } from "react-icons/cg";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { RiArrowGoBackFill } from "react-icons/ri";
import { TiArrowLoop } from "react-icons/ti";
import {
  Drawer,
  DrawerPortal,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "~/components/ui/drawer";
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
import { Switch } from "~/components/ui/switch";
import { Toggle } from "~/components/ui/toggle";
import useAutoscrollToCurrentChord from "~/hooks/useAutoscrollToCurrentChord";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import scrollChordIntoView from "~/utils/scrollChordIntoView";
import PlayButtonIcon from "./PlayButtonIcon";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Direction, getTrackBackground, Range } from "react-range";
import { IoMdSettings } from "react-icons/io";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.75,
  },
};

function AudioControls() {
  const { asPath } = useRouter();

  const [chordDurations, setChordDurations] = useState<number[]>([]);
  const [wasPlayingBeforeScrubbing, setWasPlayingBeforeScrubbing] =
    useState(false);
  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);
  const [visibility, setVisibility] = useState<"expanded" | "minimized">(
    "expanded",
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHandleDisabled, setDrawerHandleDisabled] = useState(false);

  const localStorageVolume = useLocalStorageValue("autostrum-volume");
  const localStorageAutoscroll = useLocalStorageValue("autostrum-autoscroll");
  const localStorageLooping = useLocalStorageValue("autostrum-looping");

  const volume = useGetLocalStorageValues().volume;
  const autoscrollEnabled = useGetLocalStorageValues().autoscroll;
  const looping = useGetLocalStorageValues().looping;

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useAutoscrollToCurrentChord(autoscrollEnabled);

  const {
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
    setInteractingWithAudioProgressSlider,
    playTab,
    pauseAudio,
    fetchingFullTabData,
    tabIsEffectivelyEmpty,
  } = useTabStore((state) => ({
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
    setInteractingWithAudioProgressSlider:
      state.setInteractingWithAudioProgressSlider,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    fetchingFullTabData: state.fetchingFullTabData,
    tabIsEffectivelyEmpty: state.tabIsEffectivelyEmpty,
  }));

  useEffect(() => {
    if (!masterVolumeGainNode) return;

    masterVolumeGainNode.gain.value = volume;
  }, [volume, masterVolumeGainNode]);

  // initializes the chord durations array
  useEffect(() => {
    if (!currentlyPlayingMetadata) return;

    const durations = currentlyPlayingMetadata.map((metadata) => {
      const { bpm, noteLengthMultiplier } = metadata;
      return 60 / ((bpm / Number(noteLengthMultiplier)) * playbackSpeed);
    });

    setChordDurations(durations);
  }, [currentlyPlayingMetadata, playbackSpeed]);

  function handlePlayButtonClick() {
    const delayForStoreStateToUpdate = previewMetadata.playing ? 50 : 0;

    if (audioMetadata.playing) {
      pauseAudio();
      setArtificalPlayButtonTimeout(true);
      setTimeout(() => setArtificalPlayButtonTimeout(false), 300);
    } else {
      if (currentlyPlayingMetadata?.[currentChordIndex] && autoscrollEnabled) {
        scrollChordIntoView({
          location: currentlyPlayingMetadata[currentChordIndex].location,
        });
      }

      if (previewMetadata.playing) pauseAudio();

      setTimeout(() => {
        void playTab({ location: audioMetadata.location });
      }, delayForStoreStateToUpdate);
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
      bottomValue = "1rem";
    }

    return bottomValue;
  }, [aboveLargeViewportWidth, visibility]);

  const disablePlayButton = useMemo(() => {
    if (
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
      (tabIsEffectivelyEmpty && !audioMetadata.location)
    );
  }, [
    bpm,
    fetchingFullTabData,
    audioMetadata.location,
    audioMetadata.editingLoopRange,
    currentInstrument,
    artificalPlayButtonTimeout,
    currentlyPlayingMetadata,
    tabIsEffectivelyEmpty,
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
      variants={mainAudioControlsVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      style={{
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className="baseFlex fixed w-[95vw] max-w-[500px] lg:max-w-[800px] xl:w-10/12"
    >
      <div
        style={{
          boxShadow: "0 25px 45px -12px rgb(0 0 0 / 0.4)", // large subtle blur
        }}
        className="baseVertFlex audioControlsBoxShadow z-30 size-full rounded-xl bg-accent p-2 text-primary-foreground transition-opacity lg:rounded-full lg:px-10 lg:py-2"
      >
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
                        className="baseFlex h-[28px] gap-2 !py-0 px-1"
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
              <div className="baseFlex col-span-5 w-full">
                <Button
                  className="baseFlex gap-2 text-[0.6rem]"
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
                    className={`baseFlex col-span-5 w-full gap-2 md:w-1/2 md:justify-self-end ${
                      visibility === "minimized" ? "opacity-0" : "opacity-100"
                    } transition-opacity`}
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

                    <Range
                      label="Slider to control the playback volume"
                      min={0}
                      max={100}
                      step={1}
                      values={[volume * 50]} // 100 felt too quiet/narrow of a volume range
                      disabled={disablePlayButton}
                      onChange={(values) => {
                        localStorageVolume.set(`${values[0]! / 50}`); // 100 felt too quiet/narrow of a volume range
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
                      renderThumb={({ props }) => (
                        <div
                          {...props}
                          className="!z-20 size-[18px] rounded-full border bg-primary"
                        />
                      )}
                    />
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
              <div className="baseFlex gap-2">
                <Label htmlFor="instrument" className="shrink-0">
                  Instrument
                </Label>
                <Select
                  disabled={audioMetadata.editingLoopRange}
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
                  <SelectTrigger
                    id="instrument"
                    className="focus:ring-2 focus:ring-primary-foreground/75"
                  >
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

              <div className="baseFlex gap-2">
                <Label htmlFor="speed" className="shrink-0">
                  Speed
                </Label>
                <Select
                  disabled={audioMetadata.editingLoopRange}
                  value={`${playbackSpeed}x`}
                  onValueChange={(value) => {
                    pauseAudio();

                    const newPlaybackSpeed = Number(
                      value.slice(0, value.length - 1),
                    ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                    setPlaybackSpeed(newPlaybackSpeed);
                  }}
                >
                  <SelectTrigger
                    id="speed"
                    className="focus:ring-2 focus:ring-primary-foreground/75"
                  >
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
                    onClick={() => {
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
                    <span>Play whole tab</span>
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
                  <Button
                    variant="outline"
                    className="p-2 text-primary-foreground"
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
                      localStorageVolume.set(`${values[0]! / 50}`); // 100 felt too quiet/narrow of a volume range
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
                    renderThumb={({ props }) => (
                      <div
                        {...props}
                        className="!z-20 size-[18px] rounded-full border bg-primary"
                      />
                    )}
                  />
                  <span>{Math.floor(volume * 50)}%</span>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* bottom layer: play/pause, loop, slider*/}
        <div className="baseFlex mt-2 w-full gap-4">
          {/* instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="audio"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={handlePlayButtonClick}
            className="!h-9"
          >
            <PlayButtonIcon
              uniqueLocationKey="audioControls"
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
              forceShowLoadingSpinner={fetchingFullTabData}
            />
          </Button>

          <div className="baseFlex w-9/12 gap-2">
            <span className="mr-2">
              {formatSecondsToMinutes(
                currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ??
                  0,
              )}
            </span>

            {audioMetadata.editingLoopRange ? (
              <Range
                key={"rangeTwoThumbs"} // needed so thumb is properly initialized
                label="Start/end slider to control range to loop within current tab"
                step={1}
                min={0}
                max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
                values={[
                  audioMetadata.startLoopIndex,
                  audioMetadata.endLoopIndex === -1
                    ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1 // could be jank with total tab length of one or two..
                    : audioMetadata.endLoopIndex,
                ]}
                draggableTrack
                onChange={(values) => {
                  const tabLength =
                    audioMetadata.fullCurrentlyPlayingMetadataLength - 1;

                  const newStartLoopIndex = values[0]!;
                  const newEndLoopIndex =
                    values[1] === tabLength ? -1 : values[1]!;

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
                        borderRadius: "4px",
                        filter: disabled ? "brightness(0.75)" : "none",
                        background: getTrackBackground({
                          values: [
                            audioMetadata.startLoopIndex,
                            audioMetadata.endLoopIndex === -1
                              ? audioMetadata.fullCurrentlyPlayingMetadataLength -
                                1 // could be jank with total tab length of one or two..
                              : audioMetadata.endLoopIndex,
                          ],
                          colors: [
                            "hsl(var(--gray) / 0.75)",
                            "hsl(var(--primary))",
                            "hsl(var(--gray) / 0.75)",
                          ],
                          min: 0,
                          max:
                            audioMetadata.fullCurrentlyPlayingMetadataLength -
                            1,
                        }),
                        alignSelf: "center",
                      }}
                      className={`relative w-full`}
                    >
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    className="!z-20 size-[18px] rounded-full border border-foreground/50 bg-primary"
                  />
                )}
              />
            ) : (
              <Range
                key={"rangeOneThumb"} // needed so thumb is properly initialized
                label="Slider to control the progress within the current tab"
                step={1}
                min={0}
                max={
                  currentlyPlayingMetadata
                    ? currentlyPlayingMetadata.length - 1
                    : 1
                }
                values={[
                  Math.min(
                    currentChordIndex +
                      (audioMetadata.playing &&
                      currentChordIndex !==
                        (currentlyPlayingMetadata?.length ?? 1) - 1
                        ? 1
                        : 0),
                    (currentlyPlayingMetadata?.length ?? 1) - 1,
                  ),
                ]}
                disabled={disablePlayButton}
                onChange={(values) => {
                  if (audioMetadata.playing) {
                    pauseAudio();
                  }

                  setCurrentChordIndex(values[0] ?? 0);
                }}
                renderTrack={({ props, children, disabled }) => (
                  <div
                    onMouseDown={props.onMouseDown}
                    onTouchStart={props.onTouchStart}
                    onPointerDown={() => {
                      setInteractingWithAudioProgressSlider(true);
                      setWasPlayingBeforeScrubbing(audioMetadata.playing);
                      if (audioMetadata.playing) pauseAudio();
                    }}
                    onPointerUp={() => {
                      setInteractingWithAudioProgressSlider(false);
                      if (!wasPlayingBeforeScrubbing) return;

                      // waiting, as playTab() needs to have currentChordIndex
                      // updated before it's called so it plays from the correct chord
                      // (really only is necessary for fast click+release cases)
                      setTimeout(() => {
                        void playTab({
                          location: audioMetadata.location,
                        });

                        setArtificalPlayButtonTimeout(true);

                        setTimeout(() => {
                          setArtificalPlayButtonTimeout(false);
                        }, 300);
                      }, 50);
                    }}
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
                        borderRadius: "4px",
                        filter: disabled ? "brightness(0.75)" : "none",
                        alignSelf: "center",
                      }}
                      className={`relative w-full bg-neutral-200 transition-[filter] mobileLandscape:w-[95%]`}
                    >
                      <div className="absolute left-0 top-0 h-full w-full overflow-hidden rounded-[4px]">
                        <div
                          id="editingSliderTrack"
                          style={{
                            transform: `scaleX(${Math.min(
                              (currentChordIndex +
                                (audioMetadata.playing &&
                                currentChordIndex !==
                                  (currentlyPlayingMetadata?.length ?? 1) - 1
                                  ? 1
                                  : 0)) /
                                ((currentlyPlayingMetadata?.length ?? 1) - 1 ||
                                  1),
                              1,
                            )})`,
                            transitionProperty: "transform",
                            transitionTimingFunction: "linear",
                            transitionDuration: `${
                              audioMetadata.playing
                                ? `${chordDurations[currentChordIndex] ?? 0}s`
                                : "0s"
                            }`,
                          }}
                          className="absolute left-0 top-0 z-10 h-full w-full origin-left rounded-[4px] bg-primary will-change-transform"
                        ></div>
                      </div>
                      {children}
                    </div>
                  </div>
                )}
                renderThumb={({ props }) => (
                  <div
                    {...props}
                    id="editingSliderThumb"
                    style={{
                      ...props.style,
                      transitionProperty: "transform",
                      transitionTimingFunction: "linear",
                      transitionDuration: `${
                        audioMetadata.playing
                          ? `${chordDurations[currentChordIndex] ?? 0}s`
                          : "0s"
                      }`,
                    }}
                    className="!z-20 size-[18px] rounded-full border border-foreground/50 bg-primary will-change-transform"
                  />
                )}
              />
            )}

            <span className="ml-2">
              {formatSecondsToMinutes(
                currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0,
              )}
            </span>
          </div>

          {/* conceptually: what should you do if user toggles looping while playing already... */}

          {aboveLargeViewportWidth ? (
            <>
              {/* probably have a tooltip for this + loop so that it is clear what they do? */}
              {(asPath.includes("/tab") || asPath.includes("/create")) && (
                <Toggle
                  variant={"outline"}
                  aria-label="Edit loop range"
                  disabled={!looping || audioMetadata.playing}
                  pressed={audioMetadata.editingLoopRange}
                  className="h-8 w-8 p-1"
                  onPressedChange={(value) => {
                    setAudioMetadata({
                      ...audioMetadata,
                      editingLoopRange: value,
                    });
                    setCurrentChordIndex(0); // reset to start of tab when editing loop range
                  }}
                >
                  <CgArrowsShrinkH className="h-6 w-6" />
                </Toggle>
              )}

              <Toggle
                variant={"outline"}
                aria-label="Loop toggle"
                disabled={audioMetadata.playing}
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
            <Drawer
              open={drawerOpen}
              onOpenChange={(open) => {
                if (open && audioMetadata.playing) {
                  pauseAudio();
                }

                setDrawerOpen(open);
              }}
              dismissible={!drawerHandleDisabled} // bad UX to allow drawer to be moved when <Select> is current open
            >
              <DrawerTrigger asChild>
                <Button
                  disabled={audioMetadata.editingLoopRange}
                  size="sm"
                  variant={"outline"}
                  className="px-2 py-1 text-primary-foreground"
                >
                  <IoMdSettings className="size-[18px]" />
                </Button>
              </DrawerTrigger>
              <DrawerPortal>
                <DrawerContent className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-4 rounded-t-2xl p-4 pb-6">
                  <VisuallyHidden>
                    <DrawerTitle>Audio settings</DrawerTitle>
                    <DrawerDescription>
                      Change the instrument, playback speed, and other audio
                      settings.
                    </DrawerDescription>
                  </VisuallyHidden>

                  <div className="baseVertFlex w-full !items-start gap-1">
                    <div className="baseFlex gap-2 font-medium">
                      <IoMdSettings className="size-4" />
                      Audio settings
                    </div>
                    <Separator className="w-full bg-primary" />
                  </div>

                  <div className="baseFlex mt-2 w-full !justify-between gap-4">
                    <Label htmlFor="instrument">Instrument</Label>
                    <Select
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
                      <SelectTrigger
                        id="instrument"
                        className="w-52 border-ring"
                      >
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

                  <div className="baseFlex w-full !justify-between gap-4">
                    <Label htmlFor="speed">Speed</Label>
                    <Select
                      onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                      value={`${playbackSpeed}x`}
                      onValueChange={(value) => {
                        pauseAudio();

                        const newPlaybackSpeed = Number(
                          value.slice(0, value.length - 1),
                        ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                        setPlaybackSpeed(newPlaybackSpeed);
                      }}
                    >
                      <SelectTrigger
                        id="speed"
                        className="w-[85px] border-ring"
                      >
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

                  <div className="baseFlex w-full !justify-between gap-4">
                    <Label htmlFor="autoscroll">Autoscroll</Label>
                    <Switch
                      id="autoscroll"
                      checked={autoscrollEnabled}
                      onCheckedChange={(value) =>
                        localStorageAutoscroll.set(String(value))
                      }
                    />
                  </div>

                  <div className="baseFlex w-full !justify-between gap-4">
                    <Label htmlFor="loop">Loop</Label>
                    <Switch
                      id="loop"
                      disabled={audioMetadata.playing}
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
                        disabled={!looping}
                        onClick={() => {
                          setAudioMetadata({
                            ...audioMetadata,
                            editingLoopRange: true,
                          });

                          setDrawerOpen(false);
                        }}
                        className="baseFlex gap-2"
                      >
                        <CgArrowsShrinkH className="h-5 w-5" />
                        Edit loop range
                      </Button>
                    </div>
                  )}
                </DrawerContent>
              </DrawerPortal>
            </Drawer>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AudioControls;
