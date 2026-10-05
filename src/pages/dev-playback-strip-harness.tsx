// Dev-only harness for the playback-modal WAAPI strip.
// Exercised by scripts/verifyPlaybackStripWaapi.mjs; returns 404 in production.
//
// Query params:
// - mode=hook|driver   (default hook) hook runs usePlaybackStripAnimation
// - autostart=1        resume AudioContext and start playback
// - segmentMs=12000    segment horizon, short values force a handoff
// - leadMs=30          audio lead-in before motion
// - anchor=0           chord index playback starts on
// - jumpMs=0           driver mode: add this much audio time after jumpAtMs
// - jumpAtMs=700
import ErrorPage from "next/error";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PlaybackStripDriver } from "~/hooks/playbackStripDriver";
import usePlaybackStripAnimation from "~/hooks/usePlaybackStripAnimation";
import {
  getAbsoluteScrollPositionPx,
  getPlaybackStripMotionModel,
  parseStripPositionPx,
} from "~/utils/playbackStripMotion";

const CHORDS = [
  { width: 10, duration: 0, color: "#ff2d2d" },
  { width: 40, duration: 0.4, color: "#f2c14e" },
  { width: 34, duration: 0.2, color: "#4ea1ff" },
  { width: 34, duration: 0.2, color: "#7dcc6a" },
  { width: 16, duration: 0, color: "#c07dff" },
  { width: 40, duration: 0.5, color: "#ff8a4e" },
  { width: 34, duration: 0.15, color: "#4ee0d0" },
  { width: 34, duration: 0.15, color: "#e0e04e" },
  { width: 48, duration: 0.3, color: "#ff4ea1" },
];

function buildLayout() {
  const scrollPositions: number[] = [];
  let offset = 0;
  for (const chord of CHORDS) {
    scrollPositions.push(offset);
    offset += chord.width;
  }
  return {
    scrollPositions,
    durations: CHORDS.map((chord) => chord.duration),
    totalWidth: offset,
  };
}

