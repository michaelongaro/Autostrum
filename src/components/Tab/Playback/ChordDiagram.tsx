import React from "react";

// Constants for the number of strings
const STRING_COUNT = 6;

// Interface to define a Barre
interface Barre {
  fret: number;
  startString: number;
  endString: number;
}

// Props interface for the component
interface GuitarChordDiagramProps {
  frets: string[]; // Array of 6 strings representing fret positions ('x', '0', '1', '2', etc.)
}

/**
 * GuitarChordDiagram Component
 * Renders a guitar chord diagram based on the provided frets array.
 */
const GuitarChordDiagram: React.FC<GuitarChordDiagramProps> = ({ frets }) => {
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
    return isNaN(num) ? 0 : num;
  });

  /**
   * Function to detect barres in the frets array.
   * A barre is defined as a horizontal line across two or more consecutive strings at the same fret.
   *
   * @param frets - Array of parsed fret numbers for each string
   * @returns Array of Barre objects
   */
  const detectBarres = (frets: number[]): Barre[] => {
    const barres: Barre[] = [];
    let index = 0;

    while (index < STRING_COUNT) {
      const currentFret = frets[index];
      if (currentFret && currentFret > 0) {
        let startString = index;
        let endString = index;

        // Check for consecutive strings with the same fret
        while (
          endString + 1 < STRING_COUNT &&
          frets[endString + 1] === currentFret
        ) {
          endString++;
        }

        const groupSize = endString - startString + 1;

        if (groupSize >= 2) {
          // Validate that all strings in the span are fretted at this fret
          let isValidBarre = true;
          for (let s = startString; s <= endString; s++) {
            if (frets[s] !== currentFret) {
              isValidBarre = false;
              break;
            }
          }

          if (isValidBarre) {
            barres.push({
              fret: currentFret,
              startString,
              endString,
            });
            index = endString + 1;
            continue;
          }
        }
      }

      index++;
    }

    return barres;
  };

  // Detect barres based on the parsed frets array
  const barres = detectBarres(parsedFrets);

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
   * Helper function to render barre lines.
   * Each barre is rendered as a thick horizontal line across the specified strings.
   */
  const renderBarres = () => {
    return barres.map((barre, idx) => {
      // Only render the barre if it's within the display frets
      if (
        barre.fret < displayStartFret ||
        barre.fret > displayStartFret + FRET_COUNT - 1
      ) {
        return null;
      }

      const fretIndex = displayFrets.indexOf(barre.fret);
      if (fretIndex === -1) return null; // Barre fret not displayed

      const y = 20 + (fretIndex + 0.5) * 40; // Centered between frets
      const xStart = 40 + barre.startString * 20;
      const xEnd = 40 + barre.endString * 20;

      return (
        <line
          key={`barre-${idx}`}
          x1={xStart}
          y1={y}
          x2={xEnd}
          y2={y}
          stroke="black"
          strokeWidth="8"
          strokeLinecap="round"
        />
      );
    });
  };

  /**
   * Helper function to render individual finger positions.
   * Circles are rendered for frets not covered by a barre.
   */
  const renderFingers = () => {
    const fingers = [];
    for (let s = 0; s < STRING_COUNT; s++) {
      const fret = parsedFrets[s];
      if (fret && fret > 0) {
        // Check if this fret is part of a barre
        const isBarre = barres.some(
          (barre) =>
            barre.fret === fret &&
            s >= barre.startString &&
            s <= barre.endString,
        );
        if (!isBarre) {
          // Check if the fret is within the display frets
          if (
            fret < displayStartFret ||
            fret > displayStartFret + FRET_COUNT - 1
          ) {
            continue; // Fret not displayed
          }

          const fretIndex = displayFrets.indexOf(fret);
          if (fretIndex === -1) continue; // Fret not displayed

          const y = 20 + (fretIndex + 0.5) * 40; // Centered between frets
          const x = 40 + s * 20;

          fingers.push(
            <circle key={`finger-${s}`} cx={x} cy={y} r="8" fill="black" />,
          );
        }
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
    return displayFrets.map((fret, f) => (
      <text
        key={`fret-number-${fret}-${f}`}
        x={30}
        y={20 + (f + 1) * 40 - 10} // Positioned to the left of the diagram
        textAnchor="middle"
        fontSize="12"
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
          y1={20 + f * 40}
          x2={40 + (STRING_COUNT - 1) * 20}
          y2={20 + f * 40}
          stroke="black"
          strokeLinecap="round"
          strokeWidth={maxFret <= 4 && f === 0 ? 4 : 1} // only show nut if full chord is within first 4 frets
        />
      );
    });
  };

  return (
    <svg
      width="160"
      height={20 + FRET_COUNT * 40 + 20}
      role="img"
      aria-label={`Guitar chord diagram for frets: ${frets.join(", ")}`}
    >
      {/* Draw strings */}
      {Array.from({ length: STRING_COUNT }, (_, s) => (
        <line
          key={`string-${s}`}
          x1={40 + s * 20}
          y1={20}
          x2={40 + s * 20}
          y2={20 + FRET_COUNT * 40}
          stroke="black"
          strokeWidth="1"
        />
      ))}

      {/* Draw frets */}
      {renderFrets()}

      {/* Render barre lines */}
      {renderBarres()}

      {/* Render finger positions */}
      {renderFingers()}

      {/* Render open/muted markers */}
      {renderMarkers()}

      {/* Render fret numbers */}
      {renderFretNumbers()}
    </svg>
  );
};

export default GuitarChordDiagram;
