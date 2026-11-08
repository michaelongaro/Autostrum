import type { SVGProps } from "react";

// Match BsGridFill's 14px drawing inside a 16px canvas.
function TableViewIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      {...props}
    >
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
      <path d="M6 2v12M2 6h12M2 10h12" />
    </svg>
  );
}

export default TableViewIcon;
