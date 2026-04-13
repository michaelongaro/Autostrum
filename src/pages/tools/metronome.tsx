import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import { PiMetronome } from "react-icons/pi";
import { getTrackBackground, Range } from "react-range";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import { BsFillVolumeUpFill } from "react-icons/bs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Subdivision = 1 | 2 | 4;

type TimeSignature = {
  label: string;
  beatsPerMeasure: number;
};

type ClickSound = {
  label: string;
  value: string;
  waveform: OscillatorType;
  highFreq: number;
  lowFreq: number;
  subFreq: number;
  highGain: number;
  lowGain: number;
  subGain: number;
  decay: number;
};

const clickSounds: ClickSound[] = [
  {
    label: "Classic",
    value: "classic",
    waveform: "square",
    highFreq: 1500,
    lowFreq: 1000,
    subFreq: 720,
    highGain: 0.24,
    lowGain: 0.16,
    subGain: 0.11,
    decay: 0.06,
  },
  {
    label: "Wooden",
    value: "wooden",
    waveform: "triangle",
    highFreq: 3500,
    lowFreq: 2800,
    subFreq: 2200,
    highGain: 0.3,
    lowGain: 0.22,
    subGain: 0.14,
    decay: 0.035,
  },
  {
    label: "Digital",
    value: "digital",
    waveform: "sine",
    highFreq: 1200,
    lowFreq: 880,
    subFreq: 660,
    highGain: 0.28,
    lowGain: 0.2,
    subGain: 0.13,
    decay: 0.05,
  },
  {
    label: "Hi-Hat",
    value: "hihat",
    waveform: "sawtooth",
    highFreq: 6000,
    lowFreq: 4500,
    subFreq: 3500,
    highGain: 0.12,
    lowGain: 0.09,
    subGain: 0.06,
    decay: 0.03,
  },
  {
    label: "Soft",
    value: "soft",
    waveform: "sine",
    highFreq: 900,
    lowFreq: 700,
    subFreq: 520,
    highGain: 0.18,
    lowGain: 0.13,
    subGain: 0.08,
    decay: 0.08,
  },
];

const timeSignatures: TimeSignature[] = [
  { label: "2/4", beatsPerMeasure: 2 },
  { label: "3/4", beatsPerMeasure: 3 },
  { label: "4/4", beatsPerMeasure: 4 },
  { label: "6/8", beatsPerMeasure: 6 },
];

const subdivisions: Subdivision[] = [1, 2, 4];

function getTempoName(bpm: number): string {
  if (bpm <= 24) return "Larghissimo";
  if (bpm <= 45) return "Grave";
  if (bpm <= 59) return "Largo";
  if (bpm <= 65) return "Larghetto";
  if (bpm <= 75) return "Adagio";
  if (bpm <= 107) return "Andante";
  if (bpm <= 119) return "Moderato";
  if (bpm <= 155) return "Allegro";
  if (bpm <= 175) return "Vivace";
  if (bpm <= 199) return "Presto";
  return "Prestissimo";
}

const TAP_RESET_MS = 2000;
const MAX_TAP_INTERVALS = 8;

