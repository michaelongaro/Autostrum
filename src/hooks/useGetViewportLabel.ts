import { useEffect, useLayoutEffect } from "react";
import { useTabStore } from "~/stores/TabStore";

function useGetViewportLabel() {
  const { setViewportLabel } = useTabStore((state) => ({
    setViewportLabel: state.setViewportLabel,
  }));

  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    function handleResize() {
      let viewportLabel:
        | "mobile"
        | "mobileLandscape"
        | "mobileLarge"
        | "tablet"
        | "desktop" = "mobile";

      if (window.innerHeight < 500) {
        viewportLabel = "mobileLandscape";
      }

      // TODO: experiment with this
      if (window.innerHeight >= 667) {
        viewportLabel = "mobileLarge";
      }

      // 1024 to match tailwind's lg breakpoint
      if (window.innerWidth >= 1024 && window.innerHeight >= 700) {
        viewportLabel = "tablet";
      }

      if (window.innerWidth >= 1500 && window.innerHeight >= 800) {
        viewportLabel = "desktop";
      }

      setViewportLabel(viewportLabel);
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [setViewportLabel]);
}

export default useGetViewportLabel;
