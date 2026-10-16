import StaticStrummingPattern from "~/components/Tab/Static/StaticStrummingPattern";
import { type ChordSequence } from "~/stores/TabStore";
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
    <div className="baseFlex">
      <div
        style={{
          borderColor: "hsl(var(--screenshot-foreground) / 0.5)",
          backgroundColor: "hsl(var(--screenshot-background))",
        }}
        className="baseVertFlex relative !justify-start gap-4 rounded-md border-[1px] p-1 shadow-sm"
      >
        <StaticStrummingPattern
          data={chordSequenceData.strummingPattern}
          chordSequenceData={chordSequenceData.data}
          color={color}
          theme={theme}
        />
      </div>
    </div>
  );
}

export default StaticChordSequence;
