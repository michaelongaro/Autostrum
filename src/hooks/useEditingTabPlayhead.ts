import { useEffect, useRef, type RefObject } from "react";
import {
  getTabStore,
  useTabStore,
  type Metadata,
} from "~/stores/TabStore";
import {
  EDITING_TAB_PALM_MUTE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_HEIGHT_PX,
  EDITING_TAB_STAFF_LINE_INSET_PX,
} from "~/utils/editingTabGeometry";

/** Rows differ by ~column height + gap-y-4; anything above this is a wrap. */
const ROW_Y_SNAP_THRESHOLD_PX = 40;

const MAX_FRAME_DELTA_MS = 100;

interface ChordLayoutPos {
  /** Horizontal center of the column, relative to the staff container. */
  x: number;
  /** Top of the first–sixth string span, relative to the staff container. */
  y: number;
  width: number;
}

function getChordDurationSeconds(
  metadata: Metadata,
  playbackSpeed: number,
): number {
  if (metadata.type !== "tab" && metadata.type !== "strum") {
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

function findNextSameSubsectionIndex(
  metadata: Metadata[],
  fromIndex: number,
  sectionIndex: number,
  subSectionIndex: number,
): number | null {
  for (let index = fromIndex + 1; index < metadata.length; index++) {
    const entry = metadata[index];
    if (!entry) continue;
    if (
      entry.location.sectionIndex === sectionIndex &&
      entry.location.subSectionIndex === subSectionIndex
    ) {
      return index;
    }
  }
  return null;
}

/**
 * Imperatively animates the editing-tab playhead so TabSection itself does not
 * subscribe to currentChordIndex (avoids DndContext invalidation every tick).
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
  const editingLoopRange = useTabStore(
    (state) => state.audioMetadata.editingLoopRange,
  );

  // Capture the metadata index that playbackStartedAtAudioTime corresponds to.
  const anchorChordIndexRef = useRef(0);
  const anchorPlaybackStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const playhead = playheadRef.current;
    if (!playhead) return;

    const hide = () => {
      playhead.style.opacity = "0";
    };

    if (!playing || showPlaybackModal || editingLoopRange) {
      hide();
      return;
    }

    let rafId: number | null = null;
    let lastPerfMs = performance.now();
    let displayedElapsedMs = 0;
    let audioHasStarted = false;

    const applyPlayhead = (leftPx: number, topPx: number, visible: boolean) => {
      playhead.style.opacity = visible ? "1" : "0";
      if (!visible) return;
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
        hide();
        return;
      }

      // Re-seed the time anchor whenever the strip clock is re-anchored.
      if (anchorPlaybackStartedAtRef.current !== playbackStartedAtAudioTime) {
        anchorPlaybackStartedAtRef.current = playbackStartedAtAudioTime;
        anchorChordIndexRef.current = currentChordIndex;
        displayedElapsedMs = 0;
        audioHasStarted = audioContext.currentTime >= playbackStartedAtAudioTime;
        lastPerfMs = performance.now();
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
        const anchorMeta = metadata[anchorIndex];
        if (
          anchorMeta &&
          anchorMeta.location.sectionIndex === sectionIndex &&
          anchorMeta.location.subSectionIndex === subSectionIndex
        ) {
          const pos = measureChordPosition(
            container,
            sectionIndex,
            subSectionIndex,
            anchorMeta.location.chordIndex,
          );
          if (pos) {
            applyPlayhead(pos.x - 1, pos.y, true);
          } else {
            hide();
          }
        } else {
          hide();
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (totalDurationSeconds <= 0) {
        hide();
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

      const currMeta = metadata[segmentIndex];
      if (
        !currMeta ||
        currMeta.location.sectionIndex !== sectionIndex ||
        currMeta.location.subSectionIndex !== subSectionIndex
      ) {
        hide();
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
        hide();
        rafId = requestAnimationFrame(tick);
        return;
      }

      const segmentStart = cumulative[segmentIndex] ?? 0;
      const segmentEnd = cumulative[segmentIndex + 1] ?? segmentStart;
      const segmentDuration = segmentEnd - segmentStart;
      const progress =
        segmentDuration > 0
          ? Math.min(1, Math.max(0, (loopSeconds - segmentStart) / segmentDuration))
          : 0;

      const nextIndex = findNextSameSubsectionIndex(
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

      if (nextPos && Math.abs(nextPos.y - currPos.y) <= ROW_Y_SNAP_THRESHOLD_PX) {
        // Same wrapped row: glide from this column toward the next.
        leftPx = currPos.x + (nextPos.x - currPos.x) * progress;
      } else if (nextPos) {
        // Next chord is on a new row — finish this column, then snap Y on the
        // next segment (handled when segmentIndex advances).
        leftPx = currPos.x + (currPos.width / 2) * progress;
      } else {
        // Last chord in this subsection: ease toward the right edge.
        leftPx = currPos.x + (currPos.width / 2) * progress;
      }

      // Center the 2px line on leftPx.
      applyPlayhead(leftPx - 1, topPx, true);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      hide();
    };
  }, [
    playing,
    showPlaybackModal,
    editingLoopRange,
    sectionIndex,
    subSectionIndex,
    containerRef,
    playheadRef,
  ]);
}

export const EDITING_TAB_PLAYHEAD_HEIGHT_PX = EDITING_TAB_STAFF_LINE_HEIGHT_PX;
