import { useEffect } from "react";

// iOS browsers don't reliably honor overflow/event scroll locks, and the
// older position:fixed body pin triggers a full repaint / flicker. Skip
// scroll locking on iOS unless forced (e.g. PlaybackModal).
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const macTouch =
    /Macintosh/.test(ua) && typeof (window as any).ontouchend !== "undefined";
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

function useModalScrollbarHandling(force = false) {
  useEffect(() => {
    // FYI: This allows scrolling to occur while modal is open on iOS,
    // but I think the tradeoff is worth it to prevent the flicker.
    if (!force && isIOS()) return;

    // On iOS with force=true, event prevention is unreliable — fall back to
    // the classic body pin. Elsewhere, lock via wheel/touch/key prevention so
    // sticky header/AudioControls stay put and Framer layout="position" does
    // not remeasure from overflow/position mutations.
    if (force && isIOS()) {
      const offsetY = window.scrollY;
      document.body.style.top = `${-offsetY}px`;
      document.body.classList.add("noScroll");

      return () => {
        const top = document.body.style.top;
        const restoreY = Math.abs(parseInt(`${top || 0}`, 10)) || 0;
        document.body.classList.remove("noScroll");
        document.body.style.removeProperty("top");
        window.scrollTo(0, restoreY);
      };
    }

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

    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [force]);
}

export default useModalScrollbarHandling;
