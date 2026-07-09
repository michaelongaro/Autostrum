import { PitchDetector } from "pitchy";
import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import {
  DEFAULT_TUNING,
  normalizeTuningValue,
  transposeTuningValue,
} from "~/utils/tunings";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

type UseTunerParams = {
  targetTuning: string;
  capo?: number;
  toleranceCents?: number;
  stableFrameCount?: number;
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
  setCurrentTargetIndex: (index: number) => void;
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

const DEFAULT_TUNING_NOTES = DEFAULT_TUNING.split(" ");
const ANALYSIS_GAIN = 3.2;
const MIN_CLARITY_FLOOR = 0.66;
const MIN_INPUT_GATE_RMS = 0.001;
const UI_UPDATE_INTERVAL_MS = 500;
const GUIDE_INSTRUMENT_NAME = "acoustic_guitar_steel" as const;
const GUIDE_NOTE_DURATION_SECONDS = 1.2;
const GUIDE_NOTE_GAIN = 1.65;
const GUIDE_NOTE_ATTACK_SECONDS = 0.01;
const GUIDE_NOTE_LOCKOUT_BUFFER_MS = 180;

type GuidePlaybackHandle = {
  stop?: (when?: number) => void;
  source?: AudioBufferSourceNode | null;
} | null;

function createUiSnapshot({
  signalDetected,
  detectedNote,
  detectedFrequency,
  detectedCents,
  targetCentsOffset,
  clarity,
}: UiSnapshot): UiSnapshot {
  return {
    signalDetected,
    detectedNote,
    detectedFrequency,
    detectedCents,
    targetCentsOffset,
    clarity,
  };
}

function createEmptyUiSnapshot(clarity = 0): UiSnapshot {
  return createUiSnapshot({
    signalDetected: false,
    detectedNote: null,
    detectedFrequency: null,
    detectedCents: null,
    targetCentsOffset: null,
    clarity,
  });
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

function resolvePlaybackDestination(audioContext: AudioContext) {
  return audioContext.destination;
}

export function useTuner({
  targetTuning,
  capo = 0,
  toleranceCents = 8,
  stableFrameCount = 16,
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
  const [signalDetected, setSignalDetected] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [detectedFrequency, setDetectedFrequency] = useState<number | null>(
    null,
  );
  const [detectedCents, setDetectedCents] = useState<number | null>(null);
  const [targetCentsOffset, setTargetCentsOffset] = useState<number | null>(
    null,
  );
  const [clarity, setClarity] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndexState] = useState(0);
  const [completed, setCompleted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analysisGainNodeRef = useRef<GainNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableMatchStartTimeRef = useRef<number | null>(null);
  const lastUiUpdateTimeRef = useRef(0);
  const centsHistoryRef = useRef<number[]>([]);
  const currentTargetIndexRef = useRef(0);
  const guidePlaybackLockoutUntilRef = useRef(0);
  const guidePlaybackHandleRef = useRef<GuidePlaybackHandle>(null);
  const guidePlaybackRequestIdRef = useRef(0);
  const shouldBeListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const restartListeningPromiseRef = useRef<Promise<void> | null>(null);

  const requiredStableHoldMs =
    stableHoldDurationMs ?? (stableFrameCount / 60) * 1000;

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

  const applyUiSnapshot = useCallback(
    (
      snapshot: UiSnapshot,
      options?: {
        force?: boolean;
        resetThrottle?: boolean;
        timestamp?: number;
      },
    ) => {
      const timestamp = options?.timestamp ?? performance.now();

      if (
        !options?.force &&
        lastUiUpdateTimeRef.current !== 0 &&
        timestamp - lastUiUpdateTimeRef.current < UI_UPDATE_INTERVAL_MS
      ) {
        return false;
      }

      setSignalDetected(snapshot.signalDetected);
      setDetectedFrequency(snapshot.detectedFrequency);
      setDetectedNote(snapshot.detectedNote);
      setDetectedCents(snapshot.detectedCents);
      setTargetCentsOffset(snapshot.targetCentsOffset);
      setClarity(snapshot.clarity);
      lastUiUpdateTimeRef.current = options?.resetThrottle ? 0 : timestamp;

      return true;
    },
    [],
  );

  const playReferenceNote = useCallback(
    async (targetIndex: number) => {
      const targetMidi = targetMidis[targetIndex] ?? targetMidis[0];
      if (targetMidi === undefined) {
        return;
      }

      if (!audioContext) {
        return;
      }

      const noteName = midiToNoteName(targetMidi, { sharps: true });
      if (!noteName) {
        return;
      }

      const requestId = guidePlaybackRequestIdRef.current + 1;
      guidePlaybackRequestIdRef.current = requestId;

      stopGuidePlayback(guidePlaybackHandleRef.current);
      guidePlaybackHandleRef.current = null;

      const cachedInstrument = instruments[GUIDE_INSTRUMENT_NAME];
      if (cachedInstrument) {
        guidePlaybackLockoutUntilRef.current =
          performance.now() +
          GUIDE_NOTE_DURATION_SECONDS * 1000 +
          GUIDE_NOTE_LOCKOUT_BUFFER_MS;
        stableMatchStartTimeRef.current = null;
        centsHistoryRef.current = [];
        applyUiSnapshot(createEmptyUiSnapshot(), {
          force: true,
          resetThrottle: true,
        });

        guidePlaybackHandleRef.current = cachedInstrument.play(noteName, 0, {
          duration: GUIDE_NOTE_DURATION_SECONDS,
          gain: GUIDE_NOTE_GAIN,
          attack: GUIDE_NOTE_ATTACK_SECONDS,
        });

        return;
      }

      try {
        const guideInstrument = await ensureSoundfontPlayer(
          audioContext,
          GUIDE_INSTRUMENT_NAME,
          masterVolumeGainNode ?? resolvePlaybackDestination(audioContext),
        );

        setInstruments({
          ...instruments,
          [GUIDE_INSTRUMENT_NAME]: guideInstrument,
        });

        if (guidePlaybackRequestIdRef.current !== requestId) {
          return;
        }

        guidePlaybackLockoutUntilRef.current =
          performance.now() +
          GUIDE_NOTE_DURATION_SECONDS * 1000 +
          GUIDE_NOTE_LOCKOUT_BUFFER_MS;
        stableMatchStartTimeRef.current = null;
        centsHistoryRef.current = [];
        applyUiSnapshot(createEmptyUiSnapshot(), {
          force: true,
          resetThrottle: true,
        });

        guidePlaybackHandleRef.current = guideInstrument.play(noteName, 0, {
          duration: GUIDE_NOTE_DURATION_SECONDS,
          gain: GUIDE_NOTE_GAIN,
          attack: GUIDE_NOTE_ATTACK_SECONDS,
        });
      } catch (error) {
        if (guidePlaybackRequestIdRef.current === requestId) {
          guidePlaybackLockoutUntilRef.current = 0;
        }

        console.error("Failed to play tuner reference note:", error);
      }
    },
    [
      applyUiSnapshot,
      audioContext,
      instruments,
      masterVolumeGainNode,
      setInstruments,
      targetMidis,
    ],
  );

  const setCurrentTargetIndex = useCallback(
    (
      index: number,
      options?: {
        allowCreateAudioContext?: boolean;
        playReferenceNote?: boolean;
      },
    ) => {
      const maxTargetIndex = Math.max(targetMidis.length - 1, 0);
      const clamped = Math.max(0, Math.min(index, maxTargetIndex));

      if (clamped !== currentTargetIndexRef.current) {
        stableMatchStartTimeRef.current = null;
        centsHistoryRef.current = [];
        applyUiSnapshot(createEmptyUiSnapshot(), {
          force: true,
          resetThrottle: true,
        });
      }

      setCurrentTargetIndexState(clamped);
      currentTargetIndexRef.current = clamped;

      if (options?.playReferenceNote ?? true) {
        void playReferenceNote(clamped);
      }
    },
    [applyUiSnapshot, playReferenceNote, targetMidis.length],
  );

  const resetProgress = useCallback(() => {
    guidePlaybackRequestIdRef.current += 1;
    guidePlaybackLockoutUntilRef.current = 0;
    stopGuidePlayback(guidePlaybackHandleRef.current);
    guidePlaybackHandleRef.current = null;
    stableMatchStartTimeRef.current = null;
    centsHistoryRef.current = [];
    applyUiSnapshot(createEmptyUiSnapshot(), {
      force: true,
      resetThrottle: true,
    });
    setCurrentTargetIndexState(0);
    currentTargetIndexRef.current = 0;
    setCompleted(false);
  }, [applyUiSnapshot]);

  const teardownListening = useCallback(
    ({ preserveIntent = false }: { preserveIntent?: boolean } = {}) => {
      if (!preserveIntent) {
        shouldBeListeningRef.current = false;
      }

      guidePlaybackRequestIdRef.current += 1;
      guidePlaybackLockoutUntilRef.current = 0;
      stopGuidePlayback(guidePlaybackHandleRef.current);
      guidePlaybackHandleRef.current = null;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      analyserRef.current?.disconnect();
      analyserRef.current = null;

      analysisGainNodeRef.current?.disconnect();
      analysisGainNodeRef.current = null;

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
      stableMatchStartTimeRef.current = null;
      centsHistoryRef.current = [];

      setIsListening(false);
      applyUiSnapshot(createEmptyUiSnapshot(), {
        force: true,
        resetThrottle: true,
      });
    },
    [applyUiSnapshot],
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
        (track) => track.readyState === "live" && track.enabled,
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
          stopListening();
          return;
        }

        const micSourceNode = audioContext.createMediaStreamSource(stream);
        const analysisGainNode = audioContext.createGain();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.12;

        analysisGainNode.gain.value = ANALYSIS_GAIN;

        micSourceNode.connect(analysisGainNode);
        analysisGainNode.connect(analyser);

        const inputBuffer = new Float32Array(
          new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT),
        );
        const detector = PitchDetector.forFloat32Array(inputBuffer.length);

        micSourceNodeRef.current = micSourceNode;
        analysisGainNodeRef.current = analysisGainNode;
        analyserRef.current = analyser;
        bufferRef.current = inputBuffer;
        detectorRef.current = detector;

        setIsListening(true);

        const runDetectionLoop = () => {
          const activeAnalyser = analyserRef.current;
          const activeBuffer = bufferRef.current;
          const activeDetector = detectorRef.current;

          if (!activeAnalyser || !activeBuffer || !activeDetector) {
            return;
          }

          if (guidePlaybackLockoutUntilRef.current > performance.now()) {
            rafRef.current = window.requestAnimationFrame(runDetectionLoop);
            return;
          }

          activeAnalyser.getFloatTimeDomainData(activeBuffer);

          let meanSquare = 0;
          for (const sample of activeBuffer) {
            meanSquare += sample * sample;
          }
          const rms = Math.sqrt(meanSquare / activeBuffer.length);

          if (rms < MIN_INPUT_GATE_RMS) {
            stableMatchStartTimeRef.current = null;
            applyUiSnapshot(createEmptyUiSnapshot());
            rafRef.current = window.requestAnimationFrame(runDetectionLoop);
            return;
          }

          const quietnessWeight = Math.max(0, Math.min(1, (0.02 - rms) / 0.02));

          const effectiveMinimumClarity =
            minimumClarity -
            quietnessWeight * (minimumClarity - MIN_CLARITY_FLOOR);

          const [pitch, foundClarity] = activeDetector.findPitch(
            activeBuffer,
            audioContext.sampleRate,
          );

          if (
            !Number.isFinite(pitch) ||
            pitch <= 0 ||
            foundClarity < effectiveMinimumClarity
          ) {
            stableMatchStartTimeRef.current = null;
            applyUiSnapshot(createEmptyUiSnapshot(foundClarity));
            rafRef.current = window.requestAnimationFrame(runDetectionLoop);
            return;
          }

          const nearestMidi = midiFromFrequency(pitch);
          const nearestFrequency = frequencyFromMidi(nearestMidi);
          const centsFromNearest = centsBetweenFrequencies(
            pitch,
            nearestFrequency,
          );

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
            targetMidis[currentTargetIndexRef.current] ?? targetMidis[0] ?? 40;
          const targetFrequency = frequencyFromMidi(targetMidi);
          const centsFromTarget = centsBetweenFrequencies(
            pitch,
            targetFrequency,
          );

          const now = performance.now();
          applyUiSnapshot(
            createUiSnapshot({
              signalDetected: true,
              detectedFrequency: pitch,
              detectedNote: resolvedDetectedNote,
              detectedCents: smoothedDetectedCents,
              targetCentsOffset: centsFromTarget,
              clarity: foundClarity,
            }),
            { timestamp: now },
          );

          const isMatchingTargetNote = nearestMidi === targetMidi;
          const isWithinTolerance = Math.abs(centsFromTarget) <= toleranceCents;

          if (isMatchingTargetNote && isWithinTolerance) {
            if (stableMatchStartTimeRef.current === null) {
              stableMatchStartTimeRef.current = performance.now();
            }
          } else {
            stableMatchStartTimeRef.current = null;
          }

          if (
            stableMatchStartTimeRef.current !== null &&
            performance.now() - stableMatchStartTimeRef.current >=
              requiredStableHoldMs
          ) {
            stableMatchStartTimeRef.current = null;

            if (currentTargetIndexRef.current >= targetMidis.length - 1) {
              setCompleted(true);
            } else {
              const nextIndex = currentTargetIndexRef.current + 1;
              setCurrentTargetIndex(nextIndex, {
                allowCreateAudioContext: false,
              });
            }
          }

          rafRef.current = window.requestAnimationFrame(runDetectionLoop);
        };

        rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      } catch {
        setPermissionDenied(true);
        setError("Microphone permission was denied.");
        stopListening();
      }
    })();

    restartListeningPromiseRef.current = restartPromise.finally(() => {
      restartListeningPromiseRef.current = null;
    });

    await restartListeningPromiseRef.current;
  }, [
    applyUiSnapshot,
    audioContext,
    minimumClarity,
    requiredStableHoldMs,
    setCurrentTargetIndex,
    stopListening,
    teardownListening,
    targetMidis,
    toleranceCents,
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
    signalDetected,
    permissionDenied,
    error,
    detectedNote,
    detectedFrequency,
    detectedCents,
    targetCentsOffset,
    clarity,
    currentTargetIndex,
    completed,
    targetNotes,
    setCurrentTargetIndex,
    startListening,
    stopListening,
    resetProgress,
  };
}
