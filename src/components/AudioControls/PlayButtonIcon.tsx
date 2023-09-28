import { motion } from "framer-motion";
import { useMemo } from "react";
import { BsFillPauseFill, BsFillPlayFill, BsStopFill } from "react-icons/bs";
import type Soundfont from "soundfont-player";
import type { AudioMetadata, PreviewMetadata } from "~/stores/TabStore";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
  },
  closed: {
    opacity: 0,
    scale: 0.75,
  },
};

interface PlayButtonIcon {
  uniqueLocationKey: string;
  currentInstrument: Soundfont.Player | null;
  recordedAudioBufferSourceNode?: AudioBufferSourceNode | null;
  audioMetadata?: AudioMetadata;
  tabId: number;
  sectionIndex?: number;
  subSectionIndex?: number;
  chordSequenceIndex?: number;
  previewMetadata?: PreviewMetadata;
  indexOfPattern?: number;
  previewType?: "strummingPattern" | "chord";
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
  recordedAudioBufferSourceNode,
  previewType,
}: PlayButtonIcon) {
  const renderPlayButtonIcon = useMemo(() => {
    if (
      !currentInstrument ||
      (audioMetadata?.type === "Artist recording" &&
        !previewMetadata &&
        !recordedAudioBufferSourceNode)
    ) {
      return (
        <motion.svg
          key={`${uniqueLocationKey}LoadingIcon`}
          variants={opacityAndScaleVariants}
          initial="closed"
          animate="expanded"
          transition={{ duration: 0.15 }}
          className="h-6 w-6 animate-spin rounded-full bg-inherit fill-none"
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
      (audioMetadata?.playing &&
        // just to make sure correct gridTabCard/tableTabRow responds w/ below jsx
        (audioMetadata?.tabId === tabId || tabId === -1) &&
        // TODO: refactor this whole mess to be more readable..

        (uniqueLocationKey === "audioControls" ||
          (audioMetadata.location?.sectionIndex === sectionIndex &&
            audioMetadata.location?.subSectionIndex === subSectionIndex &&
            audioMetadata.location?.chordSequenceIndex ===
              chordSequenceIndex))) ||
      (previewMetadata?.playing &&
        previewMetadata?.indexOfPattern === indexOfPattern &&
        previewMetadata?.type === previewType)
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
    uniqueLocationKey,
    audioMetadata,
    chordSequenceIndex,
    indexOfPattern,
    tabId,
    previewMetadata,
    sectionIndex,
    subSectionIndex,
    currentInstrument,
    recordedAudioBufferSourceNode,
    previewType,
  ]);

  return renderPlayButtonIcon;
}

export default PlayButtonIcon;
