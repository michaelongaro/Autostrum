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
        d="m129 67 15-6 6 16-15 6z"
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
      <circle cx="157" cy="90" r="67" className="fill-primary/5" />
      <g transform="rotate(-8 160 100)">
        <rect
          x="54"
          y="60"
          width="212"
          height="82"
          rx="10"
          className="fill-background stroke-foreground/70"
          strokeWidth="2.5"
        />
        <path d="M66 61h36v80H66z" className="fill-primary/10" />
        <path
          d="M102 61v80m41-80v80m41-80v80m41-80v80"
          className="stroke-foreground/25"
          strokeWidth="2"
        />
        <path d="M65 62v78" className="stroke-foreground/70" strokeWidth="4" />
        <path
          d="M67 71h198M67 83h198M67 95h198M67 107h198M67 119h198M67 131h198"
          className="stroke-foreground/30"
          strokeWidth="1.5"
        />
        <circle cx="123" cy="101" r="2.5" className="fill-foreground/20" />
        <circle cx="205" cy="101" r="2.5" className="fill-foreground/20" />
        <circle cx="84" cy="119" r="8" className="fill-primary/30" />
        <circle cx="124" cy="95" r="8" className="fill-primary" />
        <circle cx="164" cy="83" r="8" className="fill-primary/30" />
      </g>
      <circle
        cx="239"
        cy="48"
        r="27"
        className="fill-background stroke-foreground/70"
        strokeWidth="2.5"
      />
      <path
        d="M237 57V36l14-3v21m-14-12 14-3"
        className="stroke-foreground"
        strokeWidth="2.5"
      />
      <ellipse cx="233" cy="58" rx="5" ry="3.5" className="fill-primary" />
      <ellipse cx="247" cy="55" rx="5" ry="3.5" className="fill-primary" />
      <path
        d="M47 38h12m-6-6v12m230 87h10m-5-5v10"
        className="stroke-primary/60"
        strokeWidth="2"
      />
    </svg>
  );
}
