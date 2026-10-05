import {
  buildStripSegment,
  contentElapsedAtLocalMs,
  correctionWindowMs,
  elapsedForAbsolutePositionPx,
  getAbsoluteScrollPositionPx,
  getPlaybackStripMotionModel,
  getPlaybackStripTransform,
  getStripAnchor,
  parseStripPositionPx,
  STRIP_DRIFT_DEADBAND_MS,
  STRIP_DRIFT_HARD_SEEK_MS,
  STRIP_MAX_KEYFRAMES,
  STRIP_SEGMENT_TARGET_MS,
  type PlaybackStripLayoutInput,
  type PlaybackStripMotionModel,
  type StripSegment,
} from "~/utils/playbackStripMotion";

/**
 * Compositor-thread playback strip.
 *
 * The animation free-runs at playbackRate 1. It is started already inside its
 * active interval and is the only transform animation on the element.
 *
 * iOS Safari paints the 100% keyframe whenever a transform animation's effect
 * time is 0. That happens when playback begins at the start of the tab, and
 * again for a second animation queued with a future start time. The strip is
 * translated to the far end of the segment — out of the overflow viewport —
 * until effect time finally advances. Audio keeps going the whole time.
 * Starting at currentTime 0, stacking a waiting animation, will-change, and
 * backface-visibility: hidden are all avoided here.
 *
 * Drift is corrected rarely, by replacing that one animation from the painted
 * frame. playbackRate is never written after scheduling.
 */

const SUPERVISOR_INTERVAL_MS = 100;
const DRIFT_CHECK_INTERVAL_MS = 250;
const DEAD_ANIMATION_MS = 220;
/** Stay off the 0% keyframe. iOS samples the 100% keyframe at effect time 0. */
const MIN_ACTIVE_LOCAL_MS = 16;
/** Swap in the next segment while the current one still has this much left. */
const EXTEND_BEFORE_END_MS = 1500;

export interface PlaybackStripClock {
  getAudioCurrentTime: () => number;
  getAudioState: () => AudioContextState;
  subscribeAudioState?: (listener: () => void) => () => void;
}

interface PlaybackStripGeometry {
  model: PlaybackStripMotionModel;
  totalWidth: number;
  anchorStartTimeMs: number;
  baseRepetition: number;
}

interface ScheduledSegment {
  animation: Animation;
  segment: StripSegment;
  documentStartTime: number;
}

export interface PlaybackStripDriverOptions {
  element: HTMLDivElement;
  layout: PlaybackStripLayoutInput;
  anchorChordIndex: number;
  anchorRepetition: number;
  playbackStartedAtAudioTime: number;
  clock: PlaybackStripClock;
  onScrollPosition?: (positionPx: number) => void;
  /** Test seam. Production uses a horizon long enough to absorb a stall. */
  segmentTargetMs?: number;
}

export interface PlaybackStripSnapshot {
  timelineNow: number | null;
  audioElapsedMs: number;
  visualElapsedMs: number | null;
  expectedPositionPx: number | null;
  audioPositionPx: number | null;
  playbackRates: number[];
  playStates: string[];
  correctionCount: number;
  suspended: boolean;
  activeDurationMs: number | null;
  hasQueuedSegment: boolean;
}

function getDocumentTimelineNow(): number | null {
  const current = document.timeline?.currentTime;
  if (typeof current === "number" && Number.isFinite(current)) return current;
  return null;
}

function activeLocalMs(durationMs: number, preferredLocalMs: number) {
  if (durationMs <= MIN_ACTIVE_LOCAL_MS + 1) {
    return Math.max(0.001, durationMs / 2);
  }
  return Math.min(
    durationMs - 1,
    Math.max(MIN_ACTIVE_LOCAL_MS, preferredLocalMs),
  );
}

export class PlaybackStripDriver {
  private readonly element: HTMLDivElement;
  private readonly clock: PlaybackStripClock;
  private readonly onScrollPosition: ((positionPx: number) => void) | null;
  private readonly playbackStartedAtAudioTime: number;
  private readonly segmentTargetMs: number;
  private readonly geometry: PlaybackStripGeometry | null;

