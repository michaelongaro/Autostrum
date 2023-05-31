import { useState, useEffect } from "react";

function useViewportWidthBreakpoint(width: number) {
  const [viewportLargerThanBreakpoint, setviewportLargerThanBreakpoint] =
    useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= width) {
        setviewportLargerThanBreakpoint(true);
      } else {
        setviewportLargerThanBreakpoint(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  return viewportLargerThanBreakpoint;
}

export default useViewportWidthBreakpoint;
