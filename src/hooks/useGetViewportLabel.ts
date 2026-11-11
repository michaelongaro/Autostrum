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
        | "mobileNarrowLandscape"
        | "mobileLandscape"
        | "mobileLarge"
        | "lg"
        | "desktop" = "mobile";

      if (window.innerHeight < 400) {
        viewportLabel = "mobileNarrowLandscape";
      }

      if (window.innerHeight >= 400 && window.innerHeight < 500) {
        viewportLabel = "mobileLandscape";
      }

      // TODO: experiment with this
      if (window.innerHeight >= 667) {
        viewportLabel = "mobileLarge";
      }

      // 1024 to match tailwind's lg breakpoint
      if (window.innerWidth >= 1024) {
        viewportLabel = "lg";
      }

      if (window.innerWidth >= 1500 && window.innerHeight >= 800) {
        viewportLabel = "desktop";
      }

      setViewportLabel(viewportLabel);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [setViewportLabel]);
}

export default useGetViewportLabel;
