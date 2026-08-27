import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect } from "@react-hookz/web";
import type Soundfont from "soundfont-player";
import type { ChordTrainerPreset } from "~/data/tools/chordTrainerPresets";
import type { ChordTrainerStrummingPattern } from "~/data/tools/chordTrainerStrummingPatterns";
import { getTabStore } from "~/stores/TabStore";
import {
  APPEND_CHUNK_SIZE,
  CHORD_ITEM_WIDTH,
  INITIAL_QUEUE_LENGTH,
  TOTAL_CHORD_WIDTH,
  appendQueue,
  buildInitialQueue,
  getCenteredChordIndex,
  getChordStartScrollX,
  type ChordTrainerQueueItem,
} from "~/utils/chordTrainerQueue";
import {
  playNoteColumn,
  stopActivePlaybackStrings,
} from "~/utils/playGeneratedAudioHelpers";
import { DEFAULT_TUNING, parse } from "~/utils/tunings";

const STANDARD_TUNING = parse(DEFAULT_TUNING);
const MIN_EDGE_OPACITY = 0.18;
const EMPTY_PLAYING_STRINGS: (
  | Soundfont.Player
  | AudioBufferSourceNode
  | undefined
)[] = [undefined, undefined, undefined, undefined, undefined, undefined];

interface UseChordTrainerPlaybackArgs {
  selectedChords: ChordTrainerPreset[];
  strummingPattern: ChordTrainerStrummingPattern;
  tempo: number;
  audioEnabled: boolean;
  /** Watched only so toggling color-coding pauses and parks on the current chord. */
  colorCoded: boolean;
}

function stopPlayingStrings(
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[],
) {
  const { audioContext } = getTabStore();
  stopActivePlaybackStrings(
    currentlyPlayingStrings,
    audioContext?.currentTime ?? 0,
  );
}

function playQueuedChord({
  chord,
  bpm,
  strum,
  audioEnabled,
  currentlyPlayingStrings,
}: {
  chord: ChordTrainerPreset;
  bpm: number;
  strum: string;
  audioEnabled: boolean;
  currentlyPlayingStrings: (
    | Soundfont.Player
    | AudioBufferSourceNode
    | undefined
  )[];
}) {
  if (!strum || !audioEnabled) return;

  const { audioContext, masterVolumeGainNode, currentInstrument } =
    getTabStore();

  if (!audioContext || !masterVolumeGainNode || !currentInstrument) return;

  void playNoteColumn({
    tuning: STANDARD_TUNING,
    capo: 0,
    bpm: bpm * 1.4,
    currColumn: ["", ...chord.frets, strum, "quarter", `${bpm * 1.4}`],
    audioContext,
    masterVolumeGainNode,
    currentInstrument,
    currentlyPlayingStrings,
  }).catch((error: unknown) => {
    console.error("Unable to play chord trainer audio:", error);
  });
}

