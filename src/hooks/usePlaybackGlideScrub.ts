import {
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  clamp,
  getAbsoluteChordPosition,
  getAbsoluteChordPositionBounds,
  getChordIndexAtPlayhead,
  getNearestChordIndex,
  getStripTransform,
  halfShiftRepetitionsForNextLoop,
  isVisuallyForwardIndexChange,
  projectCoastPosition,
} from "~/utils/playbackScrubMath";

/** Friction for exponential velocity decay (per millisecond). */
const COAST_FRICTION_PER_MS = 0.0035;

/** Below this |velocity| (px/ms) we treat the coast as finished. */
const REST_VELOCITY_PX_PER_MS = 0.02;

/** Blend snap correction into the coast so landing is exact. */
const SNAP_BLEND_START_MS = 90;

/** Cap a single frame so backgrounding cannot fling the strip. */
const MAX_FRAME_DELTA_MS = 32;

/** How many recent pointer samples to keep for velocity estimation. */
const VELOCITY_SAMPLE_WINDOW_MS = 80;

interface VelocitySample {
  timeMs: number;
  x: number;
}

interface UsePlaybackGlideScrubArgs {
  enabled: boolean;
  stripRef: RefObject<HTMLDivElement | null>;
  scrubPositionRef: RefObject<number>;
  scrollPositions: number[] | null;
  chordRepetitions: number[];
  totalWidth: number;
  /** Same threshold PlaybackModal uses for primary virtualization half-shift. */
  virtualizationStartIndex: number;
  canVirtualize: boolean;
  currentChordIndex: number;
  setCurrentChordIndex: (index: number) => void;
  setChordRepetitions: (repetitions: number[]) => void;
  setIsGlideScrubbing: (scrubbing: boolean) => void;
  pauseAudio: () => void;
  playing: boolean;
}

/**
 * Native-like glide scrubbing for the playback strip:
 * 1:1 finger tracking → momentum coast → snap to nearest chord start,
 * all as one continuous rAF-driven motion. Chord highlighting updates from
 * the playhead position inside the same loop (no IntersectionObserver).
 */
