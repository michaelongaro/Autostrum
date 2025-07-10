import type { SVGProps } from "react";

function Ellipsis(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={0}
      aria-hidden="true"
      className="z-50 h-2 w-4 rotate-90"
      viewBox="10.5 4.5 3 15"
      {...props}
    >
      <path
        fillRule="evenodd"
        stroke="none"
        d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default Ellipsis;
