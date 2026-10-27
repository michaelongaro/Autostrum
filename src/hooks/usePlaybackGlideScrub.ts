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
  clampScrubVelocity,
  coastDistanceBudgetForVelocity,
  coastDurationBudgetForVelocity,
  FLING_START_VELOCITY_PX_PER_MS,
  getStripTransform,
  integrateCriticallyDampedSpringStep,
  integrateIosCoastStep,
  IOS_REST_VELOCITY_PX_PER_MS,
  MAX_COAST_DURATION_MS,
  MAX_SCRUB_VELOCITY_PX_PER_MS,
  projectCoastPositionWithDistanceBudget,
  RELEASE_STILLNESS_MOVEMENT_PX,
  RELEASE_STILLNESS_MS,
  SCRUB_COAST_DECELERATION_RATE,
  velocityToReachIosCoastDestination,
} from "~/utils/playbackScrubMath";
import { parseStripPositionPx } from "~/utils/playbackStripMotion";
import {
  closestPlaybackChordPosition,
  nearestPlaybackChordIndex,
  playbackChordIndexAtPosition,
  playbackRepetitionAtPosition,
} from "~/utils/playbackViewport";

/** Cap a single frame so backgrounding cannot fling the strip. */
const MAX_FRAME_DELTA_MS = 32;

/** How many recent pointer samples to keep for velocity estimation. */
const VELOCITY_SAMPLE_WINDOW_MS = 60;

/**
 * Critically-damped spring ω (rad/ms) for brief coast handoff / overscroll.
 * Snappy so Play is available again quickly.
 */
const SNAP_SETTLE_OMEGA_PER_MS = 0.028;

/** Softer spring for rubber-band overscroll release. */
const OVERSCROLL_SPRING_OMEGA_PER_MS = 0.014;

/** Treat as already on-target below this distance (px). */
const SNAP_SETTLED_DISTANCE_PX = 0.35;

/**
 * Minimum time window reserved for the post-coast snap spring so a coast that
 * exhausts its duration budget (or dies near the deadline) can still ease onto
 * the chord instead of teleporting.
 */
const SNAP_SETTLE_MIN_MS = 120;

/**
 * Safety cap so a pathological spring cannot run forever if floats drift.
 * Ceiling matches the most aggressive coast budget so Play is never blocked
 * longer than a max-velocity fling would already allow.
 */
const MAX_SPRING_MS = MAX_COAST_DURATION_MS;

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
 * rAF-coalesced 1:1 finger tracking → iOS exponential deceleration with a
 * soft velocity-space destination pull → critically-damped spring settle.
 *
 * Both directions use one continuous absolute coordinate. Visible loop copies
 * are mounted independently, so reversing never rebases/quantizes the pointer.
 */
