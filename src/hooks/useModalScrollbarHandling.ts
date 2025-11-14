import { useEffect } from "react";

// iOS browsers trigger a full repaint when toggling body to fixed.
// Avoid scroll locking via body mutations on iOS to prevent flicker.
function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iP(ad|hone|od)/.test(ua);
  const macTouch =
    /Macintosh/.test(ua) && typeof (window as any).ontouchend !== "undefined";
  return iOS || macTouch;
}

function useModalScrollbarHandling() {
  useEffect(() => {
    // FYI: This allows scrolling to occur while modal is open on iOS,
    // but I think the tradeoff is worth it to prevent the flicker.
    if (isIOS()) return;

    // lock
    const offsetY = window.scrollY;
    document.body.style.top = `${-offsetY}px`;
    document.body.classList.add("noScroll");

    return () => {
      // unlock
      const top = document.body.style.top;
      const restoreY = Math.abs(parseInt(`${top || 0}`, 10)) || 0;
      document.body.classList.remove("noScroll");
      document.body.style.removeProperty("top");
      window.scrollTo(0, restoreY);
    };
  }, []);
}

export default useModalScrollbarHandling;
