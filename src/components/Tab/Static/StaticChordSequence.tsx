import { motion } from "framer-motion";
import StaticStrummingPattern from "~/components/Tab/Static/StaticStrummingPattern";
import { type ChordSequence } from "~/stores/TabStore";

const opacityAndScaleVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
  closed: {
    opacity: 0,
    scale: 0.5,
    transition: {
      ease: "easeInOut",
      duration: 0.25,
    },
  },
};
export interface StaticChordSequence {
  chordSequenceData: ChordSequence;
}

function StaticChordSequence({ chordSequenceData }: StaticChordSequence) {
  return (
    <motion.div
      key={chordSequenceData.id}
      variants={opacityAndScaleVariants}
      transition={{
        layout: {
          type: "spring",
          bounce: 0.15,
          duration: 1,
        },
      }}
      className="baseFlex"
    >
      <div className="baseVertFlex relative !justify-start gap-4 rounded-md border-2 border-pink-100 p-1 shadow-sm">
        <StaticStrummingPattern data={chordSequenceData.strummingPattern} />
      </div>
    </motion.div>
  );
}

export default StaticChordSequence;
