import type { ChordSection } from "~/stores/TabStore";
import type { SVGProps } from "react";

function chordSequencesAllHaveSameNoteLength(chordSection: ChordSection) {
  const noteLength = chordSection.data[0]?.strummingPattern.noteLength;

  return chordSection.data.every(
    (chordSequence) => chordSequence.strummingPattern.noteLength === noteLength,
  );
}

function getDynamicNoteLengthIcon({
  noteLength,
  isARestNote,
  forInlineTabViewing,
}: {
  noteLength:
    | "1/4th"
    | "1/4th triplet"
    | "1/8th"
    | "1/8th triplet"
    | "1/16th"
    | "1/16th triplet"
    | "measureLine";
  isARestNote?: boolean;
  forInlineTabViewing?: boolean;
}) {
  if (isARestNote) {
    if (noteLength === "1/8th") {
      return (
        <EighthRest className={`${forInlineTabViewing ? "" : "mr-[2px]"}`} />
      );
    } else if (noteLength === "1/16th") {
      return (
        <SixteenthRest className={`${forInlineTabViewing ? "" : "mr-[2px]"}`} />
      );
    }
  }

  if (
    noteLength === "1/4th" ||
    noteLength === "1/4th triplet" ||
    noteLength === "measureLine"
  ) {
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

function EighthRest(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={22}
      height={22}
      viewBox="10 10 24 24"
      stroke="currentColor"
      fill="currentColor"
      colorInterpolation="auto"
      {...props}
    >
      <g
        style={{
          fillRule: "evenodd",
          strokeWidth: 0,
          strokeLinecap: "butt",
          strokeLinejoin: "round",
          strokeMiterlimit: 10,
        }}
      >
        <path
          d="M531.098 74.847c-.52.098-.918.457-1.098.953-.039.16-.039.199-.039.418 0 .301.019.461.16.699.199.399.617.719 1.094.836.5.141 1.336.02 2.293-.297l.238-.082-1.176 3.25-1.156 3.246s.039.02.102.063a.95.95 0 0 0 .457.137c.238 0 .539-.137.578-.258 0-.039.558-1.934 1.234-4.184l1.195-4.125-.039-.058c-.097-.121-.296-.16-.418-.063a1.4 1.4 0 0 0-.14.18c-.18.301-.637.836-.875 1.035-.219.18-.34.199-.539.121-.18-.098-.239-.199-.36-.738-.117-.535-.257-.778-.558-.977a1.23 1.23 0 0 0-.953-.156z"
          transform="matrix(1.8 0 0 1.8 -936.447 -121.34)"
        />
      </g>
    </svg>
  );
}

function SixteenthRest(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={22}
      height={17}
      viewBox="10 13 24 21"
      stroke="currentColor"
      fill="currentColor"
      colorInterpolation="auto"
      style={{
        marginBottom: "3px",
      }}
      {...props}
    >
      <g
        style={{
          fillRule: "evenodd",
          strokeWidth: 0,
          strokeLinecap: "butt",
          strokeLinejoin: "round",
          strokeMiterlimit: 10,
        }}
      >
        <path
          d="M544.191 74.847a1.43 1.43 0 0 0-1.093.953c-.043.16-.043.199-.043.418 0 .301.019.461.16.699.199.399.617.719 1.098.836.496.141 1.292.039 2.25-.277.14-.059.257-.102.257-.082 0 .023-.894 2.93-.933 3.031-.102.258-.442.735-.739 1.035-.277.278-.418.34-.636.239-.18-.098-.239-.2-.36-.739-.101-.398-.179-.617-.339-.773-.418-.461-1.137-.52-1.692-.16a1.64 1.64 0 0 0-.578.758c-.043.156-.043.199-.043.417 0 .297.023.458.16.696.199.398.617.719 1.098.836.219.062.777.062 1.156 0a9 9 0 0 0 1.074-.278c.16-.058.301-.097.301-.078 0 0-1.953 6.356-1.992 6.453 0 .02.156.141.316.18q.24.094.481 0c.156-.039.316-.137.316-.199.02-.02.817-3.027 1.793-6.676l1.774-6.633-.039-.058c-.079-.121-.239-.141-.379-.082-.079.039-.079.039-.317.398-.199.32-.48.656-.64.816-.219.18-.336.219-.536.141-.179-.098-.242-.199-.359-.738-.121-.535-.262-.778-.559-.977a1.23 1.23 0 0 0-.957-.156z"
          transform="matrix(1.8 0 0 1.8 -958.53 -120.789)"
        />
      </g>
    </svg>
  );
}

export {
  chordSequencesAllHaveSameNoteLength,
  getDynamicNoteLengthIcon,
  QuarterNote,
  EigthNote,
  SixteenthNote,
};
