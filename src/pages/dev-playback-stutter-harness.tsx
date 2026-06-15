// Dev-only harness for playback modal stutter diagnostics and A/B flags.
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import PlaybackModal from "~/components/Tab/Playback/PlaybackModal";
import { useTabStore } from "~/stores/TabStore";
import { expandFullTab } from "~/utils/playbackChordCompilationHelpers";
import { generateDefaultSectionProgression } from "~/utils/chordCompilationHelpers";
import { getPlaybackStutterDevFlags } from "~/utils/playbackStutterDevFlags";
import { startPlaybackStutterDiagnostics } from "~/utils/playbackStutterDiagnostics";

function note(id: string) {
  return {
    type: "note" as const,
    palmMute: "",
    firstString: "",
    secondString: "3",
    thirdString: "2",
    fourthString: "0",
    fifthString: "",
    sixthString: "",
    chordEffects: "",
    noteLength: "quarter" as const,
    id,
  };
}

function measureLine(id: string) {
  return {
    type: "measureLine" as const,
    isInPalmMuteSection: false,
    bpmAfterLine: null,
    id,
  };
}

function makeColumns(prefix: string, measures: number) {
  const columns: ReturnType<typeof note>[] = [];
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

function buildFixture(fixture: string) {
  if (fixture === "huge") {
    return [
      {
        id: "huge-section",
        title: "Huge section",
        data: [makeTabSection("huge-sub", 32)],
      },
    ];
  }

  return Array.from({ length: 4 }, (_, sectionIndex) => ({
    id: `section-${sectionIndex}`,
    title: `Section ${sectionIndex + 1}`,
    data: [
      makeTabSection(`sub-${sectionIndex}-0`, 8),
      makeTabSection(`sub-${sectionIndex}-1`, 8),
    ],
  }));
}

const DEV_FLAG_DOCS = [
  {
    param: "playbackStutterDebug=1",
    description: "Performance marks, long-task observer, console summaries",
  },
  {
    param: "playbackReactProfiler=1",
    description: "React.Profiler around PlaybackChordStrip",
  },
  {
    param: "playbackSkipInlineTransform=0",
    description: "Restore inline transform during play (pre-fix behavior)",
  },
  {
    param: "playbackDisableVirtualization=1",
    description: "Render every chord instead of visible window",
  },
  {
    param: "playbackFreezeRepetitions=1",
    description: "Skip chordRepetitions batch updates at loop",
  },
  {
    param: "playbackDisableHighlights=1",
    description: "Disable 75ms highlight color transitions",
  },
  {
    param: "playbackDisableSliderTransitions=1",
    description: "Disable progress slider CSS transitions while playing",
  },
  {
    param: "playbackSkipLoopSliderReset=1",
    description: "Skip slider reset + forced reflow at loop boundary",
  },
];

export default function DevPlaybackStutterHarnessPage() {
  const router = useRouter();
  const fixture =
    typeof router.query.fixture === "string" ? router.query.fixture : "realistic";
  const tabData = useMemo(() => buildFixture(fixture), [fixture]);

  const {
    setShowPlaybackModal,
    showPlaybackModal,
    setId,
    setTabData,
    setExpandedTabData,
    setPlaybackMetadata,
    setCurrentlyPlayingMetadata,
    setVisiblePlaybackContainerWidth,
    chords,
    bpm,
    storeTabData,
  } = useTabStore((state) => ({
    setShowPlaybackModal: state.setShowPlaybackModal,
    showPlaybackModal: state.showPlaybackModal,
    setId: state.setId,
    setTabData: state.setTabData,
    setExpandedTabData: state.setExpandedTabData,
    setPlaybackMetadata: state.setPlaybackMetadata,
    setCurrentlyPlayingMetadata: state.setCurrentlyPlayingMetadata,
    setVisiblePlaybackContainerWidth: state.setVisiblePlaybackContainerWidth,
    chords: state.chords,
    bpm: state.bpm,
    storeTabData: state.tabData,
  }));

  const ready = storeTabData[0]?.id === tabData[0]?.id;

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !router.isReady) return;

    getPlaybackStutterDevFlags(router.query as Record<string, string>);
    startPlaybackStutterDiagnostics();

    setId(1);
    setTabData((draft) => {
      draft.splice(0, draft.length, ...tabData);
    });
    setVisiblePlaybackContainerWidth(1024);

    const sectionProgression = generateDefaultSectionProgression(tabData);
    const expanded = expandFullTab({
      tabData,
      location: null,
      sectionProgression,
      chords,
      baselineBpm: bpm,
      playbackSpeed: 1,
      setPlaybackMetadata,
      startLoopIndex: 0,
      endLoopIndex: -1,
      loopDelay: 0,
      visiblePlaybackContainerWidth: 1024,
    });

    setExpandedTabData(expanded.chords);
    setCurrentlyPlayingMetadata(expanded.chords.length);
    setShowPlaybackModal(true);

    return () => {
      setShowPlaybackModal(false);
    };
  }, [
    router.isReady,
    router.query,
    tabData,
    setId,
    setTabData,
    setExpandedTabData,
    setPlaybackMetadata,
    setCurrentlyPlayingMetadata,
    setVisiblePlaybackContainerWidth,
    setShowPlaybackModal,
    chords,
    bpm,
  ]);

  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  const activeFlags = getPlaybackStutterDevFlags();

  return (
    <div
      id="devPlaybackStutterHarness"
      data-ready={ready}
      className="min-h-dvh bg-background p-4 text-sm text-foreground"
    >
      <h1 className="mb-2 text-lg font-semibold">
        Playback stutter diagnostics harness
      </h1>
      <p className="mb-4 max-w-3xl text-muted-foreground">
        Fixture: <code>{fixture}</code>. Open Chrome Performance while playing.
        Console: <code>__playbackStutterDiagnostics.summarize()</code>
      </p>

      <div className="mb-4 grid max-w-3xl gap-2 rounded-md border border-border p-3">
        <p className="font-medium">Active dev flags</p>
        <ul className="list-inside list-disc text-muted-foreground">
          {Object.entries(activeFlags).map(([key, value]) => (
            <li key={key}>
              {key}: <code>{String(value)}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 grid max-w-3xl gap-2 rounded-md border border-border p-3">
        <p className="font-medium">Query params</p>
        <ul className="list-inside list-disc text-muted-foreground">
          {DEV_FLAG_DOCS.map(({ param, description }) => (
            <li key={param}>
              <code>{param}</code> — {description}
            </li>
          ))}
        </ul>
      </div>

      {ready && showPlaybackModal && <PlaybackModal />}
    </div>
  );
}
