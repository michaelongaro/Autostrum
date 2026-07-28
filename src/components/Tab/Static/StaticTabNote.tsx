import PauseIcon from "~/components/ui/icons/PauseIcon";

interface StaticTabNote {
  note: string;
  isAccented?: boolean;
  isStaccato?: boolean;
  isRest?: boolean;
}

function StaticTabNote({
  note,
  isAccented,
  isStaccato,
  isRest,
}: StaticTabNote) {
  return (
    <div className="baseFlex h-[24px] w-full">
      {/* pre-note string visual */}
      <div
        style={{
          backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
        }}
        className="h-[1px] w-full"
      ></div>

      {/* note */}
      <div
        // "x" wasn't as centered as regular numbers were, manual adjustment below
        style={{
          marginTop: note === "x" ? "-2px" : "0px",
          marginBottom: note === "x" ? "2px" : "0px",
          color: "hsl(var(--screenshot-foreground))",
        }}
        className={`baseFlex relative ${isAccented ? "font-bold" : ""}`}
      >
        {isRest ? (
          <PauseIcon className="absolute bottom-1.5 size-3" />
        ) : (
          <>{note}</>
        )}

        {isStaccato && <div className="relative -top-2">.</div>}
      </div>

      {/* post-note string visual */}
      <div
        style={{
          backgroundColor: "hsl(var(--screenshot-foreground) / 0.5)",
        }}
        className="h-[1px] w-full"
      ></div>
    </div>
  );
}

export default StaticTabNote;
