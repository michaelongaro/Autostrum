import { useEffect, useRef, type RefObject } from "react";
import { getTabStore, useTabStore, type Metadata } from "~/stores/TabStore";
import {
  EDITING_TAB_PALM_MUTE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_INSET_PX,
} from "~/utils/editingTabGeometry";

/** Rows differ by ~column height + gap-y-4; anything above this is a wrap. */
const ROW_Y_SNAP_THRESHOLD_PX = 40;

const MAX_FRAME_DELTA_MS = 100;

/**
 * When paused, park the 2px playhead this far left of the chord center so the
 * fret digits stay readable under / beside the line.
 */
const PAUSED_PLAYHEAD_LEFT_OF_CENTER_PX = 10;

interface ChordLayoutPos {
  /** Horizontal center of the column, relative to the staff container. */
  x: number;
  /** Top of the first–sixth string span, relative to the staff container. */
  y: number;
  width: number;
}

function isPlayableMetadata(metadata: Metadata): boolean {
  return metadata.type === "tab" || metadata.type === "strum";
}

function getChordDurationSeconds(
  metadata: Metadata,
  playbackSpeed: number,
): number {
  if (!isPlayableMetadata(metadata)) {
    return 0;
  }

  const bpm = metadata.bpm;
  const noteLengthMultiplier = Number(metadata.noteLengthMultiplier);
  if (
    !(bpm > 0) ||
    !(noteLengthMultiplier > 0) ||
    !(playbackSpeed > 0) ||
    !Number.isFinite(bpm) ||
    !Number.isFinite(noteLengthMultiplier)
  ) {
    return 0;
  }

  return 60 / ((bpm / noteLengthMultiplier) * playbackSpeed);
}

function buildCumulativeTimesSeconds(
  metadata: Metadata[],
  playbackSpeed: number,
): number[] {
  const cumulative = new Array(metadata.length + 1).fill(0) as number[];
  for (let index = 0; index < metadata.length; index++) {
    cumulative[index + 1] =
      cumulative[index]! +
      getChordDurationSeconds(metadata[index]!, playbackSpeed);
  }
  return cumulative;
}

function normalizeModulo(value: number, modulus: number) {
  if (modulus <= 0) return 0;
  return ((value % modulus) + modulus) % modulus;
}

function getChordElementId(
  sectionIndex: number,
  subSectionIndex: number,
  chordIndex: number,
) {
  return `section${sectionIndex}-subSection${subSectionIndex}-chord${chordIndex}`;
}

function measureChordPosition(
  container: HTMLElement,
  sectionIndex: number,
  subSectionIndex: number,
  chordIndex: number,
): ChordLayoutPos | null {
  const element = document.getElementById(
    getChordElementId(sectionIndex, subSectionIndex, chordIndex),
  );
  if (!element) return null;

  const containerRect = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left - containerRect.left + rect.width / 2,
    y:
      rect.top -
      containerRect.top +
      EDITING_TAB_PALM_MUTE_HEIGHT_PX +
      EDITING_TAB_STAFF_LINE_INSET_PX,
    width: rect.width,
  };
}

/**
 * Next same-subsection target for gliding. Skips zero-duration ornamentals
 * (measure lines) so the playhead travels across their visual width during the
 * preceding chord. Returns null on subsection repeats so the playhead holds at
 * the end, then snaps to the start on the following segment.
 */
function findNextGlideTargetIndex(
  metadata: Metadata[],
  fromIndex: number,
  sectionIndex: number,
  subSectionIndex: number,
): number | null {
  const fromMeta = metadata[fromIndex];
  if (!fromMeta) return null;

  for (let index = fromIndex + 1; index < metadata.length; index++) {
    const entry = metadata[index];
    if (!entry) continue;
    if (
      entry.location.sectionIndex !== sectionIndex ||
      entry.location.subSectionIndex !== subSectionIndex
    ) {
      continue;
    }

    // Measure lines / spacers have no duration — never glide *to* them.
    if (!isPlayableMetadata(entry)) {
      continue;
    }

    // Same DOM columns replayed for a subsection repeat: snap, don't glide back.
    if (entry.location.chordIndex <= fromMeta.location.chordIndex) {
      return null;
    }

    return index;
  }
  return null;
}