function usePlaybackGlideScrub({
  enabled,
  stripRef,
  scrubPositionRef,
  scrollPositions,
  chordRepetitions,
  totalWidth,
  virtualizationStartIndex,
  canVirtualize,
  currentChordIndex,
  setCurrentChordIndex,
  setChordRepetitions,
  setIsGlideScrubbing,
  pauseAudio,
  playing,
}: UsePlaybackGlideScrubArgs) {
  const enabledRef = useRef(enabled);
  const playingRef = useRef(playing);
  const currentChordIndexRef = useRef(currentChordIndex);
  const scrollPositionsRef = useRef(scrollPositions);
  const chordRepetitionsRef = useRef(chordRepetitions);
  const totalWidthRef = useRef(totalWidth);
  const virtualizationStartIndexRef = useRef(virtualizationStartIndex);
  const canVirtualizeRef = useRef(canVirtualize);

  const isTouchingRef = useRef(false);
  const isCoastingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  const positionRef = useRef(0);
  const velocityPxPerMsRef = useRef(0);
  const samplesRef = useRef<VelocitySample[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const coastStartedAtRef = useRef(0);
  const coastSnapTargetRef = useRef(0);
  const coastSnapIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    currentChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex]);

  useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  // Layout so half-shifts from PlaybackModal are visible to the next pointer
  // sample in the same frame (useEffect would lag one paint).
  useLayoutEffect(() => {
    chordRepetitionsRef.current = chordRepetitions;
  }, [chordRepetitions]);

  useEffect(() => {
    totalWidthRef.current = totalWidth;
  }, [totalWidth]);

  useEffect(() => {
    virtualizationStartIndexRef.current = virtualizationStartIndex;
  }, [virtualizationStartIndex]);

  useEffect(() => {
    canVirtualizeRef.current = canVirtualize;
  }, [canVirtualize]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  function getPositionBounds() {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) {
      return { min: 0, max: 0 };
    }

    return getAbsoluteChordPositionBounds(positions, repetitions, width);
  }

  /**
   * When reps are still uniform and the playhead crosses into the next loop,
   * half-shift early chords forward so scrubbing can continue continuously
   * (same shape PlaybackModal's primary virtualization uses).
   */
  function ensureNextLoopRepetitions(positionPx: number) {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0 || width <= 0) return;

    const firstRep = repetitions[0] ?? 0;
    const lastRep = repetitions[positions.length - 1] ?? 0;
    if (firstRep !== lastRep) return;

    const nextLoopStart = firstRep * width + width;
    if (positionPx < nextLoopStart - 0.5) return;

    // Short tabs skip half-shift virtualization; bump every chord into the
    // next loop so scrubbing past the end stays continuous.
    const shifted = canVirtualizeRef.current
      ? halfShiftRepetitionsForNextLoop(
          repetitions,
          virtualizationStartIndexRef.current,
        )
      : (new Array(positions.length).fill(firstRep + 1) as number[]);

    const changed = shifted.some(
      (rep, index) => rep !== (repetitions[index] ?? 0),
    );
    if (!changed) return;

    chordRepetitionsRef.current = shifted;
    setChordRepetitions(shifted);
  }

  function applyTransform(positionPx: number) {
    const strip = stripRef.current;
    ensureNextLoopRepetitions(positionPx);

    const { min, max } = getPositionBounds();
    const clamped = clamp(positionPx, min, max);
    positionRef.current = clamped;
    scrubPositionRef.current = clamped;

    if (strip) {
      strip.style.transition = "none";
      strip.style.transform = getStripTransform(clamped);
    }
  }

  function syncChordIndexFromPosition(positionPx: number) {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) return;

    const nextIndex = getChordIndexAtPlayhead(
      positionPx,
      positions,
      repetitions,
      width,
    );
    const previousIndex = currentChordIndexRef.current;

    if (nextIndex === previousIndex) return;

    const visuallyForward = isVisuallyForwardIndexChange(
      previousIndex,
      nextIndex,
      positions,
      repetitions,
      width,
    );

    // Only reset virtualization on a true scrub-back. Forward loop wraps
    // (last → first of next loop) also decrease the index but must keep reps.
    if (nextIndex < previousIndex && !visuallyForward) {
      const resetRepetitions = new Array(positions.length).fill(0) as number[];
      const remappedPosition = getAbsoluteChordPosition(
        nextIndex,
        positions,
        resetRepetitions,
        width,
      );

      chordRepetitionsRef.current = resetRepetitions;
      setChordRepetitions(resetRepetitions);

      // Rep reset moves chords in absolute space; keep the playhead on the
      // target chord so we don't snap back to the end of the base loop.
      positionRef.current = remappedPosition;
      scrubPositionRef.current = remappedPosition;
      const strip = stripRef.current;
      if (strip) {
        strip.style.transition = "none";
        strip.style.transform = getStripTransform(remappedPosition);
      }
    }

    currentChordIndexRef.current = nextIndex;
    setCurrentChordIndex(nextIndex);
  }

  function estimateVelocityPxPerMs() {
    const samples = samplesRef.current;
    if (samples.length < 2) return 0;

    const latest = samples[samples.length - 1]!;
    const windowStart = latest.timeMs - VELOCITY_SAMPLE_WINDOW_MS;
    let earliest = samples[0]!;

    for (let i = samples.length - 2; i >= 0; i--) {
      const sample = samples[i]!;
      if (sample.timeMs < windowStart) break;
      earliest = sample;
    }

    const dt = latest.timeMs - earliest.timeMs;
    if (dt <= 0) return 0;

    // Finger right (+) => strip position decreases.
    const fingerDeltaX = latest.x - earliest.x;
    return -fingerDeltaX / dt;
  }

  function stopRaf() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function finishScrub(finalIndex: number) {
    stopRaf();
    isTouchingRef.current = false;
    isCoastingRef.current = false;
    pointerIdRef.current = null;
    velocityPxPerMsRef.current = 0;
    samplesRef.current = [];

    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;

    if (positions && positions.length > 0) {
      let repetitions = chordRepetitionsRef.current;
      const previousIndex = currentChordIndexRef.current;
      const visuallyForward = isVisuallyForwardIndexChange(
        previousIndex,
        finalIndex,
        positions,
        repetitions,
        width,
      );

      if (finalIndex < previousIndex && !visuallyForward) {
        repetitions = new Array(positions.length).fill(0) as number[];
        chordRepetitionsRef.current = repetitions;
        setChordRepetitions(repetitions);
      }

      const finalPosition = getAbsoluteChordPosition(
        finalIndex,
        positions,
        repetitions,
        width,
      );
      // Bypass loop-advance side effects; we are committing a settled chord.
      const strip = stripRef.current;
      positionRef.current = finalPosition;
      scrubPositionRef.current = finalPosition;
      if (strip) {
        strip.style.transition = "none";
        strip.style.transform = getStripTransform(finalPosition);
      }

      currentChordIndexRef.current = finalIndex;
      setCurrentChordIndex(finalIndex);
    }

    setIsGlideScrubbing(false);
  }

  function tickCoast(nowMs: number) {
    if (!isCoastingRef.current) return;

    const lastTime = lastFrameTimeRef.current || nowMs;
    const deltaMs = clamp(nowMs - lastTime, 0, MAX_FRAME_DELTA_MS);
    lastFrameTimeRef.current = nowMs;

    let velocity = velocityPxPerMsRef.current;
    const decay = Math.exp(-COAST_FRICTION_PER_MS * deltaMs);
    velocity *= decay;

    let nextPosition = positionRef.current + velocity * deltaMs;

    // After a short free-coast, blend toward the precomputed snap target so
    // the deceleration and snap read as one continuous glide.
    const coastAgeMs = nowMs - coastStartedAtRef.current;
    if (coastAgeMs >= SNAP_BLEND_START_MS) {
      const snapTarget = coastSnapTargetRef.current;
      const blend = clamp((coastAgeMs - SNAP_BLEND_START_MS) / 220, 0, 1);
      nextPosition = nextPosition + (snapTarget - nextPosition) * blend;
    }

    const { min, max } = getPositionBounds();
    if (nextPosition <= min || nextPosition >= max) {
      nextPosition = clamp(nextPosition, min, max);
      velocity = 0;
    }

    const repsBefore = chordRepetitionsRef.current;
    applyTransform(nextPosition);
    syncChordIndexFromPosition(positionRef.current);
    velocityPxPerMsRef.current = velocity;

    // If we half-shifted into the next loop mid-coast, retarget the snap onto
    // the newly placed next-loop chords so we don't stick on the old final chord.
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;
    if (
      positions &&
      positions.length > 0 &&
      repetitions !== repsBefore
    ) {
      const liveSnapIndex = getNearestChordIndex(
        positionRef.current,
        positions,
        repetitions,
        width,
      );
      coastSnapIndexRef.current = liveSnapIndex;
      coastSnapTargetRef.current = getAbsoluteChordPosition(
        liveSnapIndex,
        positions,
        repetitions,
        width,
      );
    }

    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );
    const settled =
      Math.abs(velocity) < REST_VELOCITY_PX_PER_MS || distanceToSnap < 0.5;

    if (settled) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function beginCoast() {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    const velocity = estimateVelocityPxPerMs();
    velocityPxPerMsRef.current = velocity;

    // Advance loop layout before projecting so next-loop chords exist as
    // snap targets when flinging past the final chord.
    ensureNextLoopRepetitions(
      projectCoastPosition(
        positionRef.current,
        velocity,
        COAST_FRICTION_PER_MS,
      ),
    );

    const liveRepetitions = chordRepetitionsRef.current;
    const { min, max } = getPositionBounds();
    const projected = clamp(
      projectCoastPosition(
        positionRef.current,
        velocity,
        COAST_FRICTION_PER_MS,
      ),
      min,
      max,
    );

    const snapIndex = getNearestChordIndex(
      projected,
      positions,
      liveRepetitions,
      width,
    );
    const snapTarget = getAbsoluteChordPosition(
      snapIndex,
      positions,
      liveRepetitions,
      width,
    );

    coastSnapIndexRef.current = snapIndex;
    coastSnapTargetRef.current = snapTarget;
    coastStartedAtRef.current = performance.now();
    lastFrameTimeRef.current = coastStartedAtRef.current;
    isCoastingRef.current = true;
    isTouchingRef.current = false;

    // Zero / tiny velocity: ease directly to nearest chord.
    if (Math.abs(velocity) < REST_VELOCITY_PX_PER_MS) {
      const immediateIndex = getNearestChordIndex(
        positionRef.current,
        positions,
        liveRepetitions,
        width,
      );
      coastSnapIndexRef.current = immediateIndex;
      coastSnapTargetRef.current = getAbsoluteChordPosition(
        immediateIndex,
        positions,
        liveRepetitions,
        width,
      );
    }

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): boolean {
    if (!enabledRef.current) return false;

    if (
      event.target instanceof Element &&
      event.target.closest("[data-loop-range-node]")
    ) {
      return false;
    }

    if (playingRef.current) {
      pauseAudio();
    }

    // Cancel an in-flight coast if the user grabs again.
    stopRaf();
    isCoastingRef.current = false;

    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    const startPosition =
      positions && positions.length > 0
        ? getAbsoluteChordPosition(
            currentChordIndexRef.current,
            positions,
            repetitions,
            width,
          )
        : scrubPositionRef.current;

    isTouchingRef.current = true;
    pointerIdRef.current = event.pointerId;
    lastPointerXRef.current = event.clientX;
    samplesRef.current = [{ timeMs: performance.now(), x: event.clientX }];
    velocityPxPerMsRef.current = 0;

    setIsGlideScrubbing(true);
    applyTransform(startPosition);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail on some browsers mid-teardown; tracking still works.
    }

    return true;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!enabledRef.current || !isTouchingRef.current) return;
    if (
      pointerIdRef.current !== null &&
      event.pointerId !== pointerIdRef.current
    ) {
      return;
    }

    event.preventDefault();

    const nowMs = performance.now();
    const currentX = event.clientX;
    const deltaX = currentX - lastPointerXRef.current;
    lastPointerXRef.current = currentX;

    samplesRef.current.push({ timeMs: nowMs, x: currentX });
    const cutoff = nowMs - VELOCITY_SAMPLE_WINDOW_MS * 2;
    samplesRef.current = samplesRef.current.filter(
      (sample) => sample.timeMs >= cutoff,
    );

    // Finger right => earlier chords (lower strip position).
    applyTransform(positionRef.current - deltaX);
    syncChordIndexFromPosition(positionRef.current);
    velocityPxPerMsRef.current = estimateVelocityPxPerMs();
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!enabledRef.current || !isTouchingRef.current) return;
    if (
      pointerIdRef.current !== null &&
      event.pointerId !== pointerIdRef.current
    ) {
      return;
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }

    beginCoast();
  }

  // If the mode is toggled away mid-gesture, settle immediately.
  useEffect(() => {
    if (enabled) return;

    if (isTouchingRef.current || isCoastingRef.current) {
      const positions = scrollPositionsRef.current;
      const repetitions = chordRepetitionsRef.current;
      const width = totalWidthRef.current;
      const settleIndex =
        positions && positions.length > 0
          ? getNearestChordIndex(
              positionRef.current,
              positions,
              repetitions,
              width,
            )
          : currentChordIndexRef.current;
      finishScrub(settleIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle only when mode disables
  }, [enabled]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}

export default usePlaybackGlideScrub;
