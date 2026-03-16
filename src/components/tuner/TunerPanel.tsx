import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { get } from "@tonaljs/note";
import { Button } from "~/components/ui/button";
import { FaMicrophone } from "react-icons/fa";
import TuningSelect from "~/components/ui/TuningSelect";

const stringLabels = ["6", "5", "4", "3", "2", "1"];
const centsTicks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const mobileLabelTicks = [-50, -25, 0, 25, 50];
const regularRangeCents = 25;
const regularArcMarkerRatios = [-1, -0.4, -0.2, 0, 0.2, 0.4, 1];
const stringThicknesses = [8, 7, 6, 5, 4, 3];

function frequencyFromMidi(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function formatNoteLabel(note: string) {
  const normalized = note.trim();
  if (!normalized) return "";

  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}

function frequencyFromNote(note: string) {
  const midi = get(note).midi;
  if (midi === null) return 0;

  return frequencyFromMidi(midi);
}

type TunerPanelProps = {
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
  onSetCurrentTargetIndex: (index: number) => void;
};

function TunerPanel({
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
  onSetCurrentTargetIndex,
}: TunerPanelProps) {
  const [mode, setMode] = useState<"regular" | "chromatic">("regular");
  const currentTarget = targetNotes[currentTargetIndex] ?? "e2";
  const currentTargetFrequency = useMemo(
    () => frequencyFromNote(currentTarget),
    [currentTarget],
  );
  const currentMicFrequency = detectedFrequency ?? 0;
  const hasRegularCents = signalDetected && targetCentsOffset !== null;
  const regularRawCentsOffset = hasRegularCents ? targetCentsOffset : 0;
  const clampedRegularCentsOffset = Math.max(
    -regularRangeCents,
    Math.min(regularRangeCents, regularRawCentsOffset),
  );
  const absoluteRegularCentsOffset = Math.abs(clampedRegularCentsOffset);
  const clampedDetectedCents = Math.max(-50, Math.min(50, detectedCents ?? 0));
  const regularNeedleDegrees =
    (clampedRegularCentsOffset / regularRangeCents) * 90;
  const chromaticMarkerLeftPercent = ((clampedDetectedCents + 50) / 100) * 100;
  const regularSemicircleGradient = useMemo(() => {
    const toAngle = (centsOffset: number) =>
      Math.max(
        0,
        Math.min(
          180,
          ((centsOffset + regularRangeCents) / (regularRangeCents * 2)) * 180,
        ),
      );
    const leftOrange = toAngle(-25);
    const leftYellow = toAngle(-10);
    const leftGreen = toAngle(-toleranceCents);
    const rightGreen = toAngle(toleranceCents);
    const rightYellow = toAngle(10);
    const rightOrange = toAngle(25);

    return `conic-gradient(from 270deg at 50% 100%, rgba(239, 68, 68, 0.2) 0deg ${leftOrange}deg, rgba(249, 115, 22, 0.2) ${leftOrange}deg ${leftYellow}deg, rgba(250, 204, 21, 0.2) ${leftYellow}deg ${leftGreen}deg, rgba(34, 197, 94, 0.18) ${leftGreen}deg ${rightGreen}deg, rgba(250, 204, 21, 0.2) ${rightGreen}deg ${rightYellow}deg, rgba(249, 115, 22, 0.2) ${rightYellow}deg ${rightOrange}deg, rgba(239, 68, 68, 0.2) ${rightOrange}deg 180deg, transparent 180deg 360deg)`;
  }, [toleranceCents]);
  const regularNeedleStyle = !hasRegularCents
    ? {
        backgroundColor: "hsl(var(--primary))",
        boxShadow: "0 0 10px hsl(var(--primary) / 0.45)",
      }
    : absoluteRegularCentsOffset <= toleranceCents
      ? {
          backgroundColor: "rgb(34 197 94)",
          boxShadow: "0 0 10px rgba(34, 197, 94, 0.45)",
        }
      : absoluteRegularCentsOffset <= 10
        ? {
            backgroundColor: "rgb(250 204 21)",
            boxShadow: "0 0 10px rgba(250, 204, 21, 0.45)",
          }
        : absoluteRegularCentsOffset <= 25
          ? {
              backgroundColor: "rgb(249 115 22)",
              boxShadow: "0 0 10px rgba(249, 115, 22, 0.45)",
            }
          : {
              backgroundColor: "rgb(239 68 68)",
              boxShadow: "0 0 10px rgba(239, 68, 68, 0.45)",
            };

  return (
    <div className="baseVertFlex w-full gap-4 border-y bg-secondary p-3 shadow-sm xs:rounded-lg xs:border sm:p-5 md:p-6">
      <div className="baseVertFlex w-full gap-3 sm:flex-row sm:!items-center sm:!justify-between">
        <div className="col-span-2 grid w-full grid-cols-2 gap-1 rounded-md border bg-background p-1 sm:col-span-1 sm:w-[190px]">
          <button
            type="button"
            onClick={() => {
              setMode("regular");
            }}
            className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "regular" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
          >
            Regular
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("chromatic");
            }}
            className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "chromatic" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
          >
            Chromatic
          </button>
        </div>

        <div className="baseFlex w-full !justify-between gap-4 sm:w-auto">
          <div className="baseFlex gap-2 sm:gap-3">
            <p className="text-sm font-semibold text-foreground/80">Tuning</p>
            <TuningSelect />
          </div>

          {isListening ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:hidden sm:w-auto"
              onClick={onStopListening}
            >
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="baseFlex w-full gap-2 sm:hidden sm:w-auto"
              onClick={() => void onStartListening()}
            >
              <FaMicrophone />
              Start
            </Button>
          )}
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-4">
          {isListening ? (
            <Button
              size="sm"
              variant="outline"
              className="hidden w-full sm:block sm:w-auto"
              onClick={onStopListening}
            >
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="hidden w-full gap-2 px-8 sm:flex sm:w-auto"
              onClick={() => void onStartListening()}
            >
              <FaMicrophone />
              Start
            </Button>
          )}

          <Button
            size="sm"
            disabled={mode === "chromatic" || currentTargetIndex === 0}
            variant="outline"
            className="hidden w-full sm:block sm:w-auto"
            onClick={onResetProgress}
          >
            Reset
          </Button>
        </div>
      </div>

      {mode === "regular" ? (
        <>
          <div className="baseVertFlex w-full rounded-md border bg-background p-3 sm:p-5">
            <div className="relative h-[230px] w-full sm:h-[280px]">
              <div className="baseVertFlex w-full gap-4">
                <p className="font-semibold text-foreground">
                  {formatNoteLabel(currentTarget)}
                </p>
                <div className="baseFlex gap-2">
                  <div className="baseFlex w-20">
                    {`${currentMicFrequency.toFixed(1)} Hz`}
                  </div>
                  /
                  <div className="baseFlex w-20">
                    {`${currentTargetFrequency.toFixed(1)} Hz`}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 h-[150px] w-[230px] -translate-x-1/2 sm:h-[180px] sm:w-[280px]">
                <div
                  className="absolute bottom-0 left-0 right-0 h-[120px] rounded-t-full sm:h-[144px]"
                  style={{ backgroundImage: regularSemicircleGradient }}
                />

                <div className="absolute bottom-0 left-0 right-0 h-[120px] rounded-t-full border-x border-t border-foreground/25 sm:h-[144px]" />

                <div className="absolute bottom-0 left-1/2 h-[122px] w-px -translate-x-1/2 bg-foreground/25 sm:h-[146px]" />

                <motion.div
                  className="absolute bottom-0 h-[108px] w-[3px] rounded-full sm:h-[130px]"
                  initial={false}
                  style={{
                    left: "calc(50% - 1.5px)",
                    transformOrigin: "bottom center",
                    transition:
                      "background-color 0.6s ease, box-shadow 0.6s ease",
                    ...regularNeedleStyle,
                  }}
                  animate={{ rotate: regularNeedleDegrees }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    mass: 0.6,
                  }}
                />

                <div className="absolute bottom-[-17px] left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-primary/60 bg-background text-[12px] font-semibold text-foreground/70 sm:size-9 sm:text-base">
                  ¢
                </div>

                {regularArcMarkerRatios.map((markerRatio) => {
                  const angleRadians = markerRatio * (Math.PI / 2);
                  const angleDegrees = markerRatio * 90;
                  const xOffset = Math.sin(angleRadians) * 116;
                  const yOffset = Math.cos(angleRadians) * 126;
                  const tickHalfHeight = 4;

                  return (
                    <div
                      key={`regular-tick-mobile-${markerRatio}`}
                      className="absolute h-2 w-px bg-foreground/45 sm:hidden"
                      style={{
                        left: `calc(50% + ${xOffset}px)`,
                        bottom: `${yOffset - tickHalfHeight}px`,
                        transform: `translateX(-50%) rotate(${angleDegrees}deg)`,
                      }}
                    />
                  );
                })}

                {regularArcMarkerRatios.map((markerRatio) => {
                  const angleRadians = markerRatio * (Math.PI / 2);
                  const angleDegrees = markerRatio * 90;
                  const xOffset = Math.sin(angleRadians) * 141;
                  const yOffset = Math.cos(angleRadians) * 151;
                  const tickHalfHeight = 5;

                  return (
                    <div
                      key={`regular-tick-desktop-${markerRatio}`}
                      className="absolute hidden h-2.5 w-px bg-foreground/45 sm:block"
                      style={{
                        left: `calc(50% + ${xOffset}px)`,
                        bottom: `${yOffset - tickHalfHeight}px`,
                        transform: `translateX(-50%) rotate(${angleDegrees}deg)`,
                      }}
                    />
                  );
                })}

                {regularArcMarkerRatios.map((markerRatio) => {
                  const angleRadians = markerRatio * (Math.PI / 2);
                  const xOffset = Math.sin(angleRadians) * 124;
                  const yOffset = Math.cos(angleRadians) * 136;
                  const markerValue = markerRatio * regularRangeCents;
                  const markerLabel =
                    Math.abs(markerValue) < 0.5
                      ? "0"
                      : `${markerValue > 0 ? "+" : ""}${Math.round(markerValue)}`;

                  return (
                    <div
                      key={`regular-marker-mobile-${markerRatio}`}
                      className={`absolute text-[10px] font-medium tabular-nums sm:hidden ${markerRatio === 0 ? "text-foreground/80" : "text-foreground/60"}`}
                      style={{
                        left: `calc(50% + ${xOffset}px)`,
                        bottom: `${yOffset}px`,
                        transform: "translate(-50%, 50%)",
                      }}
                    >
                      {markerLabel}
                    </div>
                  );
                })}

                {regularArcMarkerRatios.map((markerRatio) => {
                  const angleRadians = markerRatio * (Math.PI / 2);
                  const xOffset = Math.sin(angleRadians) * 152;
                  const yOffset = Math.cos(angleRadians) * 164;
                  const markerValue = markerRatio * regularRangeCents;
                  const markerLabel =
                    Math.abs(markerValue) < 0.5
                      ? "0"
                      : `${markerValue > 0 ? "+" : ""}${Math.round(markerValue)}`;

                  return (
                    <div
                      key={`regular-marker-desktop-${markerRatio}`}
                      className={`absolute hidden text-xs font-medium tabular-nums sm:block ${markerRatio === 0 ? "text-foreground/80" : "text-foreground/60"}`}
                      style={{
                        left: `calc(50% + ${xOffset}px)`,
                        bottom: `${yOffset}px`,
                        transform: "translate(-50%, 50%)",
                      }}
                    >
                      {markerLabel}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-6 gap-1 rounded-md bg-background px-1 py-2 sm:gap-2 sm:px-2">
            {targetNotes.map((note, index) => {
              const selected = index === currentTargetIndex;
              const tuned = completed || index < currentTargetIndex;

              return (
                <button
                  type="button"
                  key={`${note}-${index}`}
                  className={`baseVertFlex relative min-h-[74px] gap-1 rounded-md px-1 py-2 text-sm transition-colors ${selected ? "bg-primary/10" : "bg-transparent"}`}
                  onClick={() => {
                    onSetCurrentTargetIndex(index);
                  }}
                  aria-current={selected ? "true" : "false"}
                >
                  {tuned && (
                    <span className="baseFlex absolute right-1 top-1 rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check className="size-2.5" />
                    </span>
                  )}

                  <div className="baseFlex h-7 w-full">
                    <motion.div
                      className={`rounded-full ${selected ? "bg-primary" : "bg-foreground/35"}`}
                      animate={{
                        opacity: selected ? 1 : 0.75,
                        scaleY: selected ? 1.04 : 1,
                      }}
                      transition={{ duration: 0.15 }}
                      style={{
                        width: `${stringThicknesses[index] ?? 3}px`,
                        height: "30px",
                      }}
                    />
                  </div>

                  <span
                    className={
                      tuned
                        ? "text-xs font-semibold text-primary sm:text-sm"
                        : "text-xs text-foreground sm:text-sm"
                    }
                  >
                    {formatNoteLabel(note)}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            disabled={currentTargetIndex === 0}
            variant="outline"
            className="w-full sm:hidden sm:w-auto"
            onClick={onResetProgress}
          >
            Reset
          </Button>
        </>
      ) : (
        <div className="baseVertFlex w-full rounded-md border bg-background p-4 md:px-6 md:py-8">
          <div className="w-full text-center text-lg font-semibold text-foreground">
            {detectedNote ? formatNoteLabel(detectedNote) : "--"}
          </div>

          <div className="relative mt-4 w-full">
            <div className="absolute left-1/2 top-0 z-10 w-[104px] -translate-x-1/2 rounded-md border bg-background px-3 py-1 text-center text-sm font-semibold tabular-nums text-foreground sm:w-[118px] sm:text-base">
              {`${currentMicFrequency.toFixed(1)} Hz`}
            </div>

            <div className="baseFlex mt-12 w-full !justify-between px-[1px] text-xs text-foreground/70 sm:hidden">
              {mobileLabelTicks.map((tick) => (
                <span key={`mobile-label-${tick}`}>{tick}</span>
              ))}
            </div>

            <div className="baseFlex mt-14 !hidden w-full !justify-between px-[1px] text-xs text-foreground/70 sm:!flex">
              {centsTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>

            <div className="relative mt-0 h-[180px] w-full rounded-md border bg-secondary px-4 py-6">
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

              <motion.div
                className="absolute inset-y-0"
                animate={{ left: `${chromaticMarkerLeftPercent}%` }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 24,
                  mass: 0.55,
                }}
              >
                <div className="relative h-full -translate-x-1/2">
                  <motion.div
                    className="absolute top-1/2 h-14 w-[3px] -translate-y-1/2 rounded-full bg-primary"
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

                  <div className="absolute bottom-3 left-1/2 w-[88px] -translate-x-1/2 rounded-md border bg-background px-2 py-1 text-center text-sm font-semibold tabular-nums text-primary">
                    {`${clampedDetectedCents > 0 ? "+" : ""}${clampedDetectedCents.toFixed(1)}¢`}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {(error || permissionDenied) && (
        <p className="w-full rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Microphone access failed."}
        </p>
      )}
    </div>
  );
}

export default TunerPanel;
