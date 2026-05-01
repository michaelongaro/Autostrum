import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import Soundfont from "soundfont-player";
import { isIOS, isSafari } from "react-device-detect";
import { BsFillVolumeUpFill } from "react-icons/bs";
import { Paintbrush } from "lucide-react";
import ChordDiagram from "~/components/Tab/ChordDiagram";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import PauseIcon from "~/components/ui/icons/PauseIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  chordTrainerPresets,
  type ChordTrainerPreset,
} from "~/data/tools/chordTrainerPresets";
import { playNoteColumn } from "~/utils/playGeneratedAudioHelpers";
import { DEFAULT_TUNING, parse } from "~/utils/tunings";
import Logo from "~/components/ui/icons/Logo";

type AudioSource =
  | "none"
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

type AudioOption = AudioSource | "none";

type QueueItem = {
  instanceId: string;
  chord: ChordTrainerPreset;
};

const AUDIO_SOURCE_LABELS: Record<AudioSource, string> = {
  none: "None",
  acoustic_guitar_nylon: "Acoustic - Nylon",
  acoustic_guitar_steel: "Acoustic - Steel",
  electric_guitar_clean: "Electric - Clean",
  electric_guitar_jazz: "Electric - Jazz",
};

const DIFFICULTY_PRESETS = [
  { id: "beginner", label: "Beginner", tempo: 48 },
  { id: "easy", label: "Easy", tempo: 60 },
  { id: "intermediate", label: "Intermediate", tempo: 72 },
  { id: "advanced", label: "Advanced", tempo: 108 },
  { id: "expert", label: "Expert", tempo: 128 },
] as const;

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
  const [audioOption, setAudioOption] = useState<AudioOption>(
    "acoustic_guitar_steel",
  );
  const [showColorCoding, setShowColorCoding] = useState(true);
  const [loadingSoundfont, setLoadingSoundfont] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const selectedChords = useMemo(() => {
    return chordTrainerPresets.filter((chord) =>
      selectedChordIds.includes(chord.id),
    );
  }, [selectedChordIds]);

  const selectedChordCount = selectedChords.length;
  const audioEnabled = audioOption !== "none";
  const audioSource = audioOption === "none" ? null : audioOption;
  const selectedDifficultyId =
    DIFFICULTY_PRESETS.find((preset) => preset.tempo === tempo)?.id ?? null;

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

  useEffect(() => {
    if (audioEnabled) return;

    for (const playingString of currentlyPlayingStringsRef.current) {
      try {
        playingString?.stop?.();
      } catch {
        // best-effort cleanup only
      }
    }
  }, [audioEnabled]);

  const ensureAudioRuntime = useCallback(
    async (source: AudioSource | null = audioSource) => {
      if (!source || source === "none") {
        throw new Error("No audio source selected.");
      }

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

  const handleDifficultySelect = useCallback((nextTempo: number) => {
    setTempo(clampTempo(nextTempo));
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
      if (audioEnabled && audioSource) {
        try {
          await ensureAudioRuntime(audioSource);
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
    audioSource,
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
        icon={<Logo className="size-5" />}
        title="Chord Trainer"
        description="Keep a stream of chord shapes moving through center and hear each voicing as it lands."
      />

      <section className="baseVertFlex w-full gap-4">
        <div className="relative w-full overflow-hidden rounded-md border bg-[radial-gradient(circle_at_center,_hsl(var(--background))_0%,_hsl(var(--background))_52%,_hsl(var(--secondary))_100%)]">
          <div
            className="relative h-[260px] w-full overflow-hidden rounded-[22px] bg-background/70 shadow-inner sm:h-[260px]"
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
                    className="pointer-events-none flex items-center justify-center p-2"
                    style={{
                      borderColor: showColorCoding
                        ? `${item.chord.color}40`
                        : undefined,
                    }}
                  >
                    <div className="h-full w-full text-foreground">
                      <ChordDiagram originalFrets={item.chord.frets} />
                    </div>
                  </div>

                  <span
                    className="text-lg font-semibold"
                    style={
                      showColorCoding ? { color: item.chord.color } : undefined
                    }
                  >
                    {item.chord.name}
                  </span>
                </div>
              ))}
            </div>

            {queue.length === 0 && (
              <div className="baseFlex absolute inset-0 h-full w-full text-sm text-foreground/70">
                Choose at least one chord to start.
              </div>
            )}
          </div>
        </div>

        <div className="baseVertFlex w-full gap-3 px-8 md:px-0">
          <div className="baseVertFlex !items-start gap-2">
            <div className="baseFlex w-full !justify-between gap-3">
              <span className="text-sm font-medium leading-none">
                Difficulty
              </span>
            </div>

            <div className="flex w-full flex-wrap gap-2">
              {DIFFICULTY_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={
                    selectedDifficultyId === preset.id ? "default" : "outline"
                  }
                  onClick={() => handleDifficultySelect(preset.tempo)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="baseFlex flex-wrap !justify-start gap-3">
            <Select
              value={audioOption}
              onValueChange={(v) => setAudioOption(v as AudioOption)}
            >
              <SelectTrigger className="hidden w-48 md:flex">
                <SelectValue>
                  <div className="baseFlex gap-2">
                    <BsFillVolumeUpFill className="size-5" />
                    {AUDIO_SOURCE_LABELS[audioOption]}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AUDIO_SOURCE_LABELS) as AudioOption[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {AUDIO_SOURCE_LABELS[key]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant={showColorCoding ? "default" : "outline"}
              onClick={() => setShowColorCoding((previous) => !previous)}
              className="gap-2"
            >
              <Paintbrush className="size-4" />
              Color-coded
            </Button>

            <Button
              variant="audio"
              onClick={() => void handleStartPause()}
              disabled={selectedChordCount === 0}
              className="w-[134px] gap-2 px-8 text-base"
            >
              {isPlaying ? (
                <PauseIcon className="size-4" />
              ) : (
                <Logo className="size-4" />
              )}
              {isPlaying ? "Pause" : "Start"}
            </Button>
          </div>
        </div>

        {audioError && (
          <div className="w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground/80">
            {audioError}
          </div>
        )}
      </section>

      <section className="baseVertFlex w-full !items-start gap-4 rounded-md border bg-secondary/90 p-4 shadow-md sm:p-6">
        <div className="baseFlex w-full !justify-between gap-3">
          <p className="text-sm font-medium leading-none">Chords</p>
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
                      ? showColorCoding
                        ? {
                            borderColor: `${chord.color}66`,
                            background: `linear-gradient(180deg, ${chord.color}14 0%, hsl(var(--background)) 100%)`,
                            boxShadow: `0 0 0 1px ${chord.color}18 inset`,
                          }
                        : {
                            borderColor: "hsl(var(--primary) / 0.42)",
                            background: "hsl(var(--primary) / 0.06)",
                            boxShadow:
                              "0 0 0 1px hsl(var(--primary) / 0.14) inset",
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
                  style={
                    selected && showColorCoding
                      ? { color: chord.color }
                      : undefined
                  }
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
