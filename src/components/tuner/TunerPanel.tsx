import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { get } from "@tonaljs/note";
import { Button } from "~/components/ui/button";
import { FaMicrophone } from "react-icons/fa";
import StopIcon from "~/components/ui/icons/StopIcon";
import { VscDebugRestart } from "react-icons/vsc";
import CapoSelect from "~/components/ui/CapoSelect";
import TuningSelect from "~/components/ui/TuningSelect";
import TuningFork from "~/components/ui/icons/TuningFork";
import { useTabStore } from "~/stores/TabStore";
import { PrettyNote, PrettyTuning } from "~/components/ui/PrettyTuning";
import { getOrdinalSuffix } from "~/utils/getOrdinalSuffix";
import ChromaticPitchScroller from "~/components/tuner/ChromaticPitchScroller";
import { formatNoteLabel, frequencyFromMidi } from "~/utils/tunerMath";
import { TUNER_DEFAULTS, type TunerReading } from "~/hooks/useTuner";

const CENTS_TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const MOBILE_LABEL_TICKS = [-50, -25, 0, 25, 50];
const REGULAR_RANGE_CENTS = 25;
const REGULAR_ARC_MARKER_RATIOS = [-1, -0.4, -0.2, 0, 0.2, 0.4, 1];
const STRING_THICKNESSES = [8, 7, 6, 5, 4, 3];

type ArcLayout = {
  tickRadiusX: number;
  tickRadiusY: number;
  labelRadiusX: number;
  labelRadiusY: number;
  tickHalfHeight: number;
  tickClassName: string;
  labelClassName: string;
};

const MOBILE_ARC: ArcLayout = {
  tickRadiusX: 118,
  tickRadiusY: 120,
  labelRadiusX: 130,
  labelRadiusY: 132,
  tickHalfHeight: 4,
  tickClassName: "absolute h-2 w-px bg-foreground/45 lg:hidden",
  labelClassName: "absolute text-[10px] font-medium tabular-nums lg:hidden",
};

const DESKTOP_ARC: ArcLayout = {
  tickRadiusX: 140,
  tickRadiusY: 144,
  labelRadiusX: 160,
  labelRadiusY: 157,
  tickHalfHeight: 5,
  tickClassName: "absolute hidden h-2.5 w-px bg-foreground/45 lg:block",
  labelClassName: "absolute hidden text-xs font-medium tabular-nums lg:block",
};

function frequencyFromNote(note: string) {
  const midi = get(note).midi;
  if (midi === null) return 0;
  return frequencyFromMidi(midi);
}

function needleStyle(centsOffset: number | null, toleranceCents: number) {
  if (centsOffset === null) {
    return {
      backgroundColor: "hsl(var(--primary))",
      boxShadow: "0 0 10px hsl(var(--primary) / 0.45)",
    };
  }

  const abs = Math.abs(centsOffset);

  if (abs <= toleranceCents) {
    return {
      backgroundColor: "rgb(34 197 94)",
      boxShadow: "0 0 10px rgba(34, 197, 94, 0.45)",
    };
  }
  if (abs <= 10) {
    return {
      backgroundColor: "rgb(250 204 21)",
      boxShadow: "0 0 10px rgba(250, 204, 21, 0.45)",
    };
  }
  if (abs <= 25) {
    return {
      backgroundColor: "rgb(249 115 22)",
      boxShadow: "0 0 10px rgba(249, 115, 22, 0.45)",
    };
  }
  return {
    backgroundColor: "rgb(239 68 68)",
    boxShadow: "0 0 10px rgba(239, 68, 68, 0.45)",
  };
}

