import { useId } from "react";

// Match the playback staff's 34px columns and 25px string spacing at 16px.
// SVG scales all of the geometry together without stitching fractional CSS boxes.
const COLUMN_WIDTH = 34;
const STAFF_TOP = 40.5;
const STRING_SPACING = 25;
const TRACK_HEIGHT = 208;

// Let Her Go, transcribed top string to bottom string from the reference.
// Both desktop and mobile landscape previews share the same notes and rhythm.
const tabData = [
  ["", "", "0h", "", "", ""],
  ["", "", "2", "", "", ""],
  ["", "1", "", "3", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "", "", "3", "", ""],
  ["3", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["0", "", "", "", "", ""],
  ["", "", "", "3", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "", "", "", "3"],
  ["", "3", "", "", "", ""],
  ["", "", "", "0", "", ""],
  ["0", "", "", "", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "", "2", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "2", "", "", ""],
  ["", "", "", "2", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "", "", "0", ""],
  ["", "", "", "2", "", ""],
  ["", "3", "", "", "", "3"],
  ["0", "", "", "", "", ""],
  ["", "3", "", "0", "", ""],
  ["", "1", "", "", "", ""],
  ["", "", "0h", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "1", "", "3", "", ""],
  ["", "", "", "", "", ""],
  ["", "", "", "", "", "1"],
  ["", "", "2", "", "", ""],
  ["", "", "", "3", "", ""],
];

const beamGroups = [
  [0, 3],
  [4, 7],
  [8, 11],
  [12, 15],
  [16, 17],
  [18, 21],
  [22, 23],
  [24, 27],
  [28, 31],
  [32, 35],
] as const;

const TRACK_WIDTH = tabData.length * COLUMN_WIDTH;
const STRINGS = Array.from({ length: 6 }, (_, index) => index);

function noteX(column: number) {
  return column * COLUMN_WIDTH + COLUMN_WIDTH / 2;
}

function stringY(string: number) {
  return STAFF_TOP + string * STRING_SPACING;
}

function staffPath(string: number) {
  const y = stringY(string);
  let from = 0;
  const segments: string[] = [];

  // Only break a string around a real note. Empty columns share one continuous
  // stroke, eliminating the antialiased seams between the old per-column divs.
  tabData.forEach((notes, column) => {
    const note = notes[string];
    if (!note) return;
    const halfGap = note.length === 1 ? 7 : 12;
    const x = noteX(column);
    segments.push(`M${from} ${y}H${x - halfGap}`);
    from = x + halfGap;
  });
  segments.push(`M${from} ${y}H${TRACK_WIDTH}`);
  return segments.join(" ");
}

export default function HeroTablature({
  layout = "desktop",
}: {
  layout?: "desktop" | "mobile";
}) {
  const id = useId();
  const notesId = `${id}-notes`;
  const playedId = `${id}-played`;
  const upcomingId = `${id}-upcoming`;
  const scoreViewport = {
    width: `${TRACK_WIDTH / 16}em`,
    height: `${TRACK_HEIGHT / 16}em`,
    viewBox: `0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`,
  };

  return (
    <div
      data-hero-tablature={layout}
      className="baseVertFlex relative min-h-0 w-full flex-1 select-none"
    >
      <div
        className={`w-full overflow-hidden ${layout === "desktop" ? "h-full max-h-[315px]" : ""}`}
      >
        <div
          className={`baseFlex relative w-full overflow-hidden ${layout === "mobile" ? "h-[15.9375em]" : "h-full"}`}
        >
          <svg
            aria-hidden="true"
            className="h-[13em] w-full shrink-0 overflow-hidden"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <svg id={notesId} {...scoreViewport}>
                {/* WebKit needs the baseline on each text element in a reused SVG. */}
                <g fill="currentColor" fontSize="16" textAnchor="middle">
                  {tabData.flatMap((notes, column) =>
                    notes.map((note, string) =>
                      note ? (
                        <text
                          key={`${column}-${string}`}
                          x={noteX(column)}
                          y={stringY(string)}
                          dominantBaseline="central"
                        >
                          {note}
                        </text>
                      ) : null,
                    ),
                  )}
                </g>
              </svg>
              <clipPath id={playedId}>
                <rect width="50%" height="100%" />
              </clipPath>
              <clipPath id={upcomingId}>
                <rect x="50%" width="50%" height="100%" />
              </clipPath>
            </defs>
            <svg {...scoreViewport}>
              <g
                data-hero-staff=""
                fill="none"
                stroke="hsl(var(--foreground) / 0.5)"
                strokeWidth="1"
              >
                {STRINGS.map((string) => (
                  <path key={string} d={staffPath(string)} />
                ))}
                {[16, 28].map((column) => (
                  <path
                    key={column}
                    d={`M${column * COLUMN_WIDTH + 0.5} ${STAFF_TOP}v${STRING_SPACING * 5}`}
                  />
                ))}
              </g>
              <g data-hero-rhythm="" fill="hsl(var(--foreground))">
                {tabData.map((_, column) => (
                  <rect
                    key={column}
                    x={noteX(column)}
                    y="182"
                    width="1"
                    height="16"
                  />
                ))}
                {beamGroups.flatMap(([start, end]) => {
                  const beamCount = start === 16 || start === 22 ? 1 : 2;
                  return Array.from({ length: beamCount }, (_, beam) => (
                    <rect
                      key={`${start}-${beam}`}
                      x={noteX(start)}
                      y={196 - beam * 4}
                      width={
                        noteX(Math.min(end, tabData.length - 1)) -
                        noteX(start) +
                        1
                      }
                      height="2"
                    />
                  ));
                })}
              </g>
            </svg>
            <g clipPath={`url(#${upcomingId})`} className="text-foreground">
              <use href={`#${notesId}`} />
            </g>
            <g clipPath={`url(#${playedId})`} className="text-primary">
              <use href={`#${notesId}`} />
            </g>
            <line
              data-hero-playhead=""
              x1="50%"
              x2="50%"
              y1="2.5em"
              y2="10.375em"
              stroke="hsl(var(--primary))"
              strokeWidth="0.125em"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
