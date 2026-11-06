import { useEffect, type RefObject } from "react";
import { registerModalTouchGuard } from "~/utils/modalTouchGuard";

// Legacy, unscoped overlays opt out on iOS unless forced. Scoped overlays use
// gesture interception on every platform without changing the page's styles.
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const macTouch = ua.includes("Macintosh") && navigator.maxTouchPoints > 0;
  return iOS || macTouch;
}

function getNearestScrollable(el: Element | null): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const canScrollY =
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      el.scrollHeight > el.clientHeight;

    if (canScrollY) return el;
    el = el.parentElement;
  }

  return null;
}

function useModalScrollbarHandling(
  force = false,
  enabled = true,
  contentRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) return;
    const content = contentRef?.current;
    if (!content && !force && isIOS()) return;
    // Playback is a custom modal, not a Base UI Dialog. Give it the same
    // boundary-aware guard instead of pinning the body on iOS.
    const removeGuard = content ? registerModalTouchGuard(content) : undefined;

    const scrollKeys = new Set([
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
    ]);

    function onWheel(e: WheelEvent) {
      const scrollable = getNearestScrollable(e.target as Element | null);
      if (!scrollable) {
        e.preventDefault();
        return;
      }

      // Block scroll-chaining to the document when the inner scroller is at an edge.
      const delta = e.deltaY;
      const atTop = scrollable.scrollTop <= 0 && delta < 0;
      const atBottom =
        scrollable.scrollTop + scrollable.clientHeight >=
          scrollable.scrollHeight - 1 && delta > 0;

      if (atTop || atBottom) {
        e.preventDefault();
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!getNearestScrollable(e.target as Element | null)) {
        e.preventDefault();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!scrollKeys.has(e.key)) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (
        target.closest(
          "input, textarea, select, [contenteditable='true'], [role='listbox']",
        )
      ) {
        return;
      }

      // Keep Space activating focused buttons/links.
      if (e.key === " " && target.closest("button, [role='button'], a")) {
        return;
      }

      if (getNearestScrollable(target)) return;

      e.preventDefault();
    }

    if (!removeGuard) {
      document.addEventListener("wheel", onWheel, { passive: false });
      document.addEventListener("touchmove", onTouchMove, { passive: false });
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      removeGuard?.();
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [force, enabled, contentRef]);
}

export default useModalScrollbarHandling;
