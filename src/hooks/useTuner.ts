import { midiToNoteName } from "@tonaljs/midi";
import { get } from "@tonaljs/note";
import { PitchDetector } from "pitchy";
import { useEffect, useMemo, useRef, useState } from "react";
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

type PitchCandidateSample = {
  cents: number;
  time: number;
};

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
const INPUT_LOSS_RELEASE_MS = 300;
const PITCH_LOSS_RELEASE_MS = 500;
const CLARITY_RELEASE_HYSTERESIS = 0.12;

const PITCH_ACQUISITION_DURATION_MS = 120;
const PITCH_ACQUISITION_WINDOW_MS = 240;
const PITCH_ACQUISITION_MIN_FRAMES = 6;
const MAX_ACQUISITION_SPREAD_CENTS = 24;

const NOTE_SWITCH_DURATION_MS = 100;
const NOTE_SWITCH_MIN_FRAMES = 5;

const TRACKING_CENTS_WINDOW = 7;
const MAX_TRACKING_SPREAD_CENTS = 30;
const CENTS_SMOOTHING_ALPHA = 0.4;

const READING_UPDATE_INTERVAL_MS = 80;
const CONFIDENCE_LOSS_RELEASE_MS = 300;

const GUIDE_INSTRUMENT_NAME = "acoustic_guitar_steel" as const;
const GUIDE_NOTE_DURATION_SECONDS = 1.2;
const GUIDE_NOTE_GAIN = 1.65;
const GUIDE_NOTE_ATTACK_SECONDS = 0.01;

/** How long to ignore the mic after playing a reference note. */
const GUIDE_SUPPRESSION_MS = (GUIDE_NOTE_DURATION_SECONDS + 0.5) * 1000;

