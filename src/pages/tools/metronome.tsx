import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import { PiMetronome } from "react-icons/pi";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";

type Subdivision = 1 | 2 | 4;

type TimeSignature = {
  label: string;
  beatsPerMeasure: number;
};

const timeSignatures: TimeSignature[] = [
  { label: "2/4", beatsPerMeasure: 2 },
  { label: "3/4", beatsPerMeasure: 3 },
  { label: "4/4", beatsPerMeasure: 4 },
  { label: "6/8", beatsPerMeasure: 6 },
];

const subdivisions: Subdivision[] = [1, 2, 4];

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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
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

      const millisecondsPerSubdivision = 60_000 / bpm / Number(subdivision);

      const executeTick = () => {
        if (isCancelled) return;

        currentStepRef.current += 1;

        const beatInMeasure =
          Math.floor((currentStepRef.current - 1) / subdivision) %
          timeSignature.beatsPerMeasure;

        const isDownbeat = beatInMeasure === 0;
        const isPrimaryPulse = (currentStepRef.current - 1) % subdivision === 0;

        setCurrentBeat(beatInMeasure + 1);

        if (isPrimaryPulse) {
          playClick({
            audioContext,
            frequency:
              accentDownbeat && isDownbeat
                ? 1500
                : 1000 - (Number(subdivision) - 1) * 50,
            gain: accentDownbeat && isDownbeat ? 0.24 : 0.16,
          });
        } else {
          playClick({ audioContext, frequency: 720, gain: 0.11 });
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
  ]);

  async function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function playClick({
    audioContext,
    frequency,
    gain,
  }: {
    audioContext: AudioContext;
    frequency: number;
    gain: number;
  }) {
    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, now);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.07);
  }

  function toggleRunning() {
    setIsRunning((currentlyRunning) => {
      const nextRunningState = !currentlyRunning;

      if (!nextRunningState) {
        setCurrentBeat(1);
        currentStepRef.current = 0;
      }

      return nextRunningState;
    });
  }

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
        <title>Metronome | Autostrum Tools</title>
      </Head>

      <ToolRouteHeader
        icon={<PiMetronome className="size-6" />}
        title="Metronome"
        description="Practice with adjustable tempo, subdivisions, and accented downbeats."
      />

      <div className="baseVertFlex w-full items-start gap-4 rounded-lg border bg-secondary p-4 shadow-md">
        <div className="baseVertFlex w-full items-start gap-2">
          <label htmlFor="bpm" className="text-sm font-medium">
            BPM: {bpm}
          </label>
          <input
            id="bpm"
            type="range"
            min={40}
            max={240}
            step={1}
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
            className="w-full"
          />
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          <div className="baseVertFlex items-start gap-2">
            <p className="text-sm font-medium">Time Signature</p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              {timeSignatures.map((signature) => (
                <Button
                  key={signature.label}
                  variant={
                    signature.label === timeSignature.label
                      ? "secondary"
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

          <div className="baseVertFlex items-start gap-2">
            <p className="text-sm font-medium">Subdivision</p>
            <div className="baseFlex flex-wrap !justify-start gap-2">
              {subdivisions.map((subdivisionOption) => (
                <Button
                  key={subdivisionOption}
                  variant={
                    subdivisionOption === subdivision ? "secondary" : "outline"
                  }
                  className="!h-8 px-3"
                  onClick={() => setSubdivision(subdivisionOption)}
                >
                  {subdivisionOption}x
                </Button>
              ))}
            </div>
          </div>

          <div className="baseVertFlex items-start gap-2">
            <p className="text-sm font-medium">Accent</p>
            <Button
              variant={accentDownbeat ? "secondary" : "outline"}
              className="!h-8 px-3"
              onClick={() =>
                setAccentDownbeat((currentlyAccented) => !currentlyAccented)
              }
            >
              {accentDownbeat ? "Downbeat On" : "Downbeat Off"}
            </Button>
          </div>
        </div>

        <div className="baseFlex w-full !justify-start gap-2">
          <Button
            variant={isRunning ? "destructive" : "secondary"}
            className="!h-9 px-4"
            onClick={toggleRunning}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>

          <p className="text-sm text-foreground/85">
            Current beat: {currentBeat}/{timeSignature.beatsPerMeasure}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default MetronomeToolPage;
