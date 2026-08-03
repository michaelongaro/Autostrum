import { useEffect } from "react";

// iOS browsers don't reliably honor overflow:hidden scroll locks, and the
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

function useModalScrollbarHandling(force = false) {
  useEffect(() => {
    // FYI: This allows scrolling to occur while modal is open on iOS,
    // but I think the tradeoff is worth it to prevent the flicker.
    if (!force && isIOS()) return;

    // On iOS with force=true, overflow:hidden is unreliable — fall back to
    // the classic body pin. Elsewhere, overflow:hidden + permanent
    // scrollbar-gutter: stable avoids Framer layout="position" shifts.
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

    document.documentElement.classList.add("modalScrollLock");

    return () => {
      document.documentElement.classList.remove("modalScrollLock");
    };
  }, [force]);
}

export default useModalScrollbarHandling;
