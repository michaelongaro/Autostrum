// Dev-only harness page for verifying playback chord virtualization.
// Exercised by scripts/verifyPlaybackChordVirtualization.mjs; returns 404 in
// production builds.
//
// Query params:
// - fixture=long | realistic  (default: long)
// - repState=split | unified  (default: split)
// - pausedAtLoop=1            keeps playback paused (default)
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlaybackModal, {
  type PlaybackHarnessSnapshot,
  type PlaybackModalDevSeed,
} from "~/components/Tab/Playback/PlaybackModal";
import {
  compileFullTab,
  generateDefaultSectionProgression,
} from "~/utils/chordCompilationHelpers";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import {
  useTabStore,
  type Section,
  type TabMeasureLine,
  type TabNote,
} from "~/stores/TabStore";

declare global {
  interface Window {
    __playbackHarness?: PlaybackHarnessSnapshot & {
      mountedChordCount: number;
      stripTransform: string | null;
      chordBoundingBoxes: Array<{
        index: number;
        left: number;
        right: number;
      }>;
      refresh: () => PlaybackHarnessSnapshot | null;
    };
  }
}

const HARNESS_VIEWPORT_WIDTH = 1024;

function note(id: string): TabNote {
  return {
    type: "note",
    palmMute: "",
    firstString: "",
    secondString: "3",
    thirdString: "2",
    fourthString: "0",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter",
    id,
  };
}

function measureLine(id: string): TabMeasureLine {
  return {
    type: "measureLine",
    isInPalmMuteSection: false,
    bpmAfterLine: null,
    id,
  };
}

function makeColumns(prefix: string, measures: number) {
  const columns: (TabNote | TabMeasureLine)[] = [];
  for (let m = 0; m < measures; m++) {
    for (let n = 0; n < 8; n++) {
      columns.push(note(`${prefix}-n-${m}-${n}`));
    }
    if (m < measures - 1) {
      columns.push(measureLine(`${prefix}-ml-${m}`));
    }
  }
  return columns;
}

function makeTabSection(id: string, measures: number) {
  return {
    id,
    type: "tab" as const,
    bpm: 120,
    baseNoteLength: "quarter" as const,
    repetitions: 1,
    data: makeColumns(id, measures),
  };
}

function buildFixture(fixture: string): Section[] {
  if (fixture === "realistic") {
    return Array.from({ length: 10 }, (_, sectionIndex) => ({
      id: `section-${sectionIndex}`,
      title: `Section ${sectionIndex + 1}`,
      data: [
        makeTabSection(`sub-${sectionIndex}-0`, 8),
        makeTabSection(`sub-${sectionIndex}-1`, 8),
      ],
    }));
  }

  return Array.from({ length: 8 }, (_, sectionIndex) => ({
    id: `long-section-${sectionIndex}`,
    title: `Long section ${sectionIndex + 1}`,
    data: [
      makeTabSection(`long-sub-${sectionIndex}-0`, 16),
      makeTabSection(`long-sub-${sectionIndex}-1`, 16),
    ],
  }));
}

function computeVirtualizationStartIndex(
  scrollPositions: number[],
  chordWidths: number[],
  viewportWidth: number,
) {
  const lastChordPosition = scrollPositions[scrollPositions.length - 1] ?? 0;
  const finalChordWidth = chordWidths[chordWidths.length - 1] ?? 0;

  for (let i = scrollPositions.length - 1; i >= 0; i--) {
    const currentPosition = scrollPositions[i] ?? 0;
    if (
      currentPosition + viewportWidth <=
      lastChordPosition + finalChordWidth
    ) {
      return i;
    }
  }

  return 0;
}

function buildSplitRepetitions(
  length: number,
  virtualizationStartIndex: number,
): number[] {
  const repetitions = Array.from({ length }, () => 1);
  for (let i = 0; i < virtualizationStartIndex; i++) {
    repetitions[i] = 2;
  }
  return repetitions;
}