function MetronomeToolPage() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef(0);

  const [bpm, setBpm] = useState(100);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(
    timeSignatures[2]!,
  );
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [accentDownbeat, setAccentDownbeat] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [clickSound, setClickSound] = useState<ClickSound>(clickSounds[0]!);

  // Mode state
  const [mode, setMode] = useState<"regular" | "speed-trainer">("regular");

  // Speed trainer state
  const [startBpm, setStartBpm] = useState(60);
  const [finalBpm, setFinalBpm] = useState(120);
  const [bpmIncrement, setBpmIncrement] = useState(5);
  const [barsPerIncrease, setBarsPerIncrease] = useState(4);
  const liveBpmRef = useRef(bpm);
  const barCountRef = useRef(0);

  // Keep liveBpmRef in sync with bpm state
  useEffect(() => {
    liveBpmRef.current = bpm;
  }, [bpm]);

  // Tap BPM state
  const tapTimesRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  const handleTap = useCallback(() => {
    const now = performance.now();

    if (tapResetTimerRef.current) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapTimesRef.current = [];
      setTapBpm(null);
    }, TAP_RESET_MS);

    tapTimesRef.current.push(now);

    if (tapTimesRef.current.length > MAX_TAP_INTERVALS + 1) {
      tapTimesRef.current = tapTimesRef.current.slice(-(MAX_TAP_INTERVALS + 1));
    }

    const times = tapTimesRef.current;
    if (times.length >= 2) {
      const totalMs = times[times.length - 1]! - times[0]!;
      const intervals = times.length - 1;
      const avgMs = totalMs / intervals;
      const detected = Math.round(60_000 / avgMs);
      const clamped = Math.max(40, Math.min(240, detected));
      setTapBpm(clamped);
      setBpm(clamped);
    }
  }, []);

  function playClick({
    audioContext,
    frequency,
    gain,
    waveform,
    decay,
  }: {
    audioContext: AudioContext;
    frequency: number;
    gain: number;
    waveform: OscillatorType;
    decay: number;
  }) {
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + decay + 0.01);
  }

  async function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function toggleRunning() {
    setIsRunning((currentlyRunning) => {
      const nextRunningState = !currentlyRunning;

      if (nextRunningState && mode === "speed-trainer") {
        setBpm(startBpm);
        liveBpmRef.current = startBpm;
        barCountRef.current = 0;
      }

      if (!nextRunningState) {
        setCurrentBeat(1);
        currentStepRef.current = 0;
        barCountRef.current = 0;
      }

      return nextRunningState;
    });
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    let isCancelled = false;

    async function runMetronomeLoop() {
      const audioContext = await getAudioContext();

      const executeTick = () => {
        if (isCancelled) return;

        const currentBpm = liveBpmRef.current;
        const millisecondsPerSubdivision =
          60_000 / currentBpm / Number(subdivision);

        currentStepRef.current += 1;

        const beatInMeasure =
          Math.floor((currentStepRef.current - 1) / subdivision) %
          timeSignature.beatsPerMeasure;

        const isDownbeat = beatInMeasure === 0;
        const isPrimaryPulse = (currentStepRef.current - 1) % subdivision === 0;

        setCurrentBeat(beatInMeasure + 1);

        // Speed trainer: track bars and increase BPM
        if (
          mode === "speed-trainer" &&
          isPrimaryPulse &&
          isDownbeat &&
          currentStepRef.current > 1
        ) {
          barCountRef.current += 1;

          if (barCountRef.current >= barsPerIncrease) {
            barCountRef.current = 0;
            const nextBpm = Math.min(currentBpm + bpmIncrement, finalBpm);
            liveBpmRef.current = nextBpm;
            setBpm(nextBpm);
          }
        }

        if (isPrimaryPulse) {
          playClick({
            audioContext,
            frequency:
              accentDownbeat && isDownbeat
                ? clickSound.highFreq
                : clickSound.lowFreq,
            gain:
              accentDownbeat && isDownbeat
                ? clickSound.highGain
                : clickSound.lowGain,
            waveform: clickSound.waveform,
            decay: clickSound.decay,
          });
        } else {
          playClick({
            audioContext,
            frequency: clickSound.subFreq,
            gain: clickSound.subGain,
            waveform: clickSound.waveform,
            decay: clickSound.decay,
          });
        }

        timerRef.current = setTimeout(executeTick, millisecondsPerSubdivision);
      };

      executeTick();
    }

    void runMetronomeLoop();

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    accentDownbeat,
    bpm,
    isRunning,
    subdivision,
    timeSignature.beatsPerMeasure,
    clickSound,
    mode,
    bpmIncrement,
    barsPerIncrease,
    finalBpm,
  ]);

  return (
    <motion.div
      key={"tools-metronome"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] !justify-start gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Metronome | Autostrum</title>
      </Head>

      <ToolRouteHeader
        icon={<PiMetronome className="size-6" />}
        title="Metronome"
        description="A simple, customizable click to help you lock in your timing and play on beat."
      />

      <div className="baseVertFlex w-full gap-6 rounded-lg border bg-secondary p-4 shadow-md sm:p-6">
        <div className="baseFlex w-full gap-4 sm:!justify-between">
          {/* Mode toggle */}
          <div className="col-span-2 grid w-full grid-cols-2 gap-1 rounded-md border bg-background p-1 sm:col-span-1 sm:w-[300px]">
            <button
              type="button"
              onClick={() => {
                setMode("regular");
                if (isRunning) toggleRunning();
              }}
              className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "regular" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            >
              Regular
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("speed-trainer");
                if (isRunning) toggleRunning();
              }}
              className={`rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${mode === "speed-trainer" ? "bg-primary text-primary-foreground" : "text-foreground/80"}`}
            >
              Speed Trainer
            </button>
          </div>

          {/* Desktop Start/Stop + Sound selector */}
          <div className="hidden gap-3 sm:flex sm:items-center sm:justify-center">
            <Select
              value={clickSound.value}
              onValueChange={(value) => {
                const sound = clickSounds.find((s) => s.value === value);
                if (sound) setClickSound(sound);
              }}
            >
              <SelectTrigger className="!h-10 w-36 bg-background">
                <SelectValue placeholder="Click sound">
                  <div className="baseFlex gap-2">
                    <BsFillVolumeUpFill className="size-5" />
                    {clickSound.label}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clickSounds.map((sound) => (
                  <SelectItem key={sound.value} value={sound.value}>
                    {sound.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={isRunning ? "destructive" : "audio"}
              className="!h-10 min-w-32 px-6"
              onClick={toggleRunning}
            >
              {isRunning ? "Stop" : "Start"}
            </Button>
          </div>
        </div>

        {/* Beat visualization circles */}
        <div className="baseFlex mt-4 flex-wrap gap-3">
          {Array.from({ length: timeSignature.beatsPerMeasure }, (_, i) => {
            const beatNumber = i + 1;
            const isActive = isRunning && currentBeat === beatNumber;
            const isDownbeat = beatNumber === 1;

            return (
              <div
                key={i}
                className={`size-10 rounded-full border-2 transition-all duration-75 sm:size-12 ${
                  isActive
                    ? isDownbeat && accentDownbeat
                      ? "scale-110 border-orange-400 bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.5)]"
                      : "scale-110 border-primary bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)]"
                    : isDownbeat && accentDownbeat
                      ? "border-orange-400/40 bg-orange-400/10"
                      : "border-foreground/20 bg-foreground/5"
                }`}
              />
            );
          })}
        </div>

        {/* BPM display + tempo name */}
        <div className="baseVertFlex gap-1">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {bpm}{" "}
            <span className="text-base font-normal text-foreground/60">
              BPM
            </span>
          </p>
          <p className="text-sm italic text-foreground/50">
            {getTempoName(bpm)}
          </p>
        </div>

        {mode === "regular" ? (
          <>
            {/* BPM slider + Tap button */}
            <div className="baseFlex w-full gap-3 sm:max-w-lg">
              <div className="flex w-full items-center px-1">
                <Range
                  label="BPM"
                  step={1}
                  min={40}
                  max={240}
                  values={[bpm]}
                  onChange={(values) => {
                    if (values[0] !== undefined) setBpm(values[0]);
                  }}
                  renderTrack={({ props, children }) => (
                    <div
                      onMouseDown={props.onMouseDown}
                      onTouchStart={props.onTouchStart}
                      style={{
                        ...props.style,
                        display: "flex",
                        width: "100%",
                      }}
                    >
                      <div
                        ref={props.ref}
                        style={{
                          height: "8px",
                          width: "100%",
                          borderRadius: "4px",
                          background: getTrackBackground({
                            values: [bpm],
                            colors: [
                              "hsl(var(--primary))",
                              "hsl(var(--gray) / 0.5)",
                            ],
                            min: 40,
                            max: 240,
                          }),
                          alignSelf: "center",
                        }}
                      >
                        {children}
                      </div>
                    </div>
                  )}
                  renderThumb={({ props }) => (
                    <div
                      {...props}
                      className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
                    />
                  )}
                />
              </div>
              <Button
                variant="outline"
                className="!h-9 shrink-0 px-4 font-semibold"
                onClick={handleTap}
              >
                Tap
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Speed trainer controls */}
            <div className="mb-4 grid w-full grid-cols-2 gap-x-8 gap-y-4 sm:px-32">
              <div className="baseVertFlex items-start gap-2">
                <label className="text-sm font-medium">
                  Start BPM: {startBpm}
                </label>
                <div className="flex w-full items-center">
                  <Range
                    label="Start BPM"
                    step={1}
                    min={40}
                    max={240}
                    values={[startBpm]}
                    onChange={(values) => {
                      if (values[0] !== undefined) setStartBpm(values[0]);
                    }}
                    renderTrack={({ props, children }) => (
                      <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                          ...props.style,
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <div
                          ref={props.ref}
                          style={{
                            height: "8px",
                            width: "100%",
                            borderRadius: "4px",
                            background: getTrackBackground({
                              values: [startBpm],
                              colors: [
                                "hsl(var(--primary))",
                                "hsl(var(--gray) / 0.5)",
                              ],
                              min: 40,
                              max: 240,
                            }),
                            alignSelf: "center",
                          }}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    renderThumb={({ props }) => (
                      <div
                        {...props}
                        className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="baseVertFlex items-start gap-2">
                <label className="text-sm font-medium">
                  Final BPM: {finalBpm}
                </label>
                <div className="flex w-full items-center">
                  <Range
                    label="Final BPM"
                    step={1}
                    min={40}
                    max={240}
                    values={[finalBpm]}
                    onChange={(values) => {
                      if (values[0] !== undefined) setFinalBpm(values[0]);
                    }}
                    renderTrack={({ props, children }) => (
                      <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                          ...props.style,
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <div
                          ref={props.ref}
                          style={{
                            height: "8px",
                            width: "100%",
                            borderRadius: "4px",
                            background: getTrackBackground({
                              values: [finalBpm],
                              colors: [
                                "hsl(var(--primary))",
                                "hsl(var(--gray) / 0.5)",
                              ],
                              min: 40,
                              max: 240,
                            }),
                            alignSelf: "center",
                          }}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    renderThumb={({ props }) => (
                      <div
                        {...props}
                        className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="baseVertFlex items-start gap-2">
                <label className="text-sm font-medium">
                  Increase by: {bpmIncrement} BPM
                </label>
                <div className="flex w-full items-center">
                  <Range
                    label="BPM increment"
                    step={1}
                    min={1}
                    max={20}
                    values={[bpmIncrement]}
                    onChange={(values) => {
                      if (values[0] !== undefined) setBpmIncrement(values[0]);
                    }}
                    renderTrack={({ props, children }) => (
                      <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                          ...props.style,
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <div
                          ref={props.ref}
                          style={{
                            height: "8px",
                            width: "100%",
                            borderRadius: "4px",
                            background: getTrackBackground({
                              values: [bpmIncrement],
                              colors: [
                                "hsl(var(--primary))",
                                "hsl(var(--gray) / 0.5)",
                              ],
                              min: 1,
                              max: 20,
                            }),
                            alignSelf: "center",
                          }}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    renderThumb={({ props }) => (
                      <div
                        {...props}
                        className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="baseVertFlex items-start gap-2">
                <label className="text-sm font-medium">
                  Every: {barsPerIncrease}{" "}
                  {barsPerIncrease === 1 ? "bar" : "bars"}
                </label>
                <div className="flex w-full items-center">
                  <Range
                    label="Bars per increase"
                    step={1}
                    min={1}
                    max={16}
                    values={[barsPerIncrease]}
                    onChange={(values) => {
                      if (values[0] !== undefined)
                        setBarsPerIncrease(values[0]);
                    }}
                    renderTrack={({ props, children }) => (
                      <div
                        onMouseDown={props.onMouseDown}
                        onTouchStart={props.onTouchStart}
                        style={{
                          ...props.style,
                          display: "flex",
                          width: "100%",
                        }}
                      >
                        <div
                          ref={props.ref}
                          style={{
                            height: "8px",
                            width: "100%",
                            borderRadius: "4px",
                            background: getTrackBackground({
                              values: [barsPerIncrease],
                              colors: [
                                "hsl(var(--primary))",
                                "hsl(var(--gray) / 0.5)",
                              ],
                              min: 1,
                              max: 16,
                            }),
                            alignSelf: "center",
                          }}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    renderThumb={({ props }) => (
                      <div
                        {...props}
                        className="z-10 size-[18px] rounded-full border border-foreground/50 bg-primary"
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Controls: time signature, subdivision, accent */}
        <div className="grid gap-3 sm:w-full sm:grid-cols-3 sm:place-items-center">
          <div className="baseVertFlex !items-start gap-2">
            <p className="text-sm font-medium">Time Signature</p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              {timeSignatures.map((signature) => (
                <Button
                  key={signature.label}
                  variant={
                    signature.label === timeSignature.label
                      ? "default"
                      : "outline"
                  }
                  className="!h-8 px-3"
                  onClick={() => setTimeSignature(signature)}
                >
                  {signature.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="text-sm font-medium">Subdivision</p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              {subdivisions.map((subdivisionOption) => (
                <Button
                  key={subdivisionOption}
                  variant={
                    subdivisionOption === subdivision ? "default" : "outline"
                  }
                  className="!h-8 px-3"
                  onClick={() => setSubdivision(subdivisionOption)}
                >
                  {subdivisionOption}x
                </Button>
              ))}
            </div>
          </div>

          <div className="baseVertFlex !items-start gap-2">
            <p className="text-sm font-medium">Downbeat Accent</p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              <Button
                variant={accentDownbeat ? "default" : "outline"}
                className="!h-8 px-3"
                onClick={() =>
                  setAccentDownbeat((currentlyAccented) => !currentlyAccented)
                }
              >
                On
              </Button>
              <Button
                variant={accentDownbeat ? "outline" : "default"}
                className="!h-8 px-3"
                onClick={() =>
                  setAccentDownbeat((currentlyAccented) => !currentlyAccented)
                }
              >
                Off
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Start/Stop + Sound selector */}
        <div className="baseFlex mt-8 w-full flex-wrap gap-3 sm:!hidden">
          <Select
            value={clickSound.value}
            onValueChange={(value) => {
              const sound = clickSounds.find((s) => s.value === value);
              if (sound) setClickSound(sound);
            }}
          >
            <SelectTrigger className="!h-10 w-36 bg-background">
              <SelectValue placeholder="Click sound">
                <div className="baseFlex gap-2">
                  <BsFillVolumeUpFill className="size-5" />
                  {clickSound.label}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clickSounds.map((sound) => (
                <SelectItem key={sound.value} value={sound.value}>
                  {sound.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={isRunning ? "destructive" : "audio"}
            className="!h-10 min-w-32 px-6"
            onClick={toggleRunning}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default MetronomeToolPage;
