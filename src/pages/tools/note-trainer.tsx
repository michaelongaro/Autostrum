import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Head from "next/head";
import { IoEar } from "react-icons/io5";
import { get } from "@tonaljs/note";
import ToolRouteHeader from "~/components/tools/ToolRouteHeader";
import { Button } from "~/components/ui/button";

const NOTE_POOL = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"] as const;

function getRandomNote() {
  return NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)] ?? "C4";
}

function NoteTrainerPage() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const [targetNote, setTargetNote] = useState<string>(() => getRandomNote());
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);

  const isCorrect = useMemo(() => {
    if (!selectedGuess) return null;
    return selectedGuess === targetNote;
  }, [selectedGuess, targetNote]);

  async function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  async function playTargetNote() {
    const frequency = get(targetNote).freq;
    if (!frequency) return;

    const audioContext = await getAudioContext();

    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

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
  }

  function handleGuess(note: string) {
    if (selectedGuess) return;

    setSelectedGuess(note);
    setRoundsPlayed((currentRoundsPlayed) => currentRoundsPlayed + 1);

    if (note === targetNote) {
      setCorrectGuesses((currentCorrectGuesses) => currentCorrectGuesses + 1);
    }
  }

  function nextRound() {
    setSelectedGuess(null);
    setTargetNote(getRandomNote());
  }

  const scorePercentage =
    roundsPlayed === 0 ? 0 : Math.round((correctGuesses / roundsPlayed) * 100);

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
        <title>Audible Note Trainer | Autostrum Tools</title>
      </Head>

      <ToolRouteHeader
        icon={<IoEar className="size-5" />}
        title="Audible Note Trainer"
        description="Hear a target note, guess from the choices below, and track your score for this session."
      />

      <div className="baseVertFlex w-full items-start gap-4 rounded-lg border bg-secondary p-4 shadow-md">
        <div className="baseFlex w-full flex-wrap !justify-start gap-2">
          <Button
            variant="secondary"
            className="!h-9 px-4"
            onClick={playTargetNote}
          >
            Play Note
          </Button>

          <Button variant="outline" className="!h-9 px-4" onClick={nextRound}>
            Skip
          </Button>
        </div>

        <div className="baseVertFlex w-full items-start gap-2">
          <p className="text-sm font-medium">Choose your guess</p>

          <div className="baseFlex w-full flex-wrap !justify-start gap-2">
            {NOTE_POOL.map((note) => (
              <Button
                key={note}
                variant="outline"
                className="!h-9 px-4"
                onClick={() => handleGuess(note)}
                disabled={!!selectedGuess}
              >
                {note}
              </Button>
            ))}
          </div>
        </div>

        {selectedGuess && (
          <p className="text-sm font-medium">
            {isCorrect
              ? "Correct!"
              : `Not quite — the target was ${targetNote}.`}
          </p>
        )}

        <div className="baseFlex w-full !justify-start gap-2 text-sm text-foreground/90">
          <p>Rounds: {roundsPlayed}</p>
          <span>•</span>
          <p>Correct: {correctGuesses}</p>
          <span>•</span>
          <p>Accuracy: {scorePercentage}%</p>
        </div>

        <Button
          variant="secondary"
          className="!h-9 px-4"
          onClick={nextRound}
          disabled={!selectedGuess}
        >
          Next Round
        </Button>
      </div>
    </motion.div>
  );
}

export default NoteTrainerPage;
