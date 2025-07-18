import { motion } from "framer-motion";
import StaticStrummingPattern from "~/components/Tab/Static/StaticStrummingPattern";
import { type ChordSequence } from "~/stores/TabStore";
import { SCREENSHOT_COLORS } from "~/utils/updateCSSThemeVars";
import type { COLORS, THEME } from "~/stores/TabStore";

export interface StaticChordSequence {
  chordSequenceData: ChordSequence;
  color: COLORS;
  theme: THEME;
}

function StaticChordSequence({
  chordSequenceData,
  color,
  theme,
}: StaticChordSequence) {
  return (
    <motion.div key={chordSequenceData.id} className="baseFlex">
      <div
        style={{
          borderColor: `hsl(${SCREENSHOT_COLORS[color][theme]["screenshot-foreground"]})`,
        }}
        className="baseVertFlex relative !justify-start gap-4 rounded-md border-2 p-1 shadow-sm"
      >
        <StaticStrummingPattern
          data={chordSequenceData.strummingPattern}
          chordSequenceData={chordSequenceData.data}
          color={color}
          theme={theme}
        />
      </div>
    </motion.div>
  );
}

export default StaticChordSequence;
