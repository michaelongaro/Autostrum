import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import Soundfont from "soundfont-player";
import { isIOS, isSafari } from "react-device-detect";
import { BsMusicNoteBeamed } from "react-icons/bs";
import { Pause } from "lucide-react";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  chordTrainerPresets,
  type ChordTrainerPreset,
} from "~/data/tools/chordTrainerPresets";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";
import { DEFAULT_TUNING, parse } from "~/utils/tunings";

type AudioSource =
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

type QueueItem = {
  instanceId: string;
  chord: ChordTrainerPreset;
};

const AUDIO_SOURCE_LABELS: Record<AudioSource, string> = {
  acoustic_guitar_nylon: "Acoustic - Nylon",
  acoustic_guitar_steel: "Acoustic - Steel",
  electric_guitar_clean: "Electric - Clean",
  electric_guitar_jazz: "Electric - Jazz",
};

const DEFAULT_SELECTED_CHORD_IDS = ["c", "g", "am", "f", "em", "d"];
const DEFAULT_TEMPO = 72;
const MIN_TEMPO = 40;
const MAX_TEMPO = 180;
const STANDARD_TUNING = parse(DEFAULT_TUNING);

const INITIAL_QUEUE_LENGTH = 36;
const APPEND_CHUNK_SIZE = 12;
const CHORD_ITEM_WIDTH = 136;
const CHORD_ITEM_GAP = 40;
const TOTAL_CHORD_WIDTH = CHORD_ITEM_WIDTH + CHORD_ITEM_GAP;
const MIN_EDGE_OPACITY = 0.18;

function clampTempo(value: number) {
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, value));
}

function createQueueItem(chord: ChordTrainerPreset): QueueItem {
  return {
    instanceId: crypto.randomUUID(),
    chord,
  };
}

function getRandomChord(
  chords: ChordTrainerPreset[],
  previousChordId?: string,
): ChordTrainerPreset | null {
  if (chords.length === 0) return null;
  if (chords.length === 1) return chords[0] ?? null;

  const candidates = previousChordId
    ? chords.filter((chord) => chord.id !== previousChordId)
    : chords;
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const randomChord = candidates.at(randomIndex);

  if (randomChord) {
    return randomChord;
  }

  return chords[0] ?? null;
}

function resolveQueueChord(
  chord: ChordTrainerPreset | null,
  fallbackChord: ChordTrainerPreset,
) {
  return chord ?? fallbackChord;
}

function buildInitialQueue(chords: ChordTrainerPreset[]): QueueItem[] {
  const queue: QueueItem[] = [];
  let previousChordId: string | undefined = undefined;
  const fallbackChord = chords[0];

  if (!fallbackChord) {
    return queue;
  }

  for (let index = 0; index < INITIAL_QUEUE_LENGTH; index++) {
    const chord = resolveQueueChord(
      getRandomChord(chords, previousChordId),
      fallbackChord,
    );

    queue.push(createQueueItem(chord));
    previousChordId = chord.id;
  }

  return queue;
}

function appendQueue(
  queue: QueueItem[],
  chords: ChordTrainerPreset[],
  count = APPEND_CHUNK_SIZE,
): QueueItem[] {
  if (chords.length === 0) return queue;

  let lastChordId = queue[queue.length - 1]?.chord.id;
  const fallbackChord = chords[0];
  if (!fallbackChord) return queue;

  const appends: QueueItem[] = [];

  for (let index = 0; index < count; index++) {
    const nextChord = resolveQueueChord(
      getRandomChord(chords, lastChordId),
      fallbackChord,
    );

    appends.push(createQueueItem(nextChord));
    lastChordId = nextChord.id;
  }

  return [...queue, ...appends];
}

