import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "~/components/ui/carousel";
import { Button } from "~/components/ui/button";
import type { Section } from "~/stores/TabStore";
import { scroller } from "react-scroll";

export const STICKY_HEADER_HEIGHT_PX = 64;
export const SECTION_NAV_HEIGHT_PX = 48;

interface PinnedSectionNavigationProps {
  sections: Section[];
  show: boolean;
  /** Extra sticky offset below this bar (e.g. pinned chords) used for scroll targeting. */
  getAdditionalStickyOffset?: () => number;
}

function PinnedSectionNavigation({
  sections,
  show,
  getAdditionalStickyOffset,
}: PinnedSectionNavigationProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const ignoreScrollSpyUntilRef = useRef(0);
  const activeSectionIndexRef = useRef(0);

  useEffect(() => {
    activeSectionIndexRef.current = activeSectionIndex;
  }, [activeSectionIndex]);

  useEffect(() => {
    if (!show || sections.length < 2) return;

    function updateActiveSection() {
      if (Date.now() < ignoreScrollSpyUntilRef.current) return;

      const sectionNav = document.getElementById("pinnedSectionNavigation");
      const sectionNavHeight =
        sectionNav?.getBoundingClientRect().height ?? SECTION_NAV_HEIGHT_PX;
      const offset =
        STICKY_HEADER_HEIGHT_PX +
        sectionNavHeight +
        (getAdditionalStickyOffset?.() ?? 0) +
        8;

      let nextActiveIndex = 0;
      for (let i = 0; i < sections.length; i++) {
        const element = document.getElementById(`sectionIndex${i}`);
        if (!element) continue;
        if (element.getBoundingClientRect().top <= offset) {
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
  }, [show, sections.length, getAdditionalStickyOffset]);

  useEffect(() => {
    if (!carouselApi || !show) return;
    carouselApi.scrollTo(activeSectionIndex);
  }, [carouselApi, activeSectionIndex, show]);

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

  return (
    <AnimatePresence mode="wait">
      {show && sections.length >= 2 && (
        <motion.div
          id="pinnedSectionNavigation"
          key="stickyPinnedSectionNavigation"
          initial={{
            opacity: 0,
            height: 0,
          }}
          animate={{
            opacity: 1,
            height: SECTION_NAV_HEIGHT_PX,
          }}
          exit={{
            opacity: 0,
            height: 0,
          }}
          transition={{ duration: 0.25 }}
          className="sticky top-16 z-20 w-full overflow-hidden border-b bg-background shadow-sm"
        >
          <Carousel
            setApi={setCarouselApi}
            opts={{
              dragFree: true,
              align: "start",
            }}
            className="h-full w-full"
          >
            <CarouselContent className="-ml-2 h-full px-2 md:-ml-3 md:px-4">
              {sections.map((section, index) => {
                const isActive = index === activeSectionIndex;

                return (
                  <CarouselItem
                    key={section.id}
                    className="baseFlex h-full basis-auto pl-2 md:pl-3"
                  >
                    <Button
                      variant="text"
                      onClick={() => scrollToSection(index)}
                      className={`relative h-full text-nowrap !px-1 font-medium ${
                        isActive ? "" : "opacity-50 hover:opacity-100"
                      }`}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {section.title || `Section ${index + 1}`}
                      {isActive && (
                        <motion.span
                          layoutId="pinnedSectionNavigationUnderline"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.6,
                          }}
                          className="absolute bottom-1 left-0 z-0 h-[2px] w-full rounded-full bg-foreground"
                        />
                      )}
                    </Button>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PinnedSectionNavigation;
