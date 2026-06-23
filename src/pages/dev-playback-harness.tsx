// Dev-only harness for verifying playback modal loop/pause behavior.
// Exercised by scripts/verifyPlaybackPauseAfterLoop.mjs; returns 404 in production.
//
// Query params:
// - chords=60 (default) number of tab note columns in one subsection
import ErrorPage from "next/error";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import {
  useTabStore,
  type Section,
  type TabNote,
  type TabMeasureLine,
} from "~/stores/TabStore";

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
  { ssr: false },
);

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

function makeColumns(chordCount: number) {
  const columns: (TabNote | TabMeasureLine)[] = [];
  const measures = Math.ceil(chordCount / 8);

  for (let m = 0; m < measures; m++) {
    for (let n = 0; n < 8; n++) {
      if (columns.length >= chordCount) break;
      columns.push(note(`n-${m}-${n}`));
    }
    if (m < measures - 1 && columns.length < chordCount) {
      columns.push(measureLine(`ml-${m}`));
    }
  }

  return columns;
}

function buildTabData(chordCount: number): Section[] {
  return [
    {
      id: "playback-harness-section",
      title: "Playback harness",
      data: [
        {
          id: "playback-harness-sub",
          type: "tab" as const,
          bpm: 480,
          baseNoteLength: "quarter" as const,
          repetitions: 1,
          data: makeColumns(chordCount),
        },
      ],
    },
  ];
}

export default function DevPlaybackHarness() {
  const { query, isReady } = useRouter();

  const {
    setId,
    setTabData,
    setEditing,
    setBpm,
    setPlaybackSpeed,
    setCountInTimerEnabled,
    setShowPlaybackModal,
    setAudioMetadata,
    setCurrentChordIndex,
    storeTabData,
    showPlaybackModal,
    expandedTabData,
    audioMetadata,
    currentChordIndex,
    pauseAudio,
  } = useTabStore((state) => ({
    setId: state.setId,
    setTabData: state.setTabData,
    setEditing: state.setEditing,
    setBpm: state.setBpm,
    setPlaybackSpeed: state.setPlaybackSpeed,
    setCountInTimerEnabled: state.setCountInTimerEnabled,
    setShowPlaybackModal: state.setShowPlaybackModal,
    setAudioMetadata: state.setAudioMetadata,
    setCurrentChordIndex: state.setCurrentChordIndex,
    storeTabData: state.tabData,
    showPlaybackModal: state.showPlaybackModal,
    expandedTabData: state.expandedTabData,
    audioMetadata: state.audioMetadata,
    currentChordIndex: state.currentChordIndex,
    pauseAudio: state.pauseAudio,
  }));

  const previousChordIndexRef = useRef(0);
  const [hasCompletedLoop, setHasCompletedLoop] = useState(false);

  const chordCount = Math.max(
    20,
    Number(typeof query.chords === "string" ? query.chords : "60") || 60,
  );
  const tabData = useMemo(() => buildTabData(chordCount), [chordCount]);

  const ready =
    storeTabData[0]?.id === tabData[0]?.id &&
    expandedTabData !== null &&
    expandedTabData.length > 0;

  useAutoCompileChords();

  useEffect(() => {
    if (!isReady) return;

    setId(1);
    setEditing(false);
    setBpm(480);
    setPlaybackSpeed(1.5);
    setCountInTimerEnabled(false);
    setCurrentChordIndex(0);
    setAudioMetadata({
      playing: false,
      location: null,
      startLoopIndex: 0,
      endLoopIndex: -1,
      editingLoopRange: false,
      fullCurrentlyPlayingMetadataLength: -1,
    });
    setTabData((draft) => {
      draft.splice(0, draft.length, ...tabData);
    });
    setShowPlaybackModal(true);
  }, [
    isReady,
    tabData,
    setId,
    setTabData,
    setEditing,
    setBpm,
    setPlaybackSpeed,
    setCountInTimerEnabled,
    setShowPlaybackModal,
    setAudioMetadata,
    setCurrentChordIndex,
  ]);

  useEffect(() => {
    const chordTotal = expandedTabData?.length ?? 0;

    if (
      chordTotal > 0 &&
      previousChordIndexRef.current > chordTotal * 0.4 &&
      currentChordIndex < chordTotal * 0.15
    ) {
      setHasCompletedLoop(true);
    }

    previousChordIndexRef.current = currentChordIndex;
  }, [currentChordIndex, expandedTabData]);

  useEffect(() => {
    if (audioMetadata.playing) {
      setHasCompletedLoop(false);
    }
  }, [audioMetadata.playing]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (
        window as Window & {
          __playbackHarness?: {
            ready: boolean;
            chordCount: number;
            currentChordIndex: number;
            playing: boolean;
            hasCompletedLoop: boolean;
            pause: () => void;
          };
        }
      ).__playbackHarness = {
        ready,
        chordCount: expandedTabData?.length ?? 0,
        currentChordIndex,
        playing: audioMetadata.playing,
        hasCompletedLoop,
        pause: () => pauseAudio(),
      };
    }
  }, [
    ready,
    expandedTabData,
    currentChordIndex,
    audioMetadata.playing,
    hasCompletedLoop,
    pauseAudio,
  ]);

  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <div
      id="devPlaybackHarness"
      data-ready={ready}
      data-playing={audioMetadata.playing}
      data-chord-count={expandedTabData?.length ?? 0}
      className="fixed inset-0 z-[60]"
    >
      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </div>
  );
}
