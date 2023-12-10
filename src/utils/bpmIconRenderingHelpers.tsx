import type { ChordSection } from "~/stores/TabStore";
import type { SVGProps } from "react";

function chordSequencesAllHaveSameNoteLength(chordSection: ChordSection) {
  const noteLength = chordSection.data[0]?.strummingPattern.noteLength;

  return chordSection.data.every(
    (chordSequence) => chordSequence.strummingPattern.noteLength === noteLength
  );
}

function getDynamicNoteLengthIcon(
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet",
  forInlineTabViewing?: boolean
) {
  if (noteLength === "1/4th" || noteLength === "1/4th triplet") {
    return (
      <QuarterNote className={`${forInlineTabViewing ? "" : "mr-[2px]"}`} />
    );
  } else if (noteLength === "1/8th" || noteLength === "1/8th triplet") {
    return <EigthNote className={`${forInlineTabViewing ? "" : "mr-[2px]"}`} />;
  } else if (noteLength === "1/16th" || noteLength === "1/16th triplet") {
    return (
      <SixteenthNote className={`${forInlineTabViewing ? "" : "mr-[2px]"}`} />
    );
  }
}

function QuarterNote(props: SVGProps<SVGSVGElement>) {
  // Unicode Character 'QUARTER NOTE' (U+2669)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      fill="currentColor"
      strokeLinecap="square"
      strokeMiterlimit={10}
      colorInterpolation="auto"
      fontFamily="'Dialog'"
      fontSize={12}
      viewBox="0 160 110 250"
      width="0.5rem"
      height="22px"
      {...props}
    >
      <path
        stroke="none"
        d="M90.984 342.422q0 16.734-15.687 30.094-15.672 13.359-34.375 13.359-12.797 0-19.969-6.047-7.172-6.047-7.172-16.734 0-16.735 15.672-30.094 15.688-13.36 34.531-13.36 10.125 0 16.875 4.079V173.953h10.125v168.469Z"
      />
    </svg>
  );
}

function EigthNote(props: SVGProps<SVGSVGElement>) {
  // Unicode Character 'MUSICAL SYMBOL EIGHTH NOTE' (U+1D160)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      fill="currentColor"
      strokeLinecap="square"
      strokeMiterlimit={10}
      colorInterpolation="auto"
      fontFamily="'Dialog'"
      fontSize={12}
      viewBox="20 270 110 50"
      width="0.6rem"
      height="22px"
      {...props}
    >
      <defs id="genericDefs" />
      <g>
        <g>
          <path
            d="M43.3125 379.125 Q39.375 379.125 34.1719 378.1406 Q28.9688 377.1562 25.7344 373.9219 Q22.5 370.6875 22.5 367.3125 Q22.5 362.25 26.4375 355.3594 Q30.375 348.4688 38.25 344.6719 Q46.125 340.875 50.625 340.875 Q54 340.875 57.0938 341.4375 Q60.1875 342 63.8438 343.6875 Q67.5 345.375 70.875 347.9062 L70.875 194.3438 L78.1875 194.3438 L106.3125 222.4688 Q112.5 228.6562 116.4375 237.0938 Q120.375 245.5312 120.375 253.9688 Q120.375 260.1562 117.7031 266.2031 Q115.0312 272.25 109.6875 278.1562 L101.25 286.5938 L97.875 284.9062 L102.9375 275.0625 Q106.3125 268.0312 107.1562 262.4062 Q108 256.7812 108 253.4062 Q108 247.7812 104.625 241.0312 Q101.25 234.2812 95.625 229.7812 L78.1875 217.9688 L78.1875 360.5625 L69.75 369 Q64.6875 373.7812 58.2188 376.4531 Q51.75 379.125 43.3125 379.125 Z"
            stroke="none"
          />
        </g>
      </g>
    </svg>
  );
}

function SixteenthNote(props: SVGProps<SVGSVGElement>) {
  // Unicode Character 'MUSICAL SYMBOL SIXTEENTH NOTE' (U+1D161)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      fill="currentColor"
      strokeLinecap="square"
      strokeMiterlimit={10}
      colorInterpolation="auto"
      fontFamily="'Dialog'"
      fontSize={12}
      viewBox="20 270 110 50"
      width="0.6rem"
      height="22px"
      {...props}
    >
      <defs id="genericDefs" />
      <g>
        <g>
          <path
            d="M43.3125 379.125 Q39.375 379.125 34.1719 378.1406 Q28.9688 377.1562 25.7344 373.9219 Q22.5 370.6875 22.5 367.3125 Q22.5 362.25 26.4375 355.3594 Q30.375 348.4688 38.25 344.6719 Q46.125 340.875 50.625 340.875 Q54 340.875 57.0938 341.4375 Q60.1875 342 63.8438 343.6875 Q67.5 345.375 70.875 347.9062 L70.875 194.3438 L78.1875 194.3438 L106.3125 222.4688 Q112.5 228.6562 116.4375 237.0938 Q120.375 245.5312 120.375 253.9688 Q120.375 258.75 119.1719 262.4062 Q117.9844 266.0625 115.875 269.7188 Q118.125 273.9375 119.25 279.2812 Q120.375 284.625 120.375 287.7188 Q120.375 293.9062 117.7031 299.9531 Q115.0312 306 109.6875 311.9062 L101.25 320.3438 L97.875 318.6562 L102.9375 308.8125 Q106.3125 301.7812 107.1562 296.1562 Q108 290.5312 108 287.1562 Q108 281.5312 104.625 274.7812 Q101.25 268.0312 95.625 263.5312 L78.1875 251.7188 L78.1875 360.5625 L69.75 369 Q64.6875 373.7812 58.2188 376.4531 Q51.75 379.125 43.3125 379.125 ZM107.7188 257.625 Q108 255.2344 108 253.4062 Q108 247.7812 104.625 241.0312 Q101.25 234.2812 95.625 229.7812 L78.1875 217.9688 L78.1875 228.0938 L106.3125 256.2188 L107.7188 257.625 Z"
            stroke="none"
          />
        </g>
      </g>
    </svg>
  );
}

export {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
  QuarterNote,
};
