import { AnimatePresence, motion } from "framer-motion";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ChordStrumIcon from "~/components/ui/icons/ChordStrumIcon";
import {
  getPatternGroup,
  getPatternGroupIndex,
  getStrumIndexInPattern,
  type ChordTrainerQueueItem,
} from "~/utils/chordTrainerQueue";

interface ChordTrainerPatternVisualizerProps {
  queue: ChordTrainerQueueItem[];
  currentItemIndex: number;
  patternLength: number;
  showColorCoding: boolean;
}

function ChordTrainerPatternVisualizer({
  queue,
  currentItemIndex,
  patternLength,
  showColorCoding,
}: ChordTrainerPatternVisualizerProps) {
  const groupIndex = getPatternGroupIndex(currentItemIndex, patternLength);
  const strumIndex = getStrumIndexInPattern(currentItemIndex, patternLength);
  const currentGroup = getPatternGroup(queue, groupIndex, patternLength);
  const nextGroup = getPatternGroup(queue, groupIndex + 1, patternLength);

  if (!currentGroup) return null;

  return (
    <div
      id="chord-trainer-pattern-visualizer"
      className="relative h-[280px] w-full overflow-hidden bg-background/70 shadow-inner xs:h-[300px]"
    >
      <div className="bg-primary/12 pointer-events-none absolute left-1/2 top-1/2 z-0 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl xs:h-[220px] xs:w-[240px]" />

      <AnimatePresence initial={false}>
        <motion.div
          key={currentGroup.id}
          className="baseFlex absolute inset-0 z-10 gap-8 px-4 sm:gap-12 md:gap-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div
            id="chord-trainer-current-chord"
            data-chord-name={currentGroup.chord.name}
            className="baseVertFlex gap-2"
          >
            <div className="pointer-events-none h-[124px] w-[100px] text-foreground sm:h-[132px] sm:w-[108px]">
              <ChordDiagram originalFrets={currentGroup.chord.frets} />
            </div>

            <span
              className="text-xl font-semibold sm:text-2xl"
              style={
                showColorCoding
                  ? { color: currentGroup.chord.color }
                  : undefined
              }
            >
              {currentGroup.chord.name}
            </span>

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

          {nextGroup && (
            <div
              id="chord-trainer-next-chord"
              data-chord-name={nextGroup.chord.name}
              className="baseVertFlex gap-1.5"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                Next
              </span>

              <div className="pointer-events-none h-[88px] w-[72px] text-foreground sm:h-[96px] sm:w-[80px]">
                <ChordDiagram originalFrets={nextGroup.chord.frets} />
              </div>

              <span
                className="text-base font-semibold sm:text-lg"
                style={
                  showColorCoding ? { color: nextGroup.chord.color } : undefined
                }
              >
                {nextGroup.chord.name}
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ChordTrainerPatternVisualizer;
