import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { FaVolumeDown, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { IoSettingsOutline } from "react-icons/io5";
import { RiArrowGoBackFill } from "react-icons/ri";
import { TiArrowLoop } from "react-icons/ti";
import { Drawer } from "vaul";
import { shallow } from "zustand/shallow";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import PlayButtonIcon from "./PlayButtonIcon";
import {
  resetTabSliderPosition,
  returnTransitionToTabSlider,
} from "~/utils/tabSliderHelpers";

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

interface AudioControls {
  visibility: "expanded" | "minimized";
  setVisibility: Dispatch<SetStateAction<"expanded" | "minimized">>;
}

function AudioControls({ visibility, setVisibility }: AudioControls) {
  const { query } = useRouter();

  const [tabProgressValue, setTabProgressValue] = useState(0);
  const [wasPlayingBeforeScrubbing, setWasPlayingBeforeScrubbing] =
    useState(false);

  const [previousChordIndex, setPreviousChordIndex] = useState(0);
  const [previousTabId, setPreviousTabId] = useState(0);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);
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
    hasRecordedAudio,
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
    recordedAudioFile,
    recordedAudioBuffer,
    setRecordedAudioBuffer,
    playTab,
    playRecordedAudio,
    pauseAudio,
    fetchingFullTabData,
    audioContext,
  } = useTabStore(
    (state) => ({
      id: state.id,
      bpm: state.bpm,
      hasRecordedAudio: state.hasRecordedAudio,
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
      recordedAudioFile: state.recordedAudioFile,
      recordedAudioBuffer: state.recordedAudioBuffer,
      setRecordedAudioBuffer: state.setRecordedAudioBuffer,
      playTab: state.playTab,
      playRecordedAudio: state.playRecordedAudio,
      pauseAudio: state.pauseAudio,
      fetchingFullTabData: state.fetchingFullTabData,
      audioContext: state.audioContext,
    }),
    shallow
  );

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
    if (audioMetadata.type === "Generated" || !recordedAudioBuffer) return;

    if (audioMetadata.playing && !oneSecondIntervalRef.current) {
      returnTransitionToTabSlider();
      oneSecondIntervalRef.current = setInterval(() => {
        setTabProgressValue((prev) => prev + 1);
      }, 1000);
    }
    // TODO: fix this so you don't have the hacky - 1 in there, currently unsure of the best approach..
    else if (
      (!audioMetadata.playing ||
        tabProgressValue - 1 === Math.floor(recordedAudioBuffer.duration)) &&
      oneSecondIntervalRef.current
    ) {
      clearInterval(oneSecondIntervalRef.current);
      oneSecondIntervalRef.current = null;

      if (tabProgressValue - 1 === Math.floor(recordedAudioBuffer.duration)) {
        resetTabSliderPosition();
        setTabProgressValue(0);
      }
    }
  }, [
    recordedAudioBuffer,
    currentlyPlayingMetadata,
    audioMetadata.playing,
    audioMetadata.type,
    currentChordIndex,
    previousChordIndex,
    tabProgressValue,
  ]);

  useEffect(() => {
    if (audioMetadata.type === "Artist recording") return;

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
        } else {
          setTabProgressValue(
            currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ?? 0
          );
        }
      }
    }
  }, [
    currentlyPlayingMetadata,
    audioMetadata.playing,
    audioMetadata.type,
    currentChordIndex,
    previousChordIndex,
    tabProgressValue,
    setCurrentChordIndex,
  ]);

  const idOfAssociatedTab = useMemo(() => {
    if (id === -1 && typeof query.id === "string") {
      return parseInt(query.id, 10);
    } else {
      return id;
    }
  }, [id, query.id]);

  useEffect(() => {
    if (audioContext && hasRecordedAudio && !recordedAudioBuffer) {
      const convertAudioBuffer = async (arrayBuffer: ArrayBuffer) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setRecordedAudioBuffer(audioBuffer);
        } catch (err) {
          console.error("Decoding failed: ", err);
        }
      };

      if (audioMetadata.type === "Artist recording" && recordedAudioFile) {
        // get audioBuffer from recordedAudioFile and setRecordedAudioBuffer(audioBuffer);
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(recordedAudioFile);
        fileReader.onloadend = async () => {
          try {
            await convertAudioBuffer(fileReader.result as ArrayBuffer);
          } catch (err) {
            console.error("Decoding failed: ", err);
          }
        };
      } else if (
        audioMetadata.type === "Artist recording" &&
        !recordedAudioFile &&
        !recordedAudioBuffer &&
        idOfAssociatedTab !== -1
      ) {
        // fetch recordedAudioFile from api
        void fetch(`/api/getRecordedAudioFile/${idOfAssociatedTab}`).then(
          (res) => {
            // decode audioBuffer from recordedAudioFile and setRecordedAudioBuffer(audioBuffer);
            void res.arrayBuffer().then((arrayBuffer) => {
              void convertAudioBuffer(arrayBuffer);
            });
          }
        );
      }
    } else if (!recordedAudioBuffer) {
      setRecordedAudioBuffer(null);
    }
  }, [
    audioMetadata.type,
    hasRecordedAudio,
    recordedAudioFile,
    recordedAudioBuffer,
    setRecordedAudioBuffer,
    idOfAssociatedTab,
    audioContext,
  ]);

  // a little overkill, but didn't want to expose tabProgressValue as a store value to be able
  // to update from <AudioRecorderModal />, so we settled with this.
  useEffect(() => {
    setTabProgressValue(0);
  }, [audioMetadata.type]);

  function resetAudioStateOnSourceChange(
    audioTypeBeingChangedTo: "Generated" | "Artist recording"
  ) {
    if (oneSecondIntervalRef.current) {
      clearInterval(oneSecondIntervalRef.current);
      oneSecondIntervalRef.current = null;
    }

    pauseAudio(true);

    setAudioMetadata({
      tabId: id,
      type: audioTypeBeingChangedTo,
      playing: false,
      location: null,
    });

    setTabProgressValue(0);
    setCurrentChordIndex(0);
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
    if (artificalPlayButtonTimeout || fetchingFullTabData) return true;

    if (audioMetadata.type === "Artist recording") {
      return !recordedAudioBuffer;
    } else {
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
    }
  }, [
    bpm,
    fetchingFullTabData,
    audioMetadata.location,
    audioMetadata.type,
    currentInstrument,
    recordedAudioBuffer,
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
      <div className="baseVertFlex audioControlsBoxShadow h-full w-[95vw] gap-2 rounded-xl bg-pink-600 p-2 transition-opacity lg:rounded-full lg:px-8 lg:py-2 xl:w-10/12 2xl:w-1/2">
        <AnimatePresence mode="wait">
          {aboveLargeViewportWidth && visibility === "minimized" && (
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
                className="h-5 w-8 p-0"
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
                {audioMetadata.type === "Generated" &&
                  audioMetadata.location !== null &&
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
                          });
                        }}
                        className="baseFlex !flex-nowrap gap-2 p-1"
                      >
                        <RiArrowGoBackFill className="h-4 w-4" />
                        <p className="text-sm">Play whole tab</p>
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
                  visibility === "minimized" ? "expanded" : "minimized"
                )
              }
            >
              {visibility === "minimized" ? (
                <GoChevronUp className="h-5 w-5" />
              ) : (
                <GoChevronDown className="h-5 w-5" />
              )}
            </Button>

            {/* audio slider */}
            <div
              className={`baseFlex col-span-5 w-full !flex-nowrap gap-2 md:w-1/2 md:justify-self-end ${
                visibility === "minimized" ? "opacity-0" : "opacity-100"
              } transition-opacity`}
            >
              {volume === 0 ? (
                <FaVolumeMute className="h-5 w-5" />
              ) : volume < 1 ? (
                <FaVolumeDown className="h-5 w-5" />
              ) : (
                <FaVolumeUp className="h-5 w-5" />
              )}
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
                  onValueChange={(value) => {
                    if (value !== audioMetadata.type) {
                      resetAudioStateOnSourceChange(
                        value as "Generated" | "Artist recording"
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Audio source</SelectLabel>

                      <SelectItem value={"Generated"}>Generated</SelectItem>

                      <SelectItem
                        value={"Artist recording"}
                        disabled={!hasRecordedAudio}
                      >
                        Artist recording
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="baseFlex !flex-nowrap gap-2">
                <Label>Instrument</Label>
                <Select
                  disabled={audioMetadata.type === "Artist recording"}
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
                  disabled={audioMetadata.type === "Artist recording"}
                  value={`${playbackSpeed}x`}
                  onValueChange={(value) => {
                    pauseAudio(true);

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
              {/* this should prob be either <Checkbox /> or <Toggle /> from shadcnui */}
              <Toggle
                variant={"outline"}
                disabled={audioMetadata.type === "Artist recording"}
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
        <div className="baseFlex w-full !flex-nowrap gap-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={() => {
              if (audioMetadata.playing) {
                pauseAudio();

                if (audioMetadata.type === "Generated") {
                  setArtificalPlayButtonTimeout(true);

                  setTimeout(() => {
                    setArtificalPlayButtonTimeout(false);
                  }, 300);
                }
              } else {
                if (
                  audioMetadata.type === "Artist recording" &&
                  recordedAudioBuffer
                ) {
                  void playRecordedAudio({
                    audioBuffer: recordedAudioBuffer,
                    secondsElapsed: tabProgressValue,
                  });

                  setArtificalPlayButtonTimeout(true);

                  setTimeout(() => {
                    setArtificalPlayButtonTimeout(false);
                  }, 300);
                } else {
                  if (audioMetadata.playing || previewMetadata.playing) {
                    pauseAudio();
                  }

                  setTimeout(
                    () => {
                      void playTab({
                        tabId: id,
                        location: audioMetadata.location,
                      });
                    },
                    audioMetadata.playing || previewMetadata.playing ? 50 : 0
                  );
                }
              }
            }}
          >
            <PlayButtonIcon
              uniqueLocationKey="audioControls"
              tabId={id}
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
              recordedAudioBuffer={recordedAudioBuffer}
              forceShowLoadingSpinner={fetchingFullTabData}
            />
          </Button>

          <div className="baseFlex w-9/12 !flex-nowrap gap-2">
            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? tabProgressValue
                  : Math.min(
                      tabProgressValue,
                      currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0
                    )
              )}
            </p>

            <AudioProgressSlider
              value={[tabProgressValue]}
              min={0}
              // radix-slider thumb protrudes from lefthand side of the
              // track if max has a value of 0...
              max={
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration === 0
                    ? 1
                    : Math.floor(recordedAudioBuffer?.duration)
                  : currentlyPlayingMetadata
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

                if (audioMetadata.type === "Generated") {
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
                } else if (
                  audioMetadata.type === "Artist recording" &&
                  recordedAudioBuffer
                ) {
                  void playRecordedAudio({
                    audioBuffer: recordedAudioBuffer,
                    secondsElapsed: tabProgressValue,
                  });

                  setArtificalPlayButtonTimeout(true);

                  setTimeout(() => {
                    setArtificalPlayButtonTimeout(false);
                  }, 300);
                }
              }}
              onValueChange={(value) => {
                setTabProgressValue(value[0]!);

                if (
                  audioMetadata.type === "Artist recording" ||
                  !currentlyPlayingMetadata
                )
                  return;

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
            ></AudioProgressSlider>

            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration
                    ? Math.floor(recordedAudioBuffer.duration)
                    : 0
                  : currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0
              )}
            </p>
          </div>

          {aboveLargeViewportWidth ? (
            <>
              <Toggle
                variant={"outline"}
                aria-label="Loop toggle"
                className="h-8 w-8 p-1"
                pressed={looping}
                onPressedChange={(value) =>
                  localStorageLooping.set(String(value))
                }
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
            <Drawer.Root dismissible={!drawerHandleDisabled}>
              <Drawer.Trigger asChild>
                <Button size="sm" variant={"outline"} className="p-1">
                  <IoSettingsOutline className="h-6 w-6" />
                </Button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
                <Drawer.Content className="baseVertFlex fixed bottom-0 left-0 right-0 z-50 !items-start gap-2 bg-pink-50 p-4 pb-6 text-pink-950">
                  <div className="mx-auto mb-2 h-1 w-12 flex-shrink-0 rounded-full bg-gray-300" />

                  <Label>Audio settings</Label>
                  <Separator className="mb-2 w-full bg-pink-500" />
                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Source</Label>
                    <Select
                      onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                      value={audioMetadata.type}
                      onValueChange={(value) => {
                        if (value !== audioMetadata.type) {
                          resetAudioStateOnSourceChange(
                            value as "Generated" | "Artist recording"
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="max-w-[10rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Audio source</SelectLabel>

                          <SelectItem value={"Generated"}>Generated</SelectItem>

                          <SelectItem
                            value={"Artist recording"}
                            disabled={!hasRecordedAudio}
                          >
                            Artist recording
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="baseFlex w-full !flex-nowrap !justify-between gap-4">
                    <Label>Instrument</Label>
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
                            | "electric_guitar_jazz"
                        );
                      }}
                    >
                      <SelectTrigger className="max-w-[15rem]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Instruments</SelectLabel>

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
                      onOpenChange={(isOpen) => setDrawerHandleDisabled(isOpen)}
                      value={`${playbackSpeed}x`}
                      onValueChange={(value) => {
                        pauseAudio(true);

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
                      disabled={audioMetadata.type === "Artist recording"}
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
                      checked={looping}
                      onCheckedChange={(value) =>
                        localStorageLooping.set(String(value))
                      }
                    />
                  </div>
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
