import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { getTrackBackground, Range } from "react-range";
import { AudioProgressSlider } from "~/components/ui/AudioProgressSlider";
import { LoopingRangeSlider } from "~/components/ui/LoopingRangeSlider";
import { useTabStore } from "~/stores/TabStore";

interface ProgressSlider {
  tabProgressValue: number;
  setTabProgressValue: Dispatch<SetStateAction<number>>;
  wasPlayingBeforeScrubbing: boolean;
  setWasPlayingBeforeScrubbing: Dispatch<SetStateAction<boolean>>;
  disabled: boolean;
  setArtificalPlayButtonTimeout: Dispatch<SetStateAction<boolean>>;
  chordDurations: number[];
}

function ProgressSlider({
  tabProgressValue,
  setTabProgressValue,
  wasPlayingBeforeScrubbing,
  setWasPlayingBeforeScrubbing,
  disabled,
  setArtificalPlayButtonTimeout,
  chordDurations,
}: ProgressSlider) {
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
    playbackMetadata: state.playbackMetadata,
  }));

  const [loopRange, setLoopRange] = useState([
    audioMetadata.startLoopIndex,
    audioMetadata.endLoopIndex === -1
      ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
      : audioMetadata.endLoopIndex,
  ]);

  useEffect(() => {
    if (
      playbackMetadata?.[loopRange[0] || 0]?.type === "ornamental" ||
      playbackMetadata?.[loopRange[1] || 0]?.type === "ornamental"
    ) {
      return;
    }

    // don't think this works, just want to only enter this block if the loop range is actually
    // different from the start/end loop indices, handling the case where the end loop index is
    // the last chord in the tab
    if (
      loopRange[0] !== audioMetadata.startLoopIndex ||
      (loopRange[1] !== audioMetadata.endLoopIndex &&
        loopRange[1] !== audioMetadata.fullCurrentlyPlayingMetadataLength - 1 &&
        audioMetadata.endLoopIndex !== -1)
    ) {
      console.log("H");
      let adjustedStartIndex = loopRange[0] || 0;
      let adjustedEndIndex =
        loopRange[1] === audioMetadata.fullCurrentlyPlayingMetadataLength - 1
          ? -1
          : loopRange[1] || 0;

      setAudioMetadata({
        ...audioMetadata,
        startLoopIndex: adjustedStartIndex,
        endLoopIndex: adjustedEndIndex,
      });

      const newCurrentChordIndex =
        adjustedStartIndex !== audioMetadata.startLoopIndex
          ? adjustedStartIndex
          : adjustedEndIndex;
      setCurrentChordIndex(newCurrentChordIndex ?? 0);
    } else {
      // always want to scroll to the start of the loop range, regardless of whether it's being edited
      setCurrentChordIndex(
        audioMetadata.editingLoopRange ? loopRange[0] || 0 : 0,
      );
    }
  }, [
    loopRange,
    audioMetadata,
    setAudioMetadata,
    setCurrentChordIndex,
    playbackMetadata,
  ]);

  // might want to do something dynamic visually  with isDragged prop for thumbs

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <Range
          key={"rangeTwoThumbs"} // needed so thumb(s) are properly initialized
          label="Range to loop within tab"
          step={1} // 0.1
          min={0}
          max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
          // allowOverlap={true}
          draggableTrack
          values={loopRange}
          // any use for onFinalChange?
          onChange={(newLoopRange) => {
            setLoopRange(newLoopRange);
          }}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  width: "100%",
                  borderRadius: "4px",
                  background: getTrackBackground({
                    values: loopRange,
                    colors: ["#ccc", "#548BF4", "#ccc"],
                    min: 0,
                    max: audioMetadata.fullCurrentlyPlayingMetadataLength - 1,
                  }),
                  alignSelf: "center",
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}-toggle`}
              style={{
                ...props.style,
                backgroundColor: "#999",
              }}
              className="z-10 size-[18px] rounded-full will-change-transform"
            />
          )}
        />
      ) : (
        <Range
          key={"rangeOneThumb"} // needed so thumb(s) are properly initialized
          label="Progress within tab"
          step={1} // 0.1
          min={0}
          max={
            currentlyPlayingMetadata ? currentlyPlayingMetadata.length - 1 : 0
          }
          values={[
            // bounding the value to the range of the tab
            Math.min(
              currentChordIndex + (audioMetadata.playing ? 1 : 0),
              currentlyPlayingMetadata!.length - 1,
            ),
          ]}
          // any use for onFinalChange?
          onChange={(values) => {
            if (audioMetadata.playing) {
              pauseAudio();
            }

            setCurrentChordIndex(values[0] || 0);

            // TODO: add logic for scrubbing through audio playback instead of tab playback
          }}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              onPointerDown={() => {
                if (audioMetadata.playing) {
                  pauseAudio();
                }
              }}
              style={{
                ...props.style,
                display: "flex",
                width: "100%",
                marginLeft: "0.5rem",
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: "8px",
                  width: "100%",
                  borderRadius: "4px",
                  background: getTrackBackground({
                    values: [currentChordIndex],
                    colors: ["#548BF4", "#ccc"],
                    min: 0,
                    max: currentlyPlayingMetadata?.length || 0,
                  }),
                  alignSelf: "center",
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, index }) => (
            <div
              {...props}
              key={`${props.key}-${index}`}
              style={{
                ...props.style,
                backgroundColor: "#999",
                transition: `transform ${
                  currentChordIndex === 0
                    ? 0
                    : audioMetadata.playing
                      ? chordDurations[currentChordIndex] || 0
                      : 0
                }s linear`,
              }}
              className="z-10 size-[18px] rounded-full will-change-transform"
            />
          )}
        />

        // <AudioProgressSlider
        //   value={[tabProgressValue]}
        //   min={0}
        //   // radix-slider thumb protrudes from lefthand side of the
        //   // track if max has a value of 0...
        //   max={
        //     audioMetadata.type === "Artist recording"
        //       ? recordedAudioBuffer
        //         ? Math.floor(recordedAudioBuffer?.duration)
        //         : 1
        //       : currentlyPlayingMetadata
        //         ? currentlyPlayingMetadata.at(-1)?.elapsedSeconds
        //         : 1
        //   }
        //   step={1}
        //   disabled={disabled}
        //   style={{
        //     pointerEvents: disabled ? "none" : "auto",
        //   }}
        //   onPointerDown={() => {
        //     setWasPlayingBeforeScrubbing(audioMetadata.playing);
        //     if (audioMetadata.playing) pauseAudio();
        //   }}
        //   onPointerUp={() => {
        //     if (!wasPlayingBeforeScrubbing) return;

        //     if (audioMetadata.type === "Generated") {
        //       // waiting; playTab() needs to have currentChordIndex
        //       // updated before it's called so it plays from the correct chord
        //       setTimeout(() => {
        //         void playTab({
        //           tabId: id,
        //           location: audioMetadata.location,
        //         });

        //         setArtificalPlayButtonTimeout(true);

        //         setTimeout(() => {
        //           setArtificalPlayButtonTimeout(false);
        //         }, 300);
        //       }, 50);
        //     } else if (
        //       audioMetadata.type === "Artist recording" &&
        //       recordedAudioBuffer
        //     ) {
        //       void playRecordedAudio({
        //         audioBuffer: recordedAudioBuffer,
        //         secondsElapsed: tabProgressValue,
        //       });

        //       setArtificalPlayButtonTimeout(true);

        //       setTimeout(() => {
        //         setArtificalPlayButtonTimeout(false);
        //       }, 300);
        //     }
        //   }}
        //   onValueChange={(value) => {
        //     setTabProgressValue(value[0]!);

        //     if (
        //       audioMetadata.type === "Artist recording" ||
        //       !currentlyPlayingMetadata
        //     )
        //       return;

        //     let newCurrentChordIndex = -1;

        //     for (let i = 0; i < currentlyPlayingMetadata.length; i++) {
        //       const metadata = currentlyPlayingMetadata[i]!;

        //       if (metadata.elapsedSeconds === value[0]) {
        //         newCurrentChordIndex = i;
        //         break;
        //       }
        //     }

        //     if (newCurrentChordIndex !== -1) {
        //       setCurrentChordIndex(newCurrentChordIndex);
        //     }
        //   }}
        // />
      )}
    </>
  );
}

export default ProgressSlider;
