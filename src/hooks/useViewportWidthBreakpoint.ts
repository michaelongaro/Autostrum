import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import { useState } from "react";

function useViewportWidthBreakpoint(width: number) {
  const [viewportLargerThanBreakpoint, setViewportLargerThanBreakpoint] =
    useState(false);

  useIsomorphicLayoutEffect(() => {
    function handleResize() {
      setViewportLargerThanBreakpoint(window.innerWidth >= width);
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  return viewportLargerThanBreakpoint;
}

export default useViewportWidthBreakpoint;
