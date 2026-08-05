import { useEffect, useState } from "react";
import useGetLocalStorageValues from "~/hooks/useGetLocalStorageValues";

interface UseSectionNavigationVisibilityArgs {
  sectionCount: number;
  drawerOpen: boolean;
  showPlaybackModal: boolean;
  /** Reset the tall-enough latch when this identity changes (e.g. tab id). */
  resetKey: string | number;
  showPinnedChords: boolean;
  /** When false, always hide (e.g. Tab editing mode). */
  enabled?: boolean;
}

/**
 * Shared visibility gate for pinned section navigation used by StaticTab and Tab.
 * Latches once the page is tall enough so virtualized content can unlock the nav.
 */
function useSectionNavigationVisibility({
  sectionCount,
  drawerOpen,
  showPlaybackModal,
  resetKey,
  showPinnedChords,
  enabled = true,
}: UseSectionNavigationVisibilityArgs) {
  const { pinSectionNavigation, zoom } = useGetLocalStorageValues();
  const [pageTallEnoughForSectionNav, setPageTallEnoughForSectionNav] =
    useState(false);

  useEffect(() => {
    setPageTallEnoughForSectionNav(false);
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;

    function checkPageHeight() {
      // Vaul briefly alters layout metrics while open; skip so the section nav
      // does not unmount from a transient short scrollHeight.
      if (drawerOpen) return;

      const tallEnough =
        document.documentElement.scrollHeight >= window.innerHeight * 3;

      // Latch true once content is tall enough. Virtualized sections grow the
      // page after mount; observing documentElement alone misses scrollHeight
      // changes, so we also recheck on scroll and body/main resize.
      if (tallEnough) {
        setPageTallEnoughForSectionNav(true);
      }
    }

    checkPageHeight();
    window.addEventListener("resize", checkPageHeight);
    window.addEventListener("scroll", checkPageHeight, { passive: true });

    const resizeObserver = new ResizeObserver(checkPageHeight);
    resizeObserver.observe(document.body);
    const mainTab = document.getElementById("mainTabComponent");
    if (mainTab) resizeObserver.observe(mainTab);

    return () => {
      window.removeEventListener("resize", checkPageHeight);
      window.removeEventListener("scroll", checkPageHeight);
      resizeObserver.disconnect();
    };
  }, [
    enabled,
    sectionCount,
    zoom,
    showPinnedChords,
    pinSectionNavigation,
    drawerOpen,
    resetKey,
  ]);

  return (
    enabled &&
    pinSectionNavigation &&
    sectionCount >= 2 &&
    pageTallEnoughForSectionNav &&
    !showPlaybackModal
  );
}

export default useSectionNavigationVisibility;
