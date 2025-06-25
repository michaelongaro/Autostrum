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

export interface StaticChordSection {
  subSectionData: ChordSectionType;
}

function StaticChordSection({ subSectionData }: StaticChordSection) {
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
      className="baseVertFlex lightestGlassmorphic relative h-full !justify-start rounded-md p-4 md:p-8"
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
                    <div className="baseFlex ml-4 gap-3 rounded-t-md bg-pink-500 px-2 py-1 text-sm !shadow-sm">
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

                          <p>Repeat {chordSequence.repetitions}x</p>
                        </div>
                      )}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    <StaticChordSequence chordSequenceData={chordSequence} />
                  </AnimatePresence>
                </div>
              ) : (
                <p className="italic text-pink-200">Empty strumming pattern</p>
              )}
            </Fragment>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default StaticChordSection;