function readingsEqual(a: TunerReading, b: TunerReading) {
  return (
    a.signalDetected === b.signalDetected &&
    a.detectedNote === b.detectedNote &&
    a.detectedFrequency === b.detectedFrequency &&
    a.detectedCents === b.detectedCents &&
    a.targetCentsOffset === b.targetCentsOffset
  );
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

/**
 * Returns a spread that ignores the most extreme samples on either side.
 *
 * This is less sensitive than a simple min/max range to a single bad pitch
 * estimate caused by a pluck transient, room noise, or a strong harmonic.
 */
function robustSpread(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const lowerIndex = Math.floor((sorted.length - 1) * 0.2);
  const upperIndex = Math.ceil((sorted.length - 1) * 0.8);

  return sorted[upperIndex] - sorted[lowerIndex];
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
  if (!handle) {
    return;
  }

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
  const lastRawDetectedMidiRef = useRef<number | null>(null);
  const lastValidPitchTimeRef = useRef<number | null>(null);
  const lastConfidentPitchTimeRef = useRef<number | null>(null);
  const pendingOctaveJumpMidiRef = useRef<number | null>(null);

  const pitchCandidateMidiRef = useRef<number | null>(null);
  const pitchCandidateSamplesRef = useRef<PitchCandidateSample[]>([]);

  const lockedMidiRef = useRef<number | null>(null);
  const trackingCentsHistoryRef = useRef<number[]>([]);
  const smoothedCentsRef = useRef<number | null>(null);
  const lastReadingUpdateTimeRef = useRef(0);

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

  const targetNotes = useMemo(
    () => resolveTargetNotes(targetTuning),
    [targetTuning],
  );

  const targetMidis = useMemo(
    () => resolveTargetMidis(targetTuning, capo),
    [capo, targetTuning],
  );

  const loopConfigRef = useRef({
    targetMidis,
    toleranceCents,
    minimumClarity,
    stableHoldDurationMs,
  });

  function updateReading(next: TunerReading) {
    setReading((current) => (readingsEqual(current, next) ? current : next));
  }

  function resetPitchCandidate() {
    pitchCandidateMidiRef.current = null;
    pitchCandidateSamplesRef.current = [];
  }

  function clearPitchLock({
    preserveCandidate = false,
  }: {
    preserveCandidate?: boolean;
  } = {}) {
    lockedMidiRef.current = null;
    trackingCentsHistoryRef.current = [];
    smoothedCentsRef.current = null;
    lastConfidentPitchTimeRef.current = null;
    lastReadingUpdateTimeRef.current = 0;
    stableMatchStartTimeRef.current = null;

    if (!preserveCandidate) {
      resetPitchCandidate();
    }
  }

  function resetPitchTracking() {
    stableMatchStartTimeRef.current = null;
    lastRawDetectedMidiRef.current = null;
    lastValidPitchTimeRef.current = null;
    lastConfidentPitchTimeRef.current = null;
    pendingOctaveJumpMidiRef.current = null;
    lockedMidiRef.current = null;
    trackingCentsHistoryRef.current = [];
    smoothedCentsRef.current = null;
    lastReadingUpdateTimeRef.current = 0;
    resetPitchCandidate();
  }

  function collectPitchCandidate(
    midi: number,
    cents: number,
    frameTime: number,
    requiredDurationMs: number,
    requiredFrames: number,
  ) {
    if (pitchCandidateMidiRef.current !== midi) {
      pitchCandidateMidiRef.current = midi;
      pitchCandidateSamplesRef.current = [];
    }

    const samples = pitchCandidateSamplesRef.current;

    samples.push({
      cents,
      time: frameTime,
    });

    while (
      samples.length > 0 &&
      frameTime - samples[0].time > PITCH_ACQUISITION_WINDOW_MS
    ) {
      samples.shift();
    }

    if (samples.length < requiredFrames) {
      return null;
    }

    const duration = frameTime - samples[0].time;
    if (duration < requiredDurationMs) {
      return null;
    }

    const centsValues = samples.map((sample) => sample.cents);
    if (robustSpread(centsValues) > MAX_ACQUISITION_SPREAD_CENTS) {
      return null;
    }

    return centsValues;
  }

  function lockPitch(
    midi: number,
    candidateCents: number[],
    frameTime: number,
  ) {
    const initialCents = median(candidateCents);

    lockedMidiRef.current = midi;
    trackingCentsHistoryRef.current = candidateCents.slice(
      -TRACKING_CENTS_WINDOW,
    );
    smoothedCentsRef.current = initialCents;
    lastConfidentPitchTimeRef.current = frameTime;
    stableMatchStartTimeRef.current = null;
    lastReadingUpdateTimeRef.current = 0;
    resetPitchCandidate();
  }

  function clearGuideSuppression() {
    guideSuppressUntilRef.current = 0;
  }

  function teardownListening({
    preserveIntent = false,
  }: {
    preserveIntent?: boolean;
  } = {}) {
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
    const midis = loopConfigRef.current.targetMidis;
    const targetMidi = midis[targetIndex] ?? midis[0];

    if (targetMidi === undefined || !ctx) {
      return;
    }

    const noteName = midiToNoteName(targetMidi, {
      sharps: true,
    });

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
        options: {
          duration: number;
          gain: number;
          attack: number;
        },
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
    const midis = loopConfigRef.current.targetMidis;
    const maxIndex = Math.max(midis.length - 1, 0);
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
    detectedMidi: number,
    centsFromTarget: number,
    frameTime: number,
  ) {
    const {
      targetMidis: midis,
      toleranceCents: tolerance,
      stableHoldDurationMs: holdMs,
    } = loopConfigRef.current;

    const targetMidi = midis[currentTargetIndexRef.current] ?? midis[0] ?? 40;

    const inTune =
      detectedMidi === targetMidi && Math.abs(centsFromTarget) <= tolerance;

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

    /*
     * Automatic advancement should not play a reference note. Doing so
     * suppresses microphone processing and interrupts the player's tuning
     * flow. Reference playback remains available for explicit selection.
     */
    setCurrentTargetIndex(currentTargetIndexRef.current + 1, {
      playReferenceNote: false,
    });
  }

  function publishLockedReading(frameTime: number, force = false) {
    const lockedMidi = lockedMidiRef.current;
    const smoothedCents = smoothedCentsRef.current;

    if (lockedMidi === null || smoothedCents === null) {
      return;
    }

    if (
      !force &&
      frameTime - lastReadingUpdateTimeRef.current < READING_UPDATE_INTERVAL_MS
    ) {
      return;
    }

    const midis = loopConfigRef.current.targetMidis;
    const targetMidi = midis[currentTargetIndexRef.current] ?? midis[0] ?? 40;

    /*
     * Reconstruct the filtered frequency from the locked MIDI note and
     * filtered cents. This prevents raw frame-to-frame frequency jitter from
     * leaking back into the UI.
     */
    const filteredFrequency =
      frequencyFromMidi(lockedMidi) * 2 ** (smoothedCents / 1200);

    const centsFromTarget = (lockedMidi - targetMidi) * 100 + smoothedCents;

    updateReading({
      signalDetected: true,
      detectedFrequency: Math.round(filteredFrequency * 10) / 10,
      detectedNote: midiToNoteName(lockedMidi, {
        sharps: true,
      }).toLowerCase(),
      detectedCents: Math.round(smoothedCents * 10) / 10,
      targetCentsOffset: Math.round(centsFromTarget * 10) / 10,
    });

    lastReadingUpdateTimeRef.current = frameTime;
  }

  function scheduleNextDetectionFrame() {
    rafRef.current = window.requestAnimationFrame(runDetectionLoop);
  }

  function runDetectionLoop() {
    const ctx = audioContextRef.current;
    const analyser = analyserRef.current;
    const buffer = bufferRef.current;
    const detector = detectorRef.current;

    if (!ctx || !analyser || !buffer || !detector) {
      return;
    }

    const { minimumClarity: clarityThreshold } = loopConfigRef.current;

    analyser.getFloatTimeDomainData(buffer);
    const frameTime = performance.now();

    let meanSquare = 0;

    for (const sample of buffer) {
      meanSquare += sample * sample;
    }

    const rms = Math.sqrt(meanSquare / buffer.length);

    /*
     * Ignore microphone input while a reference note is likely to be
     * ringing through the device speakers.
     */
    if (frameTime < guideSuppressUntilRef.current) {
      stableMatchStartTimeRef.current = null;
      updateReading(EMPTY_READING);
      scheduleNextDetectionFrame();
      return;
    }

    if (rms < MIN_INPUT_GATE_RMS) {
      stableMatchStartTimeRef.current = null;

      const lastValid = lastValidPitchTimeRef.current;

      if (
        lastValid === null ||
        frameTime - lastValid >= INPUT_LOSS_RELEASE_MS
      ) {
        resetPitchTracking();
        updateReading(EMPTY_READING);
      }

      scheduleNextDetectionFrame();
      return;
    }

    const quietnessWeight = Math.max(0, Math.min(1, (0.02 - rms) / 0.02));

    const effectiveMinimumClarity =
      clarityThreshold -
      quietnessWeight * (clarityThreshold - MIN_CLARITY_FLOOR);

    const lastValid = lastValidPitchTimeRef.current;

    const retainingPitch =
      lastValid !== null && frameTime - lastValid < PITCH_LOSS_RELEASE_MS;

    /*
     * Slightly lower the required clarity after acquiring a pitch so the
     * natural decay of a guitar string does not cause visual flicker.
     */
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

      if (
        lastValid === null ||
        frameTime - lastValid >= PITCH_LOSS_RELEASE_MS
      ) {
        resetPitchTracking();
        updateReading(EMPTY_READING);
      }

      scheduleNextDetectionFrame();
      return;
    }

    const nearestMidi = midiFromFrequency(pitch);
    const previousRawMidi = lastRawDetectedMidiRef.current;

    /*
     * A strong harmonic can make a guitar pitch detector briefly report an
     * octave jump. Require at least two frames before allowing the octave
     * candidate into the normal confidence-acquisition process.
     */
    if (
      previousRawMidi !== null &&
      isSingleOctaveJump(nearestMidi, previousRawMidi)
    ) {
      if (pendingOctaveJumpMidiRef.current !== nearestMidi) {
        pendingOctaveJumpMidiRef.current = nearestMidi;
        stableMatchStartTimeRef.current = null;
        scheduleNextDetectionFrame();
        return;
      }
    }

    pendingOctaveJumpMidiRef.current = null;
    lastRawDetectedMidiRef.current = nearestMidi;
    lastValidPitchTimeRef.current = frameTime;

    const centsFromNearest = centsBetweenFrequencies(
      pitch,
      frequencyFromMidi(nearestMidi),
    );

    const lockedMidi = lockedMidiRef.current;

    /*
     * No pitch is currently trusted. Accumulate a short run of consistent
     * samples before displaying anything.
     */
    if (lockedMidi === null) {
      const candidateCents = collectPitchCandidate(
        nearestMidi,
        centsFromNearest,
        frameTime,
        PITCH_ACQUISITION_DURATION_MS,
        PITCH_ACQUISITION_MIN_FRAMES,
      );

      if (candidateCents) {
        lockPitch(nearestMidi, candidateCents, frameTime);
        publishLockedReading(frameTime, true);

        const smoothedCents = smoothedCentsRef.current;

        const targetMidi =
          loopConfigRef.current.targetMidis[currentTargetIndexRef.current] ??
          loopConfigRef.current.targetMidis[0] ??
          40;

        if (smoothedCents !== null) {
          const centsFromTarget =
            (nearestMidi - targetMidi) * 100 + smoothedCents;

          advanceIfInTune(nearestMidi, centsFromTarget, frameTime);
        }
      }

      scheduleNextDetectionFrame();
      return;
    }

    /*
     * Do not immediately switch the displayed note when a neighboring note
     * or harmonic appears. Require the new note to remain stable first.
     */
    if (nearestMidi !== lockedMidi) {
      stableMatchStartTimeRef.current = null;

      const candidateCents = collectPitchCandidate(
        nearestMidi,
        centsFromNearest,
        frameTime,
        NOTE_SWITCH_DURATION_MS,
        NOTE_SWITCH_MIN_FRAMES,
      );

      if (candidateCents) {
        lockPitch(nearestMidi, candidateCents, frameTime);
        publishLockedReading(frameTime, true);
      } else {
        const lastConfident = lastConfidentPitchTimeRef.current;

        if (
          lastConfident !== null &&
          frameTime - lastConfident >= CONFIDENCE_LOSS_RELEASE_MS
        ) {
          clearPitchLock({
            preserveCandidate: true,
          });
          updateReading(EMPTY_READING);
        }
      }

      scheduleNextDetectionFrame();
      return;
    }

    /*
     * The detected note still matches the locked note. Use a rolling median
     * to reject individual outliers and an EMA to keep movement responsive
     * without making the tuner needle or frequency label jitter.
     */
    resetPitchCandidate();

    trackingCentsHistoryRef.current.push(centsFromNearest);

    if (trackingCentsHistoryRef.current.length > TRACKING_CENTS_WINDOW) {
      trackingCentsHistoryRef.current.shift();
    }

    const trackingSpread = robustSpread(trackingCentsHistoryRef.current);

    if (trackingSpread > MAX_TRACKING_SPREAD_CENTS) {
      stableMatchStartTimeRef.current = null;

      const lastConfident = lastConfidentPitchTimeRef.current;

      if (
        lastConfident !== null &&
        frameTime - lastConfident >= CONFIDENCE_LOSS_RELEASE_MS
      ) {
        clearPitchLock();
        updateReading(EMPTY_READING);
      }

      scheduleNextDetectionFrame();
      return;
    }

    const medianCents = median(trackingCentsHistoryRef.current);

    const previousSmoothed = smoothedCentsRef.current;

    smoothedCentsRef.current =
      previousSmoothed === null
        ? medianCents
        : previousSmoothed +
          CENTS_SMOOTHING_ALPHA * (medianCents - previousSmoothed);

    lastConfidentPitchTimeRef.current = frameTime;

    publishLockedReading(frameTime);

    const smoothedCents = smoothedCentsRef.current;

    if (smoothedCents !== null) {
      const midis = loopConfigRef.current.targetMidis;

      const targetMidi = midis[currentTargetIndexRef.current] ?? midis[0] ?? 40;

      const centsFromTarget = (lockedMidi - targetMidi) * 100 + smoothedCents;

      advanceIfInTune(lockedMidi, centsFromTarget, frameTime);
    }

    scheduleNextDetectionFrame();
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
        teardownListening({
          preserveIntent: true,
        });
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

            teardownListening({
              preserveIntent: true,
            });

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

  /*
   * Pause the microphone when the tab is hidden and resume when it becomes
   * visible again.
   */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!shouldBeListeningRef.current) {
        return;
      }

      if (document.visibilityState === "hidden") {
        teardownListening({
          preserveIntent: true,
        });
        return;
      }

      void startListening();
    };

    const onPageHide = () => {
      if (shouldBeListeningRef.current) {
        teardownListening({
          preserveIntent: true,
        });
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
    // Handlers read the latest state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Reset string progress when the tuning or capo changes.
   */
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
