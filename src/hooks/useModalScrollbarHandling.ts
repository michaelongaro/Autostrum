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

function eventElement(target: EventTarget | null): Element | null {
  if (!target) return null;
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isScrollableOverflow(overflow: string) {
  return overflow === "auto" || overflow === "scroll" || overflow === "overlay";
}

function getNearestScrollable(
  el: Element | null,
  axis: "x" | "y",
): Element | null {
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);

    if (axis === "y") {
      const canScrollY =
        isScrollableOverflow(style.overflowY) &&
        el.scrollHeight > el.clientHeight + 1;
      if (canScrollY) return el;
    } else {
      const canScrollX =
        isScrollableOverflow(style.overflowX) &&
        el.scrollWidth > el.clientWidth + 1;
      if (canScrollX) return el;
    }

    el = el.parentElement;
  }

  return null;
}

function normalizeWheelDelta(delta: number, deltaMode: number) {
  // DOM_DELTA_LINE = 1, DOM_DELTA_PAGE = 2
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * window.innerHeight;
  return delta;
}

function canScrollInDirection(
  scrollable: Element,
  axis: "x" | "y",
  delta: number,
) {
  if (delta === 0) return false;

  if (axis === "y") {
    if (delta < 0) return scrollable.scrollTop > 0;
    return (
      scrollable.scrollTop + scrollable.clientHeight <
      scrollable.scrollHeight - 1
    );
  }

  if (delta < 0) return scrollable.scrollLeft > 0;
  return (
    scrollable.scrollLeft + scrollable.clientWidth < scrollable.scrollWidth - 1
  );
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

    let lastTouchY: number | null = null;

    function onWheel(e: WheelEvent) {
      // Always preventDefault so the document cannot scroll. Letting the
      // browser handle wheel over fixed-overlay descendants (especially
      // OverlayScrollbars viewports) can still move the page; apply the
      // delta to the nearest inner scroller ourselves instead.
      e.preventDefault();

      const target = eventElement(e.target);
      const deltaY = normalizeWheelDelta(e.deltaY, e.deltaMode);
      const deltaX = normalizeWheelDelta(e.deltaX, e.deltaMode);

      if (deltaY !== 0) {
        // Shift+wheel commonly maps to horizontal scrolling.
        if (e.shiftKey) {
          const scrollableX = getNearestScrollable(target, "x");
          if (scrollableX) scrollableX.scrollLeft += deltaY;
        } else {
          const scrollableY = getNearestScrollable(target, "y");
          if (scrollableY) scrollableY.scrollTop += deltaY;
        }
      }

      if (deltaX !== 0) {
        const scrollableX = getNearestScrollable(target, "x");
        if (scrollableX) scrollableX.scrollLeft += deltaX;
      }
    }

    function onTouchStart(e: TouchEvent) {
      lastTouchY = e.touches[0]?.clientY ?? null;
    }

    function onTouchMove(e: TouchEvent) {
      const currentY = e.touches[0]?.clientY;
      if (currentY == null || lastTouchY == null) {
        e.preventDefault();
        return;
      }

      // positive delta = finger moved up = content scrolls down
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;

      const scrollable = getNearestScrollable(eventElement(e.target), "y");
      if (!scrollable || !canScrollInDirection(scrollable, "y", deltaY)) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      lastTouchY = null;
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

      // Always block document scrolling from keys while the modal is open.
      e.preventDefault();

      const scrollable = getNearestScrollable(target, "y");
      if (!scrollable) return;

      const page = Math.max(scrollable.clientHeight * 0.9, 1);
      switch (e.key) {
        case "ArrowUp":
          scrollable.scrollTop -= 40;
          break;
        case "ArrowDown":
        case " ":
          scrollable.scrollTop += 40;
          break;
        case "PageUp":
          scrollable.scrollTop -= page;
          break;
        case "PageDown":
          scrollable.scrollTop += page;
          break;
        case "Home":
          scrollable.scrollTop = 0;
          break;
        case "End":
          scrollable.scrollTop = scrollable.scrollHeight;
          break;
      }
    }

    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [force]);
}

export default useModalScrollbarHandling;
