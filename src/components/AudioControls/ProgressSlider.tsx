import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
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
  }));

  // really not sure about this one,
  // it's clear its a rerendering issue regarding useState, maybe a useEffect + gating
  // state hook could work?
  const test = useRef(false);

  const [values, setValues] = useState(() => {
    if (test.current === false) {
      test.current = [
        audioMetadata.startLoopIndex,
        audioMetadata.endLoopIndex === -1
          ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1
          : audioMetadata.endLoopIndex,
      ];
    }

    return test.current;
  });

  // useEffect(() => {
  //   if (
  //     values[0] !== audioMetadata.startLoopIndex ||
  //     values[1] !== audioMetadata.endLoopIndex
  //   ) {
  //     setAudioMetadata({
  //       ...audioMetadata,
  //       startLoopIndex: values[0] || 0,
  //       endLoopIndex: values[1] || 0,
  //     });

  //     // setCurrentChordIndex() ...
  //   }
  // }, [values, audioMetadata, setAudioMetadata]);

  // might want to do something dynamic with isDragged prop for thumbs

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <Range
          label="Range to loop within tab"
          step={1} // 0.1
          min={0}
          max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
          // allowOverlap={true}
          // draggableTrack // start back here
          values={values}
          // any use for onFinalChange?
          onChange={(values) => {
            setValues(values);
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
                  height: "7px",
                  width: "100%",
                  borderRadius: "4px",
                  background: getTrackBackground({
                    values: values,
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
          // renderThumb={({ props }) => (
          //   <div
          //     {...props}
          //     key={props.key}
          //     style={{
          //       ...props.style,
          //       backgroundColor: "#999",
          //     }}
          //     className="z-10 size-4 rounded-full will-change-transform"
          //   />
          // )}
          renderThumb={({ index, props, isDragged }) => (
            <div
              {...props}
              key={index}
              style={{
                ...props.style,
                height: "42px",
                width: "42px",
                borderRadius: "4px",
                backgroundColor: "#FFF",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                boxShadow: "0px 2px 6px #AAA",
              }}
            >
              <div
                style={{
                  height: "16px",
                  width: "5px",
                  backgroundColor: isDragged ? "#548BF4" : "#CCC",
                }}
              />
            </div>
          )}
        />
      ) : (
        <Range
          label="Progress within tab"
          step={1} // 0.1
          min={0}
          max={
            currentlyPlayingMetadata ? currentlyPlayingMetadata.length - 1 : 0
          }
          values={[currentChordIndex + (audioMetadata.playing ? 1 : 0)]}
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
                  height: "7px",
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
          renderThumb={({ props }) => (
            <div
              {...props}
              key={props.key}
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
              className="z-10 size-4 rounded-full will-change-transform"
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
