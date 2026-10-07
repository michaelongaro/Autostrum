import { FaPlay } from "react-icons/fa6";
import { cn } from "~/utils/cn";

type PlaybackFrameProps = {
  className?: string;
  showControls?: boolean;
};

const CHORDS = ["Em", "G", "D", "C", "Em", "G", "Dsus4", "Cadd9", "Em", "G"];

function PlaybackFrame({
  className,
  showControls = true,
}: PlaybackFrameProps) {
  return (
    <div
      className={cn(
        "hp-panel overflow-hidden rounded-xl border bg-background shadow-md",
        className,
      )}
      aria-hidden="true"
    >
      <div className="baseFlex !justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
        <div className="baseVertFlex !items-start gap-0.5">
          <p className="text-sm font-semibold sm:text-base">Everlong</p>
          <p className="text-xs text-foreground/65">Foo Fighters · Rock</p>
        </div>
        <div className="baseFlex gap-2 text-xs text-foreground/70">
          <span className="rounded-md border px-2 py-0.5">135 BPM</span>
          <span className="rounded-md border px-2 py-0.5">Standard</span>
        </div>
      </div>

      <div className="relative overflow-hidden px-3 py-5 sm:px-5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-10 bg-gradient-to-l from-background to-transparent" />
        <div className="hp-chord-strip baseFlex w-max gap-3">
          {[...CHORDS, ...CHORDS].map((chord, i) => (
            <div
              key={`${chord}-${i}`}
              className={cn(
                "baseVertFlex min-w-[64px] rounded-md border px-3 py-2",
                i === 2
                  ? "border-audio/60 bg-audio/15"
                  : "border-border/70 bg-secondary/40",
              )}
            >
              <span className="text-sm font-semibold">{chord}</span>
              <span className="mt-1 h-8 w-10 rounded-sm border border-dashed border-foreground/20" />
            </div>
          ))}
        </div>

        <div className="baseFlex absolute inset-0 z-[3]">
          <button
            type="button"
            tabIndex={-1}
            className="baseFlex size-14 rounded-full border border-audio bg-audio text-audio-foreground hp-play-pulse sm:size-16"
            aria-hidden
          >
            <FaPlay className="ml-0.5 size-5" />
          </button>
        </div>
      </div>

      {showControls && (
        <div className="baseFlex flex-wrap !justify-between gap-3 border-t bg-secondary/35 px-3 py-2.5 text-xs sm:px-4">
          <div className="baseFlex gap-2">
            <span className="rounded-md border px-2 py-1">Steel</span>
            <span className="rounded-md border px-2 py-1">0.75×</span>
            <span className="rounded-md border px-2 py-1">Loop</span>
            <span className="rounded-md border px-2 py-1">Count-in</span>
          </div>
          <span className="text-foreground/60">Section practice · Wake lock on</span>
        </div>
      )}
    </div>
  );
}

export default PlaybackFrame;