function ChordTrainerPage() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const currentlyPlayingStringsRef = useRef<
    (Soundfont.Player | AudioBufferSourceNode | undefined)[]
  >([undefined, undefined, undefined, undefined, undefined, undefined]);
  const soundfontCacheRef = useRef<
    Partial<Record<AudioSource, Soundfont.Player>>
  >({});
  const queueRef = useRef<QueueItem[]>([]);
  const selectedChordsRef = useRef<ChordTrainerPreset[]>([]);
  const tempoRef = useRef(DEFAULT_TEMPO);
  const audioEnabledRef = useRef(true);
  const scrollXRef = useRef(0);
  const stageWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastTriggeredIndexRef = useRef(-1);
  const queueMutationPendingRef = useRef(false);

  const [selectedChordIds, setSelectedChordIds] = useState<string[]>(
    DEFAULT_SELECTED_CHORD_IDS,
  );
  const [tempo, setTempo] = useState(DEFAULT_TEMPO);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioSource, setAudioSource] = useState<AudioSource>(
    "acoustic_guitar_steel",
  );
  const [loadingSoundfont, setLoadingSoundfont] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const selectedChords = useMemo(() => {
    return chordTrainerPresets.filter((chord) =>
      selectedChordIds.includes(chord.id),
    );
  }, [selectedChordIds]);

  const selectedChordCount = selectedChords.length;

  useEffect(() => {
    queueRef.current = queue;
    queueMutationPendingRef.current = false;
  }, [queue]);

  useEffect(() => {
    selectedChordsRef.current = selectedChords;
  }, [selectedChords]);

  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  const ensureAudioRuntime = useCallback(
    async (source: AudioSource = audioSource) => {
      let audioContext = audioContextRef.current;
      if (!audioContext) {
        audioContext = new window.AudioContext();
        audioContextRef.current = audioContext;
      }

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      let masterVolumeGainNode = masterGainRef.current;
      if (!masterVolumeGainNode) {
        masterVolumeGainNode = audioContext.createGain();
        masterVolumeGainNode.gain.value = 1;
        masterVolumeGainNode.connect(audioContext.destination);
        masterGainRef.current = masterVolumeGainNode;
      }

      let currentInstrument = soundfontCacheRef.current[source];
      if (!currentInstrument) {
        setLoadingSoundfont(true);

        const format = isSafari || isIOS ? "mp3" : "ogg";

        try {
          currentInstrument = await Soundfont.instrument(audioContext, source, {
            soundfont: "MusyngKite",
            format,
            destination: masterVolumeGainNode,
          });
        } catch {
          currentInstrument = await Soundfont.instrument(audioContext, source, {
            soundfont: "MusyngKite",
            format,
            destination: masterVolumeGainNode,
            nameToUrl: (name: string, _sf: string, fmt: string) =>
              `/sounds/instruments/${name}-${fmt}.js`,
          });
        } finally {
          setLoadingSoundfont(false);
        }

        soundfontCacheRef.current[source] = currentInstrument;
      }

      return {
        audioContext,
        masterVolumeGainNode,
        currentInstrument,
      };
    },
    [audioSource],
  );

  const playChord = useCallback(
    async (chord: ChordTrainerPreset, bpm: number) => {
      if (!audioEnabledRef.current) return;

      try {
        const { audioContext, masterVolumeGainNode, currentInstrument } =
          await ensureAudioRuntime();

        setAudioError(null);

        await playNoteColumn({
          tuning: STANDARD_TUNING,
          capo: 0,
          bpm,
          currColumn: ["", ...chord.frets, "v", "quarter", `${bpm}`],
          audioContext,
          masterVolumeGainNode,
          currentInstrument,
          currentlyPlayingStrings: currentlyPlayingStringsRef.current,
        });
      } catch (error) {
        console.error("Unable to play chord trainer audio:", error);
        setAudioError(
          "Audio is unavailable right now. The trainer will keep running visually.",
        );
      }
    },
    [ensureAudioRuntime],
  );

  const playChordRef = useRef(playChord);
  useEffect(() => {
    playChordRef.current = playChord;
  }, [playChord]);

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

  const rebuildQueue = useCallback(
    (chords: ChordTrainerPreset[]) => {
      scrollXRef.current = 0;
      lastFrameTimeRef.current = null;
      lastTriggeredIndexRef.current = -1;
      queueMutationPendingRef.current = false;

      const nextQueue = buildInitialQueue(chords);
      queueRef.current = nextQueue;
      setQueue(nextQueue);

      window.requestAnimationFrame(() => updateStreamStyles(0));
    },
    [updateStreamStyles],
  );

  const extendQueue = useCallback(() => {
    if (
      queueMutationPendingRef.current ||
      selectedChordsRef.current.length === 0
    ) {
      return;
    }

    queueMutationPendingRef.current = true;
    setQueue((currentQueue) => {
      const nextQueue = appendQueue(
        currentQueue,
        selectedChordsRef.current,
        APPEND_CHUNK_SIZE,
      );

      queueRef.current = nextQueue;
      return nextQueue;
    });
  }, []);

  const trimQueue = useCallback(
    (currentCenterIndex: number) => {
      if (
        queueMutationPendingRef.current ||
        currentCenterIndex <= 14 ||
        queueRef.current.length <= INITIAL_QUEUE_LENGTH + APPEND_CHUNK_SIZE
      ) {
        return;
      }

      const trimCount = currentCenterIndex - 8;
      if (trimCount <= 0) return;

      queueMutationPendingRef.current = true;
      scrollXRef.current -= trimCount * TOTAL_CHORD_WIDTH;
      lastTriggeredIndexRef.current -= trimCount;

      setQueue((currentQueue) => {
        const trimmedQueue = currentQueue.slice(trimCount);
        const nextQueue = appendQueue(
          trimmedQueue,
          selectedChordsRef.current,
          trimCount,
        );

        queueRef.current = nextQueue;
        return nextQueue;
      });

      updateStreamStyles(scrollXRef.current);
    },
    [updateStreamStyles],
  );

  useEffect(() => {
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
  }, [updateStreamStyles]);

  useEffect(() => {
    if (selectedChords.length === 0) {
      queueRef.current = [];
      scrollXRef.current = 0;
      setQueue([]);
      setIsPlaying(false);
      updateStreamStyles(0);
      return;
    }

    rebuildQueue(selectedChords);
  }, [rebuildQueue, selectedChords, updateStreamStyles]);

  useEffect(() => {
    if (!isPlaying || queue.length === 0 || selectedChords.length === 0) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
      return;
    }

    const tick = (time: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = time;
      }

      const deltaTime = Math.min(time - lastFrameTimeRef.current, 32);
      lastFrameTimeRef.current = time;

      const msPerChord = (60 / tempoRef.current) * 1000;
      const velocity = TOTAL_CHORD_WIDTH / msPerChord;
      scrollXRef.current += velocity * deltaTime;

      updateStreamStyles(scrollXRef.current);

      const currentCenterIndex = Math.max(
        0,
        Math.round(scrollXRef.current / TOTAL_CHORD_WIDTH),
      );

      if (currentCenterIndex > lastTriggeredIndexRef.current) {
        for (
          let index = lastTriggeredIndexRef.current + 1;
          index <= currentCenterIndex;
          index++
        ) {
          const targetChord = queueRef.current[index];
          if (targetChord && audioEnabledRef.current) {
            void playChordRef.current(targetChord.chord, tempoRef.current);
          }
        }

        lastTriggeredIndexRef.current = currentCenterIndex;
      }

      if (currentCenterIndex + 18 >= queueRef.current.length) {
        extendQueue();
      }

      trimQueue(currentCenterIndex);

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    extendQueue,
    isPlaying,
    queue.length,
    selectedChords.length,
    trimQueue,
    updateStreamStyles,
  ]);

  useEffect(() => {
    const currentlyPlayingStrings = currentlyPlayingStringsRef.current;
    const audioContext = audioContextRef.current;

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }

      for (const playingString of currentlyPlayingStrings) {
        try {
          playingString?.stop?.();
        } catch {
          // best-effort cleanup only
        }
      }

      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, []);

  const handleTempoInput = useCallback((value: string) => {
    const parsedValue = Number(value);
    if (Number.isNaN(parsedValue)) {
      setTempo(DEFAULT_TEMPO);
      return;
    }

    setTempo(clampTempo(parsedValue));
  }, []);

  const handleChordToggle = useCallback((chordId: string) => {
    setSelectedChordIds((previous) => {
      if (previous.includes(chordId)) {
        return previous.filter((id) => id !== chordId);
      }

      return [...previous, chordId];
    });
  }, []);

  const handleStartPause = useCallback(async () => {
    if (selectedChords.length === 0 || queue.length === 0) return;

    if (!isPlaying) {
      if (audioEnabled) {
        try {
          await ensureAudioRuntime();
        } catch (error) {
          console.error("Unable to initialize chord trainer audio:", error);
        }
      }

      setIsPlaying(true);
      return;
    }

    setIsPlaying(false);
  }, [
    audioEnabled,
    ensureAudioRuntime,
    isPlaying,
    queue.length,
    selectedChords.length,
  ]);

  return (
    <motion.div
      key={"tools-chord-trainer"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1240px] !justify-start gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Chord Trainer | Autostrum</title>
        <meta
          name="description"
          content="Practice chord changes with a continuous randomized stream of chord diagrams and optional guitar playback."
        />
      </Head>

      <ToolRouteHeader
        icon={<BsMusicNoteBeamed className="size-5" />}
        title="Chord Trainer"
        description="Keep a stream of chord shapes moving through center and hear each voicing as it lands."
      />

      <section className="baseVertFlex w-full gap-4 rounded-2xl border bg-secondary/90 p-4 shadow-md sm:p-6">
        <div className="relative w-full overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_center,_hsl(var(--background))_0%,_hsl(var(--background))_52%,_hsl(var(--secondary))_100%)]">
          <div
            className="relative h-full w-full overflow-hidden rounded-[22px] bg-background/70 shadow-inner sm:h-[260px]"
            ref={stageRef}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background via-background/90 to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background via-background/90 to-transparent sm:w-24" />
            <div className="bg-primary/12 pointer-events-none absolute left-1/2 top-1/2 z-10 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:h-[220px] sm:w-[240px]" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

            <div
              ref={sliderContainerRef}
              className="absolute inset-y-0 left-0 flex items-center will-change-transform"
              style={{ transform: "translate3d(0px, 0, 0)" }}
            >
              {queue.map((item) => (
                <div
                  key={item.instanceId}
                  className="baseVertFlex relative flex-shrink-0 flex-col items-center justify-center gap-2 will-change-transform [backface-visibility:hidden] [contain:layout_paint]"
                  style={{
                    width: CHORD_ITEM_WIDTH,
                    marginRight: CHORD_ITEM_GAP,
                    transform: "translateZ(0) scale(1)",
                    opacity: 1,
                  }}
                >
                  <div
                    className="pointer-events-none flex h-[152px] w-[108px] items-center justify-center rounded-2xl border bg-background/85 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                    style={{
                      borderColor: `${item.chord.color}40`,
                    }}
                  >
                    <div className="h-full w-full text-foreground">
                      <ChordDiagram originalFrets={item.chord.frets} />
                    </div>
                  </div>

                  <span
                    className="text-xs font-semibold tracking-[0.14em]"
                    style={{ color: item.chord.color }}
                  >
                    {item.chord.name}
                  </span>
                </div>
              ))}
            </div>

            {queue.length === 0 && (
              <div className="baseFlex absolute inset-0 h-full w-full text-sm text-foreground/70">
                Choose at least one chord to start the stream.
              </div>
            )}
          </div>
        </div>

        <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_220px]">
          <div className="baseVertFlex w-full !items-start gap-2 rounded-2xl border bg-background/75 p-3 sm:p-4">
            <div className="baseFlex w-full !justify-between gap-3">
              <Label htmlFor="chord-trainer-tempo">Pace</Label>
              <span className="text-xs text-foreground/55">{tempo} CPM</span>
            </div>

            <div className="baseFlex w-full !justify-start gap-3">
              <Input
                id="chord-trainer-tempo"
                type="number"
                min={MIN_TEMPO}
                max={MAX_TEMPO}
                value={tempo}
                onChange={(event) => handleTempoInput(event.target.value)}
                className="w-24"
              />

              <input
                type="range"
                min={MIN_TEMPO}
                max={MAX_TEMPO}
                step={1}
                value={tempo}
                onChange={(event) => handleTempoInput(event.target.value)}
                className="w-full accent-primary"
                aria-label="Chord trainer tempo"
              />
            </div>
          </div>

          <div className="baseVertFlex w-full !items-start gap-2 rounded-2xl border bg-background/75 p-3 sm:p-4">
            <div className="baseFlex w-full !justify-between gap-3">
              <Label htmlFor="chord-trainer-tone">Guitar Sound</Label>
              <div className="baseFlex !justify-end gap-2 text-xs text-foreground/55">
                <span>Auto-play</span>
                <Switch
                  id="chord-trainer-audio"
                  checked={audioEnabled}
                  onCheckedChange={setAudioEnabled}
                />
              </div>
            </div>

            <Select
              value={audioSource}
              onValueChange={(value) => setAudioSource(value as AudioSource)}
              disabled={!audioEnabled}
            >
              <SelectTrigger id="chord-trainer-tone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIO_SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => void handleStartPause()}
            disabled={selectedChordCount === 0}
            className="h-full min-h-[92px] gap-2 rounded-2xl text-base"
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <BsMusicNoteBeamed className="size-4" />
            )}
            {isPlaying ? "Pause" : "Start"}
          </Button>
        </div>

        {audioError && (
          <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground/80">
            {audioError}
          </div>
        )}
      </section>

      <section className="baseVertFlex w-full !items-start gap-4 rounded-2xl border bg-secondary/90 p-4 shadow-md sm:p-6">
        <div className="baseFlex w-full !justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/45">
            Chords
          </p>
          <span className="text-xs text-foreground/55">
            {selectedChordCount} selected
          </span>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {chordTrainerPresets.map((chord) => {
            const selected = selectedChordIds.includes(chord.id);

            return (
              <div key={chord.id} className="baseVertFlex gap-2">
                <Button
                  variant={"outline"}
                  style={
                    selected
                      ? {
                          borderColor: `${chord.color}66`,
                          background: `linear-gradient(180deg, ${chord.color}14 0%, hsl(var(--background)) 100%)`,
                          boxShadow: `0 0 0 1px ${chord.color}18 inset`,
                        }
                      : undefined
                  }
                  className="h-[112px] w-[88px] rounded-xl border bg-background/80 p-1.5 text-foreground"
                  onClick={() => handleChordToggle(chord.id)}
                >
                  <ChordDiagram originalFrets={chord.frets} />
                </Button>

                <span
                  className="text-sm font-semibold"
                  style={selected ? { color: chord.color } : undefined}
                >
                  {chord.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

export default ChordTrainerPage;
