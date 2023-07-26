import { useState } from "react";
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
import { Slider } from "~/components/ui/slider";
import useSound from "~/hooks/useSound";

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

function AudioControls() {
  const [source, setSource] = useState<"Generated" | "User recorded">(
    "Generated"
  );

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // prob create hook + place it here for useAutoscroll(),
  // it will look at the current locaiton based on metadata[currentChordIndex].location to get the
  // id (each chord div will need to have an id that matches this) and if turned on it will scroll to that
  // id.

  const {
    recordedAudioUrl,
    currentInstrumentName,
    setCurrentInstrumentName,
    playbackSpeed,
    setPlaybackSpeed,
    volume,
    setVolume,
  } = useTabStore(
    (state) => ({
      recordedAudioUrl: state.recordedAudioUrl,
      currentInstrumentName: state.currentInstrumentName,
      setCurrentInstrumentName: state.setCurrentInstrumentName,
      playbackSpeed: state.playbackSpeed,
      setPlaybackSpeed: state.setPlaybackSpeed,
      volume: state.volume,
      setVolume: state.setVolume,
    }),
    shallow
  );

  const { playTab, pauseTab, playRecordedAudio, pauseRecordedAudio } =
    useSound();

  return (
    <motion.div
      key={"audioControls"}
      className="baseFlex fixed z-50 w-[100vw]"
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
      <div className="baseVertFlex h-full w-11/12 rounded-full bg-pink-600 p-2 shadow-md md:w-9/12 md:p-4 xl:w-1/2">
        {/* top layer: audio source, instrument, speed  + volume slider */}
        <div className="baseFlex w-full !justify-between">
          {/* audio source, instrument, speed selects*/}
          <div className="baseFlex gap-2">
            <div className="baseFlex !flex-nowrap gap-2">
              <Label>Source</Label>
              <Select
                value={source}
                onValueChange={(value) =>
                  setSource(value as "Generated" | "User recorded")
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
              {source === "Generated" && (
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

          {/* autoscroll toggle + volume slider*/}
          <div className="baseFlex gap-2">
            {/* this should prob be either <Checkbox /> or <Toggle /> from shadcnui */}
            <div>Autoscroll toggle</div>

            <div
              className="relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
              onClick={() => setShowVolumeSlider(true)}
            >
              Volume
              <AnimatePresence mode="wait">
                {showVolumeSlider && (
                  <motion.div
                    key={"volumeSlider"}
                    className="absolute bottom-0 right-0 h-40 w-6"
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
                    <Slider
                      orientation="vertical"
                      value={[volume]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) => {
                        console.log("slider val to:", value[0]);
                        setVolume(value[0] as number);
                      }}
                      className="baseVertFlex h-full w-full"
                    ></Slider>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* bottom layer: play/pause, loop, slider*/}
        <div className="baseFlex w-full gap-2">
          {/* audio source, instrument, speed selects*/}

          <div>play/pause</div>

          <div>loop</div>

          <div>slider</div>
        </div>
      </div>
    </motion.div>
  );
}

export default AudioControls;
