import { AnimatedToggleGroup } from "~/components/ui/AnimatedToggleGroup";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Label } from "~/components/ui/label";
import { cn } from "~/utils/cn";

const CENTS_TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const MOBILE_LABEL_TICKS = [-50, -25, 0, 25, 50];
const GUIDED_RANGE_CENTS = 25;
const GUIDED_ARC_MARKER_RATIOS = [-1, -0.4, -0.2, 0, 0.2, 0.4, 1];
const STRING_THICKNESSES = [8, 7, 6, 5, 4, 3];

type ArcLayout = {
  tickRadius: number;
  labelRadius: number;
  tickHalfHeight: number;
  tickClassName: string;
  labelClassName: string;
};

const MOBILE_ARC: ArcLayout = {
  tickRadius: 115,
  labelRadius: 133,
  tickHalfHeight: 4,
  tickClassName: "absolute h-2 w-px bg-foreground/45 lg:hidden",
  labelClassName: "absolute text-[10px] font-medium tabular-nums lg:hidden",
};

const DESKTOP_ARC: ArcLayout = {
  tickRadius: 140,
  labelRadius: 161,
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
        ((centsOffset + GUIDED_RANGE_CENTS) / (GUIDED_RANGE_CENTS * 2)) * 180,
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

function GuidedArcMarkers({ layout }: { layout: ArcLayout }) {
  return (
    <>
      {GUIDED_ARC_MARKER_RATIOS.map((ratio) => {
        const angleRadians = ratio * (Math.PI / 2);
        const angleDegrees = ratio * 90;
        // Use the gradient's radial geometry for both ticks and label centers.
        const tickX = Math.sin(angleRadians) * layout.tickRadius;
        const tickY = Math.cos(angleRadians) * layout.tickRadius;
        const labelX = Math.sin(angleRadians) * layout.labelRadius;
        const labelY = Math.cos(angleRadians) * layout.labelRadius;
        const markerValue = ratio * GUIDED_RANGE_CENTS;
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
  playbackCapoToggle?: {
    requiredCapo: number;
    selectedCapo: number;
    onSelectCapo: (capo: number) => void;
  };
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
      <AnimatePresence mode="wait" initial={false}>
        {!hideReset && (
          <motion.div
            key="tunerResetButton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15,
            }}
          >
            <Button
              disabled={resetDisabled}
              variant="outline"
              className="baseFlex w-full gap-2 lg:w-auto"
              onClick={onResetProgress}
            >
              <VscDebugRestart />
              Reset
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isListening ? (
        <Button
          className="baseFlex w-full gap-2 lg:w-[100px]"
          onClick={onStopListening}
        >
          <StopIcon />
          Stop
        </Button>
      ) : (
        <Button
          className="w-full gap-2 lg:w-[100px]"
          onClick={() => void onStartListening()}
        >
          <FaMicrophone />
          Start
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
  playbackCapoToggle,
}: TunerPanelProps) {
  const { tuning, capo } = useTabStore((state) => ({
    tuning: state.tuning,
    capo: state.capo,
  }));

  const [mode, setMode] = useState<"guided" | "chromatic">("guided");
  const [chromaticViewReady, setChromaticViewReady] = useState(false);

  useEffect(() => {
    if (mode !== "chromatic" || chromaticViewReady) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      setChromaticViewReady(true);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [chromaticViewReady, mode]);

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
  const hasGuidedCents = signalDetected && targetCentsOffset !== null;
  const chromaticViewInitializing = mode === "chromatic" && !chromaticViewReady;

  const clampedGuidedCents = Math.max(
    -GUIDED_RANGE_CENTS,
    Math.min(GUIDED_RANGE_CENTS, hasGuidedCents ? targetCentsOffset : 0),
  );
  const clampedDetectedCents = Math.max(-50, Math.min(50, detectedCents ?? 0));
  const guidedNeedleDegrees = (clampedGuidedCents / GUIDED_RANGE_CENTS) * 90;
  const chromaticMarkerLeftPercent =
    !chromaticViewInitializing && hasChromaticCents
      ? ((clampedDetectedCents + 50) / 100) * 100
      : 50;

  const frequencyLabel = hasDetectedFrequency
    ? `${detectedFrequency.toFixed(1)} Hz`
    : "--";
  const chromaticCentsLabel = hasChromaticCents
    ? `${clampedDetectedCents > 0 ? "+" : ""}${clampedDetectedCents.toFixed(1)}¢`
    : "--";

  const resetDisabled = mode === "chromatic" || currentTargetIndex === 0;
  const requiredPlaybackCapo = playbackCapoToggle?.requiredCapo ?? 0;
  const showPlaybackCapoToggle = forPlaybackModal && requiredPlaybackCapo > 0;
  const playbackCapoControl = showPlaybackCapoToggle
    ? playbackCapoToggle
    : undefined;
  const displayedCapo = playbackCapoToggle?.selectedCapo ?? capo;

  return (
    <div
      className={cn(
        "flex h-full w-full min-w-0 flex-col items-center gap-4 bg-background pb-3 text-foreground shadow-sm md:rounded-lg md:border md:pb-6",
        forPlaybackModal ? "justify-between border-0 md:border-0" : "border-y",
      )}
    >
      <div
        className={cn(
          "w-full gap-4 p-3 md:p-6",
          forPlaybackModal
            ? "hidden flex-col items-start lg:flex"
            : "grid items-center sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        )}
      >
        {!forPlaybackModal && (
          <AnimatedToggleGroup
            aria-label="Tuner type"
            variant="default"
            className="w-full sm:w-auto lg:justify-self-start [&_[data-layout-labels]]:w-full"
            value={mode}
            onValueChange={(value) => {
              if (value === mode) return;
              setChromaticViewReady(false);
              setMode(value);
            }}
            itemClassName="h-[30px] text-xs sm:h-[38px] sm:text-sm"
            options={[
              {
                value: "guided",
                label: "Guided",
                className: "w-1/2 sm:w-[72px]",
              },
              {
                value: "chromatic",
                label: "Chromatic",
                className: "w-1/2 sm:w-[93px]",
              },
            ]}
          />
        )}

        {forPlaybackModal && (
          <div className="flex items-center gap-2">
            <TuningFork className="mr-[2px] w-[10px]" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        )}

        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center justify-center gap-4 sm:justify-end lg:justify-between",
            forPlaybackModal ? "w-full items-end" : "lg:contents",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-wrap justify-center gap-3 sm:justify-end lg:gap-4",
              forPlaybackModal ? "items-end !gap-8" : "items-center",
              !forPlaybackModal && "lg:justify-self-center",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-col items-start gap-2",
                forPlaybackModal
                  ? "gap-1.5"
                  : "lg:flex-row lg:items-center lg:gap-3",
              )}
            >
              <Label
                htmlFor="tuning"
                className={cn(forPlaybackModal && "text-foreground/80")}
              >
                Tuning
              </Label>
              {forPlaybackModal ? (
                <div className="!text-xl">
                  <PrettyTuning
                    tuning={tuning}
                    displayWithFlex={true}
                    noteClass={
                      playbackCapoControl !== undefined
                        ? "text-lg"
                        : "text-base"
                    }
                    accidentalClass={
                      playbackCapoControl !== undefined
                        ? "text-base"
                        : "text-sm"
                    }
                    showScientificPitchNotation={true}
                  />
                </div>
              ) : (
                <TuningSelect showScientificPitchNotationInTrigger={true} />
              )}
            </div>

            <div
              className={cn(
                "flex shrink-0 flex-col items-start gap-2",
                forPlaybackModal
                  ? "gap-1"
                  : "lg:flex-row lg:items-center lg:gap-3",
              )}
            >
              <Label
                htmlFor="capo"
                className={cn(forPlaybackModal && "text-foreground/80")}
              >
                Capo
              </Label>

              {forPlaybackModal ? (
                playbackCapoControl ? (
                  <AnimatedToggleGroup
                    aria-label="Preview capo"
                    variant="default"
                    className="mt-1"
                    value={
                      playbackCapoControl.selectedCapo === 0 ? "none" : "capo"
                    }
                    onValueChange={(value) =>
                      playbackCapoControl.onSelectCapo(
                        value === "none" ? 0 : requiredPlaybackCapo,
                      )
                    }
                    itemClassName="h-[24px] w-[80px] sm:w-[90px]"
                    options={[
                      { value: "none", label: "No capo" },
                      {
                        value: "capo",
                        label: `${getOrdinalSuffix(requiredPlaybackCapo)} fret`,
                      },
                    ]}
                  />
                ) : (
                  <p>
                    {displayedCapo === 0
                      ? "No capo"
                      : `${getOrdinalSuffix(displayedCapo)} fret`}
                  </p>
                )
              ) : (
                <CapoSelect triggerClassName="w-auto min-w-20" />
              )}
            </div>
          </div>

          <ListeningControls
            isListening={isListening}
            resetDisabled={resetDisabled}
            className="hidden shrink-0 gap-4 lg:ml-auto lg:flex lg:justify-self-end"
            onStartListening={onStartListening}
            onStopListening={onStopListening}
            onResetProgress={onResetProgress}
            hideReset={mode === "chromatic"}
          />
        </div>
      </div>

      {/* Overlapping grid cells preserve the body's natural height in both modes. */}
      <div className="grid w-full">
        <motion.div
          key="tunerPanel-guided"
          initial={false}
          animate={{
            opacity: mode === "guided" ? 1 : 0,
            visibility: mode === "guided" ? "visible" : "hidden",
          }}
          transition={{
            duration: 0.15,
            visibility: { delay: mode === "guided" ? 0 : 0.15 },
          }}
          aria-hidden={mode !== "guided"}
          inert={mode !== "guided"}
          className="baseVertFlex w-full gap-4 [grid-area:1/1]"
        >
          {playbackCapoControl && (
            <div className="baseFlex gap-3 lg:hidden">
              <Label>Capo</Label>
              <AnimatedToggleGroup
                aria-label="Preview capo"
                variant="default"
                value={playbackCapoControl.selectedCapo === 0 ? "none" : "capo"}
                onValueChange={(value) =>
                  playbackCapoControl.onSelectCapo(
                    value === "none" ? 0 : requiredPlaybackCapo,
                  )
                }
                itemClassName="h-[24px] w-[80px] sm:w-[90px]"
                options={[
                  { value: "none", label: "No capo" },
                  {
                    value: "capo",
                    label: `${getOrdinalSuffix(requiredPlaybackCapo)} fret`,
                  },
                ]}
              />
            </div>
          )}

          <div className="baseVertFlex w-full px-3 md:px-6">
            <div className="baseVertFlex w-full rounded-md p-3 lg:p-5">
              <div className="relative h-[230px] w-full lg:h-[280px]">
                <div className="baseVertFlex w-full gap-4">
                  <div className="font-semibold text-foreground">
                    <PrettyNote
                      note={formatNoteLabel(currentTarget)}
                      displayWithFlex={true}
                      showScientificPitchNotation={true}
                      noteClass="text-lg xs:text-xl"
                      accidentalClass="text-base xs:text-lg"
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
                    className="absolute bottom-0 left-0 right-0 h-[115px] rounded-t-full lg:h-[140px]"
                    style={{
                      backgroundImage: semicircleGradient(toleranceCents),
                    }}
                  />

                  <div className="absolute bottom-0 left-0 right-0 h-[115px] rounded-t-full border-x border-t border-foreground/25 lg:h-[140px]" />
                  <div className="absolute bottom-0 left-1/2 h-[117px] w-px -translate-x-1/2 bg-foreground/25 lg:h-[142px]" />

                  <motion.div
                    className="absolute bottom-0 h-[108px] w-[3px] rounded-full lg:h-[130px]"
                    initial={false}
                    style={{
                      left: "calc(50% - 1.5px)",
                      transformOrigin: "bottom center",
                      transition:
                        "background-color 0.6s ease, box-shadow 0.6s ease",
                      ...needleStyle(
                        hasGuidedCents ? clampedGuidedCents : null,
                        toleranceCents,
                      ),
                    }}
                    animate={{ rotate: guidedNeedleDegrees }}
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

                  <GuidedArcMarkers layout={MOBILE_ARC} />
                  <GuidedArcMarkers layout={DESKTOP_ARC} />
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
                          ? "mt-1 text-xs font-semibold text-primary lg:text-base"
                          : "mt-1 text-xs text-foreground lg:text-base"
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
            className="grid w-full max-w-[418px] grid-cols-2 gap-4 px-4 lg:hidden"
            onStartListening={onStartListening}
            onStopListening={onStopListening}
            onResetProgress={onResetProgress}
          />
        </motion.div>
        <motion.div
          key="tunerPanel-chromatic"
          initial={false}
          animate={{
            opacity: mode === "chromatic" ? 1 : 0,
            visibility: mode === "chromatic" ? "visible" : "hidden",
          }}
          transition={{
            duration: 0.15,
            visibility: { delay: mode === "chromatic" ? 0 : 0.15 },
          }}
          aria-hidden={mode !== "chromatic"}
          inert={mode !== "chromatic"}
          className="flex w-full flex-col items-center gap-4 [grid-area:1/1]"
        >
          <div className="baseVertFlex w-full flex-1 bg-background md:px-6">
            <ChromaticPitchScroller
              detectedNote={detectedNote}
              detectedCents={detectedCents}
              signalDetected={signalDetected}
              preferFlats={targetNotes.some((note) => note[1] === "b")}
            />

            {/* Shared horizontal track: labels + ticks + marker use the same % axis */}
            <div className="relative isolate mt-2 w-full px-12 sm:px-14">
              <div className="w-full">
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

              <div className="h-[124px] w-full">
                <div className="relative size-full">
                  <motion.div
                    className="absolute left-0 right-0 top-10 h-px bg-foreground/30"
                    animate={{
                      opacity: signalDetected ? [0.35, 0.8, 0.35] : 0.35,
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: signalDetected ? Infinity : 0,
                      ease: "linear",
                    }}
                  />

                  {MOBILE_LABEL_TICKS.map((tick) => (
                    <div
                      key={`mobile-tick-${tick}`}
                      className="absolute top-3 h-14 w-px -translate-x-1/2 bg-foreground/50 lg:hidden"
                      style={{ left: `${((tick + 50) / 100) * 100}%` }}
                    />
                  ))}
                  {CENTS_TICKS.map((tick) => (
                    <div
                      key={`tick-${tick}`}
                      className="absolute top-3 hidden h-14 w-px -translate-x-1/2 bg-foreground/50 lg:block"
                      style={{ left: `${((tick + 50) / 100) * 100}%` }}
                    />
                  ))}

                  <motion.div
                    className="absolute inset-y-0 w-0"
                    initial={false}
                    animate={{
                      // Idle / no-signal: always park exactly on the 0¢ tick (50%).
                      left: `${chromaticMarkerLeftPercent}%`,
                      opacity:
                        !chromaticViewInitializing && hasChromaticCents
                          ? 1
                          : 0.3,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 24,
                      mass: 0.55,
                    }}
                  >
                    <div className="relative h-full">
                      <motion.div
                        className="absolute left-1/2 top-3 h-14 w-[3px] -translate-x-1/2 rounded-full bg-primary"
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
        </motion.div>
      </div>

      {(error || permissionDenied) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Microphone access failed."}
        </p>
      )}
    </div>
  );
}

export default TunerPanel;