function parkPlayheadAtMetadataIndex({
  container,
  playhead,
  metadata,
  metadataIndex,
  sectionIndex,
  subSectionIndex,
  pausedOffset,
}: {
  container: HTMLElement;
  playhead: HTMLDivElement;
  metadata: Metadata[];
  metadataIndex: number;
  sectionIndex: number;
  subSectionIndex: number;
  pausedOffset: boolean;
}) {
  const currMeta = metadata[metadataIndex];
  if (
    currMeta?.location.sectionIndex !== sectionIndex ||
    currMeta.location.subSectionIndex !== subSectionIndex
  ) {
    playhead.style.opacity = "0";
    return;
  }

  const pos = measureChordPosition(
    container,
    sectionIndex,
    subSectionIndex,
    currMeta.location.chordIndex,
  );
  if (!pos) {
    playhead.style.opacity = "0";
    return;
  }

  playhead.style.opacity = "1";
  // Center the 2px line (`- 1`), then nudge left when paused so notes aren't covered.
  const left = pausedOffset
    ? pos.x - 1 - PAUSED_PLAYHEAD_LEFT_OF_CENTER_PX
    : pos.x - 1;
  playhead.style.transform = `translate3d(${left}px, ${pos.y}px, 0)`;
}

/**
 * Imperatively animates the editing-tab playhead so TabSection itself does not
 * subscribe to currentChordIndex (avoids DndContext invalidation every tick).
 *
 * The playhead stays visible whenever playback metadata exists (playing or
 * paused). Chord note highlighting is handled separately and only while playing.
 */
