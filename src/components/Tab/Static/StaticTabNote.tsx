interface StaticTabNote {
  note: string;
  isAccented?: boolean;
  isStaccato?: boolean;
}

function StaticTabNote({ note, isAccented, isStaccato }: StaticTabNote) {
  return (
    <div className="baseFlex w-[35px]">
      <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
      <div
        // "x" wasn't as centered as regular numbers were, manual adjustment below
        style={{
          marginTop: note === "x" ? "-2px" : "0px",
          marginBottom: note === "x" ? "2px" : "0px",
        }}
        className={`baseFlex relative ${isAccented ? "font-bold" : ""}`}
      >
        {note}
        {isStaccato && <div className="relative -top-2">.</div>}
      </div>
      <div className="my-3 h-[1px] flex-[1] bg-foreground/50"></div>
    </div>
  );
}

export default StaticTabNote;
