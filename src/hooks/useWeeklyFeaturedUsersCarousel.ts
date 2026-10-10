import { useEffect, useRef, useState } from "react";
import type { CarouselApi } from "~/components/ui/carousel";

const AUTO_ROTATION_INTERVAL = 10_000;
const INDICATOR_WIDTH = 12;
const ACTIVE_INDICATOR_WIDTH = 36;

function useWeeklyFeaturedUsersCarousel(usersKey: string) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const progressBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!carouselApi || !container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseReasons = new Set<string>();
    let animation: Animation | null = null;

    function setPaused(reason: string, paused: boolean) {
      if (paused) pauseReasons.add(reason);
      else pauseReasons.delete(reason);

      if (!animation) return;
      if (pauseReasons.size > 0) animation.pause();
      else if (animation.playState === "paused") animation.play();
    }

    function cancelAnimation() {
      if (!animation) return;
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    }

    function updateIndicators() {
      if (!carouselApi) return;

      const snaps = carouselApi.scrollSnapList();
      const looping = carouselApi.internalEngine().options.loop;
      const rawProgress = carouselApi.scrollProgress();
      const progress = looping
        ? ((rawProgress % 1) + 1) % 1
        : Math.max(0, Math.min(rawProgress, 1));

      snaps.forEach((snap, index) => {
        let distance = progress - snap;
        if (looping) {
          if (distance > 0.5) distance -= 1;
          if (distance < -0.5) distance += 1;
        }

        const previousSnap =
          snaps[index - 1] ?? (looping ? snaps[snaps.length - 1]! - 1 : snap);
        const nextSnap = snaps[index + 1] ?? (looping ? snaps[0]! + 1 : snap);
        const spacing = distance < 0 ? snap - previousSnap : nextSnap - snap;
        const weight =
          Math.abs(distance) < 0.001
            ? 1
            : spacing > 0
              ? Math.max(0, 1 - Math.abs(distance) / spacing)
              : 0;

        const indicator = indicatorRefs.current[index];
        const progressBar = progressBarRefs.current[index];
        if (indicator) {
          indicator.style.width = `${INDICATOR_WIDTH + weight * (ACTIVE_INDICATOR_WIDTH - INDICATOR_WIDTH)}px`;
        }
        if (progressBar) progressBar.style.opacity = String(weight);
      });
    }

    function resetTimer() {
      if (!carouselApi) return;

      cancelAnimation();
      const index = carouselApi.selectedScrollSnap();
      setSelectedIndex(index);
      updateIndicators();

      const progressBar = progressBarRefs.current[index];
      const snapCount = carouselApi.scrollSnapList().length;
      if (!progressBar || snapCount < 2) return;

      // The animation is also the timer, so the fill and rotation cannot drift.
      // Pausing preserves currentTime without React updates on every frame.
      animation = progressBar.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        {
          duration: AUTO_ROTATION_INTERVAL,
          easing: "linear",
          fill: "forwards",
        },
      );
      animation.onfinish = () => {
        // scrollTo also wraps when Embla cannot loop a short list of users.
        carouselApi.scrollTo(
          (carouselApi.selectedScrollSnap() + 1) % snapCount,
        );
      };
      if (pauseReasons.size > 0) animation.pause();
    }

    function handleScroll() {
      setPaused("scroll", true);
      updateIndicators();
    }

    function handleSettle() {
      updateIndicators();
      setPaused("scroll", false);
    }

    function handleReInit() {
      setPaused("drag", false);
      setPaused("scroll", false);
      resetTimer();
    }

    const handlePointerDown = () => setPaused("drag", true);
    const handlePointerUp = () => setPaused("drag", false);
    const handleMouseEnter = () => setPaused("hover", true);
    const handleMouseLeave = () => setPaused("hover", false);
    const handleFocusIn = () => setPaused("focus", true);
    const handleFocusOut = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !container?.contains(event.relatedTarget)
      ) {
        setPaused("focus", false);
      }
    };
    const handleWindowFocus = () => setPaused("window", !document.hasFocus());
    const handleVisibility = () => setPaused("hidden", document.hidden);
    const handleReducedMotion = () =>
      setPaused("reduced-motion", reducedMotion.matches);

    handleWindowFocus();
    handleVisibility();
    handleReducedMotion();
    setPaused("hover", container.matches(":hover"));
    setPaused("focus", container.contains(document.activeElement));
    resetTimer();

    // Keyboard focus can select instantly, without a subsequent settle event.
    // Only actual scroll events should add the scroll pause reason.
    carouselApi.on("select", resetTimer);
    carouselApi.on("scroll", handleScroll);
    carouselApi.on("settle", handleSettle);
    carouselApi.on("reInit", handleReInit);
    carouselApi.on("pointerDown", handlePointerDown);
    carouselApi.on("pointerUp", handlePointerUp);
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("focusin", handleFocusIn);
    container.addEventListener("focusout", handleFocusOut);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);

    return () => {
      cancelAnimation();
      carouselApi.off("select", resetTimer);
      carouselApi.off("scroll", handleScroll);
      carouselApi.off("settle", handleSettle);
      carouselApi.off("reInit", handleReInit);
      carouselApi.off("pointerDown", handlePointerDown);
      carouselApi.off("pointerUp", handlePointerUp);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("focusin", handleFocusIn);
      container.removeEventListener("focusout", handleFocusOut);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
    };
  }, [carouselApi, usersKey]);

  return {
    carouselApi,
    setCarouselApi,
    selectedIndex,
    containerRef,
    indicatorRefs,
    progressBarRefs,
  };
}

export default useWeeklyFeaturedUsersCarousel;
