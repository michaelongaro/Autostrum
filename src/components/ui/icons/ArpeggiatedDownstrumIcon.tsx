function ArpeggiatedDownstrumIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      height="1em"
      width="1em"
      {...props}
    >
      <path
        d="M8 1.5C9.6 3.2 6.4 5.2 8 7s1.6 3.8 0 5.5S6.4 15.8 8 17.5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M4.25 16.25 8 22.25l3.75-6"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export default ArpeggiatedDownstrumIcon;
