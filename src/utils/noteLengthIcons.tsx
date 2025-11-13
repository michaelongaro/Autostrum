import type {
  BaseNoteLengths,
  ChordSection,
  FullNoteLengths,
} from "~/stores/TabStore";
import type { ReactElement, SVGProps } from "react";

function chordSequencesAllHaveSameNoteLength(chordSection: ChordSection) {
  const noteLength = chordSection.data[0]?.strummingPattern.baseNoteLength;

  return chordSection.data.every(
    (chordSequence) =>
      chordSequence.strummingPattern.baseNoteLength === noteLength,
  );
}

function getDynamicNoteLengthIcon({
  noteLength,
  isARestNote,
}: {
  noteLength: FullNoteLengths | "measureLine";
  isARestNote?: boolean;
}) {
  type IconRenderer = (props: SVGProps<SVGSVGElement>) => ReactElement;

  let Icon: IconRenderer | undefined;

  if (isARestNote) {
    if (noteLength.includes("whole")) {
      Icon = WholeRest;
    } else if (noteLength.includes("half")) {
      Icon = HalfRest;
    } else if (noteLength.includes("quarter")) {
      Icon = QuarterRest;
    } else if (noteLength.includes("eighth")) {
      Icon = EighthRest;
    } else if (noteLength.includes("sixteenth")) {
      Icon = SixteenthRest;
    }
  } else if (noteLength.includes("whole")) {
    Icon = WholeNote;
  } else if (noteLength.includes("half")) {
    Icon = HalfNote;
  } else if (
    noteLength.includes("quarter") ||
    noteLength.includes("measureLine")
  ) {
    Icon = QuarterNote;
  } else if (noteLength.includes("eighth")) {
    Icon = EighthNote;
  } else if (noteLength.includes("sixteenth")) {
    Icon = SixteenthNote;
  }

  const dotCount = noteLength.includes("double-dotted")
    ? 2
    : noteLength.includes("dotted")
      ? 1
      : 0;
  const shouldRenderDots = Icon && dotCount > 0 && noteLength !== "measureLine";
  const dots = shouldRenderDots
    ? Array.from({ length: dotCount }, (_, index) => (
        <span
          key={`note-dot-${index}`}
          className="absolute left-full top-1 rounded-full bg-current"
          style={{
            width: "3px",
            height: "3px",
            marginLeft: `${4 + index * 6}px`,
          }}
        />
      ))
    : null;

  return Icon ? (
    <span className="relative inline-flex items-center">
      <Icon />
      {dots}
    </span>
  ) : null;
}

function WholeNote(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="0.5rem"
      height="1rem"
      stroke="currentColor"
      fill="currentColor"
      viewBox="0 0 300.000000 202.000000"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <g transform="translate(0.000000,202.000000) scale(0.100000,-0.100000)">
        <path d="M1195 2010 c-498 -56 -928 -298 -1109 -623 -63 -113 -81 -186 -80 -322 1 -90 6 -140 23 -200 139 -513 676 -824 1481 -861 505 -22 992 147 1271 443 202 215 262 447 184 719 -128 443 -539 726 -1205 829 -124 19 -451 28 -565 15z m360 -255 c166 -44 316 -178 412 -370 72 -142 154 -417 169 -565 25 -254 -170 -515 -421 -561 -70 -13 -200 -6 -266 15 -214 66 -355 245 -453 573 -102 340 -107 482 -23 645 90 176 250 276 447 277 42 1 102 -6 135 -14z" />
      </g>
    </svg>
  );
}

