import { getContrastTextColor } from "~/utils/chordColors";

interface ColoredChordIndicatorProps {
  color: string;
  chordName: string;
  size?: "sm" | "md";
  isHighlighted?: boolean;
}

/**
 * A colored circle indicator showing the first letter of a chord name.
 * Uses luminance-based contrast for the letter color.
 */
function ColoredChordIndicator({
  color,
  chordName,
  size = "md",
  isHighlighted = false,
}: ColoredChordIndicatorProps) {
  const firstLetter = chordName.charAt(0).toUpperCase();
  const textColor = getContrastTextColor(color);

  const sizeClasses = {
    sm: "size-5 text-xs",
    md: "size-6 text-sm",
  };

  return (
    <div
      style={{
        backgroundColor: color,
        color: textColor,
        boxShadow: isHighlighted ? `0 0 0 2px ${color}40` : undefined,
      }}
      className={`baseFlex shrink-0 rounded-full font-semibold transition-all ${sizeClasses[size]} ${
        isHighlighted ? "scale-110" : ""
      }`}
    >
      {firstLetter}
    </div>
  );
}

export default ColoredChordIndicator;