  private alive = false;
  private suspended = false;
  private holdingLeadIn = false;
  private suspendedVisualElapsedMs = 0;
  private active: ScheduledSegment | null = null;
  private timerId: number | null = null;
  private unsubscribeAudioState: (() => void) | null = null;
  private nextDriftCheckAt = 0;
  private correctionCooldownUntil = 0;
  private correctionCount = 0;
  private lastObservedCurrentTime: number | null = null;
  private lastObservedAt = 0;

  constructor(options: PlaybackStripDriverOptions) {
    this.element = options.element;
    this.clock = options.clock;
    this.onScrollPosition = options.onScrollPosition ?? null;
    this.playbackStartedAtAudioTime = options.playbackStartedAtAudioTime;
    this.segmentTargetMs = options.segmentTargetMs ?? STRIP_SEGMENT_TARGET_MS;

    const model = getPlaybackStripMotionModel(options.layout);
    if (!model || model.totalDurationMs <= 0) {
      this.geometry = null;
      return;
    }

    const anchor = getStripAnchor({
      chordCount: model.chordCount,
      anchorChordIndex: options.anchorChordIndex,
      anchorRepetition: options.anchorRepetition,
      cumulativeChordTimesMs: model.cumulativeChordTimesMs,
    });

    this.geometry = anchor
      ? {
          model,
          totalWidth: options.layout.totalWidth,
          anchorStartTimeMs: anchor.anchorStartTimeMs,
          baseRepetition: anchor.baseRepetition,
        }
      : null;
  }

  start(): boolean {
    this.stop();

    if (!this.geometry || !this.element.isConnected) return false;

    const now = getDocumentTimelineNow();
    if (now === null) return false;

    this.alive = true;
    this.suspended = false;
    this.holdingLeadIn = false;
    this.element.style.transition = "none";
    // will-change and backface-visibility: hidden promote a layer that iOS
    // drops while the transform is still identity (playback from the start).
    this.element.style.willChange = "auto";
    this.element.style.backfaceVisibility = "";
    this.element.style.webkitBackfaceVisibility = "";
    this.element.dataset.playbackMotion = "waapi";

    if (!this.alignToAudio(now)) {
      this.stop();
      return false;
    }

    this.publishScroll(now);
    this.timerId = window.setInterval(() => {
      this.supervise();
    }, SUPERVISOR_INTERVAL_MS);
    this.unsubscribeAudioState =
      this.clock.subscribeAudioState?.(() => {
        this.supervise();
      }) ?? null;

    return true;
  }

  stop() {
    if (!this.alive && this.active === null && this.timerId === null) {
      return;
    }

    this.alive = false;
    this.clearSupervisor();

    // Commit the composited frame before cancelling so pause, glide-scrub,
    // and effect restarts hold the pixels that were on screen. A later layout
    // effect may still move a paused strip to the current chord boundary.
    const painted = this.readPaintedPositionPx();
    if (painted !== null) {
      this.onScrollPosition?.(painted);
      this.element.style.transform = getPlaybackStripTransform(painted);
    }

    this.cancelAll();
    this.element.style.willChange = "auto";
    this.element.style.backfaceVisibility = "";
    this.element.style.webkitBackfaceVisibility = "";
    if (this.element.dataset.playbackMotion === "waapi") {
      delete this.element.dataset.playbackMotion;
    }
  }

  getSnapshot(): PlaybackStripSnapshot {
    const timelineNow = getDocumentTimelineNow();
    const audioElapsedMs = this.audioElapsedMs();
    const visualElapsedMs =
      timelineNow === null ? null : this.visualElapsedMs(timelineNow);

    return {
      timelineNow,
      audioElapsedMs,
      visualElapsedMs,
      expectedPositionPx:
        timelineNow === null ? null : this.getExpectedPositionPx(timelineNow),
      audioPositionPx: this.geometry
        ? this.positionForElapsed(Math.max(0, audioElapsedMs))
        : null,
      playbackRates: this.playbackRates(),
      playStates: this.playStates(),
      correctionCount: this.correctionCount,
      suspended: this.suspended,
      activeDurationMs: this.active?.segment.durationMs ?? null,
      hasQueuedSegment: false,
    };
  }

  getExpectedPositionPx(timelineNow: number): number | null {
    if (!this.geometry) return null;
    return this.positionForElapsed(Math.max(0, this.visualElapsedMs(timelineNow)));
  }