function HalfNote(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 58.548 142.385"
      height="1rem"
      width="0.5rem"
      stroke="currentColor"
      fill="currentColor"
      {...props}
    >
      <g
        style={{
          fillOpacity: 1,
          strokeWidth: 0.141092,
        }}
      >
        <path
          d="M183.328 537.995c-.078.795-.682 1.404-1.197 1.961-1.152 1.108-2.564 1.993-4.12 2.366-.46.08-1.204.157-1.337-.446-.129-.638.35-1.198.71-1.67.937-1.092 2.164-1.907 3.462-2.49.676-.256 1.462-.577 2.17-.269a.6.6 0 0 1 .312.548zm-1.936-1.647c-1.759.013-3.427.99-4.511 2.358-.725.939-1.206 2.3-.618 3.425.444.905 1.501 1.264 2.443 1.212 1.625-.034 3.132-.935 4.209-2.124.797-.915 1.384-2.239.922-3.448-.333-.88-1.25-1.393-2.154-1.414a5 5 0 0 0-.291-.009z"
          style={{
            fillOpacity: 1,
            strokeWidth: 0.301292,
            strokeMiterlimit: 4,
            strokeDasharray: "none",
            strokeOpacity: 1,
          }}
          transform="matrix(6.8242 .6385 -.66434 7.29897 -840.506 -3938.742)"
        />
      </g>
      <path
        d="m-526.399.037.17 51.151.185 55.193-7.184-4.042L-532.631 0Z"
        style={{
          opacity: 1,
          vectorEffect: "none",
          fillOpacity: 1,
          fillRule: "nonzero",
          strokeWidth: 2.96315,
          strokeLinecap: "butt",
          strokeLinejoin: "miter",
          strokeMiterlimit: 4,
          strokeDasharray: "none",
          strokeDashoffset: 0,
          strokeOpacity: 1,
          paintOrder: "stroke fill markers",
        }}
        transform="translate(584.592)"
      />
    </svg>
  );
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

function EighthNote(props: SVGProps<SVGSVGElement>) {
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

function WholeRest(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={"1rem"}
      height={"1rem"}
      stroke="currentColor"
      fill="currentColor"
      viewBox="0 0 43.039 13.406"
      xmlSpace="preserve"
      {...props}
    >
      <path
        d="M0 1.235v1.234h8.114v10.937h26.775l.107-5.398.105-5.362 3.987-.106 3.95-.106V0H0Z"
        style={{
          stroke: "none",
          strokeWidth: 0.0352778,
        }}
      />
    </svg>
  );
}

function HalfRest(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={"1rem"}
      height={"1rem"}
      viewBox="0 0 43.039 13.406"
      stroke="currentColor"
      fill="currentColor"
      xmlSpace="preserve"
      transform="rotate(180)"
      {...props}
    >
      <path
        d="M0 1.235v1.234h8.114v10.937h26.775l.107-5.398.105-5.362 3.987-.106 3.95-.106V0H0Z"
        style={{
          stroke: "none",
          strokeWidth: 0.0352778,
        }}
      />
    </svg>
  );
}

function QuarterRest(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={"1rem"}
      height={"1rem"}
      stroke="currentColor"
      fill="currentColor"
      viewBox="0 0 32.442 104.253"
      xmlSpace="preserve"
      {...props}
    >
      <path
        d="M7.43 1.272 5.914 2.577 7.5 5.082c4.128 6.455 5.61 10.936 5.644 17.215.036 4.692-.458 7.091-2.257 11.077-1.306 2.893-4.34 6.844-7.056 9.278l-2.081 1.87 7.62 11.465c4.163 6.315 7.831 11.924 8.114 12.453l.529.988-1.517-.811c-1.305-.706-2.046-.812-5.045-.812-3.175.036-3.74.106-5.609 1.059-7.761 3.88-7.796 12.911-.07 24.483 2.151 3.245 8.607 11.147 8.89 10.9.07-.07-.283-1.128-.777-2.363-2.54-6.244-3.422-13.582-2.187-17.674.74-2.435 2.61-4.657 4.586-5.468 2.258-.953 6.491-.812 9.843.247l2.68.881-2.398-4.62c-4.55-8.75-6.42-14.818-6.456-21.026 0-3.14.106-4.093.917-6.28 1.447-3.986 3.916-7.62 7.938-11.677l3.633-3.633-.776-1.13C29.656 28.648 9.265.25 9.053.003c-.035-.036-.776.529-1.623 1.27"
        style={{
          stroke: "none",
          strokeWidth: 0.0352778,
        }}
      />
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
  WholeNote,
  HalfNote,
  QuarterNote,
  EighthNote,
  SixteenthNote,
  WholeRest,
  HalfRest,
  QuarterRest,
  EighthRest,
  SixteenthRest,
};
