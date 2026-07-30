import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import usePlaybackGlideScrub from "~/hooks/usePlaybackGlideScrub";
import { useTabStore } from "~/stores/TabStore";
import {
  PLAYBACK_SCRUB_MODE_LABELS,
  getVelocityAdjustedPixelsPerChord,
  getVelocityPixelsPerChord,
  type PlaybackScrubMode,
} from "~/utils/playbackScrubMath";
import type { PlaybackChordLayoutData } from "~/utils/playbackModalLayout";

interface PlaybackScrollingContainerProps {
  children: ReactNode;
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
  chordLayoutData: PlaybackChordLayoutData | null;
  chordRepetitions: number[];
  stripRef: RefObject<HTMLDivElement | null>;
  scrubPositionRef: RefObject<number>;
  isGlideScrubbing: boolean;
  setIsGlideScrubbing: Dispatch<SetStateAction<boolean>>;
}

const SCRUB_MODES: PlaybackScrubMode[] = ["legacy", "velocity", "glide"];

function PlaybackScrollingContainer({
  children,
  setChordRepetitions,
  scrollPositionsLength,
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
    expandedTabData,
    countInTimer,
    editingLoopRange,
    visiblePlaybackContainerWidth,
  } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    expandedTabData: state.expandedTabData,
    countInTimer: state.countInTimer,
    editingLoopRange: state.audioMetadata.editingLoopRange,
    visiblePlaybackContainerWidth: state.visiblePlaybackContainerWidth,
  }));

  const [scrubMode, setScrubMode] = useState<PlaybackScrubMode>("velocity");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const accumulatedDistanceRef = useRef(0);
  const isTouchingRef = useRef(false);
  const currentChordIndexRef = useRef(currentChordIndex);

  useEffect(() => {
    currentChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex]);

  const glideScrub = usePlaybackGlideScrub({
    enabled: scrubMode === "glide",
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
  });

  // Keep scrubPositionRef seeded while not glide-scrubbing so a grab starts
  // from the React-owned chord boundary.
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

  function applyChordIndexDelta(delta: number) {
    if (expandedTabData === null || delta === 0) return;

    const lastIndex = expandedTabData.length - 1;
    const previousIndex = currentChordIndexRef.current;
    let nextIndex = previousIndex + delta;

    if (delta > 0) {
      // Match legacy wrap-forward behavior.
      if (nextIndex > lastIndex) {
        nextIndex =
          ((nextIndex % (lastIndex + 1)) + (lastIndex + 1)) % (lastIndex + 1);
      }
    } else {
      if (nextIndex < 0) {
        nextIndex = 0;
      }

      // Virtualization only handles forward movement.
      setChordRepetitions(new Array(scrollPositionsLength).fill(0));
    }

    if (nextIndex !== previousIndex) {
      currentChordIndexRef.current = nextIndex;
      setCurrentChordIndex(nextIndex);
    }
  }

  function handleLegacyOrVelocityPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (
      e.target instanceof Element &&
      e.target.closest("[data-loop-range-node]")
    ) {
      return;
    }

    if (playing) pauseAudio();

    isTouchingRef.current = true;
    startXRef.current = e.clientX;
    lastMoveTimeRef.current = performance.now();
    accumulatedDistanceRef.current = 0;
  }

  function handleLegacyPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchingRef.current) return;
    e.preventDefault();

    const currentX = e.clientX;
    const deltaX = currentX - startXRef.current;

    if (deltaX > 15) {
      applyChordIndexDelta(-1);
      startXRef.current = e.clientX;
    } else if (deltaX < -15) {
      applyChordIndexDelta(1);
      startXRef.current = e.clientX;
    }
  }

  function handleVelocityPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchingRef.current) return;
    e.preventDefault();

    const nowMs = performance.now();
    const currentX = e.clientX;
    const deltaX = currentX - startXRef.current;
    const dtMs = Math.max(1, nowMs - lastMoveTimeRef.current);
    const velocityPxPerMs = Math.abs(deltaX) / dtMs;

    const containerWidth =
      visiblePlaybackContainerWidth ||
      containerRef.current?.clientWidth ||
      320;
    const basePixelsPerChord = getVelocityPixelsPerChord(containerWidth);
    const pixelsPerChord = getVelocityAdjustedPixelsPerChord(
      basePixelsPerChord,
      velocityPxPerMs,
    );

    // Signed accumulation: +fingerX (right) earns backward chord steps.
    // Reversing mid-gesture unwinds leftover distance instead of applying
    // the wrong direction to previously accumulated travel.
    accumulatedDistanceRef.current += deltaX;
    startXRef.current = currentX;
    lastMoveTimeRef.current = nowMs;

    let steps = 0;
    while (Math.abs(accumulatedDistanceRef.current) >= pixelsPerChord) {
      if (accumulatedDistanceRef.current > 0) {
        steps -= 1;
        accumulatedDistanceRef.current -= pixelsPerChord;
      } else {
        steps += 1;
        accumulatedDistanceRef.current += pixelsPerChord;
      }
    }

    if (steps !== 0) {
      applyChordIndexDelta(steps);
    }
  }

  function handleDiscretePointerEnd() {
    if (!isTouchingRef.current) return;
    isTouchingRef.current = false;
    accumulatedDistanceRef.current = 0;
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (scrubMode === "glide") {
      glideScrub.handlePointerDown(e);
      return;
    }

    handleLegacyOrVelocityPointerDown(e);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (scrubMode === "glide") {
      glideScrub.handlePointerMove(e);
      return;
    }

    if (scrubMode === "velocity") {
      handleVelocityPointerMove(e);
      return;
    }

    handleLegacyPointerMove(e);
  }

  function handlePointerEnd(e: PointerEvent<HTMLDivElement>) {
    if (scrubMode === "glide") {
      glideScrub.handlePointerEnd(e);
      return;
    }

    handleDiscretePointerEnd();
  }

  return (
    <div
      ref={containerRef}
      className={`baseFlex relative w-full touch-none overflow-hidden ${
        editingLoopRange
          ? "h-[283px] mobilePortrait:h-[296px]"
          : "h-[255px] mobilePortrait:h-[268px]"
      } ${countInTimer.showing ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={scrubMode === "glide" ? undefined : handlePointerEnd}
    >
      {/* Temporary high-z toggle for comparing scrub implementations */}
      <div
        className="baseVertFlex pointer-events-auto absolute right-2 top-2 z-[200] gap-1 rounded-md border border-white/20 bg-black/80 p-2 text-[11px] text-white shadow-lg backdrop-blur-sm"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <span className="font-semibold tracking-wide text-white/80">
          Scrub mode
        </span>
        <div className="baseFlex gap-1">
          {SCRUB_MODES.map((mode) => {
            const isActive = scrubMode === mode;
            return (
              <button
                key={mode}
                type="button"
                className={`rounded px-2 py-1 transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-white/90 hover:bg-white/20"
                }`}
                onClick={() => setScrubMode(mode)}
              >
                {PLAYBACK_SCRUB_MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

export default PlaybackScrollingContainer;
