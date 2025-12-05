import { useTabStore } from "~/stores/TabStore";
import { getContrastTextColor } from "~/utils/chordColors";

function dynamicFontSize(chordNameLength: number): number {
  const inMin = 1;
  const inMax = 20;
  const outMin = 14;
  const outMax = 8;

  // Clamp chordNameLength to [1, 20]
  const clamped = Math.max(inMin, Math.min(inMax, chordNameLength));

  // Linear mapping formula
  return outMin + ((clamped - inMin) * (outMax - outMin)) / (inMax - inMin);
}

interface ChordName {
  name: string;
  color: string;
  truncate: boolean;
  isHighlighted?: boolean;
}

function ChordName({
  name,
  color,
  truncate,
  isHighlighted = false,
}: ChordName) {
  const chordDisplayMode = useTabStore((state) => {
    return state.chordDisplayMode;
  });

  let textColor = "";

  if (chordDisplayMode === "color") {
    textColor = getContrastTextColor(color);
  } else {
    textColor = isHighlighted
      ? "hsl(var(--primary))"
      : "hsl(var(--foreground))";
  }

  const modifiedChordName =
    truncate && name.length > 7 ? name.slice(0, 5) + "…" : name;

  return (
    <div
      style={{
        backgroundColor: chordDisplayMode === "color" ? color : undefined,
        color: textColor,
        boxShadow:
          chordDisplayMode === "color"
            ? isHighlighted
              ? `0 0 0 2px ${color}40`
              : undefined
            : undefined,
        fontSize: truncate
          ? `${dynamicFontSize(name.length)}px`
          : chordDisplayMode === "color"
            ? "14px"
            : "16px",
        lineHeight: "1.25rem",
        borderWidth: chordDisplayMode === "color" ? "1px" : undefined,
        transform:
          chordDisplayMode === "color" && isHighlighted
            ? "scale(1.1)"
            : "scale(1)",
      }}
      className="baseFlex shrink-0 rounded-full border-background px-1.5 font-semibold transition-all hover:z-10"
    >
      {modifiedChordName}
    </div>
  );
}

export default ChordName;
