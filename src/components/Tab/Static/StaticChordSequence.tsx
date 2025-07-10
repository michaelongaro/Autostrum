import { motion } from "framer-motion";
import StaticStrummingPattern from "~/components/Tab/Static/StaticStrummingPattern";
import { type ChordSequence } from "~/stores/TabStore";

export interface StaticChordSequence {
  chordSequenceData: ChordSequence;
}

function StaticChordSequence({ chordSequenceData }: StaticChordSequence) {
  return (
    <motion.div key={chordSequenceData.id} className="baseFlex">
      <div className="baseVertFlex relative !justify-start gap-4 rounded-md border-2 border-foreground p-1 shadow-sm">
        <StaticStrummingPattern
          data={chordSequenceData.strummingPattern}
          chordSequenceData={chordSequenceData.data}
        />
      </div>
    </motion.div>
  );
}

export default StaticChordSequence;
