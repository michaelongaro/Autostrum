import type { SVGProps } from "react";

const CountIn = (props: SVGProps<SVGSVGElement>) => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth={0}
    viewBox="0 0 256 256"
    height={200}
    width={200}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M232 136.66A104.12 104.12 0 1 1 119.34 24a8 8 0 0 1 1.32 16A88.12 88.12 0 1 0 216 135.34a8 8 0 0 1 16 1.32M160 48a12 12 0 1 0-12-12 12 12 0 0 0 12 12m36 24a12 12 0 1 0-12-12 12 12 0 0 0 12 12m24 36a12 12 0 1 0-12-12 12 12 0 0 0 12 12"
      stroke="none"
    />
    <text
      x={128}
      y={120}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={120}
      fontWeight={700}
      stroke="none"
    >
      {"3"}
    </text>
  </svg>
);

export default CountIn;
