import { AnimatePresence, motion } from "framer-motion";
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
}

function PinnedChordsCarousel({
  chords,
  showPinnedChords,
}: PinnedChordsCarouselProps) {
  return (
    <AnimatePresence mode="wait">
      {showPinnedChords && chords.length > 0 && (
        <motion.div
          key={"stickyPinnedChords"}
          initial={{
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          animate={{
            opacity: 1,
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
          }}
          exit={{
            opacity: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          transition={{ duration: 0.25 }}
          className="baseFlex sticky left-0 top-20 z-10 max-w-[calc(100%-1.75rem)] rounded-xl border bg-background shadow-xl"
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
