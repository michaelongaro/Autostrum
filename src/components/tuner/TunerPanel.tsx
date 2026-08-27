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

const CENTS_TICKS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const MOBILE_LABEL_TICKS = [-50, -25, 0, 25, 50];
const GUIDED_RANGE_CENTS = 25;
const GUIDED_ARC_MARKER_RATIOS = [-1, -0.4, -0.2, 0, 0.2, 0.4, 1];
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
        const tickX = Math.sin(angleRadians) * layout.tickRadiusX;
        const tickY = Math.cos(angleRadians) * layout.tickRadiusY;
        const labelX = Math.sin(angleRadians) * layout.labelRadiusX;
        const labelY = Math.cos(angleRadians) * layout.labelRadiusY;
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
              className="baseFlex w-full gap-2 lg:w-auto lg:text-primary-foreground"
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
          className={`baseFlex w-full gap-2 lg:w-[100px]`}
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
  const { tuning, capo, theme } = useTabStore((state) => ({
    tuning: state.tuning,
    capo: state.capo,
    theme: state.theme,
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
      className={`baseVertFlex h-full w-full gap-4 bg-background pb-3 shadow-sm md:rounded-lg md:border md:pb-6 ${forPlaybackModal ? "!justify-between !border-0" : "border-y"}`}
    >
      <div
        className={`baseVertFlex w-full gap-3 bg-accent p-3 md:p-6 ${forPlaybackModal ? "!flex-col !items-start md:rounded-t-lg" : "sm:flex-row sm:!items-center sm:!justify-between md:rounded-t-lg"}`}
      >
        {!forPlaybackModal && (
          <div className="baseFlex gap-3">
            <Label
              className={`${forPlaybackModal ? "text-primary-foreground/80" : "text-primary-foreground"} `}
            >
              Type
            </Label>

            <div className="baseFlex relative z-10 shrink-0 overflow-y-hidden rounded-md border">
              <Button
                variant="toggle"
                style={{
                  color:
                    theme === "light"
                      ? mode === "guided"
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--background))"
                      : "hsl(var(--primary-foreground))",
                }}
                className="baseFlex relative h-[30px] w-[123px] gap-2 border-none sm:h-[38px] sm:w-[72px]"
                onClick={() => {
                  if (mode === "guided") return;
                  setChromaticViewReady(false);
                  setMode("guided");
                }}
              >
                Guided
              </Button>

              <Button
                variant="toggle"
                style={{
                  color:
                    theme === "light"
                      ? mode === "chromatic"
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--background))"
                      : "hsl(var(--primary-foreground))",
                }}
                className="baseFlex relative h-[30px] w-[123px] gap-2 border-none sm:h-[38px] sm:w-[93px]"
                onClick={() => {
                  if (mode === "chromatic") return;
                  setChromaticViewReady(false);
                  setMode("chromatic");
                }}
              >
                Chromatic
              </Button>

              <div
                style={{
                  backgroundColor:
                    theme === "light"
                      ? "hsl(var(--background)"
                      : "hsl(var(--primary))",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className={`absolute inset-0 !z-[-1] ${mode === "guided" ? "w-[123px] translate-x-0 rounded-l-sm sm:w-[72px]" : "w-[123px] translate-x-[123px] rounded-r-sm sm:w-[93px] sm:translate-x-[72px]"}`}
              ></div>
            </div>
          </div>
        )}

        {forPlaybackModal && (
          <div className="mb-2 hidden gap-2 text-primary-foreground xs:flex xs:items-center xs:justify-start">
            <TuningFork className="mr-[2px] w-[10px]" />
            <p className="text-lg font-semibold">Guitar Tuner</p>
          </div>
        )}

        <div
          className={`baseFlex w-full !justify-between ${forPlaybackModal ? "!items-end !justify-between" : "lg:pl-6"}`}
        >
          <div
            className={`flex w-full items-center justify-center sm:w-auto sm:items-center sm:justify-center ${forPlaybackModal ? "!items-end gap-8" : "mt-2 gap-4 sm:mt-0 sm:gap-6"}`}
          >
            <div
              className={`baseVertFlex !items-start ${forPlaybackModal ? "!flex-col !items-start gap-1" : "gap-2 sm:!flex-row sm:!items-center lg:gap-3"}`}
            >
              <Label
                htmlFor="tuning"
                className={`${forPlaybackModal ? "text-primary-foreground/80" : "text-primary-foreground"} `}
              >
                Tuning
              </Label>
              {forPlaybackModal ? (
                <div className="!text-xl">
                  <PrettyTuning
                    tuning={tuning}
                    displayWithFlex={true}
                    fontSize={
                      playbackCapoControl !== undefined ? "18px" : "16px"
                    }
                    lineHeight={
                      playbackCapoControl !== undefined ? "28px" : "24px"
                    }
                    color={"hsl(var(--primary-foreground))"}
                    showScientificPitchNotation={true}
                  />
                </div>
              ) : (
                <TuningSelect
                  showScientificPitchNotationInTrigger={true}
                  triggerTextColor="text-primary-foreground"
                />
              )}
            </div>

            <div
              className={`baseVertFlex !items-start ${forPlaybackModal ? "!flex-col !items-start gap-1" : "gap-2 sm:!flex-row sm:!items-center lg:gap-3"}`}
            >
              <Label
                htmlFor="capo"
                className={`${forPlaybackModal ? "text-primary-foreground/80" : "text-primary-foreground"} `}
              >
                Capo
              </Label>

              {forPlaybackModal ? (
                playbackCapoControl ? (
                  <div className="grid w-full max-w-[220px] grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={
                        playbackCapoControl.selectedCapo === 0
                          ? "default"
                          : "outline"
                      }
                      className="h-8 text-xs text-primary-foreground"
                      onClick={() => playbackCapoControl.onSelectCapo(0)}
                    >
                      No capo
                    </Button>
                    <Button
                      type="button"
                      variant={
                        playbackCapoControl.selectedCapo !== 0
                          ? "default"
                          : "outline"
                      }
                      className="h-8 text-xs text-primary-foreground"
                      onClick={() =>
                        playbackCapoControl.onSelectCapo(requiredPlaybackCapo)
                      }
                    >
                      {`${getOrdinalSuffix(requiredPlaybackCapo)} fret`}
                    </Button>
                  </div>
                ) : (
                  <p className="text-primary-foreground">
                    {displayedCapo === 0
                      ? "No capo"
                      : `${getOrdinalSuffix(displayedCapo)} fret`}
                  </p>
                )
              ) : (
                <CapoSelect triggerClassName="text-primary-foreground" />
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
            hideReset={mode === "chromatic"}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {mode === "guided" ? (
          <motion.div
            key="tunerPanel-guided"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15,
            }}
            className="baseVertFlex w-full gap-4"
          >
            <div className="baseVertFlex w-full px-3 md:px-6">
              <div className="baseVertFlex w-full rounded-md p-3 lg:p-5">
                <div className="relative h-[230px] w-full lg:h-[280px]">
                  <div className="baseVertFlex w-full gap-4">
                    <div className="font-semibold text-foreground">
                      <PrettyNote
                        note={formatNoteLabel(currentTarget)}
                        displayWithFlex={true}
                        showScientificPitchNotation={true}
                        forGuidedTuner={true}
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
        ) : (
          <motion.div
            key="tunerPanel-chromatic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15,
            }}
            className="baseVertFlex w-full gap-4"
          >
            <div className="baseVertFlex w-full rounded-md bg-background px-0 py-[37px] md:px-6 md:py-[66px]">
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
                      className="absolute inset-y-0 z-50"
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
          </motion.div>
        )}
      </AnimatePresence>

      {(error || permissionDenied) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error ?? "Microphone access failed."}
        </p>
      )}
    </div>
  );
}

export default TunerPanel;
