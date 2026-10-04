import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Distance between AudioControls and the viewport bottom while stuck, and
 * between AudioControls and the bottom of the Tab container at rest.
 */
export const AUDIO_CONTROLS_BOTTOM_OFFSET = "1rem";

/**
 * AudioControls may not travel above this distance from the top of the tab
 * data section (the block where TabSection and ChordSection render).
 */
export const AUDIO_CONTROLS_STICKY_CEILING_PX = 240;

interface AudioControlsStickyBoundsProps {
  tabDataSectionRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/**
 * Keeps AudioControls `bottom`-sticky within a range that starts
 * AUDIO_CONTROLS_STICKY_CEILING_PX below the tab data section and ends at the
 * bottom of the Tab. A spacer (not padding) extends the sticky containing
 * block upward; padding is outside the content box sticky can move through.
 * Negative margin pulls that block up without moving the controls' resting
 * place at the bottom of the tab.
 */
function AudioControlsStickyBounds({
  tabDataSectionRef,
  children,
}: AudioControlsStickyBoundsProps) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const [rise, setRise] = useState(0);

  useLayoutEffect(() => {
    const bounds = boundsRef.current;
    const tabDataSection = tabDataSectionRef.current;
    if (!bounds || !tabDataSection) return;

    const measure = () => {
      const appliedRise = -(parseFloat(bounds.style.marginTop) || 0);
      const naturalBoundsTop = bounds.getBoundingClientRect().top + appliedRise;
      const ceilingTop =
        tabDataSection.getBoundingClientRect().top +
        AUDIO_CONTROLS_STICKY_CEILING_PX;
      const nextRise = Math.max(0, Math.round(naturalBoundsTop - ceilingTop));

      if (Math.abs(nextRise - appliedRise) <= 1) return;
      setRise(nextRise);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(tabDataSection);
    const tabRoot = document.getElementById("mainTabComponent");
    if (tabRoot) observer.observe(tabRoot);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tabDataSectionRef]);

  return (
    <div
      ref={boundsRef}
      data-audio-controls-bounds=""
      className="pointer-events-none relative z-30 flex w-full flex-col items-center self-stretch"
      style={{
        marginTop: -rise,
        marginBottom: AUDIO_CONTROLS_BOTTOM_OFFSET,
      }}
    >
      <div aria-hidden className="w-full shrink-0" style={{ height: rise }} />
      {children}
    </div>
  );
}

export default AudioControlsStickyBounds;