function queryNumber(
  value: string | string[] | undefined,
  fallback: number,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function DevPlaybackStripHarness() {
  const { query, isReady } = useRouter();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef(0);
  const driverRef = useRef<PlaybackStripDriver | null>(null);
  const extraAudioSecondsRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);

  const layout = useMemo(() => buildLayout(), []);
  const model = useMemo(() => getPlaybackStripMotionModel(layout), [layout]);

  const mode = query.mode === "driver" ? "driver" : "hook";
  const segmentTargetMs = queryNumber(query.segmentMs, 12000);
  const leadMs = queryNumber(query.leadMs, 30);
  const anchor = Math.max(0, Math.floor(queryNumber(query.anchor, 0)));
  const jumpMs = queryNumber(query.jumpMs, 0);
  const jumpAtMs = queryNumber(query.jumpAtMs, 700);
  const autostart = query.autostart === "1";

  usePlaybackStripAnimation({
    stripRef,
    chordLayoutData: layout,
    currentChordIndex: anchor,
    currentRepetition: 0,
    audioContext,
    playbackStartedAtAudioTime: startedAt,
    playing: mode === "hook" && playing,
    scrollPositionRef,
    driverRef,
    segmentTargetMs,
  });

  useLayoutEffect(() => {
    if (mode !== "driver" || !playing || !audioContext || startedAt === null) {
      return;
    }

    const element = stripRef.current;
    if (!element) return;

    const driver = new PlaybackStripDriver({
      element,
      layout,
      anchorChordIndex: anchor,
      anchorRepetition: 0,
      playbackStartedAtAudioTime: startedAt,
      segmentTargetMs,
      clock: {
        getAudioCurrentTime: () =>
          audioContext.currentTime + extraAudioSecondsRef.current,
        getAudioState: () => audioContext.state,
        subscribeAudioState: (listener) => {
          audioContext.addEventListener("statechange", listener);
          return () => {
            audioContext.removeEventListener("statechange", listener);
          };
        },
      },
      onScrollPosition: (positionPx) => {
        scrollPositionRef.current = positionPx;
      },
    });

    driverRef.current = driver;
    driver.start();

    return () => {
      driver.stop();
      if (driverRef.current === driver) driverRef.current = null;
    };
  }, [anchor, audioContext, layout, mode, playing, segmentTargetMs, startedAt]);

  useEffect(() => {
    if (!isReady || !autostart || booted) return;

    let cancelled = false;
    let jumpTimer: number | null = null;
    const context = new AudioContext();
    audioContextRef.current = context;

    void context.resume().then(() => {
      if (cancelled) return;
      setAudioContext(context);
      const startAt = context.currentTime + leadMs / 1000;
      setStartedAt(startAt);
      setPlaying(true);
      setBooted(true);

      if (mode === "driver" && jumpMs !== 0) {
        jumpTimer = window.setTimeout(() => {
          extraAudioSecondsRef.current += jumpMs / 1000;
        }, jumpAtMs);
      }
    });

    return () => {
      cancelled = true;
      if (jumpTimer !== null) window.clearTimeout(jumpTimer);
    };
  }, [autostart, booted, isReady, jumpAtMs, jumpMs, leadMs, mode]);

  useEffect(() => {
    const publish = () => {
      window.__playbackStripHarness = {
        ready: booted || !autostart,
        mode,
        layout,
        model,
        scrollPosition: () => scrollPositionRef.current,
        readPositionPx: () => {
          const strip = stripRef.current;
          if (!strip) return null;
          return parseStripPositionPx(
            window.getComputedStyle(strip).transform,
          );
        },
        getSnapshot: () => driverRef.current?.getSnapshot() ?? null,
        expectedPositionPx: (elapsedMs: number) => {
          if (!model) return null;
          const anchorStart =
            model.cumulativeChordTimesMs[
              ((anchor % model.chordCount) + model.chordCount) % model.chordCount
            ] ?? 0;
          return getAbsoluteScrollPositionPx({
            model,
            totalWidth: layout.totalWidth,
            anchorStartTimeMs: anchorStart,
            baseRepetition: 0,
            elapsedMs,
          });
        },
        pause: () => setPlaying(false),
        jumpAudioByMs: (ms: number) => {
          extraAudioSecondsRef.current += ms / 1000;
        },
        blockMainThread: (ms: number) => {
          const start = performance.now();
          while (performance.now() - start < ms) {
            // Hold the main thread. A compositor animation keeps painting.
          }
        },
      };
    };

    publish();
    return () => {
      delete window.__playbackStripHarness;
    };
  }, [anchor, autostart, booted, layout, mode, model]);

  if (process.env.NODE_ENV === "production") {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <div
      id="devPlaybackStripHarness"
      data-ready={booted || !autostart ? "1" : "0"}
      data-playing={playing ? "1" : "0"}
      style={{ padding: 24, background: "#111", color: "#eee" }}
    >
      <div
        data-viewport
        style={{
          position: "relative",
          width: 640,
          height: 72,
          overflow: "hidden",
          background: "#1b1b1b",
          border: "1px solid #333",
        }}
      >
        <div
          data-playhead
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 2,
            height: "100%",
            background: "#ffffff",
            zIndex: 2,
          }}
        />
        <div
          ref={stripRef}
          data-strip
          style={{
            position: "relative",
            display: "flex",
            height: "100%",
            width: layout.totalWidth,
            willChange: "transform",
          }}
        >
          {CHORDS.map((chord, index) => (
            <div
              key={index}
              style={{
                width: chord.width,
                height: "100%",
                flex: "0 0 auto",
                background: chord.color,
              }}
            />
          ))}
          <div
            data-marker
            style={{
              position: "absolute",
              left: 180,
              top: 8,
              width: 12,
              height: 56,
              background: "#39ff14",
            }}
          />
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __playbackStripHarness?: {
      ready: boolean;
      mode: string;
      layout: ReturnType<typeof buildLayout>;
      model: ReturnType<typeof getPlaybackStripMotionModel>;
      scrollPosition: () => number;
      readPositionPx: () => number | null;
      getSnapshot: () => ReturnType<PlaybackStripDriver["getSnapshot"]> | null;
      expectedPositionPx: (elapsedMs: number) => number | null;
      pause: () => void;
      jumpAudioByMs: (ms: number) => void;
      blockMainThread: (ms: number) => void;
    };
  }
}