function usePlaybackGlideScrub({
  stripRef,
  scrubPositionRef,
  playheadRef,
  scrollPositions,
  chordRepetitions,
  totalWidth,
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
  const containerWidthRef = useRef(containerWidthPx);

  const isTouchingRef = useRef(false);
  const isCoastingRef = useRef(false);
  const isSpringBackRef = useRef(false);
  /** Spring-to-chord after coast / no-fling release (shares tickSpring). */
  const isSnapSettlingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const lastPointerXRef = useRef(0);
  /** Unconstrained playhead position (before rubber-band display mapping). */
  const positionRef = useRef(0);
  const velocityPxPerMsRef = useRef(0);
  const samplesRef = useRef<VelocitySample[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const trackingRafIdRef = useRef<number | null>(null);
  const coastSnapTargetRef = useRef(0);
  const coastSnapIndexRef = useRef(0);
  /** |velocity| at coast start; used to ramp destination-lock pull as we slow. */
  const coastInitialSpeedRef = useRef(0);
  /**
   * Coast+settle time budget locked at release from fling aggressiveness.
   * Weak flicks keep the short MIN; hard flings open toward MAX.
   */
  const coastDurationBudgetMsRef = useRef(MAX_COAST_DURATION_MS);
  /** Wall-clock time of the last significant pointer movement (for stop→release). */
  const lastSignificantMoveAtRef = useRef(0);
  const springOmegaRef = useRef(SNAP_SETTLE_OMEGA_PER_MS);
  const springStartedAtRef = useRef(0);
  const coastStartedAtRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  /** Latest rubber-banded display position waiting for the tracking rAF write. */
  const pendingDisplayPositionRef = useRef(0);
  const trackingFrameScheduledRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    currentChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex]);

  useEffect(() => {
    scrollPositionsRef.current = scrollPositions;
  }, [scrollPositions]);

  // Layout so session/loop changes are visible to the next pointer sample.
  useLayoutEffect(() => {
    chordRepetitionsRef.current = chordRepetitions;
  }, [chordRepetitions]);

  useEffect(() => {
    totalWidthRef.current = totalWidth;
  }, [totalWidth]);

  useEffect(() => {
    containerWidthRef.current = containerWidthPx;
  }, [containerWidthPx]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (trackingRafIdRef.current !== null) {
        cancelAnimationFrame(trackingRafIdRef.current);
        trackingRafIdRef.current = null;
      }
    };
  }, []);

  function getPositionBounds() {
    const positions = scrollPositionsRef.current;

    if (!positions || positions.length === 0) {
      return { min: 0, max: 0 };
    }

    // The Practice strip loops forward indefinitely; only its very beginning
    // has an edge. Crossing a loop in reverse must not create a rubber band.
    return { min: 0, max: Number.POSITIVE_INFINITY };
  }

  function getRubberBandDimension() {
    return Math.max(1, containerWidthRef.current || 320);
  }

  function syncRepetition(positionPx: number) {
    const length = scrollPositionsRef.current?.length ?? 0;
    const repetition = playbackRepetitionAtPosition(
      positionPx,
      totalWidthRef.current,
    );
    const current = chordRepetitionsRef.current;
    if (
      length === 0 ||
      (current.length === length &&
        current[0] === repetition &&
        current[length - 1] === repetition)
    )
      return;
    const next = new Array<number>(length).fill(repetition);
    chordRepetitionsRef.current = next;
    setChordRepetitions(next);
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
      strip.style.willChange = "transform";
      strip.style.transform = getStripTransform(displayPositionPx);
    }
    writePlayheadOverscrollOffset(displayPositionPx);
  }

  /**
   * Apply a new unconstrained position: rubber-band the
   * displayed transform, keep positionRef as the logical playhead.
   * When `deferDisplayWrite` is set, only update refs — the tracking rAF
   * paints once per frame for steadier translateX pacing.
   */
  function applyPosition(
    unconstrainedPositionPx: number,
    rubberBand: boolean,
    deferDisplayWrite = false,
  ) {
    const nextUnconstrained = unconstrainedPositionPx;
    const { min, max } = getPositionBounds();

    const dimension = getRubberBandDimension();

    if (rubberBand) {
      positionRef.current = nextUnconstrained;
      const display = applyIosRubberBandPosition(
        nextUnconstrained,
        min,
        max,
        dimension,
      );
      pendingDisplayPositionRef.current = display;
      if (!deferDisplayWrite) {
        writeTransform(display);
      }
      return;
    }

    const clamped = clamp(nextUnconstrained, min, max);
    positionRef.current = clamped;
    pendingDisplayPositionRef.current = clamped;
    if (!deferDisplayWrite) {
      writeTransform(clamped);
    }
  }

  function syncChordIndexFromPosition(positionPx: number) {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;

    if (!positions || positions.length === 0) return;

    syncRepetition(positionPx);
    const nextIndex = playbackChordIndexAtPosition(
      positionPx,
      positions,
      width,
    );
    const previousIndex = currentChordIndexRef.current;

    if (nextIndex === previousIndex) return;

    currentChordIndexRef.current = nextIndex;
    setCurrentChordIndex(nextIndex);
  }

  function estimateVelocityPxPerMs() {
    const nowMs = performance.now();

    // Precise scrub → stop → release: wall-clock stillness kills fling.
    // pointermove does not fire while the finger is still, so sample-only
    // stillness checks would still see the pre-pause motion window.
    if (lastSignificantMoveAtRef.current <= 0) {
      return 0;
    }
    if (nowMs - lastSignificantMoveAtRef.current >= RELEASE_STILLNESS_MS) {
      return 0;
    }

    const samples = samplesRef.current;
    if (samples.length < 2) return 0;

    const latest = samples[samples.length - 1]!;
    const windowStart = latest.timeMs - VELOCITY_SAMPLE_WINDOW_MS;
    let earliestInWindow: VelocitySample | null = null;
    for (const sample of samples) {
      if (sample.timeMs >= windowStart) {
        earliestInWindow = sample;
        break;
      }
    }

    const earliest = earliestInWindow ?? samples[0]!;
    const dt = latest.timeMs - earliest.timeMs;
    if (dt <= 0) return 0;

    const fingerDeltaX = latest.x - earliest.x;
    if (Math.abs(fingerDeltaX) < RELEASE_STILLNESS_MOVEMENT_PX) {
      return 0;
    }

    // Finger right (+) => strip position decreases.
    return clampScrubVelocity(-fingerDeltaX / dt);
  }

  function stopRaf() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  function stopTrackingRaf() {
    if (trackingRafIdRef.current !== null) {
      cancelAnimationFrame(trackingRafIdRef.current);
      trackingRafIdRef.current = null;
    }
    trackingFrameScheduledRef.current = false;
  }

  function flushTrackingFrame() {
    trackingRafIdRef.current = null;
    trackingFrameScheduledRef.current = false;
    if (!isTouchingRef.current) return;

    writeTransform(pendingDisplayPositionRef.current);
    const { min, max } = getPositionBounds();
    syncChordIndexFromPosition(clamp(positionRef.current, min, max));
  }

  function scheduleTrackingFrame() {
    if (trackingFrameScheduledRef.current) return;
    trackingFrameScheduledRef.current = true;
    trackingRafIdRef.current = requestAnimationFrame(flushTrackingFrame);
  }

  function finishScrub(finalIndex: number) {
    stopRaf();
    stopTrackingRaf();
    isTouchingRef.current = false;
    isCoastingRef.current = false;
    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;
    pointerIdRef.current = null;
    velocityPxPerMsRef.current = 0;
    samplesRef.current = [];

    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;

    if (positions && positions.length > 0) {
      const finalPosition = closestPlaybackChordPosition(
        finalIndex,
        positions,
        width,
        positionRef.current,
      );
      positionRef.current = finalPosition;
      syncRepetition(finalPosition);
      writeTransform(finalPosition);
      currentChordIndexRef.current = finalIndex;
      setCurrentChordIndex(finalIndex);
    }

    const strip = stripRef.current;
    if (strip) {
      strip.style.willChange = "auto";
    }

    setIsGlideScrubbing(false);
  }

  function retargetSnapFromProjectedPosition(projectedPx: number) {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) return;

    const { min, max } = getPositionBounds();
    const clampedProjected = clamp(projectedPx, min, max);
    const snapIndex = nearestPlaybackChordIndex(
      clampedProjected,
      positions,
      width,
    );
    coastSnapIndexRef.current = snapIndex;
    coastSnapTargetRef.current = closestPlaybackChordPosition(
      snapIndex,
      positions,
      width,
      clampedProjected,
    );
  }

  /**
   * No inertial glide after a precise stop: pin to a chord immediately.
   * Avoids a spring that looks like "scrolling on its own".
   */
  function finishAtPlayheadChord() {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    velocityPxPerMsRef.current = 0;
    coastInitialSpeedRef.current = 0;
    const playheadIndex = playbackChordIndexAtPosition(
      positionRef.current,
      positions,
      width,
    );
    const nearestIndex = nearestPlaybackChordIndex(
      positionRef.current,
      positions,
      width,
    );
    const playheadPos = closestPlaybackChordPosition(
      playheadIndex,
      positions,
      width,
      positionRef.current,
    );
    const nearestPos = closestPlaybackChordPosition(
      nearestIndex,
      positions,
      width,
      positionRef.current,
    );

    // Prefer the nearest chord when it's clearly closer; otherwise keep the
    // playhead chord (matches highlight while dragging).
    const finalIndex =
      Math.abs(nearestPos - positionRef.current) + 0.5 <
      Math.abs(playheadPos - positionRef.current)
        ? nearestIndex
        : playheadIndex;

    finishScrub(finalIndex);
  }

  function tickSpring(nowMs: number) {
    if (!isSpringBackRef.current && !isSnapSettlingRef.current) return;

    const lastTime = lastFrameTimeRef.current || nowMs;
    const deltaMs = clamp(nowMs - lastTime, 0, MAX_FRAME_DELTA_MS);
    lastFrameTimeRef.current = nowMs;

    const { position, velocity } = integrateCriticallyDampedSpringStep(
      positionRef.current,
      velocityPxPerMsRef.current,
      coastSnapTargetRef.current,
      deltaMs,
      springOmegaRef.current,
    );

    // Overscroll spring paints the rubber-banded pixels directly; settle stays
    // inside bounds so applyPosition clamping is safe.
    if (isSpringBackRef.current) {
      positionRef.current = position;
      velocityPxPerMsRef.current = velocity;
      writeTransform(position);
      const { min, max } = getPositionBounds();
      syncChordIndexFromPosition(clamp(position, min, max));
    } else {
      velocityPxPerMsRef.current = velocity;
      applyPosition(position, false);
      syncChordIndexFromPosition(positionRef.current);
    }

    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );
    const springAgeMs = nowMs - springStartedAtRef.current;
    const inertiaAgeMs =
      coastStartedAtRef.current > 0
        ? nowMs - coastStartedAtRef.current
        : springAgeMs;
    const durationBudgetMs = coastDurationBudgetMsRef.current;
    const settled =
      (distanceToSnap < SNAP_SETTLED_DISTANCE_PX &&
        Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS) ||
      springAgeMs >= MAX_SPRING_MS ||
      inertiaAgeMs >= durationBudgetMs;

    if (settled) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickSpring);
  }

  /**
   * Spring from the current strip position/velocity onto the destination-locked
   * chord. Used for tiny remaining coast error and as a continuous handoff when
   * coast velocity dies or the coast time budget is exhausted off-target.
   */
  function beginSnapSettle() {
    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );
    if (
      distanceToSnap < SNAP_SETTLED_DISTANCE_PX &&
      Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS
    ) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    springOmegaRef.current = SNAP_SETTLE_OMEGA_PER_MS;
    isSnapSettlingRef.current = true;
    isSpringBackRef.current = false;
    isCoastingRef.current = true;
    isTouchingRef.current = false;
    const nowMs = performance.now();
    springStartedAtRef.current = nowMs;
    lastFrameTimeRef.current = nowMs;

    // Keep a short spring window even if the coast budget is already spent.
    const coastElapsedMs =
      coastStartedAtRef.current > 0 ? nowMs - coastStartedAtRef.current : 0;
    coastDurationBudgetMsRef.current = Math.min(
      MAX_COAST_DURATION_MS + SNAP_SETTLE_MIN_MS,
      Math.max(
        coastDurationBudgetMsRef.current,
        coastElapsedMs + SNAP_SETTLE_MIN_MS,
      ),
    );

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickSpring);
  }

  function tickCoast(nowMs: number) {
    if (!isCoastingRef.current) return;

    if (isSpringBackRef.current || isSnapSettlingRef.current) {
      tickSpring(nowMs);
      return;
    }

    const lastTime = lastFrameTimeRef.current || nowMs;
    const deltaMs = clamp(nowMs - lastTime, 0, MAX_FRAME_DELTA_MS);
    lastFrameTimeRef.current = nowMs;

    // Aggression-scaled time budget locked at release — hard flings get longer.
    // If we still have snap error when time is up, hand off to the spring
    // instead of teleporting to the chord.
    if (nowMs - coastStartedAtRef.current >= coastDurationBudgetMsRef.current) {
      const distanceToSnap = Math.abs(
        positionRef.current - coastSnapTargetRef.current,
      );
      if (
        distanceToSnap < SNAP_SETTLED_DISTANCE_PX &&
        Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS
      ) {
        finishScrub(coastSnapIndexRef.current);
      } else {
        beginSnapSettle();
      }
      return;
    }

    const { positionDelta, velocity } = integrateIosCoastStep(
      velocityPxPerMsRef.current,
      deltaMs,
      SCRUB_COAST_DECELERATION_RATE,
    );

    let nextPosition = positionRef.current + positionDelta;
    let nextVelocity = velocity;

    // Soft destination-lock in velocity space: keep scrub deceleration at
    // speed, then gradually steer the asymptote onto the chord as we slow.
    const idealVelocity = velocityToReachIosCoastDestination(
      nextPosition,
      coastSnapTargetRef.current,
      SCRUB_COAST_DECELERATION_RATE,
    );
    const initialSpeed = Math.max(
      coastInitialSpeedRef.current,
      IOS_REST_VELOCITY_PX_PER_MS,
    );
    const speedRatio = clamp(Math.abs(nextVelocity) / initialSpeed, 0, 1);
    const pull = 0.06 + 0.4 * (1 - speedRatio) * (1 - speedRatio);
    nextVelocity = clampScrubVelocity(
      nextVelocity + (idealVelocity - nextVelocity) * pull,
    );

    const { min, max } = getPositionBounds();
    if (nextPosition <= min || nextPosition >= max) {
      nextPosition = clamp(nextPosition, min, max);
      velocityPxPerMsRef.current = 0;
      applyPosition(nextPosition, false);
      syncChordIndexFromPosition(positionRef.current);

      const distanceToSnap = Math.abs(
        positionRef.current - coastSnapTargetRef.current,
      );
      if (distanceToSnap < SNAP_SETTLED_DISTANCE_PX) {
        finishScrub(coastSnapIndexRef.current);
      } else {
        beginSnapSettle();
      }
      return;
    }

    velocityPxPerMsRef.current = nextVelocity;
    applyPosition(nextPosition, false);
    syncChordIndexFromPosition(positionRef.current);

    const distanceToSnap = Math.abs(
      positionRef.current - coastSnapTargetRef.current,
    );

    if (distanceToSnap < SNAP_SETTLED_DISTANCE_PX) {
      finishScrub(coastSnapIndexRef.current);
      return;
    }

    // Velocity spent: spring the remainder with continuous velocity handoff
    // (do not zero velocity — that caused an ease-out "kick").
    if (Math.abs(velocityPxPerMsRef.current) < IOS_REST_VELOCITY_PX_PER_MS) {
      beginSnapSettle();
      return;
    }

    rafIdRef.current = requestAnimationFrame(tickCoast);
  }

  function beginOverscrollSpringBack(min: number, max: number) {
    const positions = scrollPositionsRef.current;
    const width = totalWidthRef.current;
    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    const dimension = getRubberBandDimension();
    const displayPosition = applyIosRubberBandPosition(
      positionRef.current,
      min,
      max,
      dimension,
    );
    const edge = positionRef.current < min ? min : max;
    const edgeIndex = nearestPlaybackChordIndex(edge, positions, width);
    const edgePosition = closestPlaybackChordPosition(
      edgeIndex,
      positions,
      width,
      edge,
    );

    // Animate from the rubber-banded pixels the user currently sees, not from
    // the unconstrained logical position (which would look like a teleport).
    positionRef.current = displayPosition;
    writeTransform(displayPosition);

    coastSnapIndexRef.current = edgeIndex;
    coastSnapTargetRef.current = edgePosition;
    // Carry a little release velocity toward the edge when the finger was
    // still moving; otherwise start from rest.
    const measured = estimateVelocityPxPerMs();
    const towardEdge = edgePosition - displayPosition;
    velocityPxPerMsRef.current =
      towardEdge === 0
        ? 0
        : Math.sign(towardEdge) === Math.sign(measured)
          ? measured
          : 0;
    springOmegaRef.current = OVERSCROLL_SPRING_OMEGA_PER_MS;
    isSpringBackRef.current = true;
    isSnapSettlingRef.current = false;
    isCoastingRef.current = true;
    isTouchingRef.current = false;
    // Overscroll spring-back is not a fling coast; use the max settle ceiling.
    coastDurationBudgetMsRef.current = MAX_COAST_DURATION_MS;
    const nowMs = performance.now();
    coastStartedAtRef.current = nowMs;
    springStartedAtRef.current = nowMs;
    lastFrameTimeRef.current = nowMs;

    stopRaf();
    rafIdRef.current = requestAnimationFrame(tickSpring);
  }

  function beginCoast() {
    const positions = scrollPositionsRef.current;

    if (!positions || positions.length === 0) {
      finishScrub(currentChordIndexRef.current);
      return;
    }

    stopTrackingRaf();
    // Paint the latest deferred tracking sample before physics takes over.
    writeTransform(pendingDisplayPositionRef.current);

    const { min, max } = getPositionBounds();

    if (positionRef.current < min || positionRef.current > max) {
      beginOverscrollSpringBack(min, max);
      return;
    }

    // Cap peak release speed, then decide coast distance/duration from
    // aggressiveness. Precise / still releases stay at zero and never coast.
    let releaseVelocity = clampScrubVelocity(estimateVelocityPxPerMs());
    if (Math.abs(releaseVelocity) < FLING_START_VELOCITY_PX_PER_MS) {
      releaseVelocity = 0;
    }

    velocityPxPerMsRef.current = releaseVelocity;
    coastInitialSpeedRef.current = Math.abs(releaseVelocity);

    const distanceBudgetPx = coastDistanceBudgetForVelocity(releaseVelocity);
    const durationBudgetMs = coastDurationBudgetForVelocity(releaseVelocity);

    // Precise / stopped release: no inertial glide and no settle animation.
    if (
      distanceBudgetPx <= 0 ||
      durationBudgetMs <= 0 ||
      releaseVelocity === 0
    ) {
      finishAtPlayheadChord();
      return;
    }

    const budgetedProjected = projectCoastPositionWithDistanceBudget(
      positionRef.current,
      releaseVelocity,
      distanceBudgetPx,
      SCRUB_COAST_DECELERATION_RATE,
    );

    retargetSnapFromProjectedPosition(budgetedProjected);

    // Destination-lock onto the budgeted chord, never exceeding the capped
    // release speed so aggressiveness still owns both speed and distance.
    const lockedVelocity = velocityToReachIosCoastDestination(
      positionRef.current,
      coastSnapTargetRef.current,
      SCRUB_COAST_DECELERATION_RATE,
    );
    const travelPx = Math.abs(coastSnapTargetRef.current - positionRef.current);
    const cappedLocked = clampScrubVelocity(
      Math.sign(lockedVelocity || releaseVelocity) *
        Math.min(
          Math.abs(lockedVelocity),
          Math.abs(releaseVelocity),
          MAX_SCRUB_VELOCITY_PX_PER_MS,
        ),
    );
    velocityPxPerMsRef.current = cappedLocked;
    coastInitialSpeedRef.current = Math.abs(cappedLocked);

    // Snap target is already under the playhead (or locking produced no fling).
    if (
      travelPx < SNAP_SETTLED_DISTANCE_PX ||
      Math.abs(cappedLocked) < FLING_START_VELOCITY_PX_PER_MS
    ) {
      finishAtPlayheadChord();
      return;
    }

    // Lock duration from the measured release fling — not the destination-locked
    // velocity — so aggressiveness at lift owns how long inertia may run.
    coastDurationBudgetMsRef.current = durationBudgetMs;

    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;
    const nowMs = performance.now();
    coastStartedAtRef.current = nowMs;
    lastFrameTimeRef.current = nowMs;
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

    // Resume from the live strip position when interrupting a coast/spring or
    // grabbing during playback — never snap translateX back to a chord edge.
    const wasInertiaActive =
      isCoastingRef.current ||
      isSpringBackRef.current ||
      isSnapSettlingRef.current;

    stopRaf();
    stopTrackingRaf();
    isCoastingRef.current = false;
    isSpringBackRef.current = false;
    isSnapSettlingRef.current = false;

    // Playback motion is a compositor animation, so the scroll ref is only a
    // coarse sample. Read the painted transform while the animation is still
    // running (this handler runs before React tears it down).
    const stripElement = stripRef.current;
    const paintedPosition =
      wasInertiaActive || !stripElement
        ? null
        : parseStripPositionPx(window.getComputedStyle(stripElement).transform);
    if (paintedPosition !== null) {
      scrubPositionRef.current = paintedPosition;
    }

    const startPosition = wasInertiaActive
      ? positionRef.current
      : scrubPositionRef.current;

    isTouchingRef.current = true;
    pointerIdRef.current = event.pointerId;
    lastPointerXRef.current = event.clientX;
    const downTimeMs = performance.now();
    samplesRef.current = [{ timeMs: downTimeMs, x: event.clientX }];
    // Treat press as non-moving until a real drag delta arrives.
    lastSignificantMoveAtRef.current = 0;
    velocityPxPerMsRef.current = 0;
    positionRef.current = startPosition;
    pendingDisplayPositionRef.current = startPosition;

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

    if (Math.abs(deltaX) >= RELEASE_STILLNESS_MOVEMENT_PX) {
      lastSignificantMoveAtRef.current = nowMs;
    }

    // Update logical/rubber-band position every pointer sample for control
    // fidelity, but paint translateX once per animation frame.
    applyPosition(positionRef.current - deltaX, true, true);
    velocityPxPerMsRef.current = clampScrubVelocity(estimateVelocityPxPerMs());
    scheduleTrackingFrame();
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
