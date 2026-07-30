import {
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  applyIosRubberBandPosition,
  clamp,
  getAbsoluteChordPosition,
  getAbsoluteChordPositionBounds,
  getChordIndexAtPlayhead,
  getNearestChordIndex,
  getStripTransform,
  halfShiftRepetitionsForNextLoop,
  integrateIosCoastStep,
  IOS_DECELERATION_RATE,
  IOS_REST_VELOCITY_PX_PER_MS,
  projectIosCoastPosition,
  undoHalfShiftRepetitions,
} from "~/utils/playbackScrubMath";

/** Cap a single frame so backgrounding cannot fling the strip. */
const MAX_FRAME_DELTA_MS = 32;

/** How many recent pointer samples to keep for velocity estimation. */
const VELOCITY_SAMPLE_WINDOW_MS = 100;

/**
 * After projecting the natural iOS coast end, destination-lock onto the nearest
 * chord. Snap correction eases in so tracking→coast→snap reads as one motion.
 */
const SNAP_BLEND_START_MS = 80;
const SNAP_BLEND_DURATION_MS = 240;

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
  /** Used as the rubber-band dimension (viewport width). */
  containerWidthPx: number;
}

/**
 * Native-like glide scrubbing for the playback strip:
 * 1:1 finger tracking (UIScrollView-style) → iOS deceleration coast →
 * destination-locked snap to nearest chord start. Forward and backward use
 * the same pixel mapping; loop virtualization adjusts around the playhead
 * without teleporting position.
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
  containerWidthPx,
}: UsePlaybackGlideScrubArgs) {
  const enabledRef = useRef(enabled);
  const playingRef = useRef(playing);
  const currentChordIndexRef = useRef(currentChordIndex);
  const scrollPositionsRef = useRef(scrollPositions);
  const chordRepetitionsRef = useRef(chordRepetitions);
  const totalWidthRef = useRef(totalWidth);
  const virtualizationStartIndexRef = useRef(virtualizationStartIndex);
  const canVirtualizeRef = useRef(canVirtualize);
  const containerWidthRef = useRef(containerWidthPx);

  const isTouchingRef = useRef(false);
  const isCoastingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  /** Unconstrained playhead position (before rubber-band display mapping). */
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
    containerWidthRef.current = containerWidthPx;
  }, [containerWidthPx]);

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

  function commitRepetitions(next: number[]) {
    const current = chordRepetitionsRef.current;
    const changed = next.some((rep, index) => rep !== (current[index] ?? 0));
    if (!changed) return false;
    chordRepetitionsRef.current = next;
    setChordRepetitions(next);
    return true;
  }

  /**
   * Keep the absolute timeline continuous in both directions:
   * - forward past loop end → half-shift / bump into next loop
   * - backward past loop start → undo half-shift / decrement into previous loop
   *
   * Never remaps positionRef — only moves chord slots around the playhead.
   */
  function ensureLoopRepetitionsForPosition(positionPx: number) {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0 || width <= 0) return;

    // Iterate because a large flick can cross more than one loop boundary.
    for (let guard = 0; guard < 4; guard++) {
      const repetitions = chordRepetitionsRef.current;
      const firstRep = repetitions[0] ?? 0;
      const lastRep = repetitions[positions.length - 1] ?? 0;
      const isHalfShifted = firstRep !== lastRep;

      if (isHalfShifted) {
        const secondHalfStart = getAbsoluteChordPosition(
          virtualizationStartIndexRef.current,
          positions,
          repetitions,
          width,
        );

        // Pulling back before the second-half seam: undo primary half-shift
        // so early chords reappear behind the playhead (symmetric with forward).
        if (positionPx < secondHalfStart - 0.5) {
          commitRepetitions(undoHalfShiftRepetitions(repetitions));
          continue;
        }

        // Already spanning current→next loop; nothing else to do.
        return;
      }

      const loopStart = firstRep * width;
      const nextLoopStart = loopStart + width;

      if (positionPx >= nextLoopStart - 0.5) {
        const shifted = canVirtualizeRef.current
          ? halfShiftRepetitionsForNextLoop(
              repetitions,
              virtualizationStartIndexRef.current,
            )
          : (new Array(positions.length).fill(firstRep + 1) as number[]);
        if (!commitRepetitions(shifted)) return;
        continue;
      }

      if (firstRep > 0 && positionPx < loopStart - 0.5) {
        // Step into the previous loop without teleporting the playhead.
        const decremented = new Array(positions.length).fill(
          firstRep - 1,
        ) as number[];
        if (!commitRepetitions(decremented)) return;
        continue;
      }

      return;
    }
  }

  function writeTransform(displayPositionPx: number) {
    const strip = stripRef.current;
    scrubPositionRef.current = displayPositionPx;
    if (strip) {
      strip.style.transition = "none";
      strip.style.transform = getStripTransform(displayPositionPx);
    }
  }

  /**
   * Apply a new unconstrained position: update loop layout, rubber-band the
   * displayed transform, keep positionRef as the logical playhead.
   *
   * Loop virtualization is driven from the in-bounds playhead so rubber-banding
   * past an edge cannot spawn extra loops (matches UIScrollView: elasticity
   * does not rewrite content).
   */
  function applyPosition(unconstrainedPositionPx: number, rubberBand: boolean) {
    let { min, max } = getPositionBounds();
    const loopWidth = Math.max(0, totalWidthRef.current);

    // Allow one loop-width of slack so seam crossing (next/previous loop) can
    // run, without letting rubber-band overscroll invent unbounded loops.
    ensureLoopRepetitionsForPosition(
      clamp(
        unconstrainedPositionPx,
        min - loopWidth,
        max + loopWidth,
      ),
    );
    ({ min, max } = getPositionBounds());

    const dimension = Math.max(
      1,
      containerWidthRef.current || max - min || 320,
    );

    if (rubberBand) {
      positionRef.current = unconstrainedPositionPx;
      writeTransform(
        applyIosRubberBandPosition(
          unconstrainedPositionPx,
          min,
          max,
          dimension,
        ),
      );
      return;
    }

    const clamped = clamp(unconstrainedPositionPx, min, max);
    positionRef.current = clamped;
    writeTransform(clamped);
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

    if (nextIndex === currentChordIndexRef.current) return;

    currentChordIndexRef.current = nextIndex;
    setCurrentChordIndex(nextIndex);
  }

  function estimateVelocityPxPerMs() {
    const samples = samplesRef.current;
    if (samples.length < 2) return 0;

    const latest = samples[samples.length - 1]!;
    const windowStart = latest.timeMs - VELOCITY_SAMPLE_WINDOW_MS;

    // Prefer the oldest sample still inside the window for a stable estimate
    // (same idea as UIScrollView's recent-touch velocity).
    let earliest = samples[0]!;
    for (let i = 0; i < samples.length - 1; i++) {
      const sample = samples[i]!;
      if (sample.timeMs >= windowStart) {
        earliest = sample;
        break;
      }
      earliest = sample;
    }

    const dt = latest.timeMs - earliest.timeMs;
    if (dt <= 0) return 0;

    // Finger right (+) => strip position decreases. Direction-agnostic 1:1.
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
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (positions && positions.length > 0) {
      const finalPosition = getAbsoluteChordPosition(
        finalIndex,
        positions,
        repetitions,
        width,
      );
      positionRef.current = finalPosition;
      writeTransform(finalPosition);
      currentChordIndexRef.current = finalIndex;
      setCurrentChordIndex(finalIndex);
    }

    setIsGlideScrubbing(false);
  }

  function retargetSnapFromCurrentPosition() {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) return;

    const projected = projectIosCoastPosition(
      positionRef.current,
      velocityPxPerMsRef.current,
    );
    const { min, max } = getPositionBounds();
    const clampedProjected = clamp(projected, min, max);
    const snapIndex = getNearestChordIndex(
      clampedProjected,
      positions,
      repetitions,
      width,
    );
    coastSnapIndexRef.current = snapIndex;
    coastSnapTargetRef.current = getAbsoluteChordPosition(
      snapIndex,
      positions,
      repetitions,
      width,
    );
  }

  function tickCoast(nowMs: number) {
    if (!isCoastingRef.current) return;

    const lastTime = lastFrameTimeRef.current || nowMs;
    const deltaMs = clamp(nowMs - lastTime, 0, MAX_FRAME_DELTA_MS);
    lastFrameTimeRef.current = nowMs;

    const repsBefore = chordRepetitionsRef.current;
    const { positionDelta, velocity } = integrateIosCoastStep(
      velocityPxPerMsRef.current,
      deltaMs,
      IOS_DECELERATION_RATE,
    );

    let nextPosition = positionRef.current + positionDelta;

    // Destination-lock: after a short free coast, blend toward the snapped
    // chord so momentum and snap are one continuous deceleration.
    const coastAgeMs = nowMs - coastStartedAtRef.current;
    if (coastAgeMs >= SNAP_BLEND_START_MS) {
      const blend = clamp(
        (coastAgeMs - SNAP_BLEND_START_MS) / SNAP_BLEND_DURATION_MS,
        0,
        1,
      );
      // Smoothstep for a slightly more natural settle than linear lerp.
      const smooth = blend * blend * (3 - 2 * blend);
      nextPosition =
        nextPosition + (coastSnapTargetRef.current - nextPosition) * smooth;
    }

    const { min, max } = getPositionBounds();
    if (nextPosition <= min || nextPosition >= max) {
      nextPosition = clamp(nextPosition, min, max);
      velocityPxPerMsRef.current = 0;
    } else {
      velocityPxPerMsRef.current = velocity;
    }

    applyPosition(nextPosition, false);
    syncChordIndexFromPosition(positionRef.current);

    if (chordRepetitionsRef.current !== repsBefore) {
      retargetSnapFromCurrentPosition();
    }

    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );
    const settled =
      Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS ||
      distanceToSnap < 0.5;

    if (settled) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function beginCoast() {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    // If released while rubber-banded outside bounds, spring back with a
    // short coast toward the nearest in-bounds chord (iOS edge bounce).
    const { min, max } = getPositionBounds();
    let velocity = estimateVelocityPxPerMs();

    if (positionRef.current < min || positionRef.current > max) {
      const edge = positionRef.current < min ? min : max;
      positionRef.current = edge;
      velocity = 0;
    }

    velocityPxPerMsRef.current = velocity;
    ensureLoopRepetitionsForPosition(
      projectIosCoastPosition(positionRef.current, velocity),
    );

    retargetSnapFromCurrentPosition();

    // Near-zero velocity: snap to nearest chord under the playhead.
    if (Math.abs(velocity) < IOS_REST_VELOCITY_PX_PER_MS) {
      const liveRepetitions = chordRepetitionsRef.current;
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

    coastStartedAtRef.current = performance.now();
    lastFrameTimeRef.current = coastStartedAtRef.current;
    isCoastingRef.current = true;
    isTouchingRef.current = false;

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

    // Interrupt an in-flight coast (iOS lets you grab scrolling content).
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
    positionRef.current = startPosition;

    setIsGlideScrubbing(true);
    writeTransform(startPosition);

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

    // Strict 1:1 mapping in both directions (UIScrollView contentOffset feel).
    applyPosition(positionRef.current - deltaX, true);

    const { min, max } = getPositionBounds();
    syncChordIndexFromPosition(clamp(positionRef.current, min, max));
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
