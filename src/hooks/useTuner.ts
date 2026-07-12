import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { PitchDetector } from "pitchy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";
import {
  DEFAULT_TUNING,
  normalizeTuningValue,
  transposeTuningValue,
} from "~/utils/tunings";

type UseTunerParams = {
  targetTuning: string;
  capo?: number;
  toleranceCents?: number;
  stableHoldDurationMs?: number;
  minimumClarity?: number;
};

type UseTunerResult = {
  isListening: boolean;
  signalDetected: boolean;
  permissionDenied: boolean;
  error: string | null;
  detectedNote: string | null;
  detectedFrequency: number | null;
  detectedCents: number | null;
  targetCentsOffset: number | null;
  clarity: number;
  currentTargetIndex: number;
  completed: boolean;
  targetNotes: string[];
  setCurrentTargetIndex: (
    index: number,
    options?: { playReferenceNote?: boolean },
  ) => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetProgress: () => void;
};

type UiSnapshot = {
  signalDetected: boolean;
  detectedNote: string | null;
  detectedFrequency: number | null;
  detectedCents: number | null;
  targetCentsOffset: number | null;
  clarity: number;
};

type TunerLoopConfig = {
  targetMidis: number[];
  toleranceCents: number;
  minimumClarity: number;
  requiredStableHoldMs: number;
};

const DEFAULT_TUNING_NOTES = DEFAULT_TUNING.split(" ");
const DEFAULT_STABLE_HOLD_DURATION_MS = 250;
const MIN_CLARITY_FLOOR = 0.66;
const MIN_INPUT_GATE_RMS = 0.001;
const INPUT_LOSS_RELEASE_MS = 180;
const PITCH_LOSS_RELEASE_MS = 350;
const CLARITY_RELEASE_HYSTERESIS = 0.12;
const GUIDE_INSTRUMENT_NAME = "acoustic_guitar_steel" as const;
const GUIDE_NOTE_DURATION_SECONDS = 1.2;
const GUIDE_NOTE_GAIN = 1.65;
const GUIDE_NOTE_ATTACK_SECONDS = 0.01;
const GUIDE_PLAYBACK_QUIET_FRAME_COUNT = 3;
const GUIDE_SUPPRESSION_MAX_MS = 2500;

type GuidePlaybackHandle = {
  stop?: (when?: number) => void;
  source?: AudioBufferSourceNode | null;
} | null;

function createEmptyUiSnapshot(clarity = 0): UiSnapshot {
  return {
    signalDetected: false,
    detectedNote: null,
    detectedFrequency: null,
    detectedCents: null,
    targetCentsOffset: null,
    clarity,
  };
}

const EMPTY_UI_SNAPSHOT = createEmptyUiSnapshot();

function roundUiClarity(clarity: number) {
  return Math.round(clarity * 100) / 100;
}

function createNoSignalUiSnapshot(clarity: number) {
  const roundedClarity = roundUiClarity(clarity);

  if (roundedClarity === 0) {
    return EMPTY_UI_SNAPSHOT;
  }

  return {
    ...EMPTY_UI_SNAPSHOT,
    clarity: roundedClarity,
  };
}

function areUiSnapshotsEqual(a: UiSnapshot, b: UiSnapshot) {
  return (
    a.signalDetected === b.signalDetected &&
    a.detectedNote === b.detectedNote &&
    a.detectedFrequency === b.detectedFrequency &&
    a.detectedCents === b.detectedCents &&
    a.targetCentsOffset === b.targetCentsOffset &&
    a.clarity === b.clarity
  );
}