export default function DevPlaybackHarness() {
  const { query, isReady } = useRouter();
  const [harnessSnapshot, setHarnessSnapshot] =
    useState<PlaybackHarnessSnapshot | null>(null);

  const {
    setId,
    setTabData,
    setBpm,
    setExpandedTabData,
    setPlaybackMetadata,
    setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata,
    setVisiblePlaybackContainerWidth,
    setShowPlaybackModal,
    expandedTabData,
    playbackSpeed,
    loopDelay,
    chords,
    tabData,
  } = useTabStore((state) => ({
    setId: state.setId,
    setTabData: state.setTabData,
    setBpm: state.setBpm,
    setExpandedTabData: state.setExpandedTabData,
    setPlaybackMetadata: state.setPlaybackMetadata,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata: state.atomicallyUpdateAudioMetadata,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    setShowPlaybackModal: state.setShowPlaybackModal,
    expandedTabData: state.expandedTabData,
    playbackSpeed: state.playbackSpeed,
    loopDelay: state.loopDelay,
    chords: state.chords,
    tabData: state.tabData,
  }));

  const fixture = typeof query.fixture === "string" ? query.fixture : "long";
  const repState = typeof query.repState === "string" ? query.repState : "split";
  const fixtureTabData = useMemo(() => buildFixture(fixture), [fixture]);

  const ready = tabData[0]?.id === fixtureTabData[0]?.id && expandedTabData !== null;

  useEffect(() => {
    if (!isReady) return;

    setId(1);
    setBpm(120);
    setVisiblePlaybackContainerWidth(HARNESS_VIEWPORT_WIDTH);
    setShowPlaybackModal(true);
    setTabData((draft) => {
      draft.splice(0, draft.length, ...fixtureTabData);
    });

    const sectionProgression = generateDefaultSectionProgression(fixtureTabData);

    compileFullTab({
      tabData: fixtureTabData,
      sectionProgression,
      chords,
      baselineBpm: 120,
      playbackSpeed,
      setCurrentlyPlayingMetadata,
      startLoopIndex: 0,
      endLoopIndex: -1,
      atomicallyUpdateAudioMetadata,
      loopDelay,
    });

    const expanded = expandFullTab({
      tabData: fixtureTabData,
      location: null,
      sectionProgression,
      chords,
      baselineBpm: 120,
      playbackSpeed,
      setPlaybackMetadata,
      startLoopIndex: 0,
      endLoopIndex: -1,
      visiblePlaybackContainerWidth: HARNESS_VIEWPORT_WIDTH,
      loopDelay,
    });

    setExpandedTabData(expanded.chords);
  }, [
    isReady,
    fixtureTabData,
    setId,
    setBpm,
    setTabData,
    setExpandedTabData,
    setPlaybackMetadata,
    setCurrentlyPlayingMetadata,
    atomicallyUpdateAudioMetadata,
    setVisiblePlaybackContainerWidth,
    setShowPlaybackModal,
    chords,
    playbackSpeed,
    loopDelay,
  ]);

  const devSeed = useMemo<PlaybackModalDevSeed | undefined>(() => {
    if (!expandedTabData || expandedTabData.length === 0) return undefined;

    const scrollPositions: number[] = [];
    const chordWidths: number[] = [];
    let offsetLeft = 0;

    for (let i = 0; i < expandedTabData.length; i++) {
      const chord = expandedTabData[i];
      const isMeasureLine =
        chord?.type === "tab" && chord?.data.chordData.includes("|");
      const isSpacerChord =
        (chord?.type === "tab" && chord?.data.chordData[0] === "-1") ||
        (chord?.type === "strum" && chord?.data.strumIndex === -1);
      const chordWidth = isMeasureLine
        ? 2
        : isSpacerChord
          ? 16
          : chord?.type === "tab"
            ? 34
            : 40;

      scrollPositions[i] = offsetLeft;
      chordWidths[i] = chordWidth;
      offsetLeft += chordWidth;
    }

    const virtualizationStartIndex = computeVirtualizationStartIndex(
      scrollPositions,
      chordWidths,
      HARNESS_VIEWPORT_WIDTH,
    );

    const chordIndex = Number(query.chordIndex ?? 0);
    const safeChordIndex = Number.isFinite(chordIndex)
      ? Math.min(Math.max(0, chordIndex), expandedTabData.length - 1)
      : 0;

    const repetitions =
      repState === "split"
        ? buildSplitRepetitions(expandedTabData.length, virtualizationStartIndex)
        : Array.from({ length: expandedTabData.length }, () => 1);

    return {
      currentChordIndex: safeChordIndex,
      chordRepetitions: repetitions,
    };
  }, [expandedTabData, repState, query.chordIndex]);

  const handleDevStateSnapshot = useCallback((snapshot: PlaybackHarnessSnapshot) => {
    setHarnessSnapshot(snapshot);
  }, []);

  useEffect(() => {
    if (!ready || !harnessSnapshot) return;

    const refresh = () => harnessSnapshot;

    window.__playbackHarness = {
      ...harnessSnapshot,
      mountedChordCount: harnessSnapshot.mountedChordIndices.length,
      stripTransform:
        document
          .querySelector<HTMLElement>("[data-playback-strip]")
          ?.style.transform ?? null,
      chordBoundingBoxes: harnessSnapshot.mountedChordIndices.map((index) => {
        const element = document.querySelector<HTMLElement>(
          `[data-testid="playback-chord-${index}"]`,
        );
        const rect = element?.getBoundingClientRect();
        return {
          index,
          left: rect?.left ?? -1,
          right: rect?.right ?? -1,
        };
      }),
      refresh,
    };
  }, [ready, harnessSnapshot]);

  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <div id="devPlaybackHarness" data-ready={ready} className="h-dvh w-full">
      {ready && (
        <PlaybackModal
          devSeed={devSeed}
          onDevStateSnapshot={handleDevStateSnapshot}
        />
      )}
    </div>
  );
}
