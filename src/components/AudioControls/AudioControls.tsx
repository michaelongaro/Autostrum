import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTabStore } from "~/stores/TabStore";
import { shallow } from "zustand/shallow";
import { Label } from "~/components/ui/label";
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
import { Slider } from "~/components/ui/slider";
import { VerticalSlider } from "~/components/ui/verticalSlider";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import useSound from "~/hooks/useSound";
import { TiArrowLoop } from "react-icons/ti";
import { BsFillPlayFill, BsFillPauseFill } from "react-icons/bs";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import { FaVolumeMute, FaVolumeDown, FaVolumeUp } from "react-icons/fa";
import { RiArrowGoBackFill } from "react-icons/ri";

const positionVariants = {
  expanded: {
    opacity: 1,
    bottom: "1rem",
  },
  closed: {
    opacity: 0,
    bottom: "-5rem",
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

function AudioControls() {
  // prob create hook + place it here for useAutoscroll(),
  // it will look at the current locaiton based on metadata[currentChordIndex].location to get the
  // id (each chord div will need to have an id that matches this) and if turned on it will scroll to that
  // id.

  const [volume, setVolume] = useState(1);

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
    }),
    shallow
  );

  const { playTab, pauseTab, playRecordedAudio, pauseRecordedAudio } =
    useSound();

  // new much simpler version:
  // we are only dealing with the resolution of the slider which is whole seconds (1, 2, 3, etc)
  // so in both scenarios (audio just progressing normally / scrubbing back and forth):
  //    whatever second we are on/move to, we just need to findIndex within the metadata array
  //    that has a secondsElapsed value equal to the current second we are on/move to!
  //    (fyi findIndex finds the first index that matches the condition, which is *exactly* what we want!)
  // ^^^ just as a reminder, if you were to scrub to 34 seconds, you would do findIndex process above,
  //      and when you found the index, you would just set the currentChordIndex to that index. and theoretically
  //      if you wire everything up properly, everything should work itself out.

  // maybe dumb question, do we need a state for seconds elapsed? or try to work through metadata array + indicies?
  // ^^ I think you only need that state for the recorded audio, otherwise should be able to just do the
  //    findIndex process above based on currentChordIndex to get the secondsElapsed value!

  useEffect(() => {
    if (!masterVolumeGainNode) return;

    masterVolumeGainNode.gain.value = volume;
  }, [volume, masterVolumeGainNode]);

  return (
    <motion.div
      key={"audioControls"}
      className="baseFlex fixed z-40 w-[100vw]"
      variants={positionVariants}
      initial="closed"
      animate="expanded"
      exit="closed"
      transition={{
        type: "spring",
        bounce: 0.2,
        duration: 0.6,
      }}
    >
      {/* start off with always two rows, and see how hard it would be to combine into
          one at larger widths later on */}
      <div className="baseVertFlex h-full w-11/12 gap-2 rounded-md bg-pink-600 p-0 shadow-lg md:w-9/12 md:rounded-full md:px-8 md:py-2 xl:w-1/2">
        {/* top layer: audio source, instrument, speed  + volume slider */}
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
                      value={"User recorded"}
                      disabled={recordedAudioUrl === null}
                    >
                      User recorded
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <AnimatePresence mode="wait">
              {audioMetadata.type === "Generated" && (
                <motion.div
                  key={"generatedSpecificAudioControls"}
                  className="baseFlex gap-2"
                  variants={positionVariants} // prob just do opacity + maybe scale up from 0.5 -> 1?
                  initial="closed"
                  animate="expanded"
                  exit="closed"
                  transition={{
                    type: "spring",
                    bounce: 0.2,
                    duration: 0.6,
                  }}
                >
                  <div className="baseFlex !flex-nowrap gap-2">
                    <Label>Instrument</Label>
                    <Select
                      value={currentInstrumentName}
                      onValueChange={(value) =>
                        setCurrentInstrumentName(
                          value as
                            | "acoustic_guitar_nylon"
                            | "acoustic_guitar_steel"
                            | "electric_guitar_clean"
                            | "electric_guitar_jazz"
                        )
                      }
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
                      value={`${playbackSpeed}x`}
                      onValueChange={(value) =>
                        setPlaybackSpeed(
                          Number(value.slice(0, value.length - 1)) as
                            | 0.25
                            | 0.5
                            | 0.75
                            | 1
                            | 1.25
                            | 1.5
                        )
                      }
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* most likely need to keep the break statement in there, but also need to create
          a separate function that will idk just don't want the currentChordIndex to keep incrementing
          while it waits for the break to be fired */}

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
                      void pauseTab(true);

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
            <Toggle variant={"outline"}>Autoscroll</Toggle>

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

        {/* bottom layer: play/pause, loop, slider*/}
        <div className="baseFlex w-full !flex-nowrap gap-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            disabled={
              currentlyPlayingMetadata === null ||
              currentlyPlayingMetadata.length === 0 ||
              (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0) === 0 ||
              !currentInstrument
            }
            onClick={() => {
              if (audioMetadata.playing) {
                void pauseTab();
              } else {
                void playTab({
                  tabData,
                  rawSectionProgression: sectionProgression,
                  tuningNotes: tuning,
                  baselineBpm: bpm,
                  chords,
                  capo,
                  location: audioMetadata.location ?? undefined,
                });
              }
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            {audioMetadata.playing ? (
              <BsFillPauseFill className="h-5 w-5" />
            ) : (
              <BsFillPlayFill className="h-5 w-5" />
            )}
          </Button>

          <div className="baseFlex w-9/12 !flex-nowrap gap-4">
            <p>
              {formatSecondsToMinutes(
                currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ??
                  0
              )}
            </p>

            <Slider
              value={[
                currentlyPlayingMetadata?.[currentChordIndex]?.elapsedSeconds ??
                  0,
              ]}
              min={0}
              max={currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0}
              step={1}
              disabled={
                currentlyPlayingMetadata === null ||
                currentlyPlayingMetadata.length === 0 ||
                (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0) === 0 ||
                !currentInstrument
              }
              onValueChange={(value) => {
                if (currentlyPlayingMetadata) {
                  // copilot code below, also prob for pointerDown pause audio, etc.

                  const newCurrentChordIndex =
                    currentlyPlayingMetadata.findIndex(
                      (metadata) => metadata.elapsedSeconds === value[0]
                    );

                  setCurrentChordIndex(newCurrentChordIndex);
                }
              }}
              // className=""
            ></Slider>
          </div>

          <Toggle
            variant={"outline"}
            aria-label="Loop toggle"
            className="h-8 w-8 p-1"
          >
            <TiArrowLoop className="h-6 w-6" />
          </Toggle>
        </div>
      </div>
    </motion.div>
  );
}

export default AudioControls;
