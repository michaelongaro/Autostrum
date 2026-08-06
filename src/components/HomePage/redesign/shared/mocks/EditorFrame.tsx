import { cn } from "~/utils/cn";

type EditorFrameProps = {
  className?: string;
  compact?: boolean;
};

const STRINGS = ["E", "B", "G", "D", "A", "E"] as const;
const NOTES = [
  [null, 2, null, 4, null, 5, null, null, 7],
  [null, null, 3, null, null, 5, null, 7, null],
  [2, null, null, 4, null, null, 6, null, null],
  [null, null, 2, null, 4, null, null, 5, null],
  [null, 2, null, null, 4, null, 5, null, null],
  [0, null, null, 2, null, null, 3, null, 5],
] as const;

function EditorFrame({ className, compact = false }: EditorFrameProps) {
  return (
    <div
      className={cn(
        "hp-panel overflow-hidden rounded-xl border bg-background shadow-md",
        className,
      )}
      aria-hidden="true"
    >
      <div className="baseFlex !justify-between gap-3 border-b px-3 py-2 sm:px-4">
        <div className="baseFlex gap-2 text-xs sm:text-sm">
          <span className="font-semibold">Section 1</span>
          <span className="text-foreground/60">Eighth notes · 95 BPM · ×2</span>
        </div>
        <div className="baseFlex gap-2">
          <span className="rounded-md bg-audio/90 px-2.5 py-1 text-xs font-semibold text-audio-foreground hp-play-pulse">
            Play
          </span>
          <span className="hidden rounded-md border px-2 py-1 text-xs text-foreground/70 sm:inline">
            PM Editor
          </span>
        </div>
      </div>

      <div className={cn("space-y-1 px-3 py-4 sm:px-5", compact && "py-3")}>
        {STRINGS.map((stringName, row) => (
          <div key={`${stringName}-${row}`} className="baseFlex gap-2">
            <span className="w-3 shrink-0 text-[10px] font-medium text-foreground/50">
              {stringName}
            </span>
            <div className="relative flex h-6 flex-1 items-center sm:h-7">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <div className="relative z-[1] flex w-full justify-between px-1">
                {NOTES[row]!.map((fret, col) =>
                  fret === null ? (
                    <span key={col} className="size-5 sm:size-6" />
                  ) : (
                    <span
                      key={col}
                      className="baseFlex size-5 rounded-full border border-primary/40 bg-secondary text-[10px] font-semibold text-foreground sm:size-6 sm:text-xs"
                    >
                      {fret}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="baseFlex !justify-between gap-3 border-t bg-secondary/40 px-3 py-2 text-xs sm:px-4">
          <span className="text-foreground/70">Acoustic guitar — Steel</span>
          <div className="baseFlex gap-3">
            <span className="text-foreground/70">1×</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-border sm:w-40">
              <span className="block h-full w-1/3 rounded-full bg-audio" />
            </span>
            <span className="text-foreground/60">0:42</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorFrame;
