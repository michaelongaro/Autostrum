import { parse, toString } from "~/utils/tunings";

// most likely delete this component, but keeping it around for now
// in case we need it

interface PlaybackTabEndcap {
  type: "start" | "end";
  tuning?: string;
}

function PlaybackTabEndcap({ type, tuning }: PlaybackTabEndcap) {
  return (
    <div
      className={`baseVertFlex mb-[3.2rem] h-[271px] ${type === "start" ? "ml-4" : ""}`}
    >
      {type === "start" && tuning ? (
        <div
          style={{
            height: "168px",
            marginBottom: "0px",
          }}
          className="baseVertFlex relative w-full rounded-l-2xl border-2 border-foreground p-2"
        >
          {toString(parse(tuning), { pad: 1 })
            .split("")
            .reverse()
            .map((note, index) => (
              <div key={index}>{note}</div>
            ))}
        </div>
      ) : (
        <div
          style={{
            height: "168px",
            marginBottom: "0px",
          }}
          className="rounded-r-2xl border-2 border-foreground p-1"
        ></div>
      )}
    </div>
  );
}

export default PlaybackTabEndcap;
