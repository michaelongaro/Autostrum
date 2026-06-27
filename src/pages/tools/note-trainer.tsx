import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Head from "next/head";
import type Soundfont from "soundfont-player";
import { IoEar } from "react-icons/io5";
import { get } from "@tonaljs/note";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";
import PlayIcon from "~/components/ui/icons/PlayIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { BsFillVolumeUpFill } from "react-icons/bs";
import { Label } from "~/components/ui/label";
import { ensureSoundfontPlayer } from "~/utils/soundfontRuntime";

const CHROMATIC_NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const WHOLE_NOTES_ONLY_POOL = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];

function buildChromaticNotePool(startOctave: number, endOctave: number) {
  const notes: string[] = [];

  for (let octave = startOctave; octave <= endOctave; octave += 1) {
    for (const noteName of CHROMATIC_NOTE_NAMES) {
      notes.push(`${noteName}${octave}`);
    }
  }

  return notes;
}

const STANDARD_NOTE_POOL = buildChromaticNotePool(4, 4);
const ALL_NOTES_POOL = buildChromaticNotePool(3, 4);

type NoteSet = "whole-notes-only" | "standard" | "all-notes";

const NOTE_SET_LABELS: Record<NoteSet, string> = {
  "whole-notes-only": "Whole notes only",
  standard: "Standard",
  "all-notes": "All notes",
};

const NOTE_SET_POOLS: Record<NoteSet, readonly string[]> = {
  "whole-notes-only": WHOLE_NOTES_ONLY_POOL,
  standard: STANDARD_NOTE_POOL,
  "all-notes": ALL_NOTES_POOL,
};

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

type PlaybackHandle = {
  stop?: (when?: number) => void;
  source?: AudioScheduledSourceNode | null;
} | null;

function getRandomNote(notePool: readonly string[]) {
  return notePool[Math.floor(Math.random() * notePool.length)] ?? "C4";
}

function NoteTrainerPage() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundfontCacheRef = useRef<
    Partial<Record<AudioSource, Soundfont.Player>>
  >({});
  const currentPlaybackRef = useRef<PlaybackHandle>(null);
  const playbackRequestIdRef = useRef(0);

  const [audioSource, setAudioSource] = useState<AudioSource>("generated");
  const [noteSet, setNoteSet] = useState<NoteSet>("standard");
  const [loadingSoundfont, setLoadingSoundfont] = useState(false);
  const [targetNote, setTargetNote] = useState<string>(() =>
    getRandomNote(NOTE_SET_POOLS.standard),
  );
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [revealedNote, setRevealedNote] = useState<string | null>(null);
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(
    null,
  );
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const activeNotePool = NOTE_SET_POOLS[noteSet];
  const audioSourceRef = useRef<AudioSource>(audioSource);
  audioSourceRef.current = audioSource;

  useEffect(() => {
    setSelectedGuess(null);
    setRevealedNote(null);
    setLastGuessCorrect(null);
    setTargetNote(getRandomNote(activeNotePool));
  }, [activeNotePool]);

  function stopCurrentPlayback() {
    const currentPlayback = currentPlaybackRef.current;
    if (!currentPlayback) return;

    try {
      currentPlayback.stop?.();
    } catch {
      // best-effort cleanup only
    }

    try {
      currentPlayback.source?.stop();
    } catch {
      // source may already be stopped
    }

    currentPlaybackRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopCurrentPlayback();
    };
  }, []);

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
        const player = await ensureSoundfontPlayer(ctx, audioSource, ctx.destination);

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
      const requestId = playbackRequestIdRef.current + 1;
      playbackRequestIdRef.current = requestId;

      stopCurrentPlayback();

      const source = audioSourceRef.current;

      if (source === "generated") {
        const frequency = get(note).freq;
        if (!frequency) return;

        const audioContext = await getAudioContext();

        if (playbackRequestIdRef.current !== requestId) {
          return;
        }

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

        const playbackHandle: PlaybackHandle = {
          stop: (when?: number) => oscillator.stop(when),
          source: oscillator,
        };
        currentPlaybackRef.current = playbackHandle;

        oscillator.onended = () => {
          if (currentPlaybackRef.current === playbackHandle) {
            currentPlaybackRef.current = null;
          }
        };

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.82);
      } else {
        const player = soundfontCacheRef.current[source];
        if (!player) return;

        currentPlaybackRef.current = player.play(note, 0, {
          duration: 1.5,
          gain: 3,
        });
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
    setRevealedNote(null);
    setLastGuessCorrect(null);

    const newNote = getRandomNote(activeNotePool);
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
  const feedbackMessage = selectedGuess
    ? lastGuessCorrect
      ? "Correct!"
      : revealedNote
        ? `Not quite, the answer was ${revealedNote}.`
        : null
    : null;

  return (
    <motion.div
      key={"tools-note-trainer"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="baseVertFlex my-8 min-h-[calc(100dvh-4rem-4rem)] w-full max-w-[1000px] !justify-start gap-6 pb-8 md:my-16 md:min-h-[calc(100dvh-4rem-8rem)]"
    >
      <Head>
        <title>Note Trainer | Autostrum</title>
      </Head>

      <ToolRouteHeader
        icon={<IoEar className="size-5" />}
        title="Note Trainer"
        description="Train your ear to recognize different notes across the fretboard."
      />

      <div className="baseVertFlex w-full xs:px-4 sm:px-6 md:px-8">
        <div className="baseVertFlex relative w-full gap-8 border-y bg-background p-4 shadow-md sm:rounded-lg sm:border-x sm:p-6">
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

            <div className="mt-6 flex flex-col gap-2 md:mt-1 md:w-auto md:flex-row">
              <div className="baseVertFlex !items-start gap-2">
                <Label htmlFor="audioSelect">Audio</Label>
                <Select
                  value={audioSource}
                  onValueChange={(v) => setAudioSource(v as AudioSource)}
                >
                  <SelectTrigger id="audioSelect" className="w-52 md:w-52">
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

              <div className="baseVertFlex !items-start gap-2">
                <Label htmlFor="noteSelect">Notes</Label>
                <Select
                  value={noteSet}
                  onValueChange={(value) => setNoteSet(value as NoteSet)}
                >
                  <SelectTrigger id="noteSelect" className="w-52 md:w-52">
                    <SelectValue>{NOTE_SET_LABELS[noteSet]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NOTE_SET_LABELS) as NoteSet[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {NOTE_SET_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Center: note guess buttons */}
          <div className="baseVertFlex w-full gap-2">
            <AnimatePresence mode="popLayout">
              <motion.p
                key={feedbackMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm font-medium"
              >
                {feedbackMessage ?? "\u00a0"}
              </motion.p>
            </AnimatePresence>

            <div
              className={`mx-auto grid w-full max-w-lg grid-cols-4 gap-2 xs:grid-cols-6 sm:grid-cols-6`}
            >
              {activeNotePool.map((note) => (
                <Button
                  key={note}
                  variant={getGuessButtonVariant(note)}
                  className={`h-12 px-0 text-base sm:h-14 sm:text-lg ${getGuessButtonVariant(note) === "outline" ? "hover:bg-primary hover:!text-primary-foreground active:bg-primary active:!text-primary-foreground active:brightness-90" : ""}`}
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
            <Button
              variant="audio"
              disabled={isSoundfontLoading}
              onClick={playTargetNote}
              className="baseFlex h-11 shrink-0 gap-3 px-6 sm:w-auto"
            >
              {!isSoundfontLoading && <PlayIcon />}
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
      </div>
    </motion.div>
  );
}

export default NoteTrainerPage;
