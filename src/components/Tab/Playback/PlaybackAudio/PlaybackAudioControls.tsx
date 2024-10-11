import { useLocalStorageValue } from "@react-hookz/web";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import PlayButtonIcon from "~/components/AudioControls/PlayButtonIcon";
import ProgressSlider from "~/components/AudioControls/ProgressSlider";
import { Button } from "~/components/ui/button";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";
import useViewportWidthBreakpoint from "~/hooks/useViewportWidthBreakpoint";
import { useTabStore } from "~/stores/TabStore";
import formatSecondsToMinutes from "~/utils/formatSecondsToMinutes";
import tabIsEffectivelyEmpty from "~/utils/tabIsEffectivelyEmpty";
import {
  resetTabSliderPosition,
  returnTransitionToTabSlider,
} from "~/utils/tabSliderHelpers";

function PlaybackAudioControls() {
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
  }));

  const [tabProgressValue, setTabProgressValue] = useState(0);
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
  const looping = useGetLocalStorageValues().looping;

  const aboveLargeViewportWidth = useViewportWidthBreakpoint(1024);

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
      console.log("returnTransitionToTabSlider");
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

  useEffect(() => {
    setCurrentChordIndex(0);
    setTabProgressValue(0);
  }, [audioMetadata.editingLoopRange, setCurrentChordIndex]);

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
        if (
          currentlyPlayingMetadata?.[currentChordIndex] &&
          autoscrollEnabled
        ) {
          // scrollChordIntoView({
          //   location: currentlyPlayingMetadata[currentChordIndex]!.location,
          // });
        }
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

  // probably need two entirely different jsx returns below,
  // one for landscape mobile (horizontal layout)
  // and one for everything else (stacked vertical layout)
  // I believe this still just encompasses the play/pause button and the progress slider
  // alongside the +/- 5s buttons for non-landscape mobile view

  return (
    <>
      {viewportLabel === "mobile" && (
        <div className="baseFlex w-full gap-4 px-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={handlePlayButtonClick}
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

          <div className="baseFlex w-full !flex-nowrap gap-2">
            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? tabProgressValue
                  : Math.min(
                      tabProgressValue,
                      currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0,
                    ),
              )}
            </p>

            <ProgressSlider
              disabled={disablePlayButton}
              tabProgressValue={tabProgressValue}
              setTabProgressValue={setTabProgressValue}
              wasPlayingBeforeScrubbing={wasPlayingBeforeScrubbing}
              setWasPlayingBeforeScrubbing={setWasPlayingBeforeScrubbing}
              setArtificalPlayButtonTimeout={setArtificalPlayButtonTimeout}
            />

            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration
                    ? Math.floor(recordedAudioBuffer.duration)
                    : 0
                  : (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0),
              )}
            </p>
          </div>
        </div>
      )}

      {viewportLabel !== "mobile" && (
        <div className="baseFlex tablet:max-w-2xl w-full gap-4">
          {/* audio source, instrument, speed selects*/}

          {/* play/pause button*/}
          <Button
            variant="playPause"
            size={aboveLargeViewportWidth ? "default" : "sm"}
            disabled={disablePlayButton}
            onClick={handlePlayButtonClick}
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

          <div className="baseFlex w-9/12 !flex-nowrap gap-2">
            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? tabProgressValue
                  : Math.min(
                      tabProgressValue,
                      currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0,
                    ),
              )}
            </p>

            <ProgressSlider
              disabled={disablePlayButton}
              tabProgressValue={tabProgressValue}
              setTabProgressValue={setTabProgressValue}
              wasPlayingBeforeScrubbing={wasPlayingBeforeScrubbing}
              setWasPlayingBeforeScrubbing={setWasPlayingBeforeScrubbing}
              setArtificalPlayButtonTimeout={setArtificalPlayButtonTimeout}
            />

            <p>
              {formatSecondsToMinutes(
                audioMetadata.type === "Artist recording"
                  ? recordedAudioBuffer?.duration
                    ? Math.floor(recordedAudioBuffer.duration)
                    : 0
                  : (currentlyPlayingMetadata?.at(-1)?.elapsedSeconds ?? 0),
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default PlaybackAudioControls;
