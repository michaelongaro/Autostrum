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
          borderColor: "hsl(var(--screenshot-foreground))",
          backgroundColor: "hsl(var(--screenshot-background) / 0.75)",
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
    </div>
  );
}

export default StaticChordSequence;
