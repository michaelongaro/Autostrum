import { useEffect } from "react";

// Real iOS / iPadOS only. Desktop Chrome on Mac defines `window.ontouchend`
// as null, so `typeof ontouchend !== "undefined"` is a false positive that
// previously skipped scroll locking entirely on macOS.
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const iPadOSDesktopUa =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return iOS || iPadOSDesktopUa;
}

function useModalScrollbarHandling(force = false) {
  useEffect(() => {
    // FYI: This allows scrolling to occur while modal is open on iOS,
    // but I think the tradeoff is worth it to prevent the flicker.
    if (!force && isIOS()) return;

    // On iOS with force=true, overflow:hidden is unreliable — fall back to
    // the classic body pin.
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

    // Hard lock via overflow:hidden on <html>. scrollbar-gutter:stable is
    // already set globally, so Framer layout="position" width stays stable.
    // Sticky chrome is re-pinned to position:fixed via CSS while locked.
    const lockedY = window.scrollY;
    document.documentElement.classList.add("modalScrollLock");

    // Belt-and-suspenders: some engines still move the viewport on trackpad
    // gestures over fixed overlays even with overflow:hidden.
    function freezeScroll() {
      if (window.scrollY !== lockedY) {
        window.scrollTo(0, lockedY);
      }
    }

    window.addEventListener("scroll", freezeScroll);

    return () => {
      window.removeEventListener("scroll", freezeScroll);
      document.documentElement.classList.remove("modalScrollLock");
      window.scrollTo(0, lockedY);
    };
  }, [force]);
}

export default useModalScrollbarHandling;
