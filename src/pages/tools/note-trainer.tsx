import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import Soundfont from "soundfont-player";
import { IoEar } from "react-icons/io5";
import { get } from "@tonaljs/note";
import { isIOS, isSafari } from "react-device-detect";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { BsFillVolumeUpFill } from "react-icons/bs";
import { Check } from "lucide-react";

const NOTE_POOL = [
  "C4",
  "C#4",
  "D4",
  "D#4",
  "E4",
  "F4",
  "F#4",
  "G4",
  "G#4",
  "A4",
  "A#4",
  "B4",
] as const;

type AudioSource =
  | "generated"
  | "acoustic_guitar_nylon"
  | "acoustic_guitar_steel"
  | "electric_guitar_clean"
  | "electric_guitar_jazz";

const AUDIO_SOURCE_LABELS: Record<AudioSource, string> = {
  generated: "Generated",
  acoustic_guitar_nylon: "Acoustic - Nylon",
  acoustic_guitar_steel: "Acoustic - Steel",
  electric_guitar_clean: "Electric - Clean",
  electric_guitar_jazz: "Electric - Jazz",
};

function getRandomNote() {
  return NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)] ?? "C4";
}

function NoteTrainerPage() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundfontCacheRef = useRef<
    Partial<Record<AudioSource, Soundfont.Player>>
  >({});

  const [audioSource, setAudioSource] = useState<AudioSource>("generated");
  const [loadingSoundfont, setLoadingSoundfont] = useState(false);
  const [targetNote, setTargetNote] = useState<string>(() => getRandomNote());
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [revealedNote, setRevealedNote] = useState<string | null>(null);
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(
    null,
  );
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const audioSourceRef = useRef<AudioSource>(audioSource);
  audioSourceRef.current = audioSource;

  const getAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  // Preload soundfont when audio source changes
  useEffect(() => {
    if (audioSource === "generated") return;

    const cached = soundfontCacheRef.current[audioSource];
    if (cached) return;

    let cancelled = false;
    setLoadingSoundfont(true);

    void (async () => {
      try {
        const ctx = await getAudioContext();
        const format = isSafari || isIOS ? "mp3" : "ogg";

        let player: Soundfont.Player;
        try {
          player = await Soundfont.instrument(ctx, audioSource, {
            soundfont: "MusyngKite",
            format,
          });
        } catch {
          player = await Soundfont.instrument(ctx, audioSource, {
            soundfont: "MusyngKite",
            format,
            nameToUrl: (name: string, _sf: string, fmt: string) =>
              `/sounds/instruments/${name}-${fmt}.js`,
          });
        }

        if (!cancelled) {
          soundfontCacheRef.current[audioSource] = player;
        }
      } catch (err) {
        console.error(`Failed to load soundfont ${audioSource}:`, err);
      } finally {
        if (!cancelled) setLoadingSoundfont(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioSource, getAudioContext]);

  const playNote = useCallback(
    async (note: string) => {
      const source = audioSourceRef.current;

      if (source === "generated") {
        const frequency = get(note).freq;
        if (!frequency) return;

        const audioContext = await getAudioContext();

        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          frequency,
          audioContext.currentTime,
        );

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.18,
          audioContext.currentTime + 0.02,
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + 0.8,
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.82);
      } else {
        const player = soundfontCacheRef.current[source];
        if (!player) return;

        player.play(note, 0, { duration: 1.5, gain: 3 });
      }
    },
    [getAudioContext],
  );

  async function playTargetNote() {
    await playNote(targetNote);
  }

  function handleGuess(note: string) {
    if (selectedGuess) return;

    const correct = note === targetNote;
    setSelectedGuess(note);
    setRevealedNote(targetNote);
    setLastGuessCorrect(correct);
    setRoundsPlayed((prev) => prev + 1);

    if (correct) {
      setCorrectGuesses((prev) => prev + 1);
    }
  }

  function nextRound() {
    setSelectedGuess(null);
    const newNote = getRandomNote();
    setTargetNote(newNote);
    void playNote(newNote);
  }

  function getGuessButtonVariant(note: string) {
    if (!selectedGuess) return "outline";
    if (note === targetNote) return "default";
    if (note === selectedGuess) return "destructive";
    return "outline";
  }

  const scorePercentage =
    roundsPlayed === 0 ? 0 : Math.round((correctGuesses / roundsPlayed) * 100);

  const isSoundfontLoading =
    audioSource !== "generated" &&
    !soundfontCacheRef.current[audioSource] &&
    loadingSoundfont;

  return (
    <motion.div
      key={"tools-note-trainer"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] !justify-start gap-6 px-3 pb-8 xs:px-4 sm:px-6 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)] md:px-8"
    >
      <Head>
        <title>Note Trainer | Autostrum</title>
      </Head>

      <ToolRouteHeader
        icon={<IoEar className="size-5" />}
        title="Note Trainer"
        description="Train your ear to recognize different notes across the fretboard."
      />

      <div className="baseVertFlex relative w-full gap-6 rounded-lg border bg-secondary p-4 shadow-md sm:p-6">
        {/* Top row: round / source select / stats */}
        <div className="relative flex w-full flex-col items-center md:gap-0">
          {/* Round + stats row (mobile: top row, desktop: absolutely positioned) */}
          <div className="flex w-full items-center justify-between md:pointer-events-none md:absolute md:inset-x-0 md:top-0">
            <p className="whitespace-nowrap text-sm font-medium">
              Round {roundsPlayed + (selectedGuess ? 0 : 1)}
            </p>

            <div className="baseFlex gap-3 whitespace-nowrap text-sm">
              <p className="font-medium">
                {correctGuesses}/{roundsPlayed} correct
              </p>
              <span className="text-foreground/50">•</span>
              <p className="tabular-nums">{scorePercentage}%</p>
            </div>
          </div>

          {/* Source select (desktop only) */}
          <Select
            value={audioSource}
            onValueChange={(v) => setAudioSource(v as AudioSource)}
          >
            <SelectTrigger className="hidden w-56 md:flex">
              <SelectValue>
                <div className="baseFlex gap-2">
                  <BsFillVolumeUpFill className="size-5" />
                  {AUDIO_SOURCE_LABELS[audioSource]}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AUDIO_SOURCE_LABELS) as AudioSource[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {AUDIO_SOURCE_LABELS[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Center: note guess buttons */}
        <div className="baseVertFlex w-full gap-2">
          <p
            className={`text-sm font-medium transition-opacity ${selectedGuess ? "opacity-100" : "opacity-0"}`}
          >
            {lastGuessCorrect
              ? "Correct!"
              : `Not quite, the answer was ${revealedNote}.`}
          </p>

          <div className="mx-auto grid w-full max-w-lg grid-cols-4 gap-2 xs:grid-cols-6 sm:grid-cols-6">
            {NOTE_POOL.map((note) => (
              <Button
                key={note}
                variant={getGuessButtonVariant(note)}
                className="h-12 px-0 text-base sm:h-14 sm:text-lg"
                onClick={() => handleGuess(note)}
                disabled={!!selectedGuess}
              >
                {note}
              </Button>
            ))}
          </div>
        </div>

        {/* Bottom: play + skip/next */}
        <div className="baseFlex mt-8 w-full gap-3 sm:w-auto">
          {/* Mobile audio source popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 md:hidden"
              >
                <BsFillVolumeUpFill className="size-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1">
              <div className="flex flex-col !items-start gap-1">
                {(Object.keys(AUDIO_SOURCE_LABELS) as AudioSource[]).map(
                  (key) => (
                    <Button
                      key={key}
                      variant={audioSource === key ? "default" : "ghost"}
                      className="baseFlex w-full !justify-between gap-2 rounded-sm font-normal"
                      onClick={() => setAudioSource(key)}
                    >
                      {AUDIO_SOURCE_LABELS[key]}
                      {audioSource === key && <Check className="size-4" />}
                    </Button>
                  ),
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="audio"
            className="h-11 shrink-0 px-6"
            onClick={playTargetNote}
            disabled={isSoundfontLoading}
          >
            {isSoundfontLoading ? "Loading…" : "Play Note"}
          </Button>

          {selectedGuess ? (
            <Button
              variant="default"
              className="h-11 w-full px-6 sm:w-32"
              onClick={nextRound}
            >
              Next Round
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-11 w-full px-6 sm:w-32"
              onClick={nextRound}
            >
              Skip
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default NoteTrainerPage;
