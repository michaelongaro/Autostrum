import { useTabStore, type COLORS, type THEME } from "~/stores/TabStore";

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
  screenshotColor?: COLORS;
  screenshotTheme?: THEME;
  showFullName?: boolean;
  hideColor?: boolean;
}

function ChordName({
  name,
  color,
  truncate,
  isHighlighted,
  screenshotColor,
  screenshotTheme,
  showFullName,
  hideColor,
}: ChordName) {
  const chordDisplayMode = useTabStore((state) => {
    return state.chordDisplayMode;
  });

  let textColor = "";

  if (chordDisplayMode === "color" && !hideColor) {
    textColor = color;
  } else {
    textColor = isHighlighted
      ? "hsl(var(--primary))"
      : screenshotColor && screenshotTheme
        ? "hsl(var(--screenshot-foreground))"
        : "hsl(var(--foreground))";
  }

  const modifiedChordName =
    !showFullName && truncate && name.length > 7
      ? name.slice(0, 5) + "…"
      : name;

  return (
    <div
      style={{
        color: textColor,
        fontSize: truncate ? `${dynamicFontSize(name.length)}px` : "16px",
        lineHeight: "1.25rem",
        zIndex: showFullName ? 9 : undefined, // I still want hover to take priority over chord popover being open
        rotate:
          modifiedChordName.length > 4 && !showFullName ? "-30deg" : "0deg",
        transition: "rotate 0.15s ease-out",
      }}
      // FYI: I am still unsure why adding "isolate" fixes the issue where the chord name
      // would sometimes not change color when highlighted on iOS
      className="baseFlex isolate h-5 shrink-0 px-1 font-semibold hover:z-10"
    >
      {modifiedChordName}
    </div>
  );
}

export default ChordName;
