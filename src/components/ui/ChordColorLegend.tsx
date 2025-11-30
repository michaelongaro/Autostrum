import type { Chord } from "~/stores/TabStore";
import ColoredChordIndicator from "./ColoredChordIndicator";

interface ChordColorLegendProps {
  chords: Chord[];
  /**
   * Optional: filter to only show specific chord names
   */
  visibleChordNames?: string[];
  size?: "sm" | "md";
}

/**
 * A horizontal legend showing chord colors and their full names.
 * Deduplicates by chord name.
 */
function ChordColorLegend({
  chords,
  visibleChordNames,
  size = "sm",
}: ChordColorLegendProps) {
  // Get unique chords by name, optionally filtered
  const uniqueChords = chords.filter((chord, index, self) => {
    const isUnique = self.findIndex((c) => c.name === chord.name) === index;
    const isVisible =
      !visibleChordNames || visibleChordNames.includes(chord.name);
    return isUnique && isVisible && chord.name !== "";
  });

  if (uniqueChords.length === 0) return null;

  return (
    <div className="baseFlex flex-wrap gap-3">
      {uniqueChords.map((chord) => (
        <div key={chord.id} className="baseFlex gap-1.5">
          <ColoredChordIndicator
            color={chord.color}
            chordName={chord.name}
            size={size}
          />

          {chord.name.length > 1 && (
            <span className="text-xs font-medium text-foreground/80">
              {chord.name}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default ChordColorLegend;
