import { type Dispatch, type SetStateAction } from "react";
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
}

function ProgressSlider({
  tabProgressValue,
  setTabProgressValue,
  wasPlayingBeforeScrubbing,
  setWasPlayingBeforeScrubbing,
  disabled,
  setArtificalPlayButtonTimeout,
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

  return (
    <>
      {audioMetadata.editingLoopRange ? (
        <LoopingRangeSlider
          value={[
            audioMetadata.startLoopIndex,
            audioMetadata.endLoopIndex === -1
              ? audioMetadata.fullCurrentlyPlayingMetadataLength - 1 // could be jank with total tab length of one or two..
              : audioMetadata.endLoopIndex,
          ]}
          min={0}
          max={audioMetadata.fullCurrentlyPlayingMetadataLength - 1}
          step={1}
          onValueChange={(value) => {
            const tabLength =
              audioMetadata.fullCurrentlyPlayingMetadataLength - 1;

            const newStartLoopIndex = value[0]!;
            const newEndLoopIndex = value[1] === tabLength ? -1 : value[1]!;

            if (
              newStartLoopIndex !== audioMetadata.startLoopIndex ||
              newEndLoopIndex !== audioMetadata.endLoopIndex
            ) {
              setAudioMetadata({
                ...audioMetadata,
                startLoopIndex: newStartLoopIndex,
                endLoopIndex: newEndLoopIndex,
              });
            }
          }}
        />
      ) : (
        <AudioProgressSlider
          value={[tabProgressValue]}
          min={0}
          // radix-slider thumb protrudes from lefthand side of the
          // track if max has a value of 0...
          max={
            audioMetadata.type === "Artist recording"
              ? recordedAudioBuffer
                ? Math.floor(recordedAudioBuffer?.duration)
                : 1
              : currentlyPlayingMetadata
                ? currentlyPlayingMetadata.at(-1)?.elapsedSeconds
                : 1
          }
          step={1}
          disabled={disabled}
          style={{
            pointerEvents: disabled ? "none" : "auto",
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
        />
      )}
    </>
  );
}

export default ProgressSlider;