export function useEditingTabPlayhead({
  sectionIndex,
  subSectionIndex,
  containerRef,
  playheadRef,
}: {
  sectionIndex: number;
  subSectionIndex: number;
  containerRef: RefObject<HTMLElement | null>;
  playheadRef: RefObject<HTMLDivElement | null>;
}) {
  const playing = useTabStore((state) => state.audioMetadata.playing);
  const showPlaybackModal = useTabStore((state) => state.showPlaybackModal);

  // Stable `null` while playing so TabSection does not re-render every tick.
  // While paused, tracks scrubbing / pause position for parking.
  const pausedChordIndex = useTabStore((state) =>
    state.audioMetadata.playing ? null : state.currentChordIndex,
  );
  const hasPlaybackMetadata = useTabStore(
    (state) => state.currentlyPlayingMetadata != null,
  );

  // Capture the metadata index that playbackStartedAtAudioTime corresponds to.
  const anchorChordIndexRef = useRef(0);
  const anchorPlaybackStartedAtRef = useRef<number | null>(null);
  const lastPlayheadLeftPxRef = useRef<number | null>(null);

  useEffect(() => {
    const playhead = playheadRef.current;
    if (!playhead) return;

    const hide = () => {
      playhead.style.opacity = "0";
      lastPlayheadLeftPxRef.current = null;
    };

    if (!hasPlaybackMetadata || showPlaybackModal) {
      hide();
      return;
    }

    if (!playing) {
      const state = getTabStore();
      const container = containerRef.current;
      if (!container || !state.currentlyPlayingMetadata) {
        hide();
        return;
      }

      parkPlayheadAtMetadataIndex({
        container,
        playhead,
        metadata: state.currentlyPlayingMetadata,
        metadataIndex: pausedChordIndex ?? state.currentChordIndex,
        sectionIndex,
        subSectionIndex,
        pausedOffset: true,
      });
      return;
    }

    let rafId: number | null = null;
    let lastPerfMs = performance.now();
    let displayedElapsedMs = 0;
    let audioHasStarted = false;

    const applyPlayhead = (leftPx: number, topPx: number, visible: boolean) => {
      playhead.style.opacity = visible ? "1" : "0";
      if (!visible) {
        lastPlayheadLeftPxRef.current = null;
        return;
      }
      lastPlayheadLeftPxRef.current = leftPx;
      playhead.style.transform = `translate3d(${leftPx}px, ${topPx}px, 0)`;
    };

    const tick = () => {
      rafId = null;
      const state = getTabStore();
      const container = containerRef.current;
      const {
        currentlyPlayingMetadata,
        currentChordIndex,
        playbackSpeed,
        audioContext,
        playbackStartedAtAudioTime,
        audioMetadata,
        looping,
      } = state;

      if (
        !container ||
        !currentlyPlayingMetadata ||
        currentlyPlayingMetadata.length === 0 ||
        !audioContext ||
        playbackStartedAtAudioTime === null ||
        !audioMetadata.playing ||
        audioMetadata.editingLoopRange ||
        state.showPlaybackModal
      ) {
        // Playback just paused mid-tick: park instead of hiding so the
        // playhead does not flash away before the paused effect runs.
        if (
          container &&
          currentlyPlayingMetadata &&
          currentlyPlayingMetadata.length > 0 &&
          !audioMetadata.editingLoopRange &&
          !state.showPlaybackModal
        ) {
          parkPlayheadAtMetadataIndex({
            container,
            playhead,
            metadata: currentlyPlayingMetadata,
            metadataIndex: currentChordIndex,
            sectionIndex,
            subSectionIndex,
            pausedOffset: true,
          });
        } else {
          hide();
        }
        return;
      }

      // Re-seed the time anchor whenever the strip clock is re-anchored.
      if (anchorPlaybackStartedAtRef.current !== playbackStartedAtAudioTime) {
        anchorPlaybackStartedAtRef.current = playbackStartedAtAudioTime;
        anchorChordIndexRef.current = currentChordIndex;
        displayedElapsedMs = 0;
        audioHasStarted =
          audioContext.currentTime >= playbackStartedAtAudioTime;
        lastPerfMs = performance.now();
        lastPlayheadLeftPxRef.current = null;
      }

      const metadata = currentlyPlayingMetadata;
      const cumulative = buildCumulativeTimesSeconds(metadata, playbackSpeed);
      const totalDurationSeconds = cumulative[metadata.length] ?? 0;
      const anchorIndex =
        ((anchorChordIndexRef.current % metadata.length) + metadata.length) %
        metadata.length;
      const anchorStartSeconds = cumulative[anchorIndex] ?? 0;

      const nowPerfMs = performance.now();
      const deltaMs = Math.min(
        MAX_FRAME_DELTA_MS,
        Math.max(0, nowPerfMs - lastPerfMs),
      );
      lastPerfMs = nowPerfMs;

      if (audioContext.state === "running") {
        const audioElapsedMs = Math.max(
          0,
          (audioContext.currentTime - playbackStartedAtAudioTime) * 1000,
        );

        if (!audioHasStarted) {
          if (audioContext.currentTime >= playbackStartedAtAudioTime) {
            audioHasStarted = true;
            displayedElapsedMs = audioElapsedMs;
          }
        } else {
          // Soft-slew displayed clock toward AudioContext (same idea as the
          // playback strip) so iOS quantization cannot snap the playhead.
          displayedElapsedMs += deltaMs;
          const slew = 1 - Math.exp(-deltaMs / 500);
          displayedElapsedMs += (audioElapsedMs - displayedElapsedMs) * slew;
        }
      } else {
        displayedElapsedMs += deltaMs;
      }

      if (!audioHasStarted) {
        // Park on the anchor chord until audio actually starts.
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: anchorIndex,
          sectionIndex,
          subSectionIndex,
          pausedOffset: false,
        });
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (totalDurationSeconds <= 0) {
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: currentChordIndex,
          sectionIndex,
          subSectionIndex,
          pausedOffset: false,
        });
        rafId = requestAnimationFrame(tick);
        return;
      }

      const absoluteSeconds =
        anchorStartSeconds + Math.max(0, displayedElapsedMs / 1000);
      const loopSeconds = looping
        ? normalizeModulo(absoluteSeconds, totalDurationSeconds)
        : Math.min(absoluteSeconds, totalDurationSeconds);

      // Locate the last metadata index whose start time is <= loopSeconds.
      let segmentIndex = 0;
      for (let index = 0; index < metadata.length; index++) {
        if ((cumulative[index] ?? 0) <= loopSeconds) {
          segmentIndex = index;
        } else {
          break;
        }
      }
      // Zero-duration measure lines share a timestamp with the following chord —
      // never treat the ornamental column as the active glide segment.
      if (!isPlayableMetadata(metadata[segmentIndex]!)) {
        let advanced = segmentIndex;
        while (
          advanced < metadata.length - 1 &&
          !isPlayableMetadata(metadata[advanced]!)
        ) {
          advanced += 1;
        }
        if (isPlayableMetadata(metadata[advanced]!)) {
          segmentIndex = advanced;
        }
      }

      const currMeta = metadata[segmentIndex];
      if (
        currMeta?.location.sectionIndex !== sectionIndex ||
        currMeta.location.subSectionIndex !== subSectionIndex
      ) {
        // Playback is in another subsection — keep this section's playhead
        // parked at its first playable column so it stays visible.
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: segmentIndex,
          sectionIndex,
          subSectionIndex,
          pausedOffset: false,
        });
        rafId = requestAnimationFrame(tick);
        return;
      }

      const currPos = measureChordPosition(
        container,
        sectionIndex,
        subSectionIndex,
        currMeta.location.chordIndex,
      );
      if (!currPos) {
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: segmentIndex,
          sectionIndex,
          subSectionIndex,
          pausedOffset: false,
        });
        rafId = requestAnimationFrame(tick);
        return;
      }

      const segmentStart = cumulative[segmentIndex] ?? 0;
      const segmentEnd = cumulative[segmentIndex + 1] ?? segmentStart;
      const segmentDuration = segmentEnd - segmentStart;
      const progress =
        segmentDuration > 0
          ? Math.min(
              1,
              Math.max(0, (loopSeconds - segmentStart) / segmentDuration),
            )
          : 0;

      const nextIndex = findNextGlideTargetIndex(
        metadata,
        segmentIndex,
        sectionIndex,
        subSectionIndex,
      );
      const nextPos =
        nextIndex !== null
          ? measureChordPosition(
              container,
              sectionIndex,
              subSectionIndex,
              metadata[nextIndex]!.location.chordIndex,
            )
          : null;

      let leftPx = currPos.x;
      const topPx = currPos.y;

      // Same-row glide only when the next target is forward in X. A leftward
      // target means a wrapped repeat — hold at the end, then snap next segment.
      const glidesForwardOnSameRow =
        nextPos != null &&
        Math.abs(nextPos.y - currPos.y) <= ROW_Y_SNAP_THRESHOLD_PX &&
        nextPos.x > currPos.x;

      if (glidesForwardOnSameRow && nextPos) {
        // Same wrapped row: glide from this column toward the next (measure
        // lines between them are included in the pixel distance).
        leftPx = currPos.x + (nextPos.x - currPos.x) * progress;
      } else if (
        nextPos &&
        Math.abs(nextPos.y - currPos.y) > ROW_Y_SNAP_THRESHOLD_PX
      ) {
        // Next chord is on a new row — finish this column, then snap Y on the
        // next segment (handled when segmentIndex advances).
        leftPx = currPos.x + (currPos.width / 2) * progress;
      } else {
        // Last chord before a repeat/section end, or wrap target: ease toward
        // the right edge, then snap when the next segment starts at the left.
        leftPx = currPos.x + (currPos.width / 2) * progress;
      }

      // Center the 2px line on leftPx. Large X discontinuities (repeat wraps)
      // snap in a single frame because we never lerp toward a leftward target
      // and there is no CSS transition on the playhead transform.
      applyPlayhead(leftPx - 1, topPx, true);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      // Do not hide on cleanup — the paused branch (or the next effect pass)
      // will re-park so the playhead stays visible across pause/play toggles.
    };
  }, [
    playing,
    pausedChordIndex,
    hasPlaybackMetadata,
    showPlaybackModal,
    sectionIndex,
    subSectionIndex,
    containerRef,
    playheadRef,
  ]);
}

export const EDITING_TAB_PLAYHEAD_HEIGHT_PX = EDITING_TAB_STAFF_LINE_HEIGHT_PX;
