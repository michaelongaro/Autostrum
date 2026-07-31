import {
  useEffect,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import usePlaybackGlideScrub from "~/hooks/usePlaybackGlideScrub";
import { useTabStore } from "~/stores/TabStore";
import type { PlaybackChordLayoutData } from "~/utils/playbackModalLayout";

interface PlaybackScrollingContainerProps {
  children: ReactNode;
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  chordLayoutData: PlaybackChordLayoutData | null;
  chordRepetitions: number[];
  stripRef: RefObject<HTMLDivElement | null>;
  scrubPositionRef: RefObject<number>;
  isGlideScrubbing: boolean;
  setIsGlideScrubbing: Dispatch<SetStateAction<boolean>>;
}

function PlaybackScrollingContainer({
  children,
  setChordRepetitions,
  chordLayoutData,
  chordRepetitions,
  stripRef,
  scrubPositionRef,
  isGlideScrubbing,
  setIsGlideScrubbing,
}: PlaybackScrollingContainerProps) {
  const {
    playing,
    pauseAudio,
    currentChordIndex,
    setCurrentChordIndex,
    countInTimer,
    editingLoopRange,
    visiblePlaybackContainerWidth,
  } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    countInTimer: state.countInTimer,
    editingLoopRange: state.audioMetadata.editingLoopRange,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
  }));

  const glideScrub = usePlaybackGlideScrub({
    stripRef,
    scrubPositionRef,
    scrollPositions: chordLayoutData?.scrollPositions ?? null,
    chordRepetitions,
    totalWidth: chordLayoutData?.totalWidth ?? 0,
    virtualizationStartIndex: chordLayoutData?.virtualizationStartIndex ?? 0,
    canVirtualize: chordLayoutData?.canVirtualize ?? false,
    currentChordIndex,
    setCurrentChordIndex,
    setChordRepetitions: (repetitions) => setChordRepetitions(repetitions),
    setIsGlideScrubbing,
    pauseAudio,
    playing,
    containerWidthPx: visiblePlaybackContainerWidth,
  });

  // Keep scrubPositionRef seeded while not scrubbing so a grab starts from
  // the React-owned chord boundary.
  useEffect(() => {
    if (isGlideScrubbing || !chordLayoutData) return;

    scrubPositionRef.current =
      (chordLayoutData.scrollPositions[currentChordIndex] ?? 0) +
      (chordRepetitions[currentChordIndex] ?? 0) * chordLayoutData.totalWidth;
  }, [
    chordLayoutData,
    chordRepetitions,
    currentChordIndex,
    isGlideScrubbing,
    scrubPositionRef,
  ]);

  return (
    <div
      className={`baseFlex relative w-full touch-none overflow-hidden ${
        editingLoopRange
          ? "h-[283px] mobilePortrait:h-[296px]"
          : "h-[255px] mobilePortrait:h-[268px]"
      } ${countInTimer.showing ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={glideScrub.handlePointerDown}
      onPointerMove={glideScrub.handlePointerMove}
      onPointerUp={glideScrub.handlePointerEnd}
      onPointerCancel={glideScrub.handlePointerEnd}
    >
      {children}
    </div>
  );
}

export default PlaybackScrollingContainer;
