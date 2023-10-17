import { useLayoutEffect, useState } from "react";

function useViewportWidthBreakpoint(width: number) {
  const [viewportLargerThanBreakpoint, setViewportLargerThanBreakpoint] =
    useState(false);

  useLayoutEffect(() => {
    function handleResize() {
      if (window.innerWidth >= width) {
        setViewportLargerThanBreakpoint(true);
      } else {
        setViewportLargerThanBreakpoint(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  return viewportLargerThanBreakpoint;
}

export default useViewportWidthBreakpoint;
