import { motion } from "framer-motion";
import { Button } from "~/components/ui/button";
import { PrettyNote } from "~/components/ui/PrettyTuning";

const stringLabels = ["6", "5", "4", "3", "2", "1"];
const centsTicks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const stringThicknesses = [8, 7, 6, 5, 4, 3];

type ChromaticTunerPanelProps = {
  targetNotes: string[];
  currentTargetIndex: number;
  detectedNote: string | null;
  detectedFrequency: number | null;
  detectedCents: number | null;
  targetCentsOffset: number | null;
  toleranceCents: number;
  isListening: boolean;
  signalDetected: boolean;
  completed: boolean;
  error: string | null;
  permissionDenied: boolean;
  clarity: number;
  onStartListening: () => Promise<void>;
  onStopListening: () => void;
  onResetProgress: () => void;
  onPlayReferenceTone: () => Promise<void>;
  onSetCurrentTargetIndex: (index: number) => void;
};

function ChromaticTunerPanel({
  targetNotes,
  currentTargetIndex,
  detectedNote,
  detectedFrequency,
  detectedCents,
  targetCentsOffset,
  toleranceCents,
  isListening,
  signalDetected,
  completed,
  error,
  permissionDenied,
  clarity,
  onStartListening,
  onStopListening,
  onResetProgress,
  onPlayReferenceTone,
  onSetCurrentTargetIndex,
}: ChromaticTunerPanelProps) {
  const currentTarget = targetNotes[currentTargetIndex]?.toUpperCase() ?? "E2";
  const isInTune =
    targetCentsOffset !== null && Math.abs(targetCentsOffset) <= toleranceCents;
  const clampedTargetCents = Math.max(
    -50,
    Math.min(50, targetCentsOffset ?? 0),
  );
  const markerLeftPercent = ((clampedTargetCents + 50) / 100) * 100;
  const toleranceWidthPercent = Math.min(100, (toleranceCents / 50) * 100);
  const toleranceLeftPercent = 50 - toleranceWidthPercent / 2;

  return (
    <div className="baseVertFlex w-full max-w-[1100px] gap-5 rounded-lg border bg-secondary p-4 shadow-sm md:p-6">
      <div className="baseFlex w-full !justify-between gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
          Chromatic tuner
        </p>

        <div className="baseFlex gap-2">
          {isListening ? (
            <Button size="sm" variant="secondary" onClick={onStopListening}>
              Stop listening
            </Button>
          ) : (
            <Button size="sm" onClick={() => void onStartListening()}>
              Start listening
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={onResetProgress}>
            Reset
          </Button>
        </div>
      </div>

      <div className="baseFlex w-full gap-3 rounded-md border bg-background px-2 py-4 sm:px-4">
        {targetNotes.map((note, index) => {
          const selected = index === currentTargetIndex;
          const tuned = completed ? true : index < currentTargetIndex;

          return (
            <button
              type="button"
              key={`${note}-${index}`}
              className={`baseVertFlex relative flex-1 gap-1 rounded-md border px-2 py-3 text-sm transition-colors ${selected ? "border-primary bg-primary/10" : "bg-secondary"}`}
              onClick={() => {
                onSetCurrentTargetIndex(index);
              }}
            >
              <div className="baseFlex h-12 w-full">
                <motion.div
                  className={`rounded-full ${selected ? "bg-primary" : "bg-foreground/40"}`}
                  animate={{
                    opacity: selected ? 1 : 0.75,
                    scaleY: selected ? 1.04 : 1,
                  }}
                  transition={{ duration: 0.15 }}
                  style={{
                    width: `${stringThicknesses[index] ?? 3}px`,
                    height: "44px",
                  }}
                />
              </div>

              <span className="text-xs text-foreground/60">{`String ${stringLabels[index]}`}</span>
              <span className={tuned ? "text-primary" : "text-foreground"}>
                <PrettyNote note={note.toUpperCase()} displayWithFlex={true} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="baseVertFlex w-full rounded-md border bg-background p-4 md:px-6 md:py-8">
        <div className="baseFlex w-full !justify-between gap-3">
          <div className="baseFlex gap-2 text-sm font-medium text-foreground/80">
            <span>{`Target: String ${stringLabels[currentTargetIndex]}`}</span>
            <PrettyNote note={currentTarget} displayWithFlex={true} />
          </div>

          <div className="baseFlex gap-2 text-sm font-medium text-foreground/70">
            {signalDetected && detectedNote ? (
              <>
                <span>Detected:</span>
                <PrettyNote
                  note={detectedNote.toUpperCase()}
                  displayWithFlex={true}
                />
                <span>
                  {detectedFrequency
                    ? `${detectedFrequency.toFixed(1)} Hz`
                    : ""}
                </span>
              </>
            ) : (
              <span>{isListening ? "Listening..." : "Microphone idle"}</span>
            )}
          </div>
        </div>

        <div className="relative mt-6 w-full">
          <div className="baseFlex w-full !justify-between px-[1px] text-xs text-foreground/70">
            {centsTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>

          <div className="relative mt-4 h-[180px] w-full rounded-md border bg-secondary px-4 py-6">
            <motion.div
              className="absolute inset-0 rounded-md"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent 0px, transparent 18px, hsl(var(--foreground) / 0.05) 19px, transparent 20px)",
              }}
              animate={{
                backgroundPositionX: signalDetected ? ["0px", "24px"] : "0px",
                opacity: signalDetected ? 1 : 0.35,
              }}
              transition={{
                duration: 0.35,
                ease: "linear",
                repeat: signalDetected ? Infinity : 0,
              }}
            />

            <div
              className="absolute top-0 h-full bg-primary/15"
              style={{
                left: `${toleranceLeftPercent}%`,
                width: `${toleranceWidthPercent}%`,
              }}
            />

            <motion.div
              className="absolute left-0 right-0 top-1/2 h-px bg-foreground/30"
              animate={{
                opacity: signalDetected ? [0.35, 0.8, 0.35] : 0.35,
              }}
              transition={{
                duration: 0.8,
                repeat: signalDetected ? Infinity : 0,
                ease: "linear",
              }}
            />

            {centsTicks.map((tick) => {
              const tickLeft = ((tick + 50) / 100) * 100;

              return (
                <div
                  key={`tick-${tick}`}
                  className="absolute top-[34%] h-[32%] w-px bg-foreground/25"
                  style={{ left: `${tickLeft}%` }}
                />
              );
            })}

            {signalDetected && targetCentsOffset !== null && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                animate={{ left: `${markerLeftPercent}%` }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 24,
                  mass: 0.55,
                }}
              >
                <div className="relative flex -translate-x-1/2 flex-col items-center gap-2">
                  <motion.div
                    className="h-14 w-[3px] rounded-full bg-primary"
                    animate={{
                      boxShadow: signalDetected
                        ? [
                            "0 0 0px hsl(var(--primary) / 0)",
                            "0 0 12px hsl(var(--primary) / 0.65)",
                            "0 0 0px hsl(var(--primary) / 0)",
                          ]
                        : "0 0 0px hsl(var(--primary) / 0)",
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: signalDetected ? Infinity : 0,
                      ease: "linear",
                    }}
                  />
                  <div className="rounded-md border bg-background px-2 py-1 text-sm font-semibold text-primary">
                    {`${targetCentsOffset > 0 ? "+" : ""}${targetCentsOffset.toFixed(1)}¢`}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <motion.p
          className={`mt-4 text-center text-base font-medium ${isInTune ? "text-primary" : "text-foreground/80"}`}
          animate={{ opacity: isInTune ? 1 : 0.88 }}
          transition={{ duration: 0.2 }}
        >
          {completed
            ? "All strings reached target tuning."
            : !signalDetected
              ? "Pluck the highlighted string clearly near your microphone."
              : isInTune
                ? "In tune — hold and move to the next string."
                : targetCentsOffset !== null && targetCentsOffset < 0
                  ? "↑ Tune up (tighten)."
                  : "↓ Tune down (loosen)."}
        </motion.p>

        <div className="baseFlex mt-3 w-full !justify-between gap-3 text-xs text-foreground/60">
          <span>{`Clarity ${Math.round(clarity * 100)}%`}</span>
          {detectedCents !== null && (
            <span>
              {`Nearest-note deviation: ${detectedCents > 0 ? "+" : ""}${detectedCents.toFixed(1)}¢`}
            </span>
          )}
        </div>

        <div className="baseFlex mt-4 w-full">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onPlayReferenceTone()}
          >
            Play reference tone
          </Button>
        </div>
      </div>

      {(error || permissionDenied) && (
        <p className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Microphone access failed."}
        </p>
      )}
    </div>
  );
}

export default ChromaticTunerPanel;
