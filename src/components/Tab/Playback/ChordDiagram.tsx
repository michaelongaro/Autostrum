import { useMemo } from "react";

const STRING_COUNT = 6;

// FYI: The reversal of the frets is purely due to the compiler expecting the frets in reverse order.
// can be refactored in the future but it's not a huge issue imo.

// -1 = muted string
// -2 = not fretted at all
// 0+ = fret number

interface ChordDiagram {
  originalFrets: string[]; // Array of 6 strings representing fret positions ('x', '0', '1', '2', etc.)
}

/**
 * GuitarChordDiagram Component
 * Renders a guitar chord diagram based on the provided frets array.
 */
function ChordDiagram({ originalFrets }: ChordDiagram) {
  const frets = useMemo(() => [...originalFrets].reverse(), [originalFrets]);

  // Validate the frets array
  if (!Array.isArray(frets) || frets.length !== STRING_COUNT) {
    console.error(`Expected an array of ${STRING_COUNT} fret values.`);
    return null;
  }

  /**
   * Parse frets from strings to numbers.
   * 'x' -> -1 (muted), '0' -> 0 (open), numeric strings -> corresponding numbers.
   */
  const parsedFrets: number[] = frets.map((fret) => {
    if (fret.toLowerCase() === "x") return -1;
    const num = parseInt(fret, 10);
    return isNaN(num) ? -2 : num;
  });

  // Determine the minimum and maximum frets to display
  const frettedFrets = parsedFrets.filter((fret) => fret > 0);
  const minFret = frettedFrets.length > 0 ? Math.min(...frettedFrets) : 1;
  const maxFret = frettedFrets.length > 0 ? Math.max(...frettedFrets) : 1;

  // Decide the starting fret
  let displayStartFret = 1;
  if (maxFret > 4) {
    displayStartFret = Math.min(...frettedFrets.filter((fret) => fret > 0));
  }

  // Ensure at least four frets are displayed
  const FRET_COUNT = Math.max(4, maxFret - displayStartFret + 1);

  // Generate an array of fret numbers to display
  const displayFrets = Array.from(
    { length: FRET_COUNT + 1 },
    (_, i) => displayStartFret + i,
  );

  /**
   * Helper function to render individual finger positions.
   * Circles are rendered for frets not covered by a barre.
   */
  const renderFingers = () => {
    const fingers = [];
    for (let s = 0; s < STRING_COUNT; s++) {
      const fret = parsedFrets[s];
      if (fret && fret > 0) {
        // Check if the fret is within the display frets
        if (
          fret < displayStartFret ||
          fret > displayStartFret + FRET_COUNT - 1
        ) {
          continue; // Fret not displayed
        }

        const fretIndex = displayFrets.indexOf(fret);
        if (fretIndex === -1) continue; // Fret not displayed

        const y = 15 + (fretIndex + 0.5) * 30; // Centered between frets
        const x = 40 + s * 20;

        fingers.push(
          <circle
            key={`finger-${s}`}
            cx={x}
            cy={y}
            r="7"
            fill="currentColor"
          />,
        );
      }
    }
    return fingers;
  };

  /**
   * Helper function to render open ('O') or muted ('X') string markers.
   * These are displayed above the nut.
   */
  const renderMarkers = () => {
    return parsedFrets.map((fret, s) => {
      if (fret === 0 || fret === -1) {
        const y = 20 - 10; // Positioned above the nut
        const x = 40 + s * 20;
        return (
          <text
            key={`marker-${s}`}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="14"
            fontWeight="500"
            fill="currentColor"
          >
            {fret === 0 ? "O" : "X"}
          </text>
        );
      }
      return null;
    });
  };

  /**
   * Helper function to render fret numbers on the left side of the diagram.
   */
  const renderFretNumbers = () => {
    return displayFrets.slice(0, displayFrets.length - 1).map((fret, f) => (
      <text
        key={`fret-number-${fret}-${f}`}
        x={30}
        y={15 + (f + 1) * 30 + 5} // Positioned to the left of the diagram
        textAnchor="middle"
        fontSize="12"
        fill="currentColor"
      >
        {fret}
      </text>
    ));
  };

  /**
   * Helper function to render fret lines.
   */
  const renderFrets = () => {
    return displayFrets.map((fret, f) => {
      return (
        <line
          key={`fret-${fret}-${f}`}
          x1={40}
          y1={15 + f * 30}
          x2={40 + (STRING_COUNT - 1) * 20}
          y2={15 + f * 30}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={maxFret <= 4 && f === 0 ? 4 : 1} // only show nut if full chord is within first 4 frets
        />
      );
    });
  };

  const svgHeight = 15 + FRET_COUNT * 30 + 15;

  return (
    <svg
      viewBox={`10 0 150 ${svgHeight}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`Guitar chord diagram for frets: ${frets.join(", ")}`}
    >
      {/* Draw strings */}
      {Array.from({ length: STRING_COUNT }, (_, s) => (
        <line
          key={`string-${s}`}
          x1={40 + s * 20}
          y1={15}
          x2={40 + s * 20}
          y2={15 + FRET_COUNT * 30}
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}

      {/* Draw frets */}
      {renderFrets()}

      {/* Render finger positions */}
      {renderFingers()}

      {/* Render open/muted markers */}
      {renderMarkers()}

      {/* Render fret numbers */}
      {renderFretNumbers()}
    </svg>
  );
}

export default ChordDiagram;