function midiFromFrequency(frequency: number) {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

function frequencyFromMidi(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function centsBetweenFrequencies(a: number, b: number) {
  return 1200 * Math.log2(a / b);
}

function resolveTargetNotes(targetTuning: string) {
  return normalizeTuningValue(targetTuning).split(" ");
}

function stopGuidePlayback(handle: GuidePlaybackHandle) {
  if (!handle) return;

  try {
    handle.stop?.();
  } catch {
    // Handle was already stopped.
  }

  try {
    handle.source?.stop();
  } catch {
    // Source was already stopped.
  }
}

function isSingleOctaveJump(a: number, b: number) {
  return Math.abs(a - b) === 12 && a % 12 === b % 12;
}

function resolveGetUserMediaError(error: unknown) {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return {
        permissionDenied: true,
        message: "Microphone permission was denied.",
      };
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return {
        permissionDenied: false,
        message: "No microphone was found.",
      };
    }

    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return {
        permissionDenied: false,
        message: "The microphone is unavailable or already in use.",
      };
    }

    if (
      error.name === "OverconstrainedError" ||
      error.name === "ConstraintNotSatisfiedError"
    ) {
      return {
        permissionDenied: false,
        message: "The requested microphone settings are not supported.",
      };
    }
  }

  return {
    permissionDenied: false,
    message: "Unable to access the microphone.",
  };
}

