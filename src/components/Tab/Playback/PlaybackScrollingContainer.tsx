import {
  useRef,
  type Dispatch,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackScrollingContainerProps {
  children: ReactNode;
  setChordRepetitions: Dispatch<SetStateAction<number[]>>;
  scrollPositionsLength: number;
}

function PlaybackScrollingContainer({
  children,
  setChordRepetitions,
  scrollPositionsLength,
}: PlaybackScrollingContainerProps) {
  const {
    playing,
    pauseAudio,
    currentChordIndex,
    setCurrentChordIndex,
    expandedTabData,
    countInTimer,
  } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
    currentChordIndex: state.currentChordIndex,
    setCurrentChordIndex: state.setCurrentChordIndex,
    expandedTabData: state.expandedTabData,
    countInTimer: state.countInTimer,
  }));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const isTouchingRef = useRef(false);

  function incrementChordIndex() {
    if (expandedTabData === null) return;

    const newValue = currentChordIndex + 1;
    setCurrentChordIndex(newValue > expandedTabData.length - 1 ? 0 : newValue);
  }

  function decrementChordIndex() {
    if (expandedTabData === null) return;

    const newValue = currentChordIndex - 1;

    if (newValue < 0) return;

    setCurrentChordIndex(newValue < 0 ? expandedTabData.length - 1 : newValue);
  }

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
      decrementChordIndex(); // moving right -> chord index goes down

      // virtualization logic is set up to handle "forward" movement only, so we need to reset
      // whenever we move backwards to ensure the correct chords are rendered
      setChordRepetitions(new Array(scrollPositionsLength).fill(0));

      startXRef.current = e.clientX; // reset the start so you can scroll again
    } else if (deltaX < -15) {
      incrementChordIndex(); // moving left -> chord index goes up
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
      className={`relative h-[230px] w-full touch-none overflow-hidden mobilePortrait:h-[255px] ${countInTimer.showing ? "pointer-events-none" : "cursor-grab active:cursor-grabbing"}`}
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
