import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { CgArrowsShrinkH } from "react-icons/cg";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import PlaybackAudioRange from "~/components/AudioControls/PlaybackAudioRange";
import { Button } from "~/components/ui/button";
import PlaybackSpeedPopover from "~/components/ui/PlaybackSpeedPopover";
import useSpacebarAudioControl from "~/hooks/useSpacebarAudioControl";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore, useTabStoreApi } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
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
  const store = useTabStoreApi();
  const {
    bpm,
    playbackSpeed,
    setPlaybackSpeed,
    currentChordIndex,
    setCurrentChordIndex,
    currentlyPlayingMetadata,
    audioMetadata,
    currentInstrument,
    playTabWithCountIn,
    pauseAudio,
    fetchingFullTabData,
    countInTimer,
    viewportLabel,
    tabIsEffectivelyEmpty,
    countInTimerEnabled,
    enterPlaybackLoopRangeEditor,
  } = useTabStore((state) => ({
    bpm: state.bpm,
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    currentlyPlayingMetadata: state.currentlyPlayingMetadata,
    audioMetadata: state.audioMetadata,
    currentInstrument: state.currentInstrument,
    playTabWithCountIn: state.playTabWithCountIn,
    pauseAudio: state.pauseAudio,
    fetchingFullTabData: state.fetchingFullTabData,
    countInTimer: state.countInTimer,
    viewportLabel: state.viewportLabel,
    tabIsEffectivelyEmpty: state.tabIsEffectivelyEmpty,
    countInTimerEnabled: state.countInTimerEnabled,
    enterPlaybackLoopRangeEditor: state.enterPlaybackLoopRangeEditor,
  }));

  // One compiled cycle of whatever scope the strip is showing (committed loop,
  // or the full selected tab/section while editing the loop range). Artificial
  // viewport duplicates are excluded so Range min/max and timestamps stay in
  // the same coordinate system.
  const rangeMetadataLength = currentlyPlayingMetadata?.length ?? 0;
  const rangeChordIndex =
    rangeMetadataLength > 0
      ? ((currentChordIndex % rangeMetadataLength) + rangeMetadataLength) %
        rangeMetadataLength
      : 0;
  const rangeStartSeconds =
    currentlyPlayingMetadata?.[rangeChordIndex]?.elapsedSeconds ?? 0;
  const rangeEndSeconds =
    currentlyPlayingMetadata?.[Math.max(0, rangeMetadataLength - 1)]
      ?.elapsedSeconds ?? 0;

  const [artificalPlayButtonTimeout, setArtificalPlayButtonTimeout] =
    useState(false);
  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

  useSpacebarAudioControl({ disabled: isGlideScrubbing });

  useEffect(() => {
    if (currentChordIndex === 0) {
      setTabProgressValue(0);
    }
  }, [currentChordIndex, setTabProgressValue]);

  function handlePlayPointerDown() {
    // Stay inside the gesture stack before any await/setTimeout (count-in).
    // iOS Safari otherwise leaves AudioContext suspended until too late for
    // the strip writer on the first Play after a cold reload.
    if (!audioMetadata.playing) {
      primePlaybackUserGesture(store.getState());
    }
  }

  function handlePlayButtonClick() {
    if (audioMetadata.playing) {
      pauseAudio();
      setArtificalPlayButtonTimeout(true);
      setTimeout(() => setArtificalPlayButtonTimeout(false), 300);
      return;
    }
    void playTabWithCountIn({
      location: audioMetadata.location,
      countIn: countInTimerEnabled,
    });
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
    // idk why this last condition is going over my head right now, make sure it makes sense before commit
    // maybe doesn't hurt anything, but could be covering some of the statements above,
    // so maybe try to leverage it's "complete"ness of its check through the tab?
    (tabIsEffectivelyEmpty && !audioMetadata.location);

  return (
    <>
      {viewportLabel.includes("Landscape") && (
        <div className="baseFlex h-10 w-full shrink-0 gap-4 px-4">
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
              {formatSecondsToMinutes(rangeStartSeconds)}
            </div>

            <PlaybackAudioRange
              disabled={disablePlayButton && !audioMetadata.editingLoopRange}
              chordDurations={chordDurations}
              setChordRepetitions={setChordRepetitions}
              scrollPositionsLength={scrollPositionsLength}
            />

            <div className="baseFlex w-9 !justify-end self-start">
              {formatSecondsToMinutes(rangeEndSeconds)}
            </div>
          </div>

          {!audioMetadata.editingLoopRange && (
            <Button
              variant={"outline"}
              aria-label="Edit loop range"
              disabled={audioMetadata.playing || countInTimer.showing}
              className="h-8 w-8 p-1"
              onClick={() => enterPlaybackLoopRangeEditor()}
            >
              <CgArrowsShrinkH className="size-6" />
            </Button>
          )}
        </div>
      )}

      {!viewportLabel.includes("Landscape") && (
        // Reserve the playback controls' height when loop editing hides them.
        <div className="baseVertFlex relative h-14 w-full max-w-[85vw] shrink-0 gap-2 sm:max-w-[612px]">
          {audioMetadata.editingLoopRange &&
            viewportLabel.includes("mobile") && (
              <p className="absolute bottom-full mb-2 text-center text-sm text-gray">
                {loopRangePrompt}
              </p>
            )}

          <PlaybackAudioRange
            disabled={disablePlayButton && !audioMetadata.editingLoopRange}
            chordDurations={chordDurations}
            setChordRepetitions={setChordRepetitions}
            scrollPositionsLength={scrollPositionsLength}
          />

          <div className="baseFlex w-full !justify-between">
            <div className="baseFlex w-9 !justify-start self-start">
              {formatSecondsToMinutes(rangeStartSeconds)}
            </div>

            {audioMetadata.editingLoopRange ? (
              <>
                {viewportLabel.includes("mobile") ? null : (
                  <p className="h-0 pb-[15px] text-xs text-gray xs:pb-6 xs:pt-0.5 xs:text-sm">
                    {loopRangePrompt}
                  </p>
                )}
              </>
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
              {formatSecondsToMinutes(rangeEndSeconds)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackAudioControls;
