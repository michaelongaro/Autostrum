import {
  type Dispatch,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
  useRef,
} from "react";
import { useTabStore } from "~/stores/TabStore";

interface PlaybackScrollingContainer {
  children: ReactNode;
  setIsManuallyScrolling: Dispatch<SetStateAction<boolean>>;
}

function PlaybackScrollingContainer({
  children,
  setIsManuallyScrolling,
}: PlaybackScrollingContainer) {
  const { playing, pauseAudio } = useTabStore((state) => ({
    playing: state.audioMetadata.playing,
    pauseAudio: state.pauseAudio,
  }));

  // Refs to store mutable variables without causing re-renders
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef(0);
  const startTranslateXRef = useRef(0);
  const isTouchingRef = useRef(false);

  function handlePointerStart(e: PointerEvent<HTMLDivElement>) {
    if (playing) pauseAudio();

    isTouchingRef.current = true;

    setIsManuallyScrolling(true);

    startXRef.current = e.clientX;
    startTranslateXRef.current = translateX;
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!isTouchingRef.current) return;

    e.preventDefault();

    if (overrideNewTranslateXRef.current !== null) {
      startXRef.current = e.clientX;
      startTranslateXRef.current = overrideNewTranslateXRef.current;
      overrideNewTranslateXRef.current = null;
    }

    const currentX = e.clientX;
    const scrollScalingFactor = 1.5; // Easier to scroll farther distances
    const deltaX = (currentX - startXRef.current) * scrollScalingFactor;
    let newTranslateX = startTranslateXRef.current - deltaX;

    newTranslateX = Math.max(0, newTranslateX);
    setTranslateX(newTranslateX);
  }

  function handlePointerEnd() {
    if (!isTouchingRef.current) return;
    isTouchingRef.current = false;

    setIsManuallyScrolling(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[230px] w-full cursor-grab touch-none overflow-hidden active:cursor-grabbing mobilePortrait:h-[255px]"
      onPointerDown={handlePointerStart}
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
