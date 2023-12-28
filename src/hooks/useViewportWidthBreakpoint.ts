import { useEffect, useLayoutEffect, useState } from "react";

function useViewportWidthBreakpoint(width: number) {
  const [viewportLargerThanBreakpoint, setViewportLargerThanBreakpoint] =
    useState(false);

  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
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
