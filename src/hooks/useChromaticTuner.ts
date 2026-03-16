import { PitchDetector } from "pitchy";
import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeCustomTuningInput } from "~/utils/tunings";

type UseChromaticTunerParams = {
  targetTuning: string;
  toleranceCents?: number;
  stableFrameCount?: number;
  stableHoldDurationMs?: number;
  minimumClarity?: number;
  audioContext?: AudioContext | null;
};

type UseChromaticTunerResult = {
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

const DEFAULT_TUNING = ["e2", "a2", "d3", "g3", "b3", "e4"];
const ANALYSIS_GAIN = 3.2;
const MIN_CLARITY_FLOOR = 0.66;
const MIN_INPUT_GATE_RMS = 0.001;
const UI_UPDATE_INTERVAL_MS = 500;

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
  return normalizeCustomTuningInput(targetTuning) ?? DEFAULT_TUNING;
}

export function useChromaticTuner({
  targetTuning,
  toleranceCents = 8,
  stableFrameCount = 16,
  stableHoldDurationMs,
  minimumClarity = 0.84,
  audioContext,
}: UseChromaticTunerParams): UseChromaticTunerResult {
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
  const bufferRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableMatchStartTimeRef = useRef<number | null>(null);
  const lastUiUpdateTimeRef = useRef(0);
  const centsHistoryRef = useRef<number[]>([]);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const currentTargetIndexRef = useRef(0);

  const requiredStableHoldMs =
    stableHoldDurationMs ?? (stableFrameCount / 60) * 1000;

  const targetNotes = useMemo(
    () => resolveTargetNotes(targetTuning),
    [targetTuning],
  );

  const targetMidis = useMemo(() => {
    const resolved = targetNotes
      .map((note) => get(note).midi)
      .filter((midi): midi is number => midi !== null);

    if (resolved.length === 6) {
      return resolved;
    }

    return DEFAULT_TUNING.map((note) => get(note).midi ?? 40);
  }, [targetNotes]);

  const setCurrentTargetIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, 5));
    setCurrentTargetIndexState(clamped);
    currentTargetIndexRef.current = clamped;
  }, []);

  const resetProgress = useCallback(() => {
    stableMatchStartTimeRef.current = null;
    centsHistoryRef.current = [];
    setCurrentTargetIndex(0);
    setCompleted(false);
  }, [setCurrentTargetIndex]);

  const stopListening = useCallback(() => {
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
    lastUiUpdateTimeRef.current = 0;
    centsHistoryRef.current = [];

    setIsListening(false);
    setSignalDetected(false);
    setDetectedFrequency(null);
    setDetectedNote(null);
    setDetectedCents(null);
    setTargetCentsOffset(null);
    setClarity(0);
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      return;
    }

    setError(null);
    setPermissionDenied(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          noiseSuppression: false,
          echoCancellation: false,
        },
      });

      streamRef.current = stream;

      let activeAudioContext = audioContext;

      if (!activeAudioContext) {
        if (!localAudioContextRef.current) {
          localAudioContextRef.current = new AudioContext();
        }
        activeAudioContext = localAudioContextRef.current;
      }

      if (!activeAudioContext) {
        setError("Could not initialize audio context.");
        stopListening();
        return;
      }

      if (activeAudioContext.state === "suspended") {
        await activeAudioContext.resume();
      }

      const micSourceNode = activeAudioContext.createMediaStreamSource(stream);
      const analysisGainNode = activeAudioContext.createGain();
      const analyser = activeAudioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.12;

      analysisGainNode.gain.value = ANALYSIS_GAIN;

      micSourceNode.connect(analysisGainNode);
      analysisGainNode.connect(analyser);

      const inputBuffer = new Float32Array(analyser.fftSize);
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

        activeAnalyser.getFloatTimeDomainData(
          activeBuffer as Float32Array<ArrayBuffer>,
        );

        let meanSquare = 0;
        for (const sample of activeBuffer) {
          meanSquare += sample * sample;
        }
        const rms = Math.sqrt(meanSquare / activeBuffer.length);

        if (rms < MIN_INPUT_GATE_RMS) {
          stableMatchStartTimeRef.current = null;
          lastUiUpdateTimeRef.current = 0;
          setSignalDetected(false);
          setDetectedFrequency(null);
          setDetectedNote(null);
          setDetectedCents(null);
          setTargetCentsOffset(null);
          setClarity(0);
          rafRef.current = window.requestAnimationFrame(runDetectionLoop);
          return;
        }

        const quietnessWeight = Math.max(0, Math.min(1, (0.02 - rms) / 0.02));

        const effectiveMinimumClarity =
          minimumClarity -
          quietnessWeight * (minimumClarity - MIN_CLARITY_FLOOR);

        const [pitch, foundClarity] = activeDetector.findPitch(
          activeBuffer,
          activeAudioContext.sampleRate,
        );

        if (
          !Number.isFinite(pitch) ||
          pitch <= 0 ||
          foundClarity < effectiveMinimumClarity
        ) {
          stableMatchStartTimeRef.current = null;
          lastUiUpdateTimeRef.current = 0;
          setSignalDetected(false);
          setDetectedFrequency(null);
          setDetectedNote(null);
          setDetectedCents(null);
          setTargetCentsOffset(null);
          setClarity(foundClarity);
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
        const centsFromTarget = centsBetweenFrequencies(pitch, targetFrequency);

        const now = performance.now();
        const shouldUpdateUi =
          lastUiUpdateTimeRef.current === 0 ||
          now - lastUiUpdateTimeRef.current >= UI_UPDATE_INTERVAL_MS;

        setSignalDetected(true);
        if (shouldUpdateUi) {
          setDetectedFrequency(pitch);
          setDetectedNote(resolvedDetectedNote);
          setDetectedCents(smoothedDetectedCents);
          setTargetCentsOffset(centsFromTarget);
          setClarity(foundClarity);
          lastUiUpdateTimeRef.current = now;
        }

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
            setCurrentTargetIndex(nextIndex);
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
  }, [
    audioContext,
    isListening,
    minimumClarity,
    requiredStableHoldMs,
    setCurrentTargetIndex,
    stopListening,
    targetMidis,
    toleranceCents,
  ]);

  useEffect(() => {
    currentTargetIndexRef.current = currentTargetIndex;
  }, [currentTargetIndex]);

  useEffect(() => {
    resetProgress();
  }, [targetTuning, resetProgress]);

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
