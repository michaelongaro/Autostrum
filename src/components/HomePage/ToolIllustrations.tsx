import type { SVGProps } from "react";

const illustrationProps: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 320 180",
  fill: "none",
  "aria-hidden": true,
  focusable: false,
  className: "h-full w-full",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function MetronomeIllustration() {
  return (
    <svg {...illustrationProps}>
      <circle cx="160" cy="88" r="68" className="fill-primary/5" />
      <path
        d="M90 59a78 78 0 0 1 140 0"
        className="stroke-foreground/15"
        strokeWidth="2"
        strokeDasharray="3 7"
      />
      <ellipse cx="160" cy="156" rx="61" ry="6" className="fill-foreground/5" />
      <path
        d="M142 28h36l32 115a7 7 0 0 1-7 9h-86a7 7 0 0 1-7-9z"
        className="fill-background stroke-foreground/70"
        strokeWidth="2.5"
      />
      <path d="M148 39h24l23 91h-70z" className="fill-primary/15" />
      <path
        d="M160 47v75m-7-62h14m-14 14h14m-14 14h14m-14 14h14"
        className="stroke-foreground/30"
        strokeWidth="2"
      />
      <path
        d="m160 129-34-89"
        className="stroke-foreground"
        strokeWidth="3.5"
      />
      <path
        d="m127 67 15-6 6 16-15 6z"
        className="fill-primary stroke-foreground/70"
        strokeWidth="2"
      />
      <circle cx="160" cy="129" r="5" className="fill-foreground" />
      <path d="M118 142h84" className="stroke-foreground/20" strokeWidth="2" />
      <circle cx="225" cy="96" r="5" className="fill-primary" />
      <circle cx="240" cy="96" r="3" className="fill-foreground/20" />
      <circle cx="253" cy="96" r="3" className="fill-foreground/20" />
      <circle cx="266" cy="96" r="3" className="fill-foreground/20" />
      <path
        d="M73 99h17m-8-8v16"
        className="stroke-primary/60"
        strokeWidth="2"
      />
    </svg>
  );
}

export function TunerIllustration() {
  return (
    <svg {...illustrationProps}>
      <rect
        x="78"
        y="24"
        width="164"
        height="132"
        rx="42"
        className="fill-primary/5"
        transform="rotate(-8 160 90)"
      />
      <ellipse cx="160" cy="153" rx="83" ry="6" className="fill-foreground/5" />
      <rect
        x="66"
        y="38"
        width="188"
        height="110"
        rx="18"
        className="fill-background stroke-foreground/70"
        strokeWidth="2.5"
      />
      <rect
        x="78"
        y="50"
        width="164"
        height="86"
        rx="10"
        className="fill-primary/10"
      />
      <path
        d="M104 101a56 56 0 0 1 112 0"
        className="stroke-foreground/25"
        strokeWidth="4"
      />
      <path
        d="M149 46a56 56 0 0 1 22 0"
        className="stroke-primary"
        strokeWidth="4"
      />
      <path
        d="m113 78 6 3m14-24 4 6m23-13v7m23 0-4 6m28 15-6 3"
        className="stroke-foreground/50"
        strokeWidth="2"
      />
      <path d="M160 95V65" className="stroke-foreground" strokeWidth="3" />
      <circle cx="160" cy="97" r="4" className="fill-foreground" />
      <path
        d="M167 110h-14v17h14m-14-9h11"
        className="stroke-foreground"
        strokeWidth="3"
      />
      <path
        d="M94 115h8m116 0h8m-4-4v8"
        className="stroke-foreground/40"
        strokeWidth="2"
      />
      <path
        d="M42 82v22m-9-16v10m245-16v22m9-16v10"
        className="stroke-primary/60"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function NoteTrainerIllustration() {
  return (
    <svg {...illustrationProps}>
      <circle cx="156" cy="89" r="67" className="fill-primary/5" />
      <ellipse cx="161" cy="156" rx="94" ry="6" className="fill-foreground/5" />
      <path
        d="M80 76V62a38 38 0 0 1 76 0c0 17-9 28-19 39-7 7-9 13-11 23-2 12-10 20-22 20-14 0-24-12-24-27"
        className="fill-background stroke-foreground/70"
        strokeWidth="2.5"
      />
      <path
        d="M98 62a20 20 0 0 1 40 0c0 9-5 15-12 22-8 7-12 13-12 22a10 10 0 0 1-20 0v-7a13 13 0 0 1 13-13h5"
        className="stroke-primary"
        strokeWidth="3"
      />
      <path
        d="M170 57a22 22 0 0 1 0 28m10-38a36 36 0 0 1 0 48"
        className="stroke-primary/60"
        strokeWidth="2.5"
      />
      <circle cx="232" cy="60" r="29" className="fill-primary/10" />
      <path
        d="M234 68V43l13 5v0"
        className="stroke-primary"
        strokeWidth="2.5"
      />
      <ellipse
        cx="229"
        cy="69"
        rx="6"
        ry="4.5"
        transform="rotate(-20 228 69)"
        className="fill-primary"
      />
      <rect
        x="150"
        y="111"
        width="34"
        height="34"
        rx="8"
        className="fill-background stroke-foreground/25"
        strokeWidth="2"
      />
      <rect
        x="192"
        y="107"
        width="38"
        height="38"
        rx="9"
        className="fill-primary/15 stroke-primary"
        strokeWidth="2.5"
      />
      <rect
        x="238"
        y="111"
        width="34"
        height="34"
        rx="8"
        className="fill-background stroke-foreground/25"
        strokeWidth="2"
      />
      <path
        d="M172 122a7 7 0 1 0 0 12m88-13h-10v14h10m-10-7h8"
        className="stroke-foreground/50"
        strokeWidth="2"
      />
      <path
        d="M206 119h4a7 7 0 0 1 0 14h-4z"
        className="stroke-foreground"
        strokeWidth="2.5"
      />
      <circle
        cx="230"
        cy="107"
        r="9"
        className="fill-primary stroke-background"
        strokeWidth="2.5"
      />
      <path
        d="m226 107 3 3 5-6"
        className="stroke-primary-foreground"
        strokeWidth="2"
      />
      <path
        d="M52 69h12m-6-6v12m210 17h10m-5-5v10"
        className="stroke-primary/60"
        strokeWidth="2"
      />
    </svg>
  );
}
