import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BsFillPauseFill, BsStopFill } from "react-icons/bs";
import type Soundfont from "soundfont-player";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import {
  useTabStore,
  type AudioMetadata,
  type PreviewMetadata,
} from "~/stores/TabStore";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

type ShouldShowPauseIcon = Omit<PlayButtonIcon, "currentInstrument">;
interface PlayButtonIcon {
  uniqueLocationKey: string;
  currentInstrument: Soundfont.Player | null;
  audioMetadata?: AudioMetadata;
  tabId: number;
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  previewMetadata?: PreviewMetadata;
  indexOfPattern?: number;
  showCountInTimer?: boolean;
  previewType?: "strummingPattern" | "chord";
  forceShowLoadingSpinner?: boolean;
  size?: string;
}

function PlayButtonIcon({
  uniqueLocationKey,
  audioMetadata,
  tabId,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  previewMetadata,
  indexOfPattern,
  currentInstrument,
  showCountInTimer,
  previewType,
  forceShowLoadingSpinner,
  size = "0.75rem",
}: PlayButtonIcon) {
  const { audioContext, masterVolumeGainNode, countInBuffer } = useTabStore(
    (state) => ({
      audioContext: state.audioContext,
      masterVolumeGainNode: state.masterVolumeGainNode,
      countInBuffer: state.countInBuffer,
    }),
  );

  const [countInNumber, setCountInNumber] = useState(4);
  const [hideCountInTimer, setHideCountInTimer] = useState(false);

  useEffect(() => {
    if (
      !showCountInTimer ||
      !audioContext ||
      !masterVolumeGainNode ||
      !countInBuffer
    )
      return;

    setCountInNumber(3);

    function playCountInSound(index: number) {
      const source = audioContext!.createBufferSource();
      source.buffer = countInBuffer;

      const gainNode = audioContext!.createGain();
      gainNode.gain.value = 0.25;

      source.detune.value = index === 3 ? 0 : index === 2 ? -50 : 0;

      source.connect(gainNode);

      gainNode.connect(masterVolumeGainNode!);
      setTimeout(() => source.start(), 190);
    }

    setTimeout(() => playCountInSound(3), 115);

    setTimeout(() => {
      setCountInNumber(2);
      setTimeout(() => playCountInSound(2), 115);

      setTimeout(() => {
        setCountInNumber(1);
        setTimeout(() => playCountInSound(1), 115);

        setTimeout(() => {
          setHideCountInTimer(true);
          setCountInNumber(4);

          setTimeout(() => {
            setHideCountInTimer(false);
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1000);
  }, [showCountInTimer, audioContext, countInBuffer, masterVolumeGainNode]);

  function shouldShowPauseIcon({
    uniqueLocationKey,
    audioMetadata,
    tabId,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
    previewMetadata,
    indexOfPattern,
    previewType,
  }: ShouldShowPauseIcon) {
    const isAudioPlayingOnCurrentTab =
      audioMetadata &&
      audioMetadata?.playing &&
      (audioMetadata?.tabId === tabId || tabId === -1);

    const isAudioPlayingOnCurrentLocation =
      uniqueLocationKey === "audioControls" ||
      (audioMetadata &&
        audioMetadata.location?.sectionIndex === sectionIndex &&
        audioMetadata.location?.subSectionIndex === subSectionIndex &&
        audioMetadata.location?.chordSequenceIndex === chordSequenceIndex);

    const isPreviewPlayingWithPatternAndType =
      previewMetadata?.playing &&
      previewMetadata?.indexOfPattern === indexOfPattern &&
      previewMetadata?.type === previewType;

    return (
      (isAudioPlayingOnCurrentTab && isAudioPlayingOnCurrentLocation) ||
      isPreviewPlayingWithPatternAndType
    );
  }

  // is hideCountInTimer necessary?
  function renderPlayButtonIcon() {
    if (showCountInTimer && !hideCountInTimer) {
      return (
        <div className="baseFlex size-10 shrink-0 overflow-hidden">
          <div key={countInNumber} className="countIn text-lg">
            {countInNumber}
          </div>
        </div>
      );
    }

    if (!currentInstrument || forceShowLoadingSpinner) {
      return (
        <motion.svg
          key={`${uniqueLocationKey}LoadingIcon`}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          transition={{ duration: 0.3 }}
          className="size-5 shrink-0 animate-stableSpin rounded-full bg-inherit fill-none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </motion.svg>
      );
    } else if (
      shouldShowPauseIcon({
        audioMetadata,
        uniqueLocationKey,
        tabId,
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
        previewMetadata,
        indexOfPattern,
        previewType,
      })
    ) {
      return (
        <motion.div
          key={`${uniqueLocationKey}PauseButton`}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          {previewType === "strummingPattern" &&
          previewMetadata?.indexOfPattern === indexOfPattern ? (
            <BsStopFill
              style={{
                width: `calc(${size} * 1.5)`, // TODO: probably make custom icon components of these as well w/ better box sizing to avoid this hack
                height: `calc(${size} * 1.5)`, // TODO: probably make custom icon components of these as well w/ better box sizing to avoid this hack
              }}
            />
          ) : (
            <BsFillPauseFill
              style={{
                width: `calc(${size} * 1.5)`, // TODO: probably make custom icon components of these as well w/ better box sizing to avoid this hack
                height: `calc(${size} * 1.5)`, // TODO: probably make custom icon components of these as well w/ better box sizing to avoid this hack
              }}
            />
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key={`${uniqueLocationKey}PlayButton`}
        variants={opacityAndScaleVariants}
        initial="closed"
        animate="expanded"
        transition={{ duration: 0.3 }}
        className="z-10 shrink-0 px-1"
      >
        <PlayIcon
          style={{
            width: size,
            height: size,
          }}
        />
      </motion.div>
    );
  }

  return renderPlayButtonIcon();
}

export default PlayButtonIcon;