function useChordTrainerPlayback({
  selectedChords,
  strummingPattern,
  tempo,
  audioEnabled,
  colorCoded,
}: UseChordTrainerPlaybackArgs) {
  // Remaining refs are the imperative playback engine: DOM nodes, rAF, and
  // the scroll/queue values that rAF mutates between React commits. Config
  // is not mirrored into refs because changing it pauses and parks on the
  // current chord.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const currentlyPlayingStringsRef = useRef<
    (Soundfont.Player | AudioBufferSourceNode | undefined)[]
  >(EMPTY_PLAYING_STRINGS.slice());
  const queueRef = useRef<ChordTrainerQueueItem[]>([]);
  const scrollXRef = useRef(0);
  const stageWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastTriggeredIndexRef = useRef(-1);
  const queueMutationPendingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const currentItemIndexRef = useRef(0);

  const [queue, setQueue] = useState<ChordTrainerQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const selectedChordKey = selectedChords.map((chord) => chord.id).join(",");
  const patternId = strummingPattern.id;
  const isPatternVisualizer = strummingPattern.showIcons;

  const commitItemIndex = useCallback((index: number) => {
    if (currentItemIndexRef.current === index) return;
    currentItemIndexRef.current = index;
    setCurrentItemIndex(index);
  }, []);

  const updateStreamStyles = useCallback((scrollX: number) => {
    const stageElement = stageRef.current;
    const sliderElement = sliderContainerRef.current;
    if (!stageElement || !sliderElement) return;

    const stageWidth = stageWidthRef.current || stageElement.clientWidth;
    if (!stageWidth) return;

    const baseOffset = stageWidth / 2 - CHORD_ITEM_WIDTH / 2;
    const centerX = stageWidth / 2;
    const maxDistance = centerX + CHORD_ITEM_WIDTH / 2;

    sliderElement.style.transform = `translate3d(${(baseOffset - scrollX).toFixed(3)}px, 0, 0)`;

    const children = Array.from(sliderElement.children) as HTMLDivElement[];

    children.forEach((child, index) => {
      const itemCenter =
        baseOffset - scrollX + index * TOTAL_CHORD_WIDTH + CHORD_ITEM_WIDTH / 2;
      const distanceRatio = Math.min(
        Math.abs(itemCenter - centerX) / maxDistance,
        1,
      );
      const opacity = Math.max(1 - distanceRatio * 0.82, MIN_EDGE_OPACITY);
      const blur = distanceRatio > 0.75 ? (distanceRatio - 0.75) * 4 : 0;

      child.style.opacity = opacity.toFixed(3);
      child.style.filter = `blur(${blur.toFixed(2)}px)`;
      child.style.zIndex = `${Math.round((1 - distanceRatio) * 100)}`;
    });
  }, []);

  const stopAnimationFrame = useCallback(() => {
    if (rafRef.current === null) return;

    window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const pausePlayback = useCallback(() => {
    isPlayingRef.current = false;
    stopAnimationFrame();
    lastFrameTimeRef.current = null;

    const currentIndex = getCenteredChordIndex(scrollXRef.current);
    scrollXRef.current = getChordStartScrollX(currentIndex);
    lastTriggeredIndexRef.current = currentIndex - 1;
    commitItemIndex(currentIndex);
    if (!isPatternVisualizer) {
      updateStreamStyles(scrollXRef.current);
    }
    stopPlayingStrings(currentlyPlayingStringsRef.current);
    setIsPlaying(false);
  }, [
    commitItemIndex,
    isPatternVisualizer,
    stopAnimationFrame,
    updateStreamStyles,
  ]);

  const resetQueue = useCallback(() => {
    scrollXRef.current = 0;
    lastFrameTimeRef.current = null;
    lastTriggeredIndexRef.current = -1;
    currentItemIndexRef.current = 0;
    queueMutationPendingRef.current = false;
    queueRef.current = [];
    setQueue([]);
    setCurrentItemIndex(0);
    if (!isPatternVisualizer) {
      updateStreamStyles(0);
    }
  }, [isPatternVisualizer, updateStreamStyles]);

  const rebuildQueue = useCallback(
    (chords: ChordTrainerPreset[], pattern: ChordTrainerStrummingPattern) => {
      scrollXRef.current = 0;
      lastFrameTimeRef.current = null;
      lastTriggeredIndexRef.current = -1;
      currentItemIndexRef.current = 0;
      queueMutationPendingRef.current = false;

      const nextQueue = buildInitialQueue(chords, pattern);
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      setCurrentItemIndex(0);
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    queueRef.current = queue;
    queueMutationPendingRef.current = false;
    if (!isPatternVisualizer) {
      updateStreamStyles(scrollXRef.current);
    }
  }, [isPatternVisualizer, queue, updateStreamStyles]);

  useEffect(() => {
    pausePlayback();
  }, [
    audioEnabled,
    colorCoded,
    pausePlayback,
    patternId,
    selectedChordKey,
    tempo,
  ]);

  const prevPatternIdRef = useRef(patternId);

  useEffect(() => {
    const patternChanged = prevPatternIdRef.current !== patternId;
    prevPatternIdRef.current = patternId;

    if (selectedChords.length === 0) {
      resetQueue();
      return;
    }

    if (queueRef.current.length === 0 || patternChanged) {
      rebuildQueue(selectedChords, strummingPattern);
    }
  }, [patternId, rebuildQueue, resetQueue, selectedChordKey, selectedChords, strummingPattern]);

  useEffect(() => {
    if (isPatternVisualizer) return;

    const stageElement = stageRef.current;
    if (!stageElement || typeof ResizeObserver === "undefined") return;

    stageWidthRef.current = stageElement.clientWidth;
    updateStreamStyles(scrollXRef.current);

    const observer = new ResizeObserver(([entry]) => {
      stageWidthRef.current =
        entry?.contentRect.width ?? stageElement.clientWidth;
      updateStreamStyles(scrollXRef.current);
    });

    observer.observe(stageElement);

    return () => observer.disconnect();
  }, [isPatternVisualizer, updateStreamStyles]);

  useEffect(() => {
    if (!isPlaying || !isPlayingRef.current || selectedChords.length === 0) {
      stopAnimationFrame();
      lastFrameTimeRef.current = null;
      return;
    }

    const tick = (time: number) => {
      if (!isPlayingRef.current) return;

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = time;
      }

      const deltaTime = Math.min(time - lastFrameTimeRef.current, 32);
      lastFrameTimeRef.current = time;

      const msPerChord = (60 / tempo) * 1000;
      const velocity = TOTAL_CHORD_WIDTH / msPerChord;
      scrollXRef.current += velocity * deltaTime;

      if (!isPatternVisualizer) {
        updateStreamStyles(scrollXRef.current);
      }

      let currentCenterIndex = getCenteredChordIndex(scrollXRef.current);

      if (currentCenterIndex > lastTriggeredIndexRef.current) {
        for (
          let index = lastTriggeredIndexRef.current + 1;
          index <= currentCenterIndex;
          index++
        ) {
          const targetChord = queueRef.current[index];
          if (targetChord) {
            playQueuedChord({
              chord: targetChord.chord,
              bpm: tempo,
              strum: targetChord.strum,
              audioEnabled,
              currentlyPlayingStrings: currentlyPlayingStringsRef.current,
            });
          }
        }

        lastTriggeredIndexRef.current = currentCenterIndex;
      }

      if (currentCenterIndex + 18 >= queueRef.current.length) {
        if (
          !queueMutationPendingRef.current &&
          selectedChords.length > 0
        ) {
          queueMutationPendingRef.current = true;
          setQueue((currentQueue) => {
            const nextQueue = appendQueue(
              currentQueue,
              selectedChords,
              strummingPattern,
              APPEND_CHUNK_SIZE,
            );
            queueRef.current = nextQueue;
            return nextQueue;
          });
        }
      }

      if (
        !queueMutationPendingRef.current &&
        currentCenterIndex > 14 &&
        queueRef.current.length > INITIAL_QUEUE_LENGTH + APPEND_CHUNK_SIZE
      ) {
        const trimCount = currentCenterIndex - 8;
        if (trimCount > 0) {
          queueMutationPendingRef.current = true;
          scrollXRef.current -= trimCount * TOTAL_CHORD_WIDTH;
          lastTriggeredIndexRef.current -= trimCount;
          currentCenterIndex -= trimCount;

          setQueue((currentQueue) => {
            const trimmedQueue = currentQueue.slice(trimCount);
            const nextQueue = appendQueue(
              trimmedQueue,
              selectedChords,
              strummingPattern,
              trimCount,
            );
            queueRef.current = nextQueue;
            return nextQueue;
          });
        }
      }

      commitItemIndex(currentCenterIndex);

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      stopAnimationFrame();
    };
  }, [
    audioEnabled,
    commitItemIndex,
    isPatternVisualizer,
    isPlaying,
    selectedChords,
    stopAnimationFrame,
    strummingPattern,
    tempo,
    updateStreamStyles,
  ]);

  useEffect(() => {
    const currentlyPlayingStrings = currentlyPlayingStringsRef.current;

    return () => {
      isPlayingRef.current = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      stopPlayingStrings(currentlyPlayingStrings);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      pausePlayback();
      return;
    }

    if (queueRef.current.length === 0 || selectedChords.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [pausePlayback, selectedChords.length]);

  return {
    stageRef,
    sliderContainerRef,
    queue,
    currentItemIndex,
    isPlaying,
    pausePlayback,
    togglePlayback,
  };
}

export default useChordTrainerPlayback;
