import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import PlaybackAudioRange from "~/components/AudioControls/PlaybackAudioRange";
import { Button } from "~/components/ui/button";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import { Toggle } from "~/components/ui/toggle";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { getTabStore, useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import { getConcreteDraftLoopRange } from "~/utils/loopRangeHelpers";
import { primePlaybackUserGesture } from "~/utils/primePlaybackUserGesture";

interface PlaybackAudioControls {
  chordDurations: number[];
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
  /** True while the strip is being glide-scrubbed or still coasting after release. */
  isGlideScrubbing?: boolean;
  loopRangePrompt: string | null;
}

function PlaybackAudioControls({
  chordDurations,
  tabProgressValue,
  setTabProgressValue,
  setChordRepetitions,
  scrollPositionsLength,
  isGlideScrubbing = false,
  loopRangePrompt,
}: PlaybackAudioControls) {
  const {
    bpm,
    playbackSpeed,
    setPlaybackSpeed,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    setAudioMetadata,
    previewMetadata,
    currentInstrument,
    playTab,
    pauseAudio,
    ensureAudioSystemReady,
    fetchingFullTabData,
    countInTimer,
    setCountInTimer,
    viewportLabel,
    playbackMetadata,
    tabIsEffectivelyEmpty,
    countInTimerEnabled,
    draftLoopStartIndex,
    draftLoopEndIndex,
    initDraftLoopRangeFromAudioMetadata,
  } = useTabStore((state) => ({
    bpm: state.bpm,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    setAudioMetadata: state.setAudioMetadata,
    previewMetadata: state.previewMetadata,
    currentInstrument: state.currentInstrument,
    playTab: state.playTab,
    pauseAudio: state.pauseAudio,
    ensureAudioSystemReady: state.ensureAudioSystemReady,
    fetchingFullTabData: state.fetchingFullTabData,
    countInTimer: state.countInTimer,
    setCountInTimer: state.setCountInTimer,
    viewportLabel: state.viewportLabel,
    playbackMetadata: state.playbackMetadata,
    tabIsEffectivelyEmpty: state.tabIsEffectivelyEmpty,
    countInTimerEnabled: state.countInTimerEnabled,
    draftLoopStartIndex: state.draftLoopStartIndex,
    draftLoopEndIndex: state.draftLoopEndIndex,
    initDraftLoopRangeFromAudioMetadata:
      state.initDraftLoopRangeFromAudioMetadata,
  }));

  const loopRange = getConcreteDraftLoopRange(
    draftLoopStartIndex,
    draftLoopEndIndex,
    audioMetadata.fullTabMetadataLength,
  );

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);
  // Invalidates delayed count-in → playTab work after app switch / pause so
  // iOS cannot start playback without a fresh user gesture.
  const playRequestIdRef = useRef(0);

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useSpacebarAudioControl({ disabled: isGlideScrubbing });

  useEffect(() => {
    if (currentChordIndex === 0) {
      setTabProgressValue(0);
    }
  }, [currentChordIndex, setTabProgressValue]);

  useEffect(() => {
    function cancelPendingPlayStart() {
      playRequestIdRef.current += 1;
      const { countInTimer: latestCountInTimer, setCountInTimer: setTimer } =
        getTabStore();
      if (latestCountInTimer.showing) {
        setTimer({
          ...latestCountInTimer,
          showing: false,
        });
      }
    }

    function handleBackground() {
      if (document.visibilityState === "hidden") {
        cancelPendingPlayStart();
      }
    }

    document.addEventListener("visibilitychange", handleBackground);
    window.addEventListener("pagehide", cancelPendingPlayStart);

    return () => {
      document.removeEventListener("visibilitychange", handleBackground);
      window.removeEventListener("pagehide", cancelPendingPlayStart);
    };
  }, []);

  function handlePlayPointerDown() {
    // Stay inside the gesture stack before any await/setTimeout (count-in).
    // iOS Safari otherwise leaves AudioContext suspended until too late for
    // the strip writer on the first Play after a cold reload.
    if (!audioMetadata.playing) {
      primePlaybackUserGesture();
    }
  }

  function handlePlayButtonClick() {
    const delayPlayStart = countInTimerEnabled ? 3000 : 0;

    if (audioMetadata.playing) {
      playRequestIdRef.current += 1;
      pauseAudio();
      setArtificalPlayButtonTimeout(true);
      setTimeout(() => setArtificalPlayButtonTimeout(false), 300);
      return;
    }

    // Sync unlock again on click — pointerdown may have been skipped for
    // keyboard / some assistive paths.
    primePlaybackUserGesture();

    const playRequestId = playRequestIdRef.current + 1;
    playRequestIdRef.current = playRequestId;

    void (async () => {
      // Count-in runs before playTab, so recover here too.
      const audioSystem = await ensureAudioSystemReady();
      if (!audioSystem || playRequestIdRef.current !== playRequestId) return;

      const {
        audioContext: readyAudioContext,
        masterVolumeGainNode: readyMasterVolumeGainNode,
        countInBuffer: readyCountInBuffer,
      } = audioSystem;

      if (countInTimerEnabled) {
        setCountInTimer({
          ...countInTimer,
          showing: true,
        });

        function playCountInSound(index: number) {
          if (
            playRequestIdRef.current !== playRequestId ||
            !readyAudioContext ||
            !readyMasterVolumeGainNode ||
            !readyCountInBuffer
          ) {
            return;
          }

          const source = readyAudioContext.createBufferSource();
          source.buffer = readyCountInBuffer;

          const gainNode = readyAudioContext.createGain();
          gainNode.gain.value = 0.25;

          source.detune.value = index === 3 ? 0 : index === 2 ? -50 : 0;

          source.connect(gainNode);

          gainNode.connect(readyMasterVolumeGainNode);
          setTimeout(() => source.start(), 190);
        }

        setTimeout(() => playCountInSound(3), 115);

        setTimeout(() => {
          setTimeout(() => playCountInSound(2), 115);

          setTimeout(() => {
            setTimeout(() => playCountInSound(1), 115);
          }, 1000);
        }, 1000);
      }

      if (previewMetadata.playing) pauseAudio();

      const startPlayback = () => {
        if (playRequestIdRef.current !== playRequestId) return;

        void playTab({
          location: audioMetadata.location,
        });

        if (countInTimerEnabled) {
          setCountInTimer({
            ...countInTimer,
            showing: false,
          });
        }
      };

      // Avoid setTimeout(0) when there is no count-in — it breaks the iOS user
      // gesture chain and leaves AudioContext suspended on the first Play after
      // a cold reload (strip then never advances).
      if (delayPlayStart === 0) {
        startPlayback();
      } else {
        setTimeout(startPlayback, delayPlayStart);
      }
    })();
  }

  const disablePlayButton =
    isGlideScrubbing ||
    countInTimer.showing ||
    artificalPlayButtonTimeout ||
    fetchingFullTabData ||
    audioMetadata.editingLoopRange ||
    bpm === -1 ||
    currentlyPlayingMetadata === null ||
    currentlyPlayingMetadata.length === 0 ||
    !currentInstrument ||
    // idk why this last condition is going over my head right now, make sure it makes sense before commit
    // maybe doesn't hurt anything, but could be covering some of the statements above,
    // so maybe try to leverage it's "complete"ness of its check through the tab?
    (tabIsEffectivelyEmpty && !audioMetadata.location);

  return (
    <>
      {viewportLabel.includes("Landscape") && (
        <div className="baseFlex w-full gap-4 px-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          {!audioMetadata.editingLoopRange && (
            <>
              <Button
                variant="audio"
                size={aboveLargeViewportWidth ? "default" : "sm"}
                disabled={disablePlayButton}
                onPointerDown={handlePlayPointerDown}
                onClick={handlePlayButtonClick}
                className="size-8 shrink-0 overflow-hidden rounded-full border-none bg-transparent p-0 text-foreground hover:bg-audio hover:text-audio-foreground disabled:border-none disabled:bg-transparent disabled:opacity-100"
              >
                <PlayButtonIcon
                  uniqueLocationKey="audioControls"
                  currentInstrument={currentInstrument}
                  audioMetadata={audioMetadata}
                  forceShowLoadingSpinner={fetchingFullTabData}
                  showCountInTimer={countInTimerEnabled && countInTimer.showing}
                  size="0.75rem"
                />
              </Button>

              <PlaybackSpeedPopover
                triggerVariant="link"
                playbackSpeed={playbackSpeed}
                disabled={countInTimer.showing}
                onPlaybackSpeedChange={(newPlaybackSpeed) => {
                  const normalizedProgress = tabProgressValue * playbackSpeed;
                  setTabProgressValue(normalizedProgress / newPlaybackSpeed);
                  setPlaybackSpeed(newPlaybackSpeed);
                  pauseAudio();
                }}
                side="top"
              />
            </>
          )}

          <div className="baseFlex w-full gap-4">
            <div className="baseFlex w-9 !justify-start self-start">
              {formatSecondsToMinutes(
                playbackMetadata?.[
                  audioMetadata.editingLoopRange
                    ? loopRange[0]
                    : currentChordIndex
                ]?.elapsedSeconds ?? 0,
              )}
            </div>

            <PlaybackAudioRange
              disabled={disablePlayButton}
              chordDurations={chordDurations}
              setChordRepetitions={setChordRepetitions}
              scrollPositionsLength={scrollPositionsLength}
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

          {!audioMetadata.editingLoopRange && (
            <Toggle
              variant={"outline"}
              aria-label="Edit loop range"
              disabled={audioMetadata.playing || countInTimer.showing}
              pressed={audioMetadata.editingLoopRange}
              className="h-8 w-8 p-1"
              onPressedChange={(value) => {
                if (value) {
                  initDraftLoopRangeFromAudioMetadata();
                  setCurrentChordIndex(audioMetadata.startLoopIndex);
                } else {
                  setCurrentChordIndex(0);
                }

                setAudioMetadata({
                  ...audioMetadata,
                  editingLoopRange: value,
                });
              }}
            >
              <CgArrowsShrinkH className="h-6 w-6" />
            </Toggle>
          )}
        </div>
      )}

      {!viewportLabel.includes("Landscape") && (
        <div className="baseVertFlex w-full max-w-[85vw] gap-2 sm:max-w-[612px]">
          <PlaybackAudioRange
            disabled={disablePlayButton}
            chordDurations={chordDurations}
            setChordRepetitions={setChordRepetitions}
            scrollPositionsLength={scrollPositionsLength}
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

            {audioMetadata.editingLoopRange ? (
              <p className="h-0 pb-[15px] text-xs text-gray xs:pb-6 xs:pt-0.5 xs:text-sm">
                {loopRangePrompt}
              </p>
            ) : (
              <div className="baseFlex gap-6">
                <Button
                  variant="text"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton || currentChordIndex === 0}
                  onClick={() => {
                    if (currentlyPlayingMetadata === null) return;

                    pauseAudio();

                    let i = currentChordIndex;

                    const currentTime =
                      currentlyPlayingMetadata[currentChordIndex]
                        ?.elapsedSeconds;

                    if (currentTime === undefined) return;

                    const targetTime = currentTime - 5;

                    // Loop to find the first chord that matches the -5 seconds condition
                    while (i > 0) {
                      if (
                        currentlyPlayingMetadata[i]?.elapsedSeconds &&
                        currentlyPlayingMetadata[i]!.elapsedSeconds <=
                          targetTime
                      ) {
                        break;
                      }

                      i--;
                    }

                    // Continue looping backward to ensure it is the _very first_ chord
                    // at targetTime
                    while (
                      i > 0 &&
                      currentlyPlayingMetadata[i - 1]?.elapsedSeconds ===
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
                  variant="audio"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton}
                  onPointerDown={handlePlayPointerDown}
                  onClick={handlePlayButtonClick}
                  className="size-10 shrink-0 overflow-hidden rounded-full border-none bg-transparent p-0 text-foreground hover:bg-audio hover:text-audio-foreground disabled:border-none disabled:bg-transparent disabled:brightness-75"
                >
                  <PlayButtonIcon
                    uniqueLocationKey="audioControls"
                    currentInstrument={currentInstrument}
                    audioMetadata={audioMetadata}
                    forceShowLoadingSpinner={fetchingFullTabData}
                    showCountInTimer={countInTimer.showing}
                    size={"1rem"}
                  />
                </Button>

                <Button
                  variant="text"
                  size={aboveLargeViewportWidth ? "default" : "sm"}
                  disabled={disablePlayButton}
                  onClick={() => {
                    if (currentlyPlayingMetadata === null) return;

                    pauseAudio();

                    // allows the user to wrap back to the start of the tab
                    let i =
                      currentChordIndex === currentlyPlayingMetadata.length - 1
                        ? 0
                        : currentChordIndex;

                    // allows the user to wrap back to the start of the tab
                    const currentTime =
                      currentChordIndex === currentlyPlayingMetadata.length - 1
                        ? 0
                        : currentlyPlayingMetadata[currentChordIndex]
                            ?.elapsedSeconds;

                    if (currentTime === undefined) return;

                    const targetTime = currentTime + 5;

                    // Loop to find the first chord that matches the +5 seconds condition
                    while (i < currentlyPlayingMetadata.length - 1) {
                      if (
                        currentlyPlayingMetadata[i]?.elapsedSeconds &&
                        currentlyPlayingMetadata[i]!.elapsedSeconds >=
                          targetTime
                      ) {
                        break;
                      }

                      i++;
                    }

                    // at this point we already have the very first chord at targetTime since
                    // we are incrementing chord-by-chord

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
