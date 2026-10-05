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
 * The animation free-runs at playbackRate 1. Its start time is latched to the
 * audio clock once, then a successor segment is queued on the same document
 * timeline so a loop handoff does not wait for main-thread `onfinish`.
 *
 * Drift is corrected rarely, and only by replacing the animation with a new
 * one whose first frame is the painted position. `playbackRate` and
 * `currentTime` are never written after an animation is scheduled — those
 * updates are applied with a stale main-thread time on iOS and were the source
 * of the old WAAPI stutters.
 */

const SUPERVISOR_INTERVAL_MS = 100;
const DRIFT_CHECK_INTERVAL_MS = 250;
const DEAD_ANIMATION_MS = 220;
const SUCCESSOR_PROMOTE_DELAY_MS = 8;

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

function scheduleSegmentAnimation(
  element: HTMLElement,
  segment: StripSegment,
  fill: FillMode,
  startTime: number,
): Animation | null {
  try {
    const effect = new KeyframeEffect(element, segment.keyframes, {
      duration: segment.durationMs,
      fill,
      easing: "linear",
      composite: "replace",
    });
    const animation = new Animation(effect, document.timeline);
    animation.startTime = startTime;
    return animation;
  } catch {
    return null;
  }
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
  private suspendedVisualElapsedMs = 0;
  private active: ScheduledSegment | null = null;
  private queued: ScheduledSegment | null = null;
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
    this.element.style.transition = "none";
    this.element.style.willChange = "transform";
    this.element.style.backfaceVisibility = "hidden";
    this.element.style.webkitBackfaceVisibility = "hidden";
    this.element.dataset.playbackMotion = "waapi";

    // Prime a 3D layer before the first animation so a cold WebKit compositor
    // has a transform target. The animation replaces this inline value.
    const primedElapsedMs = Math.max(0, this.audioElapsedMs());
    this.element.style.transform = getPlaybackStripTransform(
      this.positionForElapsed(primedElapsedMs),
    );
    void this.element.getBoundingClientRect();

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
    if (
      !this.alive &&
      this.active === null &&
      this.queued === null &&
      this.timerId === null
    ) {
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
      hasQueuedSegment: this.queued !== null,
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

    this.promoteQueued(now);
    this.ensureSuccessor();
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
    const fromElapsedMs = Math.max(0, audioElapsedMs);
    const documentStartTime = now - (audioElapsedMs - fromElapsedMs);
    const segment = this.buildIdentitySegment(fromElapsedMs);
    if (!segment) return false;

    return this.replaceActive(segment, documentStartTime);
  }

  private realign(
    visualElapsedMs: number,
    audioElapsedMs: number,
    paintedPositionPx: number | null,
    now: number,
  ) {
    const errorMs = visualElapsedMs - Math.max(0, audioElapsedMs);

    if (Math.abs(errorMs) <= STRIP_DRIFT_DEADBAND_MS) {
      const segment = this.buildIdentitySegment(Math.max(0, visualElapsedMs), {
        firstPositionPx: paintedPositionPx ?? undefined,
      });
      if (!segment) return;
      this.replaceActive(segment, now);
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

    this.replaceActive(segment, now);
    this.correctionCount += 1;
    this.correctionCooldownUntil = now + windowMs + 1500;
  }

  private hardSeek(audioElapsedMs: number, now: number) {
    const segment = this.buildIdentitySegment(Math.max(0, audioElapsedMs));
    if (!segment) return;
    this.replaceActive(segment, now);
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

  private promoteQueued(now: number) {
    if (!this.queued || !this.active) return;
    if (now < this.queued.documentStartTime + SUCCESSOR_PROMOTE_DELAY_MS) {
      return;
    }

    const queuedTime = this.queued.animation.currentTime;
    const successorStarted =
      typeof queuedTime === "number" &&
      queuedTime >= SUCCESSOR_PROMOTE_DELAY_MS;

    if (!successorStarted) {
      const rebuilt = scheduleSegmentAnimation(
        this.element,
        this.queued.segment,
        "both",
        this.queued.documentStartTime,
      );
      this.queued.animation.cancel();
      if (!rebuilt) {
        this.queued = null;
        this.hardSeek(Math.max(0, this.audioElapsedMs()), now);
        return;
      }
      this.queued = {
        animation: rebuilt,
        segment: this.queued.segment,
        documentStartTime: this.queued.documentStartTime,
      };
    }

    const previous = this.active;
    try {
      this.queued.animation.effect?.updateTiming({ fill: "both" });
    } catch {
      // The successor is already inside its active interval, where fill does
      // not change the painted frame. Forwards-fill only matters if it ends
      // before the next segment is queued.
    }

    this.active = this.queued;
    this.queued = null;
    previous.animation.cancel();
    this.ensureSuccessor();
  }

  private ensureSuccessor() {
    if (!this.alive || this.suspended || this.queued || !this.active) return;
    if (!this.geometry) return;

    const documentStartTime =
      this.active.documentStartTime + this.active.segment.durationMs;
    const segment = this.buildIdentitySegment(this.active.segment.endElapsedMs);
    if (!segment) return;

    const animation = scheduleSegmentAnimation(
      this.element,
      segment,
      "none",
      documentStartTime,
    );
    if (!animation) return;

    this.queued = { animation, segment, documentStartTime };
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

  private replaceActive(segment: StripSegment, documentStartTime: number) {
    this.cancelAll();
    const animation = scheduleSegmentAnimation(
      this.element,
      segment,
      "both",
      documentStartTime,
    );
    if (!animation) return false;

    this.active = { animation, segment, documentStartTime };
    this.lastObservedCurrentTime = null;
    this.ensureSuccessor();
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
    if (this.queued) rates.push(this.queued.animation.playbackRate);
    return rates;
  }

  private playStates() {
    const states: string[] = [];
    if (this.active) states.push(this.active.animation.playState);
    if (this.queued) states.push(this.queued.animation.playState);
    return states;
  }

  private cancelAll() {
    this.active?.animation.cancel();
    this.queued?.animation.cancel();
    this.active = null;
    this.queued = null;

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