function semicircleGradient(toleranceCents: number) {
  const toAngle = (centsOffset: number) =>
    Math.max(
      0,
      Math.min(
        180,
        ((centsOffset + REGULAR_RANGE_CENTS) / (REGULAR_RANGE_CENTS * 2)) * 180,
      ),
    );

  const leftOrange = toAngle(-25);
  const leftYellow = toAngle(-10);
  const leftGreen = toAngle(-toleranceCents);
  const rightGreen = toAngle(toleranceCents);
  const rightYellow = toAngle(10);
  const rightOrange = toAngle(25);

  return `conic-gradient(from 270deg at 50% 100%, rgba(239, 68, 68, 0.2) 0deg ${leftOrange}deg, rgba(249, 115, 22, 0.2) ${leftOrange}deg ${leftYellow}deg, rgba(250, 204, 21, 0.2) ${leftYellow}deg ${leftGreen}deg, rgba(34, 197, 94, 0.18) ${leftGreen}deg ${rightGreen}deg, rgba(250, 204, 21, 0.2) ${rightGreen}deg ${rightYellow}deg, rgba(249, 115, 22, 0.2) ${rightYellow}deg ${rightOrange}deg, rgba(239, 68, 68, 0.2) ${rightOrange}deg 180deg, transparent 180deg 360deg)`;
}

function RegularArcMarkers({ layout }: { layout: ArcLayout }) {
  return (
    <>
      {REGULAR_ARC_MARKER_RATIOS.map((ratio) => {
        const angleRadians = ratio * (Math.PI / 2);
        const angleDegrees = ratio * 90;
        const tickX = Math.sin(angleRadians) * layout.tickRadiusX;
        const tickY = Math.cos(angleRadians) * layout.tickRadiusY;
        const labelX = Math.sin(angleRadians) * layout.labelRadiusX;
        const labelY = Math.cos(angleRadians) * layout.labelRadiusY;
        const markerValue = ratio * REGULAR_RANGE_CENTS;
        const markerLabel =
          Math.abs(markerValue) < 0.5
            ? "0"
            : `${markerValue > 0 ? "+" : ""}${Math.round(markerValue)}`;

        return (
          <div key={`${layout.tickClassName}-${ratio}`}>
            <div
              className={layout.tickClassName}
              style={{
                left: `calc(50% + ${tickX}px)`,
                bottom: `${tickY - layout.tickHalfHeight}px`,
                transform: `translateX(-50%) rotate(${angleDegrees}deg)`,
              }}
            />
            <div
              className={`${layout.labelClassName} ${ratio === 0 ? "text-foreground/80" : "text-foreground/60"}`}
              style={{
                left: `calc(50% + ${labelX}px)`,
                bottom: `${labelY}px`,
                transform: "translate(-50%, 50%)",
              }}
            >
              {markerLabel}
            </div>
          </div>
        );
      })}
    </>
  );
}

type TunerPanelProps = {
  targetNotes: string[];
  currentTargetIndex: number;
  reading: TunerReading;
  toleranceCents?: number;
  isListening: boolean;
  completed: boolean;
  error: string | null;
  permissionDenied: boolean;
  onStartListening: () => Promise<void>;
  onStopListening: () => void;
  onResetProgress: () => void;
  onSetCurrentTargetIndex: (index: number) => void;
  forPlaybackModal?: boolean;
};

function ListeningControls({
  isListening,
  resetDisabled,
  hideReset,
  className,
  onStartListening,
  onStopListening,
  onResetProgress,
}: {
  isListening: boolean;
  resetDisabled: boolean;
  hideReset?: boolean;
  className?: string;
  onStartListening: () => Promise<void>;
  onStopListening: () => void;
  onResetProgress: () => void;
}) {
  return (
    <div className={className}>
      {isListening ? (
        <Button
          size="sm"
          variant="outline"
          className="baseFlex w-full gap-2 lg:w-auto"
          onClick={onStopListening}
        >
          <StopIcon />
          Stop
        </Button>
      ) : (
        <Button
          size="sm"
          className="w-full gap-2 px-8 lg:w-auto"
          onClick={() => void onStartListening()}
        >
          <FaMicrophone />
          Start
        </Button>
      )}

      {!hideReset && (
        <Button
          size="sm"
          disabled={resetDisabled}
          variant="outline"
          className="baseFlex w-full gap-2 lg:w-auto"
          onClick={onResetProgress}
        >
          <VscDebugRestart />
          Reset
        </Button>
      )}
    </div>
  );
}

