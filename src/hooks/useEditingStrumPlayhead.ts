import { useEffect, useRef, type RefObject } from "react";
import { getTabStore, useTabStore, type Metadata } from "~/stores/TabStore";

/** Rows differ by more than a strum column; anything above this is a wrap. */
const ROW_Y_SNAP_THRESHOLD_PX = 40;

const MAX_FRAME_DELTA_MS = 100;

/**
 * When paused, park the 2px playhead this far left of the column center so the
 * strum icon / beat label stay readable beside the line.
 */
const PAUSED_PLAYHEAD_LEFT_OF_CENTER_PX = 10;

interface StrumLayoutPos {
  /** Horizontal center of the strum column, relative to the pattern container. */
  x: number;
  /** Top of the strum-icon → beat-label span, relative to the pattern container. */
  y: number;
  /** Pixel height from strum icon top through beat label bottom. */
  height: number;
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

function getStrumElementId(
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
  chordIndex: number,
) {
  return `section${sectionIndex}-subSection${subSectionIndex}-chordSequence${chordSequenceIndex}-chord${chordIndex}`;
}

function matchesChordSequenceLocation(
  entry: Metadata,
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
) {
  return (
    entry.location.sectionIndex === sectionIndex &&
    entry.location.subSectionIndex === subSectionIndex &&
    entry.location.chordSequenceIndex === chordSequenceIndex
  );
}

/**
 * Measure the playhead span from the strum icon through the beat indicator.
 * Column width comes from the full strum cell (includes variable chord Selects).
 */
function measureStrumPosition(
  container: HTMLElement,
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
  chordIndex: number,
): StrumLayoutPos | null {
  const element = document.getElementById(
    getStrumElementId(
      sectionIndex,
      subSectionIndex,
      chordSequenceIndex,
      chordIndex,
    ),
  );
  if (!element) return null;

  const spanStart = element.querySelector("[data-strum-playhead-span-start]");
  const spanEnd = element.querySelector("[data-strum-playhead-span-end]");
  if (!spanStart || !spanEnd) return null;

  const containerRect = container.getBoundingClientRect();
  const columnRect = element.getBoundingClientRect();
  const startRect = spanStart.getBoundingClientRect();
  const endRect = spanEnd.getBoundingClientRect();

  const top = startRect.top - containerRect.top;
  const bottom = endRect.bottom - containerRect.top;
  const height = Math.max(1, bottom - top);

  return {
    x: columnRect.left - containerRect.left + columnRect.width / 2,
    y: top,
    height,
    width: columnRect.width,
  };
}

/**
 * Next same chord-sequence target for gliding. Skips zero-duration ornamentals.
 * Returns null on sequence repeats so the playhead holds at the end, then snaps.
 */
function findNextGlideTargetIndex(
  metadata: Metadata[],
  fromIndex: number,
  sectionIndex: number,
  subSectionIndex: number,
  chordSequenceIndex: number,
): number | null {
  const fromMeta = metadata[fromIndex];
  if (!fromMeta) return null;

  for (let index = fromIndex + 1; index < metadata.length; index++) {
    const entry = metadata[index];
    if (!entry) continue;
    if (
      !matchesChordSequenceLocation(
        entry,
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
      )
    ) {
      continue;
    }

    if (!isPlayableMetadata(entry)) {
      continue;
    }

    // Same DOM columns replayed for a sequence repeat: snap, don't glide back.
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
  chordSequenceIndex,
  pausedOffset,
}: {
  container: HTMLElement;
  playhead: HTMLDivElement;
  metadata: Metadata[];
  metadataIndex: number;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  pausedOffset: boolean;
}) {
  const applyPos = (pos: StrumLayoutPos) => {
    playhead.style.opacity = "1";
    playhead.style.height = `${pos.height}px`;
    const left = pausedOffset
      ? pos.x - 1 - PAUSED_PLAYHEAD_LEFT_OF_CENTER_PX
      : pos.x - 1;
    playhead.style.transform = `translate3d(${left}px, ${pos.y}px, 0)`;
  };

  const currMeta = metadata[metadataIndex];
  if (
    !currMeta ||
    !matchesChordSequenceLocation(
      currMeta,
      sectionIndex,
      subSectionIndex,
      chordSequenceIndex,
    )
  ) {
    playhead.style.opacity = "0";
    return;
  }

  const pos = measureStrumPosition(
    container,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
    currMeta.location.chordIndex,
  );
  if (!pos) {
    playhead.style.opacity = "0";
    return;
  }

  applyPos(pos);
}

/**
 * Imperatively animates the editing chord-sequence playhead so StrummingPattern
 * does not subscribe to currentChordIndex every tick.
 *
 * Height spans the strum icon through the beat indicator and is remeasured each
 * frame so variable chord-name Select widths (and any layout shifts) stay aligned.
 */
export function useEditingStrumPlayhead({
  enabled,
  sectionIndex,
  subSectionIndex,
  chordSequenceIndex,
  containerRef,
  playheadRef,
}: {
  enabled: boolean;
  sectionIndex: number;
  subSectionIndex: number;
  chordSequenceIndex: number;
  containerRef: RefObject<HTMLElement | null>;
  playheadRef: RefObject<HTMLDivElement | null>;
}) {
  const playing = useTabStore((state) => state.audioMetadata.playing);
  const showPlaybackModal = useTabStore((state) => state.showPlaybackModal);
  const editingLoopRange = useTabStore(
    (state) => state.audioMetadata.editingLoopRange,
  );
  const pausedChordIndex = useTabStore((state) =>
    state.audioMetadata.playing ? null : state.currentChordIndex,
  );
  const hasPlaybackMetadata = useTabStore(
    (state) => state.currentlyPlayingMetadata != null,
  );

  const anchorChordIndexRef = useRef(0);
  const anchorPlaybackStartedAtRef = useRef<number | null>(null);
  const lastPlayheadLeftPxRef = useRef<number | null>(null);

  useEffect(() => {
    const playhead = playheadRef.current;
    if (!playhead || !enabled) return;

    const hide = () => {
      playhead.style.opacity = "0";
      lastPlayheadLeftPxRef.current = null;
    };

    if (!hasPlaybackMetadata) {
      hide();
      return;
    }

    if (showPlaybackModal || editingLoopRange) {
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
        chordSequenceIndex,
        pausedOffset: true,
      });
      return;
    }

    let rafId: number | null = null;
    let lastPerfMs = performance.now();
    let displayedElapsedMs = 0;
    let audioHasStarted = false;

    const applyPlayhead = (
      leftPx: number,
      topPx: number,
      heightPx: number,
      visible: boolean,
    ) => {
      playhead.style.opacity = visible ? "1" : "0";
      if (!visible) {
        lastPlayheadLeftPxRef.current = null;
        return;
      }
      lastPlayheadLeftPxRef.current = leftPx;
      playhead.style.height = `${heightPx}px`;
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
            chordSequenceIndex,
            pausedOffset: true,
          });
        } else {
          hide();
        }
        return;
      }

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
          displayedElapsedMs += deltaMs;
          const slew = 1 - Math.exp(-deltaMs / 500);
          displayedElapsedMs += (audioElapsedMs - displayedElapsedMs) * slew;
        }
      } else {
        displayedElapsedMs += deltaMs;
      }

      if (!audioHasStarted) {
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: anchorIndex,
          sectionIndex,
          subSectionIndex,
          chordSequenceIndex,
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
          chordSequenceIndex,
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

      let segmentIndex = 0;
      for (let index = 0; index < metadata.length; index++) {
        if ((cumulative[index] ?? 0) <= loopSeconds) {
          segmentIndex = index;
        } else {
          break;
        }
      }
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
        !currMeta ||
        !matchesChordSequenceLocation(
          currMeta,
          sectionIndex,
          subSectionIndex,
          chordSequenceIndex,
        )
      ) {
        parkPlayheadAtMetadataIndex({
          container,
          playhead,
          metadata,
          metadataIndex: segmentIndex,
          sectionIndex,
          subSectionIndex,
          chordSequenceIndex,
          pausedOffset: false,
        });
        rafId = requestAnimationFrame(tick);
        return;
      }

      const currPos = measureStrumPosition(
        container,
        sectionIndex,
        subSectionIndex,
        chordSequenceIndex,
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
          chordSequenceIndex,
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
        chordSequenceIndex,
      );
      const nextPos =
        nextIndex !== null
          ? measureStrumPosition(
              container,
              sectionIndex,
              subSectionIndex,
              chordSequenceIndex,
              metadata[nextIndex]!.location.chordIndex,
            )
          : null;

      let leftPx = currPos.x;
      const topPx = currPos.y;
      const heightPx = currPos.height;

      const glidesForwardOnSameRow =
        nextPos != null &&
        Math.abs(nextPos.y - currPos.y) <= ROW_Y_SNAP_THRESHOLD_PX &&
        nextPos.x > currPos.x;

      if (glidesForwardOnSameRow && nextPos) {
        // Column centers already reflect variable Select widths.
        leftPx = currPos.x + (nextPos.x - currPos.x) * progress;
      } else if (
        nextPos &&
        Math.abs(nextPos.y - currPos.y) > ROW_Y_SNAP_THRESHOLD_PX
      ) {
        leftPx = currPos.x + (currPos.width / 2) * progress;
      } else {
        leftPx = currPos.x + (currPos.width / 2) * progress;
      }

      applyPlayhead(leftPx - 1, topPx, heightPx, true);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [
    enabled,
    playing,
    pausedChordIndex,
    hasPlaybackMetadata,
    showPlaybackModal,
    editingLoopRange,
    sectionIndex,
    subSectionIndex,
    chordSequenceIndex,
    containerRef,
    playheadRef,
  ]);
}
