import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { PitchDetector } from "pitchy";
import { useEffect, useRef, useState } from "react";
import { useTabStore } from "~/stores/TabStore";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";
import {
  centsBetweenFrequencies,
  frequencyFromMidi,
  isSingleOctaveJump,
  midiFromFrequency,
} from "~/utils/tunerMath";
import {
  DEFAULT_TUNING,
  normalizeTuningValue,
  transposeTuningValue,
} from "~/utils/tunings";

export const TUNER_DEFAULTS = {
  toleranceCents: 5,
  stableHoldDurationMs: 1500,
  minimumClarity: 0.84,
} as const;

type UseTunerParams = {
  targetTuning: string;
  capo?: number;
  toleranceCents?: number;
  stableHoldDurationMs?: number;
  minimumClarity?: number;
};

export type TunerReading = {
  signalDetected: boolean;
  detectedNote: string | null;
  detectedFrequency: number | null;
  detectedCents: number | null;
  targetCentsOffset: number | null;
};

export type UseTunerResult = {
  isListening: boolean;
  permissionDenied: boolean;
  error: string | null;
  reading: TunerReading;
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

type GuidePlaybackHandle = {
  stop?: (when?: number) => void;
  source?: AudioBufferSourceNode | null;
} | null;

const EMPTY_READING: TunerReading = {
  signalDetected: false,
  detectedNote: null,
  detectedFrequency: null,
  detectedCents: null,
  targetCentsOffset: null,
};

const DEFAULT_TUNING_NOTES = DEFAULT_TUNING.split(" ");
const MIN_CLARITY_FLOOR = 0.66;
const MIN_INPUT_GATE_RMS = 0.001;
const INPUT_LOSS_RELEASE_MS = 180;
const PITCH_LOSS_RELEASE_MS = 350;
const CLARITY_RELEASE_HYSTERESIS = 0.12;
const GUIDE_INSTRUMENT_NAME = "acoustic_guitar_steel" as const;
const GUIDE_NOTE_DURATION_SECONDS = 1.2;
const GUIDE_NOTE_GAIN = 1.65;
const GUIDE_NOTE_ATTACK_SECONDS = 0.01;
/** How long to ignore the mic after playing a reference note. */
const GUIDE_SUPPRESSION_MS = (GUIDE_NOTE_DURATION_SECONDS + 0.5) * 1000;
const CENTS_SMOOTHING_WINDOW = 5;

function readingsEqual(a: TunerReading, b: TunerReading) {
  return (
    a.signalDetected === b.signalDetected &&
    a.detectedNote === b.detectedNote &&
    a.detectedFrequency === b.detectedFrequency &&
    a.detectedCents === b.detectedCents &&
    a.targetCentsOffset === b.targetCentsOffset
  );
}

function resolveTargetNotes(targetTuning: string) {
  return normalizeTuningValue(targetTuning).split(" ");
}

function resolveTargetMidis(targetTuning: string, capo: number) {
  const notes = resolveTargetNotes(transposeTuningValue(targetTuning, capo));
  const midis = notes
    .map((note) => get(note).midi)
    .filter((midi): midi is number => midi !== null);

  if (midis.length === 6) {
    return midis;
  }

  return DEFAULT_TUNING_NOTES.map((note) => get(note).midi ?? 40);
}

function stopGuidePlayback(handle: GuidePlaybackHandle) {
  if (!handle) return;

  try {
    handle.stop?.();
  } catch {
    // Already stopped.
  }

  try {
    handle.source?.stop();
  } catch {
    // Already stopped.
  }
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
  toleranceCents = TUNER_DEFAULTS.toleranceCents,
  stableHoldDurationMs = TUNER_DEFAULTS.stableHoldDurationMs,
  minimumClarity = TUNER_DEFAULTS.minimumClarity,
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
  const [reading, setReading] = useState<TunerReading>(EMPTY_READING);
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
  const pendingOctaveJumpMidiRef = useRef<number | null>(null);

  const currentTargetIndexRef = useRef(0);
  const completedRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const isListeningRef = useRef(false);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const streamGenerationRef = useRef(0);

  const guidePlaybackHandleRef = useRef<GuidePlaybackHandle>(null);
  const guidePlaybackRequestIdRef = useRef(0);
  const guideSuppressUntilRef = useRef(0);

  const instrumentsRef = useRef(instruments);
  const audioContextRef = useRef(audioContext);
  const masterVolumeGainNodeRef = useRef(masterVolumeGainNode);

  const targetNotes = resolveTargetNotes(targetTuning);
  const targetMidis = resolveTargetMidis(targetTuning, capo);

  const loopConfigRef = useRef({
    targetMidis,
    toleranceCents,
    minimumClarity,
    stableHoldDurationMs,
  });

  function updateReading(next: TunerReading) {
    setReading((current) => (readingsEqual(current, next) ? current : next));
  }

  function resetPitchTracking() {
    stableMatchStartTimeRef.current = null;
    centsHistoryRef.current = [];
    lastDetectedMidiRef.current = null;
    lastValidPitchTimeRef.current = null;
    pendingOctaveJumpMidiRef.current = null;
  }

  function clearGuideSuppression() {
    guideSuppressUntilRef.current = 0;
  }

  function teardownListening({ preserveIntent = false } = {}) {
    if (!preserveIntent) {
      shouldBeListeningRef.current = false;
    }

    guidePlaybackRequestIdRef.current += 1;
    clearGuideSuppression();
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

    isListeningRef.current = false;
    setIsListening(false);
    updateReading(EMPTY_READING);
  }

  function stopListening() {
    teardownListening();
  }

  async function playReferenceNote(targetIndex: number) {
    const ctx = audioContextRef.current;
    const targetMidi = targetMidis[targetIndex] ?? targetMidis[0];

    if (targetMidi === undefined || !ctx) {
      return;
    }

    const noteName = midiToNoteName(targetMidi, { sharps: true });
    if (!noteName) {
      return;
    }

    const requestId = ++guidePlaybackRequestIdRef.current;
    clearGuideSuppression();
    stopGuidePlayback(guidePlaybackHandleRef.current);
    guidePlaybackHandleRef.current = null;

    const play = (player: {
      play: (
        name: string,
        when: number,
        options: { duration: number; gain: number; attack: number },
      ) => GuidePlaybackHandle;
    }) => {
      if (guidePlaybackRequestIdRef.current !== requestId) {
        return;
      }

      resetPitchTracking();
      updateReading(EMPTY_READING);

      guidePlaybackHandleRef.current = player.play(noteName, 0, {
        duration: GUIDE_NOTE_DURATION_SECONDS,
        gain: GUIDE_NOTE_GAIN,
        attack: GUIDE_NOTE_ATTACK_SECONDS,
      });

      guideSuppressUntilRef.current = performance.now() + GUIDE_SUPPRESSION_MS;
    };

    const cached = instrumentsRef.current[GUIDE_INSTRUMENT_NAME];
    if (cached) {
      play(cached);
      return;
    }

    try {
      const guideInstrument = await ensureSoundfontPlayer(
        ctx,
        GUIDE_INSTRUMENT_NAME,
        masterVolumeGainNodeRef.current ?? ctx.destination,
      );

      const nextInstruments = {
        ...instrumentsRef.current,
        [GUIDE_INSTRUMENT_NAME]: guideInstrument,
      };

      instrumentsRef.current = nextInstruments;
      setInstruments(nextInstruments);
      play(guideInstrument);
    } catch (caughtError) {
      if (guidePlaybackRequestIdRef.current === requestId) {
        clearGuideSuppression();
      }
      console.error("Failed to play tuner reference note:", caughtError);
    }
  }

  function setCurrentTargetIndex(
    index: number,
    options?: { playReferenceNote?: boolean },
  ) {
    const maxIndex = Math.max(targetMidis.length - 1, 0);
    const clamped = Math.max(0, Math.min(index, maxIndex));

    if (clamped !== currentTargetIndexRef.current) {
      resetPitchTracking();
      updateReading(EMPTY_READING);
    }

    completedRef.current = false;
    setCompleted(false);
    currentTargetIndexRef.current = clamped;
    setCurrentTargetIndexState(clamped);

    if (options?.playReferenceNote ?? true) {
      void playReferenceNote(clamped);
    }
  }

  function resetProgress() {
    guidePlaybackRequestIdRef.current += 1;
    clearGuideSuppression();
    stopGuidePlayback(guidePlaybackHandleRef.current);
    guidePlaybackHandleRef.current = null;
    resetPitchTracking();
    updateReading(EMPTY_READING);
    currentTargetIndexRef.current = 0;
    setCurrentTargetIndexState(0);
    completedRef.current = false;
    setCompleted(false);
  }

  function advanceIfInTune(
    nearestMidi: number,
    centsFromTarget: number,
    frameTime: number,
  ) {
    const {
      targetMidis: midis,
      toleranceCents: tolerance,
      stableHoldDurationMs: holdMs,
    } = loopConfigRef.current;

    const targetMidi =
      midis[currentTargetIndexRef.current] ?? midis[0] ?? 40;
    const inTune =
      nearestMidi === targetMidi && Math.abs(centsFromTarget) <= tolerance;

    if (!inTune) {
      stableMatchStartTimeRef.current = null;
      return;
    }

    if (stableMatchStartTimeRef.current === null) {
      stableMatchStartTimeRef.current = frameTime;
      return;
    }

    if (frameTime - stableMatchStartTimeRef.current < holdMs) {
      return;
    }

    stableMatchStartTimeRef.current = null;

    if (currentTargetIndexRef.current >= midis.length - 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
      }
      return;
    }

    setCurrentTargetIndex(currentTargetIndexRef.current + 1);
  }

  function runDetectionLoop() {
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;
    const buffer = bufferRef.current;
    const detector = detectorRef.current;

    if (!ctx || !analyser || !buffer || !detector) {
      return;
    }

    const {
      targetMidis: midis,
      minimumClarity: clarityThreshold,
    } = loopConfigRef.current;

    analyser.getFloatTimeDomainData(buffer);
    const frameTime = performance.now();

    let meanSquare = 0;
    for (const sample of buffer) {
      meanSquare += sample * sample;
    }
    const rms = Math.sqrt(meanSquare / buffer.length);

    // Ignore the mic while a reference note is still ringing through speakers.
    if (frameTime < guideSuppressUntilRef.current) {
      updateReading(EMPTY_READING);
      rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      return;
    }

    if (rms < MIN_INPUT_GATE_RMS) {
      stableMatchStartTimeRef.current = null;

      const lastValid = lastValidPitchTimeRef.current;
      if (lastValid === null || frameTime - lastValid >= INPUT_LOSS_RELEASE_MS) {
        resetPitchTracking();
        updateReading(EMPTY_READING);
      }

      rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      return;
    }

    const quietnessWeight = Math.max(0, Math.min(1, (0.02 - rms) / 0.02));
    const effectiveMinimumClarity =
      clarityThreshold -
      quietnessWeight * (clarityThreshold - MIN_CLARITY_FLOOR);

    const lastValid = lastValidPitchTimeRef.current;
    const retainingPitch =
      lastValid !== null && frameTime - lastValid < PITCH_LOSS_RELEASE_MS;

    // Slightly lower clarity once a pitch is held so natural decay doesn't flicker.
    const requiredClarity = retainingPitch
      ? Math.max(
          MIN_CLARITY_FLOOR,
          effectiveMinimumClarity - CLARITY_RELEASE_HYSTERESIS,
        )
      : effectiveMinimumClarity;

    const [pitch, foundClarity] = detector.findPitch(buffer, ctx.sampleRate);

    if (
      !Number.isFinite(pitch) ||
      pitch <= 0 ||
      foundClarity < requiredClarity
    ) {
      stableMatchStartTimeRef.current = null;

      if (lastValid === null || frameTime - lastValid >= PITCH_LOSS_RELEASE_MS) {
        resetPitchTracking();
        updateReading(EMPTY_READING);
      }

      rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      return;
    }

    const nearestMidi = midiFromFrequency(pitch);
    const previousMidi = lastDetectedMidiRef.current;

    // Require two consecutive frames before accepting a sudden octave jump.
    if (
      previousMidi !== null &&
      isSingleOctaveJump(nearestMidi, previousMidi)
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

    const centsFromNearest = centsBetweenFrequencies(
      pitch,
      frequencyFromMidi(nearestMidi),
    );

    if (lastDetectedMidiRef.current !== nearestMidi) {
      centsHistoryRef.current = [];
      lastDetectedMidiRef.current = nearestMidi;
    }

    centsHistoryRef.current.push(centsFromNearest);
    if (centsHistoryRef.current.length > CENTS_SMOOTHING_WINDOW) {
      centsHistoryRef.current.shift();
    }

    const smoothedCents =
      centsHistoryRef.current.reduce((sum, value) => sum + value, 0) /
      centsHistoryRef.current.length;

    const targetMidi =
      midis[currentTargetIndexRef.current] ?? midis[0] ?? 40;
    const centsFromTarget = centsBetweenFrequencies(
      pitch,
      frequencyFromMidi(targetMidi),
    );

    updateReading({
      signalDetected: true,
      detectedFrequency: Math.round(pitch * 10) / 10,
      detectedNote: midiToNoteName(nearestMidi, { sharps: true }).toLowerCase(),
      detectedCents: Math.round(smoothedCents * 10) / 10,
      targetCentsOffset: Math.round(centsFromTarget * 10) / 10,
    });

    advanceIfInTune(nearestMidi, centsFromTarget, frameTime);

    rafRef.current = window.requestAnimationFrame(runDetectionLoop);
  }

  async function startListening() {
    shouldBeListeningRef.current = true;

    if (startPromiseRef.current) {
      await startPromiseRef.current;
      return;
    }

    if (isListeningRef.current) {
      const tracks = streamRef.current?.getAudioTracks() ?? [];
      const streamAlive = tracks.some(
        (track) => track.readyState === "live" && track.enabled && !track.muted,
      );
      if (streamAlive) {
        return;
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported in this browser.");
      shouldBeListeningRef.current = false;
      return;
    }

    const startPromise = (async () => {
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

        if (!shouldBeListeningRef.current) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        const ctx = audioContextRef.current;
        if (!ctx) {
          setError("Could not initialize audio context.");
          teardownListening();
          return;
        }

        if (ctx.state === "suspended") {
          try {
            await ctx.resume();
          } catch {
            // Detection can still run; resume is best-effort.
          }
        }

        streamRef.current = stream;

        const micSourceNode = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
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
            void startListening();
          });
        }

        isListeningRef.current = true;
        setIsListening(true);
        setError(null);
        setPermissionDenied(false);

        rafRef.current = window.requestAnimationFrame(runDetectionLoop);
      } catch (caughtError) {
        const resolved = resolveGetUserMediaError(caughtError);
        setPermissionDenied(resolved.permissionDenied);
        setError(resolved.message);
        teardownListening();
      }
    })();

    startPromiseRef.current = startPromise.finally(() => {
      startPromiseRef.current = null;
    });

    await startPromiseRef.current;
  }

  // Keep refs in sync for the rAF loop / async callbacks.
  useEffect(() => {
    instrumentsRef.current = instruments;
  }, [instruments]);

  useEffect(() => {
    audioContextRef.current = audioContext;
  }, [audioContext]);

  useEffect(() => {
    masterVolumeGainNodeRef.current = masterVolumeGainNode;
  }, [masterVolumeGainNode]);

  useEffect(() => {
    loopConfigRef.current = {
      targetMidis,
      toleranceCents,
      minimumClarity,
      stableHoldDurationMs,
    };
  }, [minimumClarity, stableHoldDurationMs, targetMidis, toleranceCents]);

  // Pause the mic when the tab is hidden; resume when it becomes visible again.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!shouldBeListeningRef.current) {
        return;
      }

      if (document.visibilityState === "hidden") {
        teardownListening({ preserveIntent: true });
        return;
      }

      void startListening();
    };

    const onPageHide = () => {
      if (shouldBeListeningRef.current) {
        teardownListening({ preserveIntent: true });
      }
    };

    const onFocus = () => {
      if (
        shouldBeListeningRef.current &&
        document.visibilityState === "visible"
      ) {
        void startListening();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onFocus);
    };
    // Intentionally empty: handlers read latest state via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset string progress when the tuning or capo changes.
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      resetProgress();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capo, targetTuning]);

  useEffect(() => {
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isListening,
    permissionDenied,
    error,
    reading,
    currentTargetIndex,
    completed,
    targetNotes,
    setCurrentTargetIndex,
    startListening,
    stopListening,
    resetProgress,
  };
}