function TunerPanel({
  targetNotes,
  currentTargetIndex,
  reading,
  toleranceCents = TUNER_DEFAULTS.toleranceCents,
  isListening,
  completed,
  error,
  permissionDenied,
  onStartListening,
  onStopListening,
  onResetProgress,
  onSetCurrentTargetIndex,
  forPlaybackModal,
}: TunerPanelProps) {
  const { tuning, capo } = useTabStore((state) => ({
    tuning: state.tuning,
    capo: state.capo,
  }));

  const [mode, setMode] = useState<"regular" | "chromatic">("regular");

  const {
    signalDetected,
    detectedNote,
    detectedFrequency,
    detectedCents,
    targetCentsOffset,
  } = reading;

  const currentTarget = targetNotes[currentTargetIndex] ?? "e2";
  const currentTargetFrequency = frequencyFromNote(currentTarget);
  const hasDetectedFrequency = signalDetected && detectedFrequency !== null;
  const hasChromaticCents = signalDetected && detectedCents !== null;
  const hasRegularCents = signalDetected && targetCentsOffset !== null;

  const clampedRegularCents = Math.max(
    -REGULAR_RANGE_CENTS,
    Math.min(REGULAR_RANGE_CENTS, hasRegularCents ? targetCentsOffset : 0),
  );
  const clampedDetectedCents = Math.max(-50, Math.min(50, detectedCents ?? 0));
  const regularNeedleDegrees = (clampedRegularCents / REGULAR_RANGE_CENTS) * 90;
  const chromaticMarkerLeftPercent = hasChromaticCents
    ? ((clampedDetectedCents + 50) / 100) * 100
    : 50;

  const frequencyLabel = hasDetectedFrequency
    ? `${detectedFrequency.toFixed(1)} Hz`
    : "--";
  const chromaticCentsLabel = hasChromaticCents
    ? `${clampedDetectedCents > 0 ? "+" : ""}${clampedDetectedCents.toFixed(1)}¢`
    : "--";

  const resetDisabled = mode === "chromatic" || currentTargetIndex === 0;

  return (
    <div
      className={`baseVertFlex h-full w-full gap-4 bg-background py-3 shadow-sm md:rounded-lg md:border lg:py-5 ${forPlaybackModal ? "md:py-6" : "border-y md:py-6"}`}
    >
      <div
        className={`baseVertFlex w-full gap-3 px-3 md:px-6 lg:flex-row lg:!items-center lg:!justify-between lg:px-6 ${forPlaybackModal ? "lg:mt-8" : ""}`}
      >
        {!forPlaybackModal && (
          <div className="col-span-2 grid w-full grid-cols-2 gap-1 rounded-md border p-1 lg:col-span-1 lg:w-[190px]">
            <button
              type="button"
              onClick={() => setMode("regular")}
              className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "regular" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => setMode("chromatic")}
              className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "chromatic" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            >
              Chromatic
            </button>
          </div>
        )}

        {forPlaybackModal && (
          <div className="baseFlex w-full !justify-start gap-2 xs:w-auto">
            <TuningFork className="size-5" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        )}

        <div
          className={`flex w-full items-center xs:justify-center xs:gap-8 lg:w-auto lg:items-center lg:justify-center ${forPlaybackModal ? "gap-8" : "flex-col gap-3 xs:flex-row"}`}
        >
          <div className="baseFlex gap-2 lg:gap-3">
            <p className="text-sm font-semibold text-foreground/80">Tuning</p>
            {forPlaybackModal ? (
              <PrettyTuning
                tuning={tuning}
                displayWithFlex={true}
                showScientificPitchNotation={true}
              />
            ) : (
              <TuningSelect showScientificPitchNotationInTrigger={true} />
            )}
          </div>

          <div className="baseFlex gap-2 text-sm lg:gap-3">
            <p className="font-semibold text-foreground/80">Capo</p>
            {forPlaybackModal ? (
              <p>{capo === 0 ? "None" : `${getOrdinalSuffix(capo)} fret`}</p>
            ) : (
              <CapoSelect />
            )}
          </div>
        </div>

        <ListeningControls
          isListening={isListening}
          resetDisabled={resetDisabled}
          className="hidden w-full gap-2 lg:flex lg:w-auto lg:gap-4"
          onStartListening={onStartListening}
          onStopListening={onStopListening}
          onResetProgress={onResetProgress}
        />
      </div>

      {mode === "regular" ? (
        <>
          <div className="baseVertFlex w-full px-3 md:px-6">
            <div className="baseVertFlex w-full rounded-md p-3 lg:p-5">
              <div className="relative h-[230px] w-full lg:h-[280px]">
                <div className="baseVertFlex w-full gap-4">
                  <div className="font-semibold text-foreground">
                    <PrettyNote
                      note={formatNoteLabel(currentTarget)}
                      displayWithFlex={true}
                      showScientificPitchNotation={true}
                    />
                  </div>
                  <div className="baseFlex gap-2">
                    <div className="baseFlex w-20">{frequencyLabel}</div>/
                    <div className="baseFlex w-20">
                      {`${currentTargetFrequency.toFixed(1)} Hz`}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-1/2 h-[150px] w-[230px] -translate-x-1/2 lg:h-[180px] lg:w-[280px]">
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[120px] rounded-t-full lg:h-[144px]"
                    style={{
                      backgroundImage: semicircleGradient(toleranceCents),
                    }}
                  />

                  <div className="absolute bottom-0 left-0 right-0 h-[120px] rounded-t-full border-x border-t border-foreground/25 lg:h-[144px]" />
                  <div className="absolute bottom-0 left-1/2 h-[122px] w-px -translate-x-1/2 bg-foreground/25 lg:h-[146px]" />

                  <motion.div
                    className="absolute bottom-0 h-[108px] w-[3px] rounded-full lg:h-[130px]"
                    initial={false}
                    style={{
                      left: "calc(50% - 1.5px)",
                      transformOrigin: "bottom center",
                      transition:
                        "background-color 0.6s ease, box-shadow 0.6s ease",
                      ...needleStyle(
                        hasRegularCents ? clampedRegularCents : null,
                        toleranceCents,
                      ),
                    }}
                    animate={{ rotate: regularNeedleDegrees }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 22,
                      mass: 0.6,
                    }}
                  />

                  <div className="absolute bottom-[-17px] left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-primary/60 bg-background text-base font-semibold text-foreground/70 lg:size-9 lg:text-lg">
                    ¢
                  </div>

                  <RegularArcMarkers layout={MOBILE_ARC} />
                  <RegularArcMarkers layout={DESKTOP_ARC} />
                </div>
              </div>
            </div>
          </div>

          <div className="baseVertFlex w-full md:px-6">
            <div className="grid w-full grid-cols-6 gap-1 px-3 py-2 md:rounded-md lg:gap-2 lg:px-2">
              {targetNotes.map((note, index) => {
                const selected = index === currentTargetIndex;
                const tuned = completed || index < currentTargetIndex;

                return (
                  <button
                    type="button"
                    key={`${note}-${index}`}
                    // tried to do some kind of inset box shadow on light theme, but was too cramped on mobile
                    className={`baseVertFlex relative min-h-[80px] gap-1 rounded-md px-1 py-2 text-sm transition ${selected ? "bg-primary/10" : "bg-transparent"}`}
                    onClick={() => onSetCurrentTargetIndex(index)}
                    aria-current={selected ? "true" : "false"}
                  >
                    <AnimatePresence mode="popLayout">
                      {tuned && (
                        <motion.span
                          key={`motion-${note}-${index}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="baseFlex absolute right-1 top-1 rounded-full bg-primary p-[0.1rem] text-primary-foreground sm:p-0.5"
                        >
                          <Check className="size-2 sm:size-2.5" />
                        </motion.span>
                      )}
                    </AnimatePresence>

                    <div className="baseFlex h-7 w-full">
                      <motion.div
                        className={`rounded-full ${selected ? "bg-primary" : "bg-foreground/35"}`}
                        animate={{
                          opacity: selected ? 1 : 0.75,
                          scaleY: selected ? 1.04 : 1,
                        }}
                        transition={{ duration: 0.15 }}
                        style={{
                          width: `${STRING_THICKNESSES[index] ?? 3}px`,
                          height: "30px",
                        }}
                      />
                    </div>

                    <span
                      className={
                        tuned
                          ? "mt-1 text-xs font-semibold text-primary lg:text-sm"
                          : "mt-1 text-xs text-foreground lg:text-sm"
                      }
                    >
                      <PrettyNote
                        note={formatNoteLabel(note)}
                        displayWithFlex={true}
                        showScientificPitchNotation={true}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <ListeningControls
            isListening={isListening}
            resetDisabled={currentTargetIndex === 0}
            className="grid w-full grid-cols-2 gap-2 px-4 lg:hidden"
            onStartListening={onStartListening}
            onStopListening={onStopListening}
            onResetProgress={onResetProgress}
          />
        </>
      ) : (
        <div className="baseVertFlex w-full gap-4">
          <div className="baseVertFlex w-full rounded-md bg-background px-0 py-4 md:px-6 md:py-8">
            <ChromaticPitchScroller
              detectedNote={detectedNote}
              detectedCents={detectedCents}
              signalDetected={signalDetected}
            />

            {/* Shared horizontal track: labels + ticks + marker use the same % axis */}
            <div className="relative mt-4 w-full px-5 sm:px-6">
              <div className="size-full px-3 md:px-6 lg:px-5">
                <div className="relative mb-1 h-4 w-full text-xs tabular-nums text-foreground/70">
                  {MOBILE_LABEL_TICKS.map((tick) => (
                    <span
                      key={`mobile-label-${tick}`}
                      className="absolute top-0 -translate-x-1/2 lg:hidden"
                      style={{ left: `${((tick + 50) / 100) * 100}%` }}
                    >
                      {tick}
                    </span>
                  ))}
                  {CENTS_TICKS.map((tick) => (
                    <span
                      key={`desktop-label-${tick}`}
                      className="absolute top-0 hidden -translate-x-1/2 lg:block"
                      style={{ left: `${((tick + 50) / 100) * 100}%` }}
                    >
                      {tick}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-[180px] w-full rounded-md bg-primary/10 px-3 shadow-sm md:px-6 lg:px-5">
                <div className="relative size-full py-6">
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

                  {CENTS_TICKS.map((tick) => (
                    <div
                      key={`tick-${tick}`}
                      className="absolute top-[34%] h-[32%] w-px -translate-x-1/2 bg-foreground/25"
                      style={{ left: `${((tick + 50) / 100) * 100}%` }}
                    />
                  ))}

                  <motion.div
                    className="absolute inset-y-0"
                    animate={{
                      // Idle / no-signal: always park exactly on the 0¢ tick (50%).
                      left: `${chromaticMarkerLeftPercent}%`,
                      opacity: hasChromaticCents ? 1 : 0.3,
                    }}
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
                        {chromaticCentsLabel}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <ListeningControls
            isListening={isListening}
            resetDisabled
            hideReset
            className="baseFlex w-36 lg:hidden [&_button]:w-full"
            onStartListening={onStartListening}
            onStopListening={onStopListening}
            onResetProgress={onResetProgress}
          />
        </div>
      )}

      {(error || permissionDenied) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Microphone access failed."}
        </p>
      )}
    </div>
  );
}

export default TunerPanel;
