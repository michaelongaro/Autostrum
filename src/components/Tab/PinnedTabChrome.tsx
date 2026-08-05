import { useCallback } from "react";
import PinnedChordsCarousel from "~/components/Tab/PinnedChordsCarousel";
import PinnedSectionNavigation, {
  SECTION_NAV_HEIGHT_PX,
  STICKY_HEADER_HEIGHT_PX,
} from "~/components/Tab/PinnedSectionNavigation";
import type { Chord } from "~/stores/TabStore";

interface PinnedTabChromeProps {
  showSectionNavigation: boolean;
  chords: Chord[];
  showPinnedChords: boolean;
}

export function getSectionScrollMarginTop({
  showSectionNavigation,
  showPinnedChordsBar,
}: {
  showSectionNavigation: boolean;
  showPinnedChordsBar: boolean;
}) {
  return (
    STICKY_HEADER_HEIGHT_PX +
    (showSectionNavigation ? SECTION_NAV_HEIGHT_PX : 0) +
    (showSectionNavigation && showPinnedChordsBar ? 140 : 0) +
    8
  );
}

/**
 * Sticky stack for section navigation + optional pinned chords.
 * Shared by StaticTab and Tab's viewing/preview path.
 */
function PinnedTabChrome({
  showSectionNavigation,
  chords,
  showPinnedChords,
}: PinnedTabChromeProps) {
  const showPinnedChordsBar = showPinnedChords && chords.length > 0;

  const getPinnedChordsStickyOffset = useCallback(() => {
    if (!showPinnedChordsBar) return 0;
    const pinnedChords = document.getElementById("stickyPinnedChords");
    return pinnedChords?.getBoundingClientRect().height ?? 0;
  }, [showPinnedChordsBar]);

  if (!showSectionNavigation) {
    return (
      <PinnedChordsCarousel
        chords={chords}
        showPinnedChords={showPinnedChords}
      />
    );
  }

  return (
    <div className="baseVertFlex sticky top-16 z-20 w-full !justify-start">
      <PinnedSectionNavigation
        getAdditionalStickyOffset={getPinnedChordsStickyOffset}
        showPinnedChordsBar={showPinnedChordsBar}
      />

      <PinnedChordsCarousel
        chords={chords}
        showPinnedChords={showPinnedChords}
        nestedInStickyStack
      />
    </div>
  );
}

export default PinnedTabChrome;
