import {
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackScrollingContainerProps {
  children: ReactNode;
  canWrapBackward: boolean;
  stepPlaybackChord: (direction: 1 | -1) => void;
}

// TODO: still want to avoid "translateX" reliance at all costs, but this approach is inherently
// glitchy when scrolling fast because you can easily interrupt an in-progress scroll transition.

function PlaybackScrollingContainer({
  children,
  canWrapBackward,
  stepPlaybackChord,
}: PlaybackScrollingContainerProps) {
  const { playing, pauseAudio, currentChordIndex } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
    currentChordIndex: state.currentChordIndex,
  }));

  // We only need to track the horizontal start position and whether the user is touching.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const isTouchingRef = useRef(false);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (playing) pauseAudio();

    isTouchingRef.current = true;
    startXRef.current = e.clientX;
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchingRef.current) return;
    e.preventDefault();

    // Determine how far user has scrolled horizontally
    const currentX = e.clientX;
    const deltaX = currentX - startXRef.current;

    // If we've passed a 15px threshold to the left or right, increment or decrement
    if (deltaX > 15) {
      if (currentChordIndex === 0 && !canWrapBackward) {
        startXRef.current = e.clientX;
        return;
      }
      stepPlaybackChord(-1); // moving right -> chord index goes down
      startXRef.current = e.clientX; // reset the start so you can scroll again
    } else if (deltaX < -15) {
      stepPlaybackChord(1); // moving left -> chord index goes up
      startXRef.current = e.clientX; // reset the start
    }
  }

  function handlePointerEnd() {
    if (!isTouchingRef.current) return;
    isTouchingRef.current = false;
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[230px] w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing mobilePortrait:h-[255px]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
    >
      {children}
    </div>
  );
}

export default PlaybackScrollingContainer;