  private supervise() {
    if (!this.alive) return;

    if (!this.element.isConnected) {
      this.stop();
      return;
    }

    const now = getDocumentTimelineNow();
    if (now === null) return;

    this.syncAudioRunning(now);
    if (!this.alive || this.suspended) return;

    if (this.audioElapsedMs() < 0 || this.holdingLeadIn) {
      if (this.audioElapsedMs() < 0) {
        this.holdLeadIn();
        this.publishScroll(now);
        return;
      }
      this.holdingLeadIn = false;
      this.playFromElapsed(Math.max(0, this.audioElapsedMs()), now);
    }

    this.maybeExtend(now);
    this.publishScroll(now);
    this.maybeRecoverDeadAnimation(now);
    this.maybeCorrectDrift(now);
  }

  private syncAudioRunning(now: number) {
    const running = this.clock.getAudioState() === "running";

    if (!running) {
      if (!this.suspended) this.freeze(now);
      return;
    }

    if (!this.suspended) return;

    this.suspended = false;
    const audioElapsedMs = this.audioElapsedMs();
    const painted = this.readPaintedPositionPx();

    if (!this.geometry || painted === null || audioElapsedMs < 0) {
      this.alignToAudio(now);
      return;
    }

    const visualElapsedMs = elapsedForAbsolutePositionPx({
      model: this.geometry.model,
      totalWidth: this.geometry.totalWidth,
      anchorStartTimeMs: this.geometry.anchorStartTimeMs,
      baseRepetition: this.geometry.baseRepetition,
      positionPx: painted,
      estimateElapsedMs: this.suspendedVisualElapsedMs,
    });

    this.realign(visualElapsedMs, audioElapsedMs, painted, now);
  }

  private freeze(now: number) {
    const painted = this.readPaintedPositionPx();
    this.suspendedVisualElapsedMs = Math.max(0, this.visualElapsedMs(now));
    this.cancelAll();

    if (painted !== null) {
      this.element.style.transform = getPlaybackStripTransform(painted);
      this.onScrollPosition?.(painted);
    }

    this.suspended = true;
  }

  private alignToAudio(now: number) {
    if (!this.geometry) return false;

    const audioElapsedMs = this.audioElapsedMs();
    if (audioElapsedMs < 0) {
      this.holdLeadIn();
      return true;
    }

    return this.playFromElapsed(audioElapsedMs, now);
  }

  private holdLeadIn() {
    this.holdingLeadIn = true;
    this.cancelAll();
    const positionPx = this.positionForElapsed(0);
    this.element.style.transform = getPlaybackStripTransform(positionPx);
    this.onScrollPosition?.(positionPx);
  }

  private playFromElapsed(elapsedMs: number, now: number) {
    const localMs = activeLocalMs(this.segmentTargetMs, MIN_ACTIVE_LOCAL_MS);
    const fromElapsedMs = Math.max(0, elapsedMs - localMs);
    const segment = this.buildIdentitySegment(fromElapsedMs);
    if (!segment) return false;
    const appliedLocalMs = Math.min(
      activeLocalMs(segment.durationMs, elapsedMs - fromElapsedMs),
      segment.durationMs - 1,
    );
    return this.startSegment(segment, Math.max(0.001, appliedLocalMs), now);
  }

  private realign(
    visualElapsedMs: number,
    audioElapsedMs: number,
    paintedPositionPx: number | null,
    now: number,
  ) {
    const errorMs = visualElapsedMs - Math.max(0, audioElapsedMs);

    if (Math.abs(errorMs) <= STRIP_DRIFT_DEADBAND_MS) {
      this.playFromElapsed(Math.max(0, visualElapsedMs), now);
      return;
    }

    if (Math.abs(errorMs) > STRIP_DRIFT_HARD_SEEK_MS || audioElapsedMs < 0) {
      this.hardSeek(Math.max(0, audioElapsedMs), now);
      return;
    }

    this.slew(visualElapsedMs, audioElapsedMs, paintedPositionPx, now);
  }

