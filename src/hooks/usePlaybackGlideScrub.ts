import {
  useEffect,
  useRef,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  clamp,
  getAbsoluteChordPosition,
  getChordIndexAtPlayhead,
  getNearestChordIndex,
  getStripTransform,
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

  useEffect(() => {
    chordRepetitionsRef.current = chordRepetitions;
  }, [chordRepetitions]);

  useEffect(() => {
    totalWidthRef.current = totalWidth;
  }, [totalWidth]);

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

    const lastIndex = positions.length - 1;
    return {
      min: getAbsoluteChordPosition(0, positions, repetitions, width),
      max: getAbsoluteChordPosition(lastIndex, positions, repetitions, width),
    };
  }

  function applyTransform(positionPx: number) {
    const strip = stripRef.current;
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

    if (nextIndex < previousIndex) {
      // Virtualization only handles forward movement; reset on scrub-back.
      const resetRepetitions = new Array(positions.length).fill(0) as number[];
      chordRepetitionsRef.current = resetRepetitions;
      setChordRepetitions(resetRepetitions);
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

      if (finalIndex < currentChordIndexRef.current) {
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
      applyTransform(finalPosition);

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

    applyTransform(nextPosition);
    syncChordIndexFromPosition(nextPosition);
    velocityPxPerMsRef.current = velocity;

    const distanceToSnap = Math.abs(nextPosition - coastSnapTargetRef.current);
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
      repetitions,
      width,
    );
    const snapTarget = getAbsoluteChordPosition(
      snapIndex,
      positions,
      repetitions,
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
        repetitions,
        width,
      );
      coastSnapIndexRef.current = immediateIndex;
      coastSnapTargetRef.current = getAbsoluteChordPosition(
        immediateIndex,
        positions,
        repetitions,
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
