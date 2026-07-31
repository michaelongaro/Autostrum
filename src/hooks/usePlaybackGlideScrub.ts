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
  isVisuallyForwardIndexChange,
  IOS_DECELERATION_RATE,
  IOS_REST_VELOCITY_PX_PER_MS,
  projectIosCoastPosition,
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

/** Ease-out duration when releasing from a rubber-banded overscroll. */
const OVERSCROLL_SPRING_BACK_MS = 320;

/**
 * When coast velocity dies (or release has no fling), ease the remaining
 * distance to the nearest chord instead of hard-jumping via finishScrub.
 */
const SNAP_SETTLE_MS = 280;

/** Treat as already on-target below this distance (px). */
const SNAP_SETTLED_DISTANCE_PX = 0.5;

/**
 * Coast velocity must be at least this negative (px/ms) before we treat a
 * position decrease as an intentional backward scrub for rep resets.
 */
const BACKWARD_RESET_VELOCITY_PX_PER_MS = -0.05;

interface VelocitySample {
  timeMs: number;
  x: number;
}

interface UsePlaybackGlideScrubArgs {
  stripRef: RefObject<HTMLDivElement | null>;
  scrubPositionRef: RefObject<number>;
  /** Center playhead; translated with rubber-band overscroll so it stays attached. */
  playheadRef?: RefObject<HTMLDivElement | null>;
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
 * destination-locked snap to nearest chord start.
 *
 * Forward scrubbing can enter the next artificial loop via half-shift.
 * Backward scrubbing resets chordRepetitions to all zeros (virtualization only
 * handles forward movement) and remaps the playhead onto the base loop.
 */
function usePlaybackGlideScrub({
  stripRef,
  scrubPositionRef,
  playheadRef,
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
  const isSpringBackRef = useRef(false);
  /** Ease-to-chord after coast velocity dies (shares tickSpringBack). */
  const isSnapSettlingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  /** Unconstrained playhead position (before rubber-band display mapping). */
  const positionRef = useRef(0);
  const velocityPxPerMsRef = useRef(0);
  /**
   * Finger/coast intent: -1 = backward through the tab (position decreasing),
   * +1 = forward. Used so snap-blend micro-corrections cannot trigger the
   * backward chordRepetitions reset.
   */
  const scrubDirectionRef = useRef<-1 | 0 | 1>(0);
  const samplesRef = useRef<VelocitySample[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const coastStartedAtRef = useRef(0);
  const coastSnapTargetRef = useRef(0);
  const coastSnapIndexRef = useRef(0);
  const springBackStartRef = useRef(0);
  const springBackDurationMsRef = useRef(OVERSCROLL_SPRING_BACK_MS);
  const lastFrameTimeRef = useRef(0);

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

  function getRubberBandDimension(min: number, max: number) {
    return Math.max(1, containerWidthRef.current || max - min || 320);
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
   * True only for intentional backward scrubbing — not snap-blend pullback
   * during a forward coast, and not forward loop wraps (last → 0).
   */
  function isIntentionalBackwardScrub() {
    // Snap-settle / overscroll spring-back can move position backward toward a
    // nearby chord without being an intentional backward scrub.
    if (isSpringBackRef.current || isSnapSettlingRef.current) return false;

    if (isTouchingRef.current) {
      return scrubDirectionRef.current === -1;
    }

    if (isCoastingRef.current) {
      return velocityPxPerMsRef.current <= BACKWARD_RESET_VELOCITY_PX_PER_MS;
    }

    return scrubDirectionRef.current === -1;
  }

  /**
   * Forward only: when the playhead crosses into the next loop, half-shift /
   * bump repetitions so scrubbing can continue continuously.
   */
  function ensureNextLoopRepetitions(positionPx: number) {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0 || width <= 0) return;

    for (let guard = 0; guard < 4; guard++) {
      const repetitions = chordRepetitionsRef.current;
      const firstRep = repetitions[0] ?? 0;
      const lastRep = repetitions[positions.length - 1] ?? 0;

      // Already spanning current→next loop via primary virtualization.
      if (firstRep !== lastRep) return;

      const nextLoopStart = firstRep * width + width;
      if (positionPx < nextLoopStart - 0.5) return;

      const shifted = canVirtualizeRef.current
        ? halfShiftRepetitionsForNextLoop(
            repetitions,
            virtualizationStartIndexRef.current,
          )
        : (new Array(positions.length).fill(firstRep + 1) as number[]);
      if (!commitRepetitions(shifted)) return;
    }
  }

  /**
   * Virtualization only handles forward movement. On an intentional backward
   * scrub while any chord is on a non-zero repetition, reset all reps to 0 and
   * remap the playhead onto that chord in the base loop.
   */
  function maybeResetRepetitionsOnBackwardScrub(
    previousPositionPx: number,
    nextPositionPx: number,
  ): number {
    if (nextPositionPx >= previousPositionPx) {
      return nextPositionPx;
    }

    if (!isIntentionalBackwardScrub()) {
      return nextPositionPx;
    }

    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) {
      return nextPositionPx;
    }

    const hasNonZeroRep = repetitions.some((rep) => rep !== 0);
    if (!hasNonZeroRep) {
      return nextPositionPx;
    }

    const previousIndex = currentChordIndexRef.current;
    const indexAtNext = getChordIndexAtPlayhead(
      nextPositionPx,
      positions,
      repetitions,
      width,
    );

    // Forward loop wraps also decrease index (last → 0) but increase absolute
    // position — never reset those.
    if (
      isVisuallyForwardIndexChange(
        previousIndex,
        indexAtNext,
        positions,
        repetitions,
        width,
      )
    ) {
      return nextPositionPx;
    }

    const resetRepetitions = new Array(positions.length).fill(0) as number[];
    commitRepetitions(resetRepetitions);

    const remappedPosition = getAbsoluteChordPosition(
      indexAtNext,
      positions,
      resetRepetitions,
      width,
    );

    currentChordIndexRef.current = indexAtNext;
    setCurrentChordIndex(indexAtNext);

    return remappedPosition;
  }

  /**
   * Keep the centered playhead visually attached during rubber-band overscroll
   * by shifting it the same delta the strip moves past the edge chord.
   */
  function writePlayheadOverscrollOffset(displayPositionPx: number) {
    const playhead = playheadRef?.current;
    if (!playhead) return;

    const { min, max } = getPositionBounds();
    const overscrollOffsetPx =
      clamp(displayPositionPx, min, max) - displayPositionPx;

    playhead.style.transform =
      Math.abs(overscrollOffsetPx) < 0.05
        ? ""
        : `translate3d(${overscrollOffsetPx}px, 0, 0)`;
  }

  function writeTransform(displayPositionPx: number) {
    const strip = stripRef.current;
    scrubPositionRef.current = displayPositionPx;
    if (strip) {
      strip.style.transition = "none";
      strip.style.transform = getStripTransform(displayPositionPx);
    }
    writePlayheadOverscrollOffset(displayPositionPx);
  }

  /**
   * Apply a new unconstrained position: update loop layout, rubber-band the
   * displayed transform, keep positionRef as the logical playhead.
   */
  function applyPosition(unconstrainedPositionPx: number, rubberBand: boolean) {
    const nextUnconstrained = maybeResetRepetitionsOnBackwardScrub(
      positionRef.current,
      unconstrainedPositionPx,
    );

    let { min, max } = getPositionBounds();
    const loopWidth = Math.max(0, totalWidthRef.current);

    // Allow one loop-width of forward slack so next-loop half-shift can run
    // without letting rubber-band overscroll invent unbounded loops.
    ensureNextLoopRepetitions(
      clamp(nextUnconstrained, min, max + loopWidth),
    );
    ({ min, max } = getPositionBounds());

    const dimension = getRubberBandDimension(min, max);

    if (rubberBand) {
      positionRef.current = nextUnconstrained;
      writeTransform(
        applyIosRubberBandPosition(nextUnconstrained, min, max, dimension),
      );
      return;
    }

    const clamped = clamp(nextUnconstrained, min, max);
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
    const previousIndex = currentChordIndexRef.current;

    if (nextIndex === previousIndex) return;

    const visuallyForward = isVisuallyForwardIndexChange(
      previousIndex,
      nextIndex,
      positions,
      repetitions,
      width,
    );

    // Only reset on intentional backward scrub — never on forward loop wraps
    // (last → 0) or snap-blend pullback during a forward coast.
    if (
      nextIndex < previousIndex &&
      !visuallyForward &&
      isIntentionalBackwardScrub()
    ) {
      const hasNonZeroRep = repetitions.some((rep) => rep !== 0);
      if (hasNonZeroRep) {
        const resetRepetitions = new Array(positions.length).fill(0) as number[];
        commitRepetitions(resetRepetitions);

        const remappedPosition = getAbsoluteChordPosition(
          nextIndex,
          positions,
          resetRepetitions,
          width,
        );
        positionRef.current = remappedPosition;
        writeTransform(remappedPosition);
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
    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;
    pointerIdRef.current = null;
    velocityPxPerMsRef.current = 0;
    samplesRef.current = [];

    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;

    if (positions && positions.length > 0) {
      // Do not reset repetitions here. Forward loop wraps (last → 0) and
      // snap corrections can also lower the index; resets are handled only by
      // intentional-backward paths during the gesture/coast.
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

    scrubDirectionRef.current = 0;
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

  function tickSpringBack(nowMs: number) {
    if (!isSpringBackRef.current && !isSnapSettlingRef.current) return;

    const durationMs = springBackDurationMsRef.current;
    const elapsedMs = nowMs - coastStartedAtRef.current;
    const t = clamp(elapsedMs / durationMs, 0, 1);
    // Ease-out cubic — matches the familiar iOS rubber-band / settle feel.
    const ease = 1 - Math.pow(1 - t, 3);
    const nextPosition =
      springBackStartRef.current +
      (coastSnapTargetRef.current - springBackStartRef.current) * ease;

    positionRef.current = nextPosition;
    writeTransform(nextPosition);
    syncChordIndexFromPosition(nextPosition);

    if (t >= 1) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickSpringBack);
  }

  /**
   * Smoothly ease from the current strip position onto the destination-locked
   * chord. Used when coast velocity dies with remaining snap distance, and
   * when releasing with no fling.
   */
  function beginSnapSettle() {
    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );
    if (distanceToSnap < SNAP_SETTLED_DISTANCE_PX) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    springBackStartRef.current = positionRef.current;
    springBackDurationMsRef.current = SNAP_SETTLE_MS;
    velocityPxPerMsRef.current = 0;
    isSnapSettlingRef.current = true;
    isSpringBackRef.current = false;
    isCoastingRef.current = true;
    isTouchingRef.current = false;
    coastStartedAtRef.current = performance.now();
    lastFrameTimeRef.current = coastStartedAtRef.current;

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickSpringBack);
  }

  function tickCoast(nowMs: number) {
    if (!isCoastingRef.current) return;

    if (isSpringBackRef.current || isSnapSettlingRef.current) {
      tickSpringBack(nowMs);
      return;
    }

    const lastTime = lastFrameTimeRef.current || nowMs;
    const deltaMs = clamp(nowMs - lastTime, 0, MAX_FRAME_DELTA_MS);
    lastFrameTimeRef.current = nowMs;

    const repsBefore = chordRepetitionsRef.current;
    const { positionDelta, velocity } = integrateIosCoastStep(
      velocityPxPerMsRef.current,
      deltaMs,
      IOS_DECELERATION_RATE,
    );

    // Keep scrub direction aligned with live coast velocity so intentional
    // backward flings can still reset reps, while forward coasts cannot.
    if (Math.abs(velocity) >= IOS_REST_VELOCITY_PX_PER_MS) {
      scrubDirectionRef.current = velocity < 0 ? -1 : 1;
    }

    let nextPosition = positionRef.current + positionDelta;

    const coastAgeMs = nowMs - coastStartedAtRef.current;
    if (coastAgeMs >= SNAP_BLEND_START_MS) {
      const blend = clamp(
        (coastAgeMs - SNAP_BLEND_START_MS) / SNAP_BLEND_DURATION_MS,
        0,
        1,
      );
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

    if (distanceToSnap < SNAP_SETTLED_DISTANCE_PX) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    // Velocity died with snap distance remaining — ease the rest of the way
    // instead of hard-jumping to the chord start.
    if (Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS) {
      beginSnapSettle();
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function beginOverscrollSpringBack(min: number, max: number) {
    const positions = scrollPositionsRef.current;
    const repetitions = chordRepetitionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    const dimension = getRubberBandDimension(min, max);
    const displayPosition = applyIosRubberBandPosition(
      positionRef.current,
      min,
      max,
      dimension,
    );
    const edge = positionRef.current < min ? min : max;
    const edgeIndex = getNearestChordIndex(
      edge,
      positions,
      repetitions,
      width,
    );
    const edgePosition = getAbsoluteChordPosition(
      edgeIndex,
      positions,
      repetitions,
      width,
    );

    // Animate from the rubber-banded pixels the user currently sees, not from
    // the unconstrained logical position (which would look like a teleport).
    springBackStartRef.current = displayPosition;
    springBackDurationMsRef.current = OVERSCROLL_SPRING_BACK_MS;
    positionRef.current = displayPosition;
    writeTransform(displayPosition);

    coastSnapIndexRef.current = edgeIndex;
    coastSnapTargetRef.current = edgePosition;
    velocityPxPerMsRef.current = 0;
    scrubDirectionRef.current = 0;
    isSpringBackRef.current = true;
    isSnapSettlingRef.current = false;
    isCoastingRef.current = true;
    isTouchingRef.current = false;
    coastStartedAtRef.current = performance.now();
    lastFrameTimeRef.current = coastStartedAtRef.current;

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickSpringBack);
  }

  function beginCoast() {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    const { min, max } = getPositionBounds();

    if (positionRef.current < min || positionRef.current > max) {
      beginOverscrollSpringBack(min, max);
      return;
    }

    const velocity = estimateVelocityPxPerMs();
    velocityPxPerMsRef.current = velocity;

    if (Math.abs(velocity) >= IOS_REST_VELOCITY_PX_PER_MS) {
      scrubDirectionRef.current = velocity < 0 ? -1 : 1;
    }

    ensureNextLoopRepetitions(
      projectIosCoastPosition(positionRef.current, velocity),
    );

    retargetSnapFromCurrentPosition();

    // No fling: ease directly onto the nearest chord start.
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
      beginSnapSettle();
      return;
    }

    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;
    coastStartedAtRef.current = performance.now();
    lastFrameTimeRef.current = coastStartedAtRef.current;
    isCoastingRef.current = true;
    isTouchingRef.current = false;

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): boolean {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-loop-range-node]")
    ) {
      return false;
    }

    if (playingRef.current) {
      pauseAudio();
    }

    stopRaf();
    isCoastingRef.current = false;
    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;

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
    scrubDirectionRef.current = 0;
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
    if (!isTouchingRef.current) return;
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

    // Finger right => earlier chords (lower strip position) => backward.
    if (deltaX !== 0) {
      scrubDirectionRef.current = deltaX > 0 ? -1 : 1;
    }

    applyPosition(positionRef.current - deltaX, true);

    const { min, max } = getPositionBounds();
    syncChordIndexFromPosition(clamp(positionRef.current, min, max));
    velocityPxPerMsRef.current = estimateVelocityPxPerMs();
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!isTouchingRef.current) return;
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

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}

export default usePlaybackGlideScrub;