  private maybeCorrectDrift(now: number) {
    if (now < this.nextDriftCheckAt || now < this.correctionCooldownUntil) {
      return;
    }
    this.nextDriftCheckAt = now + DRIFT_CHECK_INTERVAL_MS;

    if (!this.active || this.suspended) return;

    if (this.active.segment.warp) {
      const localMs = now - this.active.documentStartTime;
      if (localMs < this.active.segment.warp.windowMs) return;
    }

    const audioElapsedMs = this.audioElapsedMs();
    if (!Number.isFinite(audioElapsedMs) || audioElapsedMs < 40) return;

    const visualElapsedMs = this.visualElapsedMs(now);
    if (Math.abs(visualElapsedMs - audioElapsedMs) <= STRIP_DRIFT_DEADBAND_MS) {
      return;
    }

    const painted = this.readPaintedPositionPx();
    const visualFromPaint =
      painted === null || !this.geometry
        ? visualElapsedMs
        : elapsedForAbsolutePositionPx({
            model: this.geometry.model,
            totalWidth: this.geometry.totalWidth,
            anchorStartTimeMs: this.geometry.anchorStartTimeMs,
            baseRepetition: this.geometry.baseRepetition,
            positionPx: painted,
            estimateElapsedMs: Math.max(0, visualElapsedMs),
          });

    if (
      Math.abs(visualFromPaint - audioElapsedMs) <= STRIP_DRIFT_DEADBAND_MS
    ) {
      return;
    }

    this.realign(visualFromPaint, audioElapsedMs, painted, now);
  }

  private slew(
    visualElapsedMs: number,
    audioElapsedMs: number,
    paintedPositionPx: number | null,
    now: number,
  ) {
    if (!this.geometry) return;

    const windowMs = correctionWindowMs(visualElapsedMs - audioElapsedMs);
    const segment = buildStripSegment({
      model: this.geometry.model,
      totalWidth: this.geometry.totalWidth,
      anchorStartTimeMs: this.geometry.anchorStartTimeMs,
      baseRepetition: this.geometry.baseRepetition,
      fromElapsedMs: visualElapsedMs,
      targetDurationMs: Math.max(this.segmentTargetMs, windowMs + 1000),
      maxKeyframes: STRIP_MAX_KEYFRAMES,
      warp: {
        visualElapsedMs,
        audioElapsedMs,
        windowMs,
      },
      firstPositionPx: paintedPositionPx ?? undefined,
    });

    if (!segment) return;

    this.startSegment(segment, MIN_ACTIVE_LOCAL_MS, now);
    this.correctionCount += 1;
    this.correctionCooldownUntil = now + windowMs + 1500;
  }

  private hardSeek(audioElapsedMs: number, now: number) {
    if (!this.playFromElapsed(Math.max(0, audioElapsedMs), now)) return;
    this.correctionCount += 1;
    this.correctionCooldownUntil = now + 1500;
  }

  private maybeRecoverDeadAnimation(now: number) {
    const animation = this.active?.animation;
    if (!animation || this.suspended) return;

    const audioElapsedMs = this.audioElapsedMs();
    if (audioElapsedMs < 150) return;

    if (animation.playState === "finished" || animation.playState === "idle") {
      this.hardSeek(audioElapsedMs, now);
      this.lastObservedCurrentTime = null;
      return;
    }

    if (animation.playState === "paused") return;

    const currentTime = animation.currentTime;
    if (typeof currentTime !== "number") return;

    if (
      this.lastObservedCurrentTime === null ||
      Math.abs(currentTime - this.lastObservedCurrentTime) > 1
    ) {
      this.lastObservedCurrentTime = currentTime;
      this.lastObservedAt = now;
      return;
    }

    if (now - this.lastObservedAt < DEAD_ANIMATION_MS) return;

    this.hardSeek(audioElapsedMs, now);
    this.lastObservedCurrentTime = null;
  }

  private maybeExtend(now: number) {
    if (!this.active || this.holdingLeadIn) return;

    const localMs = now - this.active.documentStartTime;
    if (localMs < this.active.segment.durationMs * 0.5) return;

    if (this.active.segment.warp && localMs < this.active.segment.warp.windowMs) {
      return;
    }

    const remainingMs = this.active.segment.durationMs - localMs;
    if (remainingMs > EXTEND_BEFORE_END_MS) return;

    this.playFromElapsed(Math.max(0, this.visualElapsedMs(now)), now);
  }

  private buildIdentitySegment(
    fromElapsedMs: number,
    options?: { firstPositionPx?: number },
  ) {
    if (!this.geometry) return null;

    return buildStripSegment({
      model: this.geometry.model,
      totalWidth: this.geometry.totalWidth,
      anchorStartTimeMs: this.geometry.anchorStartTimeMs,
      baseRepetition: this.geometry.baseRepetition,
      fromElapsedMs,
      targetDurationMs: this.segmentTargetMs,
      maxKeyframes: STRIP_MAX_KEYFRAMES,
      firstPositionPx: options?.firstPositionPx,
    });
  }

