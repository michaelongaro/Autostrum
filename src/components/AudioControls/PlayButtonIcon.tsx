import { motion } from "framer-motion";
import { useState, useEffect, useMemo, useCallback } from "react";
import { BsFillPauseFill, BsFillPlayFill, BsStopFill } from "react-icons/bs";
import type Soundfont from "soundfont-player";
import type { AudioMetadata, PreviewMetadata } from "~/stores/TabStore";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
  },
  closed: {
    opacity: 0,
  },
};

interface PlayButtonIcon {
  uniqueLocationKey: string;
  currentInstrument: Soundfont.Player | null;
  recordedAudioBuffer?: AudioBuffer | null;
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
  recordedAudioBuffer,
  showCountInTimer,
  previewType,
  forceShowLoadingSpinner,
}: PlayButtonIcon) {
  type ShouldShowPauseIcon = Omit<
    PlayButtonIcon,
    "currentInstrument" | "recordedAudioBuffer"
  >;

  const [countInNumber, setCountInNumber] = useState(3);

  useEffect(() => {
    if (!showCountInTimer) return;

    setTimeout(() => {
      setCountInNumber(2);
      setTimeout(() => {
        setCountInNumber(1);
        setTimeout(() => {
          setCountInNumber(3);
        }, 1000);
      }, 1000);
    }, 1000);
  }, [showCountInTimer]);

  const shouldShowPauseIcon = useCallback(
    ({
      uniqueLocationKey,
      audioMetadata,
      tabId,
      sectionIndex,
      subSectionIndex,
      chordSequenceIndex,
      previewMetadata,
      indexOfPattern,
      previewType,
    }: ShouldShowPauseIcon) => {
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
    },
    []
  );

  const renderPlayButtonIcon = useMemo(() => {
    if (showCountInTimer) {
      return (
        <motion.p
          key={`${uniqueLocationKey}CountInTimer${countInNumber}`}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          transition={{ duration: 0.15 }}
          className=" h-5 w-5 text-[18px]"
        >
          {countInNumber}
        </motion.p>
      );
    }

    if (
      !currentInstrument ||
      forceShowLoadingSpinner ||
      (uniqueLocationKey === "audioControls" && // can only play recorded audio through <AudioControls />
        audioMetadata?.type === "Artist recording" &&
        !recordedAudioBuffer)
    ) {
      return (
        <motion.svg
          key={`${uniqueLocationKey}LoadingIcon`}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          transition={{ duration: 0.15 }}
          className="h-5 w-5 animate-stableSpin rounded-full bg-inherit fill-none"
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
          transition={{ duration: 0.15 }}
        >
          {previewType === "strummingPattern" &&
          previewMetadata?.indexOfPattern === indexOfPattern ? (
            <BsStopFill className="h-5 w-5" />
          ) : (
            <BsFillPauseFill className="h-5 w-5" />
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
        transition={{ duration: 0.15 }}
      >
        <BsFillPlayFill className="h-5 w-5" />
      </motion.div>
    );
  }, [
    audioMetadata,
    tabId,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
    previewMetadata,
    indexOfPattern,
    previewType,
    currentInstrument,
    recordedAudioBuffer,
    shouldShowPauseIcon,
    uniqueLocationKey,
    forceShowLoadingSpinner,
    countInNumber,
    showCountInTimer,
  ]);

  return renderPlayButtonIcon;
}

export default PlayButtonIcon;
