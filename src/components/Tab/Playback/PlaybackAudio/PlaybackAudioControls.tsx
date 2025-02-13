import { useLocalStorageValue } from "@react-hookz/web";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import { TiArrowLoop } from "react-icons/ti";
import { getTrackBackground, Range } from "react-range";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import ProgressSlider from "~/components/AudioControls/ProgressSlider";
import PlaybackGranularLoopRangeEditor from "~/components/Tab/Playback/PlaybackGranularLoopRangeEditor";
import { Button } from "~/components/ui/button";
import { Toggle } from "~/components/ui/toggle";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import {
  resetTabSliderPosition,
  returnTransitionToTabSlider,
} from "~/utils/tabSliderHelpers";

interface PlaybackAudioControls {
  chordDurations: number[];
  loopRange: [number, number];
  setLoopRange: Dispatch<SetStateAction<[number, number]>>;
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
}

function PlaybackAudioControls({
  chordDurations,
  loopRange,
  setLoopRange,
  tabProgressValue,
  setTabProgressValue,
}: PlaybackAudioControls) {
  const { query, asPath } = useRouter();

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
    countInTimer,
    setCountInTimer,
    mobileHeaderModal,
    setMobileHeaderModal,
    viewportLabel,
    looping,
    playbackMetadata,
  } = useTabStore((state) => ({
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
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    mobileHeaderModal: state.mobileHeaderModal,
    setMobileHeaderModal: state.setMobileHeaderModal,
    viewportLabel: state.viewportLabel,
    looping: state.looping,
    playbackMetadata: state.playbackMetadata,
  }));

  const [wasPlayingBeforeScrubbing, setWasPlayingBeforeScrubbing] =
    useState(false);

  const [previousChordIndex, setPreviousChordIndex] = useState(0);
  const [previousTabId, setPreviousTabId] = useState(0);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const oneSecondIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const localStorageVolume = useLocalStorageValue("autostrumVolume");
  const localStorageAutoscroll = useLocalStorageValue("autostrumAutoscroll");
  const localStorageLooping = useLocalStorageValue("autostrumLooping");

  const volume = useGetLocalStorageValues().volume;
  const autoscrollEnabled = useGetLocalStorageValues().autoscroll;
  // const looping = useGetLocalStorageValues().looping;

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useSpacebarAudioControl({ tabProgressValue });

  useEffect(() => {
    if (!mobileHeaderModal.showing) {
      setDrawerOpen(false);
    }
  }, [mobileHeaderModal.showing]);

  useEffect(() => {
    if (!masterVolumeGainNode) return;

    masterVolumeGainNode.gain.value = volume;
  }, [volume, masterVolumeGainNode]);

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
    if (currentChordIndex === 0) {
      setPreviousChordIndex(0);
      setTabProgressValue(0);
    } else {
      setPreviousChordIndex(currentChordIndex - 1);
    }
  }, [currentChordIndex]);

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
          },
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

  function handlePlayButtonClick() {
    const isViewingTabPath =
      asPath.includes("/tab") && !asPath.includes("edit");
    const delayPlayStart = isViewingTabPath ? 3000 : 0;
    const delayForStoreStateToUpdate = previewMetadata.playing ? 50 : 0;
    const setPlayButtonTimeout = () => {
      setArtificalPlayButtonTimeout(true);
      setTimeout(() => setArtificalPlayButtonTimeout(false), 300);
    };

    if (audioMetadata.playing) {
      pauseAudio();
      if (audioMetadata.type === "Generated") setPlayButtonTimeout();
    } else {
      if (isViewingTabPath) {
        setCountInTimer({
          ...countInTimer,
          showing: true,
        });
      }
      if (previewMetadata.playing) pauseAudio();

      setTimeout(() => {
        if (audioMetadata.type === "Artist recording" && recordedAudioBuffer) {
          playRecordedAudio({
            audioBuffer: recordedAudioBuffer,
            secondsElapsed: tabProgressValue,
          });
          setPlayButtonTimeout();
        } else {
          setTimeout(() => {
            void playTab({ tabId: id, location: audioMetadata.location });
          }, delayForStoreStateToUpdate);
        }
        if (isViewingTabPath)
          setCountInTimer({
            ...countInTimer,
            showing: false,
          });
      }, delayPlayStart);
    }
  }

  const disablePlayButton = useMemo(() => {
    if (
      countInTimer.showing ||
      artificalPlayButtonTimeout ||
      fetchingFullTabData ||
      audioMetadata.editingLoopRange
    )
      return true;

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
    countInTimer.showing,
    bpm,
    fetchingFullTabData,
    audioMetadata.location,
    audioMetadata.type,
    audioMetadata.editingLoopRange,
    currentInstrument,
    recordedAudioBuffer,
    tabData,
    artificalPlayButtonTimeout,
    currentlyPlayingMetadata,
  ]);

  return (
    <>
      {viewportLabel.includes("Landscape") && (
        <div className="baseFlex w-full gap-4 px-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={handlePlayButtonClick}
            className="size-8 shrink-0 overflow-hidden rounded-full bg-transparent p-0"
          >
            <PlayButtonIcon
              uniqueLocationKey="audioControls"
              tabId={id}
              currentInstrument={currentInstrument}
              audioMetadata={audioMetadata}
              recordedAudioBuffer={recordedAudioBuffer}
              forceShowLoadingSpinner={fetchingFullTabData}
              showCountInTimer={countInTimer.showing}
            />
          </Button>

          {/* speed selector (rotates through 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x speeds) */}
          <AnimatePresence mode={"popLayout"} initial={false}>
            <motion.div
              key={playbackSpeed}
              initial={{ scale: 0.5, x: 30, opacity: 0 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              exit={{ scale: 0.5, x: -30, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Button
                variant="link"
                onClick={() => {
                  pauseAudio();

                  let newPlaybackSpeed = playbackSpeed;

                  if (newPlaybackSpeed === 1.5) newPlaybackSpeed = 0.25;
                  else
                    newPlaybackSpeed = (playbackSpeed + 0.25) as
                      | 0.25
                      | 0.5
                      | 0.75
                      | 1
                      | 1.25
                      | 1.5;

                  // Normalize the progress value to 1x speed
                  const normalizedProgress = tabProgressValue * playbackSpeed;

                  // Adjust the progress value to the new playback speed
                  const adjustedProgress =
                    normalizedProgress / newPlaybackSpeed;

                  // Set the new progress value
                  setTabProgressValue(adjustedProgress);
                  setPlaybackSpeed(newPlaybackSpeed);
                }}
                className="w-6"
              >
                {playbackSpeed}x
              </Button>
            </motion.div>
          </AnimatePresence>

          <div className="baseFlex w-full !flex-nowrap gap-2">
            <div className="baseFlex w-9 !justify-start self-start">
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? tabProgressValue
                  : (playbackMetadata?.[
                      audioMetadata.editingLoopRange
                        ? loopRange[0]
                        : currentChordIndex
                    ]?.elapsedSeconds ?? 0),
              )}
            </div>

            <ProgressSlider
              disabled={disablePlayButton}
              tabProgressValue={tabProgressValue}
              setTabProgressValue={setTabProgressValue}
              wasPlayingBeforeScrubbing={wasPlayingBeforeScrubbing}
              setWasPlayingBeforeScrubbing={setWasPlayingBeforeScrubbing}
              setArtificalPlayButtonTimeout={setArtificalPlayButtonTimeout}
              chordDurations={chordDurations}
              loopRange={loopRange}
              setLoopRange={setLoopRange}
            />

            <div className="baseFlex w-9 !justify-end self-start">
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration
                    ? Math.floor(recordedAudioBuffer.duration)
                    : 0
                  : (playbackMetadata?.[
                      audioMetadata.editingLoopRange
                        ? loopRange[1]
                        : playbackMetadata?.length - 1
                    ]?.elapsedSeconds ?? 0),
              )}
            </div>
          </div>

          <Toggle
            variant={"outline"}
            aria-label="Edit looping range"
            disabled={
              !looping ||
              audioMetadata.type === "Artist recording" ||
              audioMetadata.playing ||
              countInTimer.showing
            }
            pressed={audioMetadata.editingLoopRange}
            className="h-8 w-8 p-1"
            onPressedChange={(value) => {
              // set to beginning of loop if moving to editing loop range, otherwise
              // reset to beginning of tab
              setCurrentChordIndex(value ? audioMetadata.startLoopIndex : 0);

              setAudioMetadata({
                ...audioMetadata,
                editingLoopRange: value,
              });
            }}
          >
            <CgArrowsShrinkH className="h-6 w-6" />
          </Toggle>
        </div>
      )}

      {!viewportLabel.includes("Landscape") && (
        <div className="baseVertFlex w-full max-w-[90vw] gap-2 sm:max-w-xl">
          <ProgressSlider
            disabled={disablePlayButton}
            tabProgressValue={tabProgressValue}
            setTabProgressValue={setTabProgressValue}
            wasPlayingBeforeScrubbing={wasPlayingBeforeScrubbing}
            setWasPlayingBeforeScrubbing={setWasPlayingBeforeScrubbing}
            setArtificalPlayButtonTimeout={setArtificalPlayButtonTimeout}
            chordDurations={chordDurations}
            loopRange={loopRange}
            setLoopRange={setLoopRange}
          />

          <div className="baseFlex w-full !justify-between">
            <div className="baseFlex w-9 !justify-start self-start">
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? tabProgressValue
                  : (playbackMetadata?.[
                      audioMetadata.editingLoopRange
                        ? loopRange[0]
                        : currentChordIndex
                    ]?.elapsedSeconds ?? 0),
              )}
            </div>

            {/* editing loop range - granular loop range component
                not editing loop range - regular audio controls based on viewport */}

            {audioMetadata.editingLoopRange ? (
              <PlaybackGranularLoopRangeEditor
                loopRange={loopRange}
                setLoopRange={setLoopRange}
              />
            ) : (
              <div className="baseFlex gap-6">
                <Button
                  variant="text"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton}
                  onClick={() => {
                    pauseAudio();

                    let i = currentChordIndex;

                    const currentTime =
                      currentlyPlayingMetadata?.[currentChordIndex]
                        ?.elapsedSeconds;

                    if (currentTime === undefined) return;

                    const targetTime = currentTime - 5;

                    // Loop to find the first chord that matches the -5 seconds condition
                    while (i > 0) {
                      if (
                        currentlyPlayingMetadata?.[i]?.elapsedSeconds &&
                        currentlyPlayingMetadata[i]!.elapsedSeconds <=
                          targetTime
                      ) {
                        break;
                      }
                      i--;
                    }

                    // Continue looping backward to ensure it is the _very first_ chord at that time
                    while (
                      i > 0 &&
                      currentlyPlayingMetadata?.[i - 1]?.elapsedSeconds ===
                        targetTime
                    ) {
                      i--;
                    }

                    setCurrentChordIndex(i);
                  }}
                  className="size-4 shrink-0 rounded-full bg-transparent p-0"
                >
                  -5s
                </Button>

                <Button
                  variant="playPause"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton}
                  onClick={handlePlayButtonClick}
                  className="size-10 shrink-0 rounded-full bg-transparent p-0"
                >
                  <PlayButtonIcon
                    uniqueLocationKey="audioControls"
                    tabId={id}
                    currentInstrument={currentInstrument}
                    audioMetadata={audioMetadata}
                    recordedAudioBuffer={recordedAudioBuffer}
                    forceShowLoadingSpinner={fetchingFullTabData}
                    showCountInTimer={countInTimer.showing}
                    size={"1.5rem"}
                  />
                </Button>

                <Button
                  variant="text"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton}
                  onClick={() => {
                    if (currentlyPlayingMetadata === null) return;

                    pauseAudio();

                    let i = currentChordIndex;

                    const currentTime =
                      currentlyPlayingMetadata?.[currentChordIndex]
                        ?.elapsedSeconds;

                    if (currentTime === undefined) return;

                    const targetTime = currentTime + 5;

                    // Loop to find the first chord that matches the +5 seconds condition
                    while (
                      i < currentlyPlayingMetadata?.length - 1 &&
                      currentlyPlayingMetadata?.[i]?.elapsedSeconds !==
                        undefined &&
                      currentlyPlayingMetadata[i]!.elapsedSeconds <= targetTime
                    ) {
                      i++;
                    }

                    // Continue looping forward to ensure it is the _very first_ chord at that time
                    while (
                      i < currentlyPlayingMetadata?.length - 1 &&
                      currentlyPlayingMetadata?.[i + 1]?.elapsedSeconds ===
                        targetTime
                    ) {
                      i++;
                    }

                    setCurrentChordIndex(i);
                  }}
                  className="size-4 shrink-0 rounded-full bg-transparent p-0"
                >
                  +5s
                </Button>
              </div>
            )}

            <div className="baseFlex w-9 !justify-end self-start">
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration
                    ? Math.floor(recordedAudioBuffer.duration)
                    : 0
                  : (playbackMetadata?.[
                      audioMetadata.editingLoopRange
                        ? loopRange[1]
                        : playbackMetadata?.length - 1
                    ]?.elapsedSeconds ?? 0),
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackAudioControls;
