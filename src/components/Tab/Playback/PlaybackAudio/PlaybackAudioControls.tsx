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
  const { asPath } = useRouter();

  const {
    id,
    bpm,
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
    viewportLabel,
    looping,
    playbackMetadata,
  } = useTabStore((state) => ({
    id: state.id,
    bpm: state.bpm,
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
    viewportLabel: state.viewportLabel,
    looping: state.looping,
    playbackMetadata: state.playbackMetadata,
  }));

  const [previousChordIndex, setPreviousChordIndex] = useState(0);
  const [previousTabId, setPreviousTabId] = useState(0);

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);

  const oneSecondIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const volume = useGetLocalStorageValues().volume;

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useSpacebarAudioControl();

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
                playbackMetadata?.[
                  audioMetadata.editingLoopRange
                    ? loopRange[0]
                    : currentChordIndex
                ]?.elapsedSeconds ?? 0,
              )}
            </div>

            <ProgressSlider
              disabled={disablePlayButton}
              chordDurations={chordDurations}
              loopRange={loopRange}
              setLoopRange={setLoopRange}
            />

            <div className="baseFlex w-9 !justify-end self-start">
              {formatSecondsToMinutes(
                playbackMetadata?.[
                  audioMetadata.editingLoopRange
                    ? loopRange[1]
                    : playbackMetadata?.length - 1
                ]?.elapsedSeconds ?? 0,
              )}
            </div>
          </div>

          <Toggle
            variant={"outline"}
            aria-label="Edit loop range"
            disabled={!looping || audioMetadata.playing || countInTimer.showing}
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
            chordDurations={chordDurations}
            loopRange={loopRange}
            setLoopRange={setLoopRange}
          />

          <div className="baseFlex w-full !justify-between">
            <div className="baseFlex w-9 !justify-start self-start">
              {formatSecondsToMinutes(
                playbackMetadata?.[
                  audioMetadata.editingLoopRange
                    ? loopRange[0]
                    : currentChordIndex
                ]?.elapsedSeconds ?? 0,
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
                playbackMetadata?.[
                  audioMetadata.editingLoopRange
                    ? loopRange[1]
                    : playbackMetadata?.length - 1
                ]?.elapsedSeconds ?? 0,
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackAudioControls;
