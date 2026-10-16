import type { RefObject } from "react";
import { IoIosArrowUp } from "react-icons/io";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ChordTrainerPatternVisualizer from "~/components/tools/ChordTrainerPatternVisualizer";
import {
  CHORD_ITEM_GAP,
  CHORD_ITEM_WIDTH,
  type ChordTrainerQueueItem,
} from "~/utils/chordTrainerQueue";

interface ChordTrainerVisualizerProps {
  stageRef: RefObject<HTMLDivElement | null>;
  sliderContainerRef: RefObject<HTMLDivElement | null>;
  queue: ChordTrainerQueueItem[];
  currentItemIndex: number;
  patternLength: number;
  showColorCoding: boolean;
  showStrumIcons: boolean;
}

function ChordTrainerStreamVisualizer({
  stageRef,
  sliderContainerRef,
  queue,
  showColorCoding,
}: Pick<
  ChordTrainerVisualizerProps,
  "stageRef" | "sliderContainerRef" | "queue" | "showColorCoding"
>) {
  return (
    <div
      className="relative h-[260px] w-full overflow-hidden bg-background/70 shadow-inner xs:h-[260px]"
      ref={stageRef}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-background via-background/90 to-transparent xs:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-background via-background/90 to-transparent xs:w-24" />
      <div className="bg-primary/12 pointer-events-none absolute left-1/2 top-1/2 z-10 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl xs:h-[220px] xs:w-[240px]" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-lg font-semibold leading-none text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)]"
      >
        <IoIosArrowUp />
      </span>

      <div
        id="chord-trainer-slider"
        ref={sliderContainerRef}
        className="absolute inset-y-0 left-0 flex items-center will-change-transform"
        style={{ transform: "translate3d(0px, 0, 0)" }}
      >
        {queue.map((item) => (
          <div
            key={item.instanceId}
            className="baseVertFlex relative flex-shrink-0 flex-col items-center justify-center gap-2 will-change-transform [backface-visibility:hidden] [contain:layout_paint]"
            style={{
              width: CHORD_ITEM_WIDTH,
              marginRight: CHORD_ITEM_GAP,
              transform: "translateZ(0) scale(1)",
              opacity: 1,
            }}
          >
            <div
              className="pointer-events-none flex items-center justify-center p-2"
              style={{
                borderColor: showColorCoding
                  ? `${item.chord.color}40`
                  : undefined,
              }}
            >
              {item.showDiagram && (
                <div className="h-full w-full text-foreground">
                  <ChordDiagram originalFrets={item.chord.frets} />
                </div>
              )}
            </div>

            <span
              className="text-xl font-semibold sm:text-2xl"
              style={
                showColorCoding ? { color: item.chord.color } : undefined
              }
            >
              {item.chord.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChordTrainerVisualizer({
  stageRef,
  sliderContainerRef,
  queue,
  currentItemIndex,
  patternLength,
  showColorCoding,
  showStrumIcons,
}: ChordTrainerVisualizerProps) {
  return (
    <div className="relative w-full overflow-hidden border-y bg-[radial-gradient(circle_at_center,_hsl(var(--background))_0%,_hsl(var(--background))_52%,_hsl(var(--secondary))_100%)] xs:rounded-md xs:border-x">
      {queue.length === 0 ? (
        <div className="baseFlex relative h-[260px] w-full text-sm text-foreground/70">
          Choose at least one chord to start.
        </div>
      ) : showStrumIcons ? (
        <ChordTrainerPatternVisualizer
          stageRef={stageRef}
          sliderContainerRef={sliderContainerRef}
          queue={queue}
          currentItemIndex={currentItemIndex}
          patternLength={patternLength}
          showColorCoding={showColorCoding}
        />
      ) : (
        <ChordTrainerStreamVisualizer
          stageRef={stageRef}
          sliderContainerRef={sliderContainerRef}
          queue={queue}
          showColorCoding={showColorCoding}
        />
      )}
    </div>
  );
}

export default ChordTrainerVisualizer;
