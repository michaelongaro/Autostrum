import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ChordName from "~/components/ui/ChordName";
import type { Chord } from "~/stores/TabStore";

interface PinnedChordsCarouselProps {
  chords: Chord[];
  showPinnedChords: boolean;
  /** When true, sticky positioning is handled by a parent sticky stack. */
  nestedInStickyStack?: boolean;
}

function PinnedChordsCarousel({
  chords,
  showPinnedChords,
  nestedInStickyStack = false,
}: PinnedChordsCarouselProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {showPinnedChords && chords.length > 0 && (
        <motion.div
          id="stickyPinnedChords"
          key={"stickyPinnedChords"}
          initial={{
            height: 0,
            // The standalone bar is a direct child of the tab's gap-4 flex
            // container. Collapse that gap too, so mounting/unmounting has no jump.
            marginBottom: nestedInStickyStack ? 0 : "-1rem",
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
          }}
          animate={{
            height: "auto",
            marginBottom: 0,
            opacity: 1,
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            borderTopWidth: 1,
            borderBottomWidth: 1,
          }}
          exit={{
            height: 0,
            marginBottom: nestedInStickyStack ? 0 : "-1rem",
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
          className={`baseFlex max-w-[calc(100%-1.75rem)] overflow-hidden rounded-xl border bg-background px-2 shadow-xl sm:px-8 ${
            nestedInStickyStack ? "relative z-10" : "sticky left-0 top-20 z-10"
          }`}
        >
          <Carousel
            opts={{
              dragFree: true,
              align: "start",
            }}
            className="baseFlex max-w-[100%]"
          >
            <CarouselContent>
              {chords.map((chord) => (
                <CarouselItem
                  key={chord.id}
                  className="baseVertFlex basis-[96px] gap-2 text-foreground md:basis-[134px]"
                >
                  <ChordName
                    name={chord.name}
                    color={chord.color}
                    truncate={false}
                    showFullName={true}
                  />

                  <div className="h-[80px] tablet:h-[118px]">
                    <ChordDiagram originalFrets={chord.frets} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PinnedChordsCarousel;
