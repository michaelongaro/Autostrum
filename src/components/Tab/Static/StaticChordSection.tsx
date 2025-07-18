import { AnimatePresence, motion } from "framer-motion";
import { Fragment } from "react";
import { Separator } from "~/components/ui/separator";
import {
  useTabStore,
  type ChordSection as ChordSectionType,
  type ChordSequence as ChordSequenceType,
} from "~/stores/TabStore";
import {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
} from "~/utils/bpmIconRenderingHelpers";
import StaticChordSequence from "~/components/Tab/Static/StaticChordSequence";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";

export interface StaticChordSection {
  subSectionData: ChordSectionType;
  color: COLORS;
  theme: THEME;
}

function StaticChordSection({
  subSectionData,
  color,
  theme,
}: StaticChordSection) {
  const { bpm } = useTabStore((state) => ({
    bpm: state.bpm,
  }));

  function showBpm(chordSequence: ChordSequenceType) {
    if (!chordSequencesAllHaveSameNoteLength(subSectionData)) return true;

    return chordSequence.bpm !== -1 && chordSequence.bpm !== subSectionData.bpm;
  }

  return (
    <motion.div
      key={subSectionData.id}
      style={{
        borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-border"]})`,
        backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]})`,
      }}
      className="baseVertFlex relative h-full !justify-start rounded-md border p-4 shadow-md md:p-8"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${subSectionData.id}ChordSectionWrapper`}
          className="baseFlex flex-wrap !items-end !justify-start gap-8"
        >
          {subSectionData.data.map((chordSequence, index) => (
            <Fragment key={`${chordSequence.id}wrapper`}>
              {chordSequence.data.length > 0 ? (
                <div className="baseVertFlex !items-start">
                  {(showBpm(chordSequence) ||
                    chordSequence.repetitions > 1) && (
                    <div
                      style={{
                        borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-border"]})`,
                        backgroundColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-secondary"]} / 0.25)`,
                        color: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
                      }}
                      className="baseFlex ml-4 gap-3 rounded-t-md border px-2 py-1 text-sm !shadow-sm"
                    >
                      {showBpm(chordSequence) && (
                        <div className="baseFlex gap-1">
                          {getDynamicNoteLengthIcon({
                            noteLength:
                              chordSequence.strummingPattern.noteLength,
                          })}
                          {chordSequence.bpm === -1
                            ? subSectionData.bpm === -1
                              ? bpm
                              : subSectionData.bpm
                            : chordSequence.bpm}{" "}
                          BPM
                        </div>
                      )}

                      {chordSequence.repetitions > 1 && (
                        <div className="baseFlex gap-3">
                          {showBpm(chordSequence) && (
                            <Separator
                              className="h-4 w-[1px]"
                              orientation="vertical"
                            />
                          )}

                          <span>Repeat {chordSequence.repetitions}x</span>
                        </div>
                      )}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    <StaticChordSequence
                      chordSequenceData={chordSequence}
                      color={color}
                      theme={theme}
                    />
                  </AnimatePresence>
                </div>
              ) : (
                <span className="italic text-gray">
                  Empty strumming pattern
                </span>
              )}
            </Fragment>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default StaticChordSection;