  private startSegment(segment: StripSegment, localMs: number, now: number) {
    const safeLocalMs = activeLocalMs(segment.durationMs, localMs);
    const elapsedMs = contentElapsedAtLocalMs(segment, safeLocalMs);
    // Inline frame first, so cancelling the previous animation cannot reveal
    // the 100% keyframe iOS uses whenever effect time is still 0.
    this.element.style.transform = getPlaybackStripTransform(
      this.positionForElapsed(elapsedMs),
    );

    this.cancelAll();

    let animation: Animation;
    try {
      const effect = new KeyframeEffect(this.element, segment.keyframes, {
        duration: segment.durationMs,
        fill: "both",
        easing: "linear",
        composite: "replace",
      });
      // Construct idle, set a non-zero currentTime, then play. element.animate()
      // would sample effect time 0 before we could move it.
      animation = new Animation(effect, document.timeline);
      animation.currentTime = safeLocalMs;
      animation.play();
    } catch {
      return false;
    }

    // Pin the origin ourselves. play() can leave startTime at "now" while
    // currentTime is already MIN_ACTIVE_LOCAL_MS, which made the model lead
    // the painted frame by that offset for the whole segment.
    const timelineNow = getDocumentTimelineNow() ?? now;
    const documentStartTime = timelineNow - safeLocalMs;
    try {
      animation.startTime = documentStartTime;
    } catch {
      // Idle/play already established the origin. The sampled fallback below
      // still tracks the animation.
    }
    const appliedLocalMs =
      typeof animation.currentTime === "number" && animation.currentTime > 0
        ? animation.currentTime
        : safeLocalMs;
    const origin =
      typeof animation.startTime === "number"
        ? animation.startTime
        : timelineNow - appliedLocalMs;
    this.active = {
      animation,
      segment,
      documentStartTime: origin,
    };
    this.lastObservedCurrentTime = null;
    this.holdingLeadIn = false;
    return true;
  }

  private publishScroll(now: number) {
    if (!this.onScrollPosition) return;
    this.onScrollPosition(this.positionForElapsed(Math.max(0, this.visualElapsedMs(now))));
  }

  private visualElapsedMs(now: number) {
    if (this.suspended) return this.suspendedVisualElapsedMs;
    if (!this.active) return Math.max(0, this.audioElapsedMs());

    const localMs = now - this.active.documentStartTime;
    return contentElapsedAtLocalMs(this.active.segment, localMs);
  }

  private positionForElapsed(elapsedMs: number) {
    if (!this.geometry) return 0;
    return getAbsoluteScrollPositionPx({
      model: this.geometry.model,
      totalWidth: this.geometry.totalWidth,
      anchorStartTimeMs: this.geometry.anchorStartTimeMs,
      baseRepetition: this.geometry.baseRepetition,
      elapsedMs,
    });
  }

  private audioElapsedMs() {
    return (
      (this.clock.getAudioCurrentTime() - this.playbackStartedAtAudioTime) *
      1000
    );
  }

  private readPaintedPositionPx() {
    return parseStripPositionPx(window.getComputedStyle(this.element).transform);
  }

  private playbackRates() {
    const rates: number[] = [];
    if (this.active) rates.push(this.active.animation.playbackRate);
    return rates;
  }

  private playStates() {
    const states: string[] = [];
    if (this.active) states.push(this.active.animation.playState);
    return states;
  }

  private cancelAll() {
    this.active?.animation.cancel();
    this.active = null;

    if (typeof this.element.getAnimations === "function") {
      for (const animation of this.element.getAnimations()) {
        animation.cancel();
      }
    }
  }

  private clearSupervisor() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.unsubscribeAudioState?.();
    this.unsubscribeAudioState = null;
  }
}

export function createAudioContextClock(
  audioContext: AudioContext,
): PlaybackStripClock {
  return {
    getAudioCurrentTime: () => audioContext.currentTime,
    getAudioState: () => audioContext.state,
    subscribeAudioState: (listener) => {
      audioContext.addEventListener("statechange", listener);
      return () => {
        audioContext.removeEventListener("statechange", listener);
      };
    },
  };
}
