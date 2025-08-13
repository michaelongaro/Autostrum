function StopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={0}
      viewBox="4.5 3.25 7 9.5"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "0.75rem",
        height: "0.75rem",
      }}
      {...props}
    >
      <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5" />
    </svg>
  );
}

export default StopIcon;