export function useTuner({
  targetTuning,
  capo = 0,
  toleranceCents = 8,
  stableHoldDurationMs,
  minimumClarity = 0.84,
}: UseTunerParams): UseTunerResult {
  const { audioContext, masterVolumeGainNode, instruments, setInstruments } =
    useTabStore((state) => ({
      audioContext: state.audioContext,
      masterVolumeGainNode: state.masterVolumeGainNode,
      instruments: state.instruments,
      setInstruments: state.setInstruments,
    }));

  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uiSnapshot, setUiSnapshot] = useState<UiSnapshot>(
    () => EMPTY_UI_SNAPSHOT,
  );
  const [currentTargetIndex, setCurrentTargetIndexState] = useState(0);
  const [completed, setCompleted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableMatchStartTimeRef = useRef<number | null>(null);
  const centsHistoryRef = useRef<number[]>([]);
  const lastDetectedMidiRef = useRef<number | null>(null);
  const lastValidPitchTimeRef = useRef<number | null>(null);
  const currentTargetIndexRef = useRef(0);
  const guidePlaybackHandleRef = useRef<GuidePlaybackHandle>(null);
  const guidePlaybackRequestIdRef = useRef(0);
  const guidePlaybackAwaitingSilenceRef = useRef(false);
  const guidePlaybackActiveRef = useRef(false);
  const guidePlaybackQuietFrameCountRef = useRef(0);
  const guidePlaybackSuppressionDeadlineRef = useRef(0);
  const guidePlaybackActiveTimeoutRef = useRef<number | null>(null);
  const guidePlaybackSuppressionTokenRef = useRef(0);
  const shouldBeListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const restartListeningPromiseRef = useRef<Promise<void> | null>(null);
  const instrumentsRef = useRef(instruments);
  const pendingOctaveJumpMidiRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const streamGenerationRef = useRef(0);
  const loopConfigRef = useRef<TunerLoopConfig>({
    targetMidis: DEFAULT_TUNING_NOTES.map((note) => get(note).midi ?? 40),
    toleranceCents,
    minimumClarity,
    requiredStableHoldMs:
      stableHoldDurationMs ?? DEFAULT_STABLE_HOLD_DURATION_MS,
  });

  const requiredStableHoldMs =
    stableHoldDurationMs ?? DEFAULT_STABLE_HOLD_DURATION_MS;

  const targetNotes = useMemo(
    () => resolveTargetNotes(targetTuning),
    [targetTuning],
  );

  const comparisonTargetTuning = useMemo(
    () => transposeTuningValue(targetTuning, capo),
    [capo, targetTuning],
  );

  const comparisonTargetNotes = useMemo(
    () => resolveTargetNotes(comparisonTargetTuning),
    [comparisonTargetTuning],
  );

  const targetMidis = useMemo(() => {
    const resolved = comparisonTargetNotes
      .map((note) => get(note).midi)
      .filter((midi): midi is number => midi !== null);

    if (resolved.length === 6) {
      return resolved;
    }

    return DEFAULT_TUNING_NOTES.map((note) => get(note).midi ?? 40);
  }, [comparisonTargetNotes]);

  const resetPitchTracking = useCallback(() => {
    stableMatchStartTimeRef.current = null;
    centsHistoryRef.current = [];
    lastDetectedMidiRef.current = null;
    lastValidPitchTimeRef.current = null;
    pendingOctaveJumpMidiRef.current = null;
  }, []);

  const clearGuidePlaybackSuppression = useCallback(() => {
    guidePlaybackSuppressionTokenRef.current += 1;
    guidePlaybackSuppressionDeadlineRef.current = 0;

    if (guidePlaybackActiveTimeoutRef.current !== null) {
      window.clearTimeout(guidePlaybackActiveTimeoutRef.current);
      guidePlaybackActiveTimeoutRef.current = null;
    }

    guidePlaybackAwaitingSilenceRef.current = false;
    guidePlaybackActiveRef.current = false;
    guidePlaybackQuietFrameCountRef.current = 0;
  }, []);

  const beginGuidePlaybackSuppression = useCallback(
    (handle: GuidePlaybackHandle) => {
      clearGuidePlaybackSuppression();

      guidePlaybackAwaitingSilenceRef.current = true;
      guidePlaybackActiveRef.current = true;
      guidePlaybackSuppressionDeadlineRef.current =
        performance.now() + GUIDE_SUPPRESSION_MAX_MS;

      const token = guidePlaybackSuppressionTokenRef.current;

      const markPlaybackInactive = () => {
        if (guidePlaybackSuppressionTokenRef.current !== token) {
          return;
        }

        guidePlaybackActiveRef.current = false;

        if (guidePlaybackActiveTimeoutRef.current !== null) {
          window.clearTimeout(guidePlaybackActiveTimeoutRef.current);
          guidePlaybackActiveTimeoutRef.current = null;
        }
      };

      if (handle?.source) {
        handle.source.addEventListener("ended", markPlaybackInactive, {
          once: true,
        });
        return;
      }

      guidePlaybackActiveTimeoutRef.current = window.setTimeout(
        markPlaybackInactive,
        GUIDE_NOTE_DURATION_SECONDS * 1000,
      );
    },
    [clearGuidePlaybackSuppression],
  );

  const playReferenceNote = useCallback(
    async (targetIndex: number) => {
      const targetMidi = targetMidis[targetIndex] ?? targetMidis[0];

      if (targetMidi === undefined || !audioContext) {
        return;
      }

      const noteName = midiToNoteName(targetMidi, { sharps: true });

      if (!noteName) {
        return;
      }

      const requestId = guidePlaybackRequestIdRef.current + 1;
      guidePlaybackRequestIdRef.current = requestId;

      clearGuidePlaybackSuppression();
      stopGuidePlayback(guidePlaybackHandleRef.current);
      guidePlaybackHandleRef.current = null;

      const cachedInstrument = instrumentsRef.current[GUIDE_INSTRUMENT_NAME];

      if (cachedInstrument) {
        resetPitchTracking();
        setUiSnapshot(EMPTY_UI_SNAPSHOT);

        guidePlaybackHandleRef.current = cachedInstrument.play(noteName, 0, {
          duration: GUIDE_NOTE_DURATION_SECONDS,
          gain: GUIDE_NOTE_GAIN,
          attack: GUIDE_NOTE_ATTACK_SECONDS,
        });

        beginGuidePlaybackSuppression(guidePlaybackHandleRef.current);
        return;
      }

      try {
        const guideInstrument = await ensureSoundfontPlayer(
          audioContext,
          GUIDE_INSTRUMENT_NAME,
          masterVolumeGainNode ?? audioContext.destination,
        );

        const nextInstruments = {
          ...instrumentsRef.current,
          [GUIDE_INSTRUMENT_NAME]: guideInstrument,
        };

        instrumentsRef.current = nextInstruments;
        setInstruments(nextInstruments);

        if (guidePlaybackRequestIdRef.current !== requestId) {
          return;
        }

        resetPitchTracking();
        setUiSnapshot(EMPTY_UI_SNAPSHOT);

        guidePlaybackHandleRef.current = guideInstrument.play(noteName, 0, {
          duration: GUIDE_NOTE_DURATION_SECONDS,
          gain: GUIDE_NOTE_GAIN,
          attack: GUIDE_NOTE_ATTACK_SECONDS,
        });

        beginGuidePlaybackSuppression(guidePlaybackHandleRef.current);
      } catch (caughtError) {
        if (guidePlaybackRequestIdRef.current === requestId) {
          clearGuidePlaybackSuppression();
        }

        console.error("Failed to play tuner reference note:", caughtError);
      }
    },
    [
      audioContext,
      beginGuidePlaybackSuppression,
      clearGuidePlaybackSuppression,
      masterVolumeGainNode,
      resetPitchTracking,
      setInstruments,
      targetMidis,
    ],
  );

  const setCurrentTargetIndex = useCallback(
    (index: number, options?: { playReferenceNote?: boolean }) => {
      const maxTargetIndex = Math.max(targetMidis.length - 1, 0);
      const clamped = Math.max(0, Math.min(index, maxTargetIndex));

      if (clamped !== currentTargetIndexRef.current) {
        resetPitchTracking();
        setUiSnapshot(EMPTY_UI_SNAPSHOT);
      }

      setCompleted(false);
      completedRef.current = false;
      setCurrentTargetIndexState(clamped);
      currentTargetIndexRef.current = clamped;

      if (options?.playReferenceNote ?? true) {
        void playReferenceNote(clamped);
      }
    },
    [playReferenceNote, resetPitchTracking, targetMidis.length],
  );

  const resetProgress = useCallback(() => {
    guidePlaybackRequestIdRef.current += 1;
    clearGuidePlaybackSuppression();
    stopGuidePlayback(guidePlaybackHandleRef.current);
    guidePlaybackHandleRef.current = null;
    resetPitchTracking();
    setUiSnapshot(EMPTY_UI_SNAPSHOT);
    setCurrentTargetIndexState(0);
    currentTargetIndexRef.current = 0;
    completedRef.current = false;
    setCompleted(false);
  }, [clearGuidePlaybackSuppression, resetPitchTracking]);

  const teardownListening = useCallback(
    ({ preserveIntent = false }: { preserveIntent?: boolean } = {}) => {
      if (!preserveIntent) {
        shouldBeListeningRef.current = false;
      }

      guidePlaybackRequestIdRef.current += 1;
      clearGuidePlaybackSuppression();
      stopGuidePlayback(guidePlaybackHandleRef.current);
      guidePlaybackHandleRef.current = null;

      streamGenerationRef.current += 1;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      analyserRef.current?.disconnect();
      analyserRef.current = null;

      micSourceNodeRef.current?.disconnect();
      micSourceNodeRef.current = null;

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }

        streamRef.current = null;
      }

      detectorRef.current = null;
      bufferRef.current = null;
      resetPitchTracking();

      setIsListening(false);
      setUiSnapshot(EMPTY_UI_SNAPSHOT);
    },
    [clearGuidePlaybackSuppression, resetPitchTracking],
  );

  const stopListening = useCallback(() => {
    teardownListening();
  }, [teardownListening]);

  const recoverListening = useCallback(async () => {
    if (restartListeningPromiseRef.current) {
      await restartListeningPromiseRef.current;
      return;
    }

    const activeTracks = streamRef.current?.getAudioTracks() ?? [];
    const hasRecoverableStream =
      activeTracks.length > 0 &&
      activeTracks.some(
        (track) => track.readyState === "live" && track.enabled && !track.muted,
      );

    if (isListeningRef.current && hasRecoverableStream) {
      return;
    }

    const restartPromise = (async () => {
      if (streamRef.current || isListeningRef.current) {
        teardownListening({ preserveIntent: true });
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: false,
            noiseSuppression: false,
            echoCancellation: false,
          },
        });

        streamRef.current = stream;

        if (!audioContext) {
          setError("Could not initialize audio context.");
          teardownListening();
          return;
        }

        if (audioContext.state === "suspended") {
          try {
            await audioContext.resume();
          } catch {
            // Best-effort; detection loop will still run.
          }
        }

        const micSourceNode = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        micSourceNode.connect(analyser);

        const inputBuffer = new Float32Array(analyser.fftSize);
        const detector = PitchDetector.forFloat32Array(inputBuffer.length);
        const streamGeneration = ++streamGenerationRef.current;

        micSourceNodeRef.current = micSourceNode;
        analyserRef.current = analyser;
        bufferRef.current = inputBuffer;
        detectorRef.current = detector;

        for (const track of stream.getAudioTracks()) {
          track.addEventListener("ended", () => {
            if (
              !shouldBeListeningRef.current ||
              streamGenerationRef.current !== streamGeneration
            ) {
              return;
            }

            teardownListening({ preserveIntent: true });
            void recoverListening();
          });
        }

        setIsListening(true);
        setError(null);
        setPermissionDenied(false);

        const runDetectionLoop = () => {
          const activeAnalyser = analyserRef.current;
          const activeBuffer = bufferRef.current;
          const activeDetector = detectorRef.current;

          if (!activeAnalyser || !activeBuffer || !activeDetector) {
            return;
          }

          const {
            targetMidis: activeTargetMidis,
            toleranceCents: activeToleranceCents,
            minimumClarity: activeMinimumClarity,
            requiredStableHoldMs: activeStableHoldDurationMs,
          } = loopConfigRef.current;

          activeAnalyser.getFloatTimeDomainData(activeBuffer);

          const frameTime = performance.now();

          let meanSquare = 0;

          for (const sample of activeBuffer) {
            meanSquare += sample * sample;
          }

          const rms = Math.sqrt(meanSquare / activeBuffer.length);

          if (guidePlaybackAwaitingSilenceRef.current) {
            if (frameTime > guidePlaybackSuppressionDeadlineRef.current) {
              clearGuidePlaybackSuppression();
            } else if (
              !guidePlaybackActiveRef.current &&
              rms < MIN_INPUT_GATE_RMS
            ) {
              guidePlaybackQuietFrameCountRef.current += 1;

              if (
                guidePlaybackQuietFrameCountRef.current >=
                GUIDE_PLAYBACK_QUIET_FRAME_COUNT
              ) {
                clearGuidePlaybackSuppression();
              }
            } else {
              guidePlaybackQuietFrameCountRef.current = 0;
            }

            setUiSnapshot(EMPTY_UI_SNAPSHOT);

            if (guidePlaybackAwaitingSilenceRef.current) {
              rafRef.current = window.requestAnimationFrame(runDetectionLoop);
              return;
            }
          }

          if (rms < MIN_INPUT_GATE_RMS) {
            // A quiet frame must never contribute toward the stable hold,
            // even if the previously detected pitch remains visible.
            stableMatchStartTimeRef.current = null;

            const lastValidPitchTime = lastValidPitchTimeRef.current;
            const shouldReleaseDisplayedPitch =
              lastValidPitchTime === null ||
              frameTime - lastValidPitchTime >= INPUT_LOSS_RELEASE_MS;

            if (shouldReleaseDisplayedPitch) {
              resetPitchTracking();

              setUiSnapshot((current) =>
                areUiSnapshotsEqual(current, EMPTY_UI_SNAPSHOT)
                  ? current
                  : EMPTY_UI_SNAPSHOT,
              );
            }

            rafRef.current = window.requestAnimationFrame(runDetectionLoop);
            return;
          }

          const quietnessWeight = Math.max(0, Math.min(1, (0.02 - rms) / 0.02));

          const effectiveMinimumClarity =
            activeMinimumClarity -
            quietnessWeight * (activeMinimumClarity - MIN_CLARITY_FLOOR);

          const lastValidPitchTime = lastValidPitchTimeRef.current;
          const isRetainingRecentPitch =
            lastValidPitchTime !== null &&
            frameTime - lastValidPitchTime < PITCH_LOSS_RELEASE_MS;

          // Acquiring a pitch requires the normal clarity threshold. Once a
          // pitch has been acquired, a slightly lower threshold is allowed so
          // ordinary guitar decay does not cause the display to flicker.
          const requiredClarity = isRetainingRecentPitch
            ? Math.max(
                MIN_CLARITY_FLOOR,
                effectiveMinimumClarity - CLARITY_RELEASE_HYSTERESIS,
              )
            : effectiveMinimumClarity;

          const [pitch, foundClarity] = activeDetector.findPitch(
            activeBuffer,
            audioContext.sampleRate,
          );

          if (
            !Number.isFinite(pitch) ||
            pitch <= 0 ||
            foundClarity < requiredClarity
          ) {
            // Keep the last valid result visible through short confidence
            // dropouts, but do not let those frames count as stable tuning.
            stableMatchStartTimeRef.current = null;

            const shouldReleaseDisplayedPitch =
              lastValidPitchTime === null ||
              frameTime - lastValidPitchTime >= PITCH_LOSS_RELEASE_MS;

            if (!shouldReleaseDisplayedPitch) {
              rafRef.current = window.requestAnimationFrame(runDetectionLoop);
              return;
            }

            const safeClarity = Number.isFinite(foundClarity)
              ? foundClarity
              : 0;
            const noSignalSnapshot = createNoSignalUiSnapshot(safeClarity);

            resetPitchTracking();

            setUiSnapshot((current) =>
              areUiSnapshotsEqual(current, noSignalSnapshot)
                ? current
                : noSignalSnapshot,
            );

            rafRef.current = window.requestAnimationFrame(runDetectionLoop);
            return;
          }

          const nearestMidi = midiFromFrequency(pitch);
          const previousDetectedMidi = lastDetectedMidiRef.current;

          if (
            previousDetectedMidi !== null &&
            isSingleOctaveJump(nearestMidi, previousDetectedMidi)
          ) {
            if (pendingOctaveJumpMidiRef.current !== nearestMidi) {
              pendingOctaveJumpMidiRef.current = nearestMidi;
              stableMatchStartTimeRef.current = null;
              rafRef.current = window.requestAnimationFrame(runDetectionLoop);
              return;
            }
          }

          pendingOctaveJumpMidiRef.current = null;
          lastValidPitchTimeRef.current = frameTime;

          const nearestFrequency = frequencyFromMidi(nearestMidi);
          const centsFromNearest = centsBetweenFrequencies(
            pitch,
            nearestFrequency,
          );

          if (lastDetectedMidiRef.current !== nearestMidi) {
            centsHistoryRef.current = [];
            lastDetectedMidiRef.current = nearestMidi;
            pendingOctaveJumpMidiRef.current = null;
          }

          centsHistoryRef.current.push(centsFromNearest);

          if (centsHistoryRef.current.length > 5) {
            centsHistoryRef.current.shift();
          }

          const smoothedDetectedCents =
            centsHistoryRef.current.reduce((sum, value) => sum + value, 0) /
            centsHistoryRef.current.length;

          const resolvedDetectedNote = midiToNoteName(nearestMidi, {
            sharps: true,
          }).toLowerCase();

          const targetMidi =
            activeTargetMidis[currentTargetIndexRef.current] ??
            activeTargetMidis[0] ??
            40;
          const targetFrequency = frequencyFromMidi(targetMidi);
          const centsFromTarget = centsBetweenFrequencies(
            pitch,
            targetFrequency,
          );

          const nextUiSnapshot: UiSnapshot = {
            signalDetected: true,
            detectedFrequency: Math.round(pitch * 10) / 10,
            detectedNote: resolvedDetectedNote,
            detectedCents: Math.round(smoothedDetectedCents * 10) / 10,
            targetCentsOffset: Math.round(centsFromTarget * 10) / 10,
            clarity: roundUiClarity(foundClarity),
          };

          setUiSnapshot((current) =>
            areUiSnapshotsEqual(current, nextUiSnapshot)
              ? current
              : nextUiSnapshot,
          );

          const isMatchingTargetNote = nearestMidi === targetMidi;
          const isWithinTolerance =
            Math.abs(centsFromTarget) <= activeToleranceCents;

          if (isMatchingTargetNote && isWithinTolerance) {
            if (stableMatchStartTimeRef.current === null) {
              stableMatchStartTimeRef.current = frameTime;
            }
          } else {
            stableMatchStartTimeRef.current = null;
          }

          if (
            stableMatchStartTimeRef.current !== null &&
            frameTime - stableMatchStartTimeRef.current >=
              activeStableHoldDurationMs
          ) {
            stableMatchStartTimeRef.current = null;

            if (currentTargetIndexRef.current >= activeTargetMidis.length - 1) {
              if (!completedRef.current) {
                completedRef.current = true;
                setCompleted(true);
              }
            } else {
              setCurrentTargetIndex(currentTargetIndexRef.current + 1);
            }
          }

          rafRef.current = window.requestAnimationFrame(runDetectionLoop);
        };

        rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      } catch (caughtError) {
        const resolvedError = resolveGetUserMediaError(caughtError);

        setPermissionDenied(resolvedError.permissionDenied);
        setError(resolvedError.message);
        teardownListening();
      }
    })();

    restartListeningPromiseRef.current = restartPromise.finally(() => {
      restartListeningPromiseRef.current = null;
    });

    await restartListeningPromiseRef.current;
  }, [
    audioContext,
    clearGuidePlaybackSuppression,
    resetPitchTracking,
    setCurrentTargetIndex,
    teardownListening,
  ]);

  const startListening = useCallback(async () => {
    shouldBeListeningRef.current = true;

    if (isListeningRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      shouldBeListeningRef.current = false;
      return;
    }

    setError(null);
    setPermissionDenied(false);
    await recoverListening();
  }, [recoverListening]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    instrumentsRef.current = instruments;
  }, [instruments]);

  useEffect(() => {
    loopConfigRef.current = {
      targetMidis,
      toleranceCents,
      minimumClarity,
      requiredStableHoldMs,
    };
  }, [minimumClarity, requiredStableHoldMs, targetMidis, toleranceCents]);

  useEffect(() => {
    currentTargetIndexRef.current = currentTargetIndex;
  }, [currentTargetIndex]);

  useEffect(() => {
    const handleBackgrounding = () => {
      if (
        !shouldBeListeningRef.current ||
        document.visibilityState === "visible"
      ) {
        return;
      }

      teardownListening({ preserveIntent: true });
    };

    document.addEventListener("visibilitychange", handleBackgrounding);
    window.addEventListener("pagehide", handleBackgrounding);

    return () => {
      document.removeEventListener("visibilitychange", handleBackgrounding);
      window.removeEventListener("pagehide", handleBackgrounding);
    };
  }, [teardownListening]);

  useEffect(() => {
    const recoverIfNeeded = () => {
      if (
        !shouldBeListeningRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      void recoverListening();
    };

    window.addEventListener("focus", recoverIfNeeded);
    document.addEventListener("visibilitychange", recoverIfNeeded);

    return () => {
      window.removeEventListener("focus", recoverIfNeeded);
      document.removeEventListener("visibilitychange", recoverIfNeeded);
    };
  }, [recoverListening]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      resetProgress();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [capo, resetProgress, targetTuning]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    signalDetected: uiSnapshot.signalDetected,
    permissionDenied,
    error,
    detectedNote: uiSnapshot.detectedNote,
    detectedFrequency: uiSnapshot.detectedFrequency,
    detectedCents: uiSnapshot.detectedCents,
    targetCentsOffset: uiSnapshot.targetCentsOffset,
    clarity: uiSnapshot.clarity,
    currentTargetIndex,
    completed,
    targetNotes,
    setCurrentTargetIndex,
    startListening,
    stopListening,
    resetProgress,
  };
}
