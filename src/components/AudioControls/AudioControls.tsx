import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { Slider } from "~/components/ui/slider";
import { VerticalSlider } from "~/components/ui/verticalSlider";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import useSound from "~/hooks/useSound";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { TiArrowLoop } from "react-icons/ti";
import { IoSettingsOutline } from "react-icons/io5";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { FaVolumeMute, FaVolumeDown, FaVolumeUp } from "react-icons/fa";
import { RiArrowGoBackFill } from "react-icons/ri";
import useAutoscrollToCurrentChord from "~/hooks/useAutoscrollToCurrentChord";

const positionVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

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

const widthAndHeightVariants = {
  expanded: {
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  closed: {
    width: "0",
    height: "0",
    opacity: 0,
  },
};

function AudioControls() {
  const [volume, setVolume] = useState(1);
  const [autoscrollEnabled, setAutoscrollEnabled] = useState(false);
  const [tabProgressValue, setTabProgressValue] = useState(0);
  const [wasPlayingBeforeScrubbing, setWasPlayingBeforeScrubbing] =
    useState(false);
  const [
    waitForCurrentChordIndexToUpdate,
    setWaitForCurrentChordIndexToUpdate,
  ] = useState(false);
  const [updatedCurrentChordIndex, setUpdatedCurrentChordIndex] = useState(0);
  const [previousChordIndex, setPreviousChordIndex] = useState(0);
  const [previousTabId, setPreviousTabId] = useState(0);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const oneSecondIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [audioControlsAreMinized, setAudioControlsAreMinimized] =
    useState(false);

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);
  useAutoscrollToCurrentChord({ autoscrollEnabled });

  const {
    recordedAudioUrl,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    masterVolumeGainNode,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    setCurrentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    currentInstrument,
    tabData,
    sectionProgression,
    tuning,
    bpm,
    chords,
    capo,
    looping,
    setLooping,
  } = useTabStore(
    (state) => ({
      recordedAudioUrl: state.recordedAudioUrl,
      currentInstrumentName: state.currentInstrumentName,
      setCurrentInstrumentName: state.setCurrentInstrumentName,
      playbackSpeed: state.playbackSpeed,
      setPlaybackSpeed: state.setPlaybackSpeed,
      masterVolumeGainNode: state.masterVolumeGainNode,
      currentChordIndex: state.currentChordIndex,
      setCurrentChordIndex: state.setCurrentChordIndex,
      currentlyPlayingMetadata: state.currentlyPlayingMetadata,
      setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
      audioMetadata: state.audioMetadata,
      setAudioMetadata: state.setAudioMetadata,
      currentInstrument: state.currentInstrument,
      tabData: state.tabData,
      sectionProgression: state.sectionProgression,
      tuning: state.tuning,
      bpm: state.bpm,
      chords: state.chords,
      capo: state.capo,
      looping: state.looping,
      setLooping: state.setLooping,
    }),
    shallow
  );

  const { playTab, pauseAudio, playRecordedAudio, pauseRecordedAudio } =
    useSound();

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
      // kind of a hack, but need to have it moving towards one *as soon*
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
        setTabProgressValue(
          currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ?? 0
        );
      }
    }
  }, [
    currentlyPlayingMetadata,
    audioMetadata.playing,
    currentChordIndex,
    previousChordIndex,
    tabProgressValue,
  ]);

  useEffect(() => {
    if (audioMetadata.type === "Artist recorded") {
      setAutoscrollEnabled(false);
    }
  }, [audioMetadata.type]);

  // REALLY hate having this here, but not sure how else to guarentee that the correct
  // currentChordIndex is used when playTab() is called...
  useEffect(() => {
    if (
      !audioMetadata.playing &&
      waitForCurrentChordIndexToUpdate &&
      updatedCurrentChordIndex === currentChordIndex
    ) {
      void playTab({
        tabData,
        rawSectionProgression: sectionProgression,
        tuningNotes: tuning,
        baselineBpm: bpm,
        chords,
        capo,
        playbackSpeed,
        location: audioMetadata.location ?? undefined,
      });
      setWaitForCurrentChordIndexToUpdate(false);
    }
  }, [
    currentChordIndex,
    waitForCurrentChordIndexToUpdate,
    updatedCurrentChordIndex,
    audioMetadata.playing,
    audioMetadata.location,
    bpm,
    capo,
    chords,
    playTab,
    playbackSpeed,
    sectionProgression,
    tabData,
    tuning,
  ]);

  return (
    <motion.div
      key={"audioControls"}
      // can't set inline styles for bottom value inside of framer-motion controlled
      // element (at least one that is wrapped in AnimatePresence)
      style={{
        bottom: audioControlsAreMinized ? "-6.5rem" : "1rem",
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      className="baseFlex fixed z-40 w-[100vw]"
      variants={positionVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        duration: 0.15,
      }}
    >
      <div className="baseVertFlex h-full w-11/12 gap-2 rounded-lg bg-pink-600 p-2 shadow-2xl lg:rounded-full lg:px-8 lg:py-2 xl:w-10/12 2xl:w-1/2">
        <AnimatePresence mode="wait">
          {aboveLargeViewportWidth && audioControlsAreMinized && (
            <motion.div
              key={"audioControlsTopLayer"}
              className="baseFlex"
              variants={widthAndHeightVariants}
              initial="closed"
              animate="expanded"
              exit="closed"
              transition={{
                duration: 0.15,
              }}
            >
              <Button
                variant="ghost"
                className="h-5 w-8 px-2 py-1"
                onClick={() => setAudioControlsAreMinimized(false)}
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
                {audioMetadata.type === "Generated" &&
                  audioMetadata.location !== null &&
                  !audioControlsAreMinized && (
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
                          pauseAudio(true);

                          setAudioMetadata({
                            ...audioMetadata,
                            location: null,
                          });
                        }}
                        className="baseFlex !flex-nowrap gap-2"
                      >
                        <RiArrowGoBackFill className="h-4 w-4" />
                        <p>Return to entire tab</p>
                      </Button>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {/* v/^ chevron */}
            <Button
              variant={"ghost"}
              className="col-span-2 h-8 w-8 p-2"
              onClick={() => setAudioControlsAreMinimized(true)}
            >
              {audioControlsAreMinized ? (
                <GoChevronUp className="h-5 w-5" />
              ) : (
                <GoChevronDown className="h-5 w-5" />
              )}
            </Button>

            {/* audio slider */}
            <div className="baseFlex col-span-5 w-full !flex-nowrap gap-2">
              {volume === 0 ? (
                <FaVolumeMute className="h-5 w-5" />
              ) : volume < 1 ? (
                <FaVolumeDown className="h-5 w-5" />
              ) : (
                <FaVolumeUp className="h-5 w-5" />
              )}
              <Slider
                value={[volume * 50]} // 100 felt too quite/narrow of a volume range
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0]! / 50)} // 100 felt too quite/narrow of a volume range
                // className=""
              ></Slider>
            </div>
          </div>
        )}

        {/* desktop top layer: audio source, instrument, speed  + volume slider */}
        {aboveLargeViewportWidth && (
          <div className="baseFlex w-full !justify-between">
            {/* audio source, instrument, speed selects*/}
            <div className="baseFlex gap-2">
              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Source</Label>
                <Select
                  value={audioMetadata.type}
                  onValueChange={(value) =>
                    setAudioMetadata({
                      ...audioMetadata,
                      type: value as "Generated" | "Artist recorded",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Audio source</SelectLabel>

                      <SelectItem value={"Generated"}>Generated</SelectItem>

                      <SelectItem
                        value={"Artist recorded"}
                        disabled={recordedAudioUrl === null}
                      >
                        Artist recorded
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Instrument</Label>
                <Select
                  disabled={audioMetadata.type === "Artist recorded"}
                  value={currentInstrumentName}
                  onValueChange={(value) => {
                    pauseAudio();

                    setCurrentInstrumentName(
                      value as
                        | "acoustic_guitar_nylon"
                        | "acoustic_guitar_steel"
                        | "electric_guitar_clean"
                        | "electric_guitar_jazz"
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sections</SelectLabel>

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
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Speed</Label>
                <Select
                  disabled={audioMetadata.type === "Artist recorded"}
                  value={`${playbackSpeed}x`}
                  onValueChange={(value) => {
                    pauseAudio();

                    const newPlaybackSpeed = Number(
                      value.slice(0, value.length - 1)
                    ) as 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

                    setPlaybackSpeed(newPlaybackSpeed);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Speed</SelectLabel>
                      <SelectItem value={"0.25x"}>0.25x</SelectItem>
                      <SelectItem value={"0.5x"}>0.5x</SelectItem>
                      <SelectItem value={"0.75x"}>0.75x</SelectItem>
                      <SelectItem value={"1x"}>1x</SelectItem>
                      <SelectItem value={"1.25x"}>1.25x</SelectItem>
                      <SelectItem value={"1.5x"}>1.5x</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* conditional "move selected section back to entire tab" */}
            <AnimatePresence mode="wait">
              {audioMetadata.type === "Generated" &&
                audioMetadata.location !== null && (
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
                        pauseAudio(true);

                        setAudioMetadata({
                          ...audioMetadata,
                          location: null,
                        });
                      }}
                      className="baseFlex gap-2"
                    >
                      <RiArrowGoBackFill className="h-4 w-4" />
                      <p>Return to entire tab</p>
                    </Button>
                  </motion.div>
                )}
            </AnimatePresence>

            {/* autoscroll toggle + volume slider*/}
            <div className="baseFlex gap-2">
              {/* this should prob be either <Checkbox /> or <Toggle /> from shadcnui */}
              <Toggle
                variant={"outline"}
                pressed={autoscrollEnabled}
                onPressedChange={(value) => setAutoscrollEnabled(value)}
              >
                Autoscroll
              </Toggle>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="p-2">
                    {volume === 0 ? (
                      <FaVolumeMute className="h-5 w-5" />
                    ) : volume < 1 ? (
                      <FaVolumeDown className="h-5 w-5" />
                    ) : (
                      <FaVolumeUp className="h-5 w-5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="baseVertFlex h-36 w-11 !flex-nowrap gap-2 p-2"
                  side="top"
                >
                  <VerticalSlider
                    value={[volume * 50]} // 100 felt too quite/narrow of a volume range
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0]! / 50)} // 100 felt too quite/narrow of a volume range
                  ></VerticalSlider>
                  <p>{Math.floor(volume * 50)}%</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* bottom layer: play/pause, loop, slider*/}
        <div className="baseFlex w-full !flex-nowrap gap-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            disabled={
              artificalPlayButtonTimeout ||
              currentlyPlayingMetadata === null ||
              currentlyPlayingMetadata.length === 0 ||
              (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0) === 0 ||
              !currentInstrument
            }
            onClick={() => {
              if (audioMetadata.playing) {
                setArtificalPlayButtonTimeout(true);

                setTimeout(() => {
                  setArtificalPlayButtonTimeout(false);
                }, 300);
                pauseAudio();
              } else {
                void playTab({
                  tabData,
                  rawSectionProgression: sectionProgression,
                  tuningNotes: tuning,
                  baselineBpm: bpm,
                  chords,
                  capo,
                  playbackSpeed,
                  tabId: audioMetadata.tabId,
                  location: audioMetadata.location ?? undefined,
                });
              }
            }}
          >
            {audioMetadata.playing ? (
              <BsFillPauseFill className="h-5 w-5" />
            ) : (
              <BsFillPlayFill className="h-5 w-5" />
            )}
          </Button>

          <div className="baseFlex w-9/12 !flex-nowrap gap-4">
            <div className="baseFlex !flex-nowrap gap-1">
              <p>
                {formatSecondsToMinutes(
                  Math.min(
                    tabProgressValue,
                    currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0
                  )
                )}
              </p>
              /
              <p>
                {formatSecondsToMinutes(
                  currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0
                )}
              </p>
            </div>

            <Slider
              value={[tabProgressValue]}
              min={0}
              max={currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0}
              step={1}
              disabled={
                currentlyPlayingMetadata === null ||
                currentlyPlayingMetadata.length === 0 ||
                (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0) === 0 ||
                !currentInstrument
              }
              onPointerDown={() => {
                setWasPlayingBeforeScrubbing(audioMetadata.playing);
                pauseAudio();
              }}
              onPointerUp={() => {
                if (wasPlayingBeforeScrubbing) {
                  setWaitForCurrentChordIndexToUpdate(true);
                }
              }}
              onValueChange={(value) => {
                setTabProgressValue(value[0]!);

                if (currentlyPlayingMetadata) {
                  let newCurrentChordIndex = -1;

                  for (let i = 0; i < currentlyPlayingMetadata.length; i++) {
                    const metadata = currentlyPlayingMetadata[i]!;

                    if (metadata.elapsedSeconds === value[0]) {
                      newCurrentChordIndex = i;
                      break;
                    } else if (metadata.elapsedSeconds > value[0]! && i > 0) {
                      newCurrentChordIndex = i - 1;
                      break;
                    }
                  }

                  if (newCurrentChordIndex !== -1) {
                    setCurrentChordIndex(newCurrentChordIndex);
                    setUpdatedCurrentChordIndex(newCurrentChordIndex);
                  }
                }
              }}
            ></Slider>
          </div>

          {aboveLargeViewportWidth ? (
            <>
              <Toggle
                variant={"outline"}
                aria-label="Loop toggle"
                className="h-8 w-8 p-1"
                pressed={looping}
                onPressedChange={(value) => setLooping(value)}
              >
                <TiArrowLoop className="h-6 w-6" />
              </Toggle>
              <Button
                variant={"ghost"}
                className="h-8 w-8 p-2"
                onClick={() => setAudioControlsAreMinimized(true)}
              >
                <GoChevronDown className="h-5 w-5" />
              </Button>
            </>
          ) : (
            // not sure what modal fully does, main concern is it closing when clicking on
            // any space inside that isn't another ui component closes the dropdown menu
            // maybe open + onOpenChange props?
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="p-1">
                  <IoSettingsOutline className="h-6 w-6" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                side={"top"}
                className="baseVertFlex min-w-[20rem] !items-start gap-2 bg-pink-50 text-pink-950"
              >
                <Label>Audio settings</Label>
                <Separator className="mb-2 w-full bg-pink-500" />
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Source</Label>
                  <Select
                    value={audioMetadata.type}
                    onValueChange={(value) =>
                      setAudioMetadata({
                        ...audioMetadata,
                        type: value as "Generated" | "Artist recorded",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Audio source</SelectLabel>

                        <SelectItem value={"Generated"}>Generated</SelectItem>

                        <SelectItem
                          value={"Artist recorded"}
                          disabled={recordedAudioUrl === null}
                        >
                          Artist recorded
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Instrument</Label>
                  <Select
                    value={currentInstrumentName}
                    onValueChange={(value) => {
                      pauseAudio();

                      setCurrentInstrumentName(
                        value as
                          | "acoustic_guitar_nylon"
                          | "acoustic_guitar_steel"
                          | "electric_guitar_clean"
                          | "electric_guitar_jazz"
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Sections</SelectLabel>

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
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Speed</Label>
                  <Select
                    value={`${playbackSpeed}x`}
                    onValueChange={(value) => {
                      pauseAudio();

                      setPlaybackSpeed(
                        Number(value.slice(0, value.length - 1)) as
                          | 0.25
                          | 0.5
                          | 0.75
                          | 1
                          | 1.25
                          | 1.5
                      );
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Speed</SelectLabel>
                        <SelectItem value={"0.25x"}>0.25x</SelectItem>
                        <SelectItem value={"0.5x"}>0.5x</SelectItem>
                        <SelectItem value={"0.75x"}>0.75x</SelectItem>
                        <SelectItem value={"1x"}>1x</SelectItem>
                        <SelectItem value={"1.25x"}>1.25x</SelectItem>
                        <SelectItem value={"1.5x"}>1.5x</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Autoscroll</Label>
                  <Switch
                    id="autoscroll"
                    disabled={audioMetadata.type === "Artist recorded"}
                    checked={autoscrollEnabled}
                    onCheckedChange={(value) => setAutoscrollEnabled(value)}
                  />
                </div>
                <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                  <Label>Loop</Label>
                  <Switch
                    id="loop"
                    checked={looping}
                    onCheckedChange={(value) => setLooping(value)}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AudioControls;
