import type { RefObject } from "react";
import { IoIosArrowUp } from "react-icons/io";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import {
  CHORD_ITEM_GAP,
  CHORD_ITEM_WIDTH,
  getPatternGroup,
  getPatternGroupIndex,
  getPatternGroups,
  getStrumIndexInPattern,
  type ChordTrainerQueueItem,
} from "~/utils/chordTrainerQueue";

interface ChordTrainerPatternVisualizerProps {
  stageRef: RefObject<HTMLDivElement | null>;
  sliderContainerRef: RefObject<HTMLDivElement | null>;
  queue: ChordTrainerQueueItem[];
  currentItemIndex: number;
  patternLength: number;
  showColorCoding: boolean;
}

function ChordTrainerPatternVisualizer({
  stageRef,
  sliderContainerRef,
  queue,
  currentItemIndex,
  patternLength,
  showColorCoding,
}: ChordTrainerPatternVisualizerProps) {
  const groups = getPatternGroups(queue, patternLength);
  const groupIndex = getPatternGroupIndex(currentItemIndex, patternLength);
  const strumIndex = getStrumIndexInPattern(currentItemIndex, patternLength);
  const currentGroup = getPatternGroup(queue, groupIndex, patternLength);

  return (
    <div
      id="chord-trainer-pattern-visualizer"
      className="relative h-[280px] w-full overflow-hidden bg-background/70 shadow-inner xs:h-[300px]"
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
        {groups.map((group, index) => (
          <div
            key={group.id}
            data-group-index={index}
            data-current-group={index === groupIndex ? "true" : "false"}
            data-chord-name={group.chord.name}
            className="baseVertFlex relative flex-shrink-0 flex-col items-center justify-center gap-2 will-change-transform [backface-visibility:hidden] [contain:layout_paint]"
            style={{
              width: CHORD_ITEM_WIDTH,
              marginRight: CHORD_ITEM_GAP,
              transform: "translateZ(0) scale(1)",
              opacity: 1,
            }}
          >
            <div className="pointer-events-none flex h-[132px] w-full items-center justify-center p-2 text-foreground">
              <ChordDiagram originalFrets={group.chord.frets} />
            </div>

            <span
              className="flex h-8 items-center text-xl font-semibold sm:text-2xl"
              style={
                showColorCoding ? { color: group.chord.color } : undefined
              }
            >
              {group.chord.name}
            </span>

            <div className="h-6 w-full" aria-hidden="true" />
          </div>
        ))}
      </div>

      {currentGroup && (
        <div
          id="chord-trainer-pattern-strums"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[5] flex w-[136px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2"
        >
          <div className="h-[132px] w-full p-2" aria-hidden="true" />
          <div className="h-8 w-full" aria-hidden="true" />
          <div className="baseFlex h-6 gap-0.5">
            {currentGroup.items.map((item, index) => {
              const played = index <= strumIndex;

              return (
                <div
                  key={`${item.instanceId}-strum`}
                  data-strum-index={index}
                  data-strum-played={played ? "true" : "false"}
                  className="baseFlex h-6 w-5 transition-opacity duration-150"
                  style={{
                    opacity: played ? 1 : 0.5,
                    color: showColorCoding
                      ? currentGroup.chord.color
                      : undefined,
                    fill: showColorCoding
                      ? currentGroup.chord.color
                      : undefined,
                  }}
                >
                  {item.strum ? (
                    <ChordStrumIcon effects={item.strum} />
                  ) : (
                    <div className="h-5 w-2.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChordTrainerPatternVisualizer;
