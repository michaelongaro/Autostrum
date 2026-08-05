import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import { Button } from "~/components/ui/button";
import { scroller } from "react-scroll";
import { cn } from "~/utils/cn";
import { useSectionIds, useSectionTitles } from "~/hooks/useTabDataSelectors";

export const STICKY_HEADER_HEIGHT_PX = 64;
/** Approximate nav bar height for scroll-margin fallbacks; live height is measured from the DOM. */
export const SECTION_NAV_HEIGHT_PX = 36;

interface PinnedSectionNavigation {
  /** Extra sticky offset below this bar (e.g. pinned chords) used for scroll targeting. */
  getAdditionalStickyOffset?: () => number;
  showPinnedChordsBar: boolean;
}

function PinnedSectionNavigation({
  getAdditionalStickyOffset,
  showPinnedChordsBar,
}: PinnedSectionNavigation) {
  // Fetch light primitives from the store so parents (esp. Tab) never need tabData.
  const sectionIds = useSectionIds();
  const sectionTitles = useSectionTitles();
  const sectionCount = sectionIds.length;

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [carouselOverflows, setCarouselOverflows] = useState(false);
  const ignoreScrollSpyUntilRef = useRef(0);
  const activeSectionIndexRef = useRef(0);
  const previousCarouselApiRef = useRef<CarouselApi>(undefined);

  useEffect(() => {
    activeSectionIndexRef.current = activeSectionIndex;
  }, [activeSectionIndex]);

  useEffect(() => {
    if (!carouselApi) return;

    function updateOverflowState() {
      setCarouselOverflows(
        Boolean(
          carouselApi &&
          (carouselApi.canScrollPrev() || carouselApi.canScrollNext()),
        ),
      );
    }

    updateOverflowState();
    carouselApi.on("reInit", updateOverflowState);
    carouselApi.on("select", updateOverflowState);
    carouselApi.on("resize", updateOverflowState);

    return () => {
      carouselApi.off("reInit", updateOverflowState);
      carouselApi.off("select", updateOverflowState);
      carouselApi.off("resize", updateOverflowState);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (sectionCount < 2) return;

    function updateActiveSection() {
      if (Date.now() < ignoreScrollSpyUntilRef.current) return;

      const sectionNav = document.getElementById("pinnedSectionNavigation");
      const sectionNavHeight =
        sectionNav?.getBoundingClientRect().height ?? SECTION_NAV_HEIGHT_PX;
      const stickyBottom =
        STICKY_HEADER_HEIGHT_PX +
        sectionNavHeight +
        (getAdditionalStickyOffset?.() ?? 0);

      // Activate a section once its top reaches ~35% into the reading area
      // below sticky chrome — avoids flipping on a mere sliver at the top.
      const readingHeight = Math.max(0, window.innerHeight - stickyBottom);
      const focusY = stickyBottom + readingHeight * 0.35;

      let nextActiveIndex = 0;
      for (let i = 0; i < sectionCount; i++) {
        const element = document.getElementById(`sectionIndex${i}`);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= focusY) {
          nextActiveIndex = i;
        }
      }

      if (nextActiveIndex !== activeSectionIndexRef.current) {
        setActiveSectionIndex(nextActiveIndex);
      }
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sectionCount, getAdditionalStickyOffset]);

  useEffect(() => {
    if (!carouselApi) {
      previousCarouselApiRef.current = undefined;
      return;
    }

    const isNewApiInstance = previousCarouselApiRef.current !== carouselApi;
    previousCarouselApiRef.current = carouselApi;

    // Jump instantly on mount/re-init (e.g. after drawer closes); animate otherwise.
    carouselApi.scrollTo(activeSectionIndex, isNewApiInstance);
  }, [carouselApi, activeSectionIndex]);

  function scrollToSection(sectionIndex: number) {
    const element = document.getElementById(`sectionIndex${sectionIndex}`);
    if (!element) return;

    const sectionNav = document.getElementById("pinnedSectionNavigation");
    const sectionNavHeight =
      sectionNav?.getBoundingClientRect().height ?? SECTION_NAV_HEIGHT_PX;
    const offset =
      STICKY_HEADER_HEIGHT_PX +
      sectionNavHeight +
      (getAdditionalStickyOffset?.() ?? 0) +
      8;

    ignoreScrollSpyUntilRef.current = Date.now() + 600;
    setActiveSectionIndex(sectionIndex);
    carouselApi?.scrollTo(sectionIndex);

    scroller.scrollTo(element.id, {
      duration: 450,
      delay: 0,
      smooth: "easeInOutQuad",
      offset: -offset,
    });
  }

  if (sectionCount < 2) return null;

  return (
    <div
      id="pinnedSectionNavigation"
      className={`w-full border-b bg-background tablet:border-b-0 ${showPinnedChordsBar ? "mb-1 tablet:mb-0" : ""}`}
    >
      <Carousel
        setApi={setCarouselApi}
        opts={{
          dragFree: true,
          align: "start",

          watchDrag: (api) => api.canScrollPrev() || api.canScrollNext(),
        }}
        className="baseFlex w-full"
      >
        <CarouselContent className="-ml-1 px-2 py-1 md:-ml-2 md:px-4">
          {sectionIds.map((sectionId, index) => {
            const isActive = index === activeSectionIndex;

            return (
              <CarouselItem
                key={sectionId}
                className={cn(
                  "basis-auto pl-1 md:pl-2",
                  carouselOverflows
                    ? "cursor-grab active:cursor-grabbing"
                    : "!cursor-default active:!cursor-default",
                )}
              >
                <Button
                  variant="text"
                  onClick={() => scrollToSection(index)}
                  className={cn(
                    "relative !h-auto text-nowrap !px-1.5 !pb-2 !pt-1.5 font-medium leading-none",
                    isActive ? "" : "opacity-50 hover:opacity-100",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  {sectionTitles[index] || `Section ${index + 1}`}
                  {isActive && (
                    <motion.span
                      layoutId="pinnedSectionNavigationUnderline"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                      className="absolute bottom-0.5 left-1.5 right-1.5 z-0 h-[2px] rounded-full bg-foreground"
                    />
                  )}
                </Button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export default PinnedSectionNavigation;
