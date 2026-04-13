import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { Button } from "~/components/ui/button";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import {
  buildPracticeExerciseTabData,
  type PracticeExercise,
} from "~/data/tools/practiceExercises";
import { useTabStore } from "~/stores/TabStore";
import Logo from "~/components/ui/icons/Logo";

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
  { ssr: false },
);

type PracticePlaybackPanelProps = {
  exercises: PracticeExercise[];
  emptyStateLabel: string;
};

type PlaybackSpeedOption = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5;

const playbackSpeedOptions: PlaybackSpeedOption[] = [0.5, 0.75, 1, 1.25, 1.5];
const loopDelayOptions = [0, 0.5, 1, 2];

function PracticePlaybackPanel({
  exercises,
  emptyStateLabel,
}: PracticePlaybackPanelProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id ?? "",
  );
  const [selectedRepetitions, setSelectedRepetitions] = useState(2);
  const [selectedPlaybackSpeed, setSelectedPlaybackSpeed] =
    useState<PlaybackSpeedOption>(1);
  const [selectedLoopDelay, setSelectedLoopDelay] = useState(0);

  const {
    showPlaybackModal,
    setShowPlaybackModal,
    pauseAudio,
    setEditing,
    setTitle,
    setTuning,
    setBpm,
    setCapo,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    setTabData,
    setCurrentChordIndex,
    setAudioMetadata,
    setPlaybackSpeed,
    setLoopDelay,
    audioMetadata,
  } = useTabStore((state) => ({
    showPlaybackModal: state.showPlaybackModal,
    setShowPlaybackModal: state.setShowPlaybackModal,
    pauseAudio: state.pauseAudio,
    setEditing: state.setEditing,
    setTitle: state.setTitle,
    setTuning: state.setTuning,
    setBpm: state.setBpm,
    setCapo: state.setCapo,
    setChords: state.setChords,
    setStrummingPatterns: state.setStrummingPatterns,
    setSectionProgression: state.setSectionProgression,
    setTabData: state.setTabData,
    setCurrentChordIndex: state.setCurrentChordIndex,
    setAudioMetadata: state.setAudioMetadata,
    setPlaybackSpeed: state.setPlaybackSpeed,
    setLoopDelay: state.setLoopDelay,
    audioMetadata: state.audioMetadata,
  }));

  useAutoCompileChords();

  const selectedExercise = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );

  useEffect(() => {
    if (!selectedExercise) return;

    pauseAudio(true, true);
    setShowPlaybackModal(false);

    setEditing(false);
    setTitle(selectedExercise.title);
    setTuning(selectedExercise.tuning);
    setBpm(selectedExercise.bpm);
    setCapo(0);
    setChords([]);
    setStrummingPatterns([]);
    setSectionProgression([]);
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
      draft.splice(
        0,
        draft.length,
        ...buildPracticeExerciseTabData(selectedExercise, {
          repetitions: selectedRepetitions,
        }),
      );
    });
  }, [
    selectedExercise,
    selectedRepetitions,
    pauseAudio,
    setShowPlaybackModal,
    setEditing,
    setTitle,
    setTuning,
    setBpm,
    setCapo,
    setChords,
    setStrummingPatterns,
    setSectionProgression,
    setCurrentChordIndex,
    setAudioMetadata,
    setTabData,
  ]);

  useEffect(() => {
    setPlaybackSpeed(selectedPlaybackSpeed);
  }, [selectedPlaybackSpeed, setPlaybackSpeed]);

  useEffect(() => {
    setLoopDelay(selectedLoopDelay);
  }, [selectedLoopDelay, setLoopDelay]);

  if (!selectedExercise) {
    return (
      <div className="baseVertFlex w-full items-start rounded-lg border bg-secondary p-4 shadow-md">
        <p className="text-sm">{emptyStateLabel}</p>
      </div>
    );
  }

  return (
    <>
      <div className="baseVertFlex w-full items-start gap-4 rounded-lg border bg-secondary p-4 shadow-md sm:gap-8">
        <div className="baseVertFlex w-full !items-start gap-2">
          <p className="text-sm font-medium">Choose an exercise</p>

          <div className="grid w-full gap-2 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <Button
                key={exercise.id}
                variant={
                  exercise.id === selectedExerciseId ? "default" : "outline"
                }
                className="!h-auto min-h-14 !justify-start px-3 py-2 text-left"
                onClick={() => setSelectedExerciseId(exercise.id)}
              >
                <span className="baseVertFlex !items-start gap-0.5">
                  <span className="text-sm font-medium">{exercise.title}</span>
                  <span
                    className={`text-xs ${exercise.id === selectedExerciseId ? "text-primary-foreground/80" : "text-foreground/80"}`}
                  >
                    {exercise.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>

        <div className="baseVertFlex w-full !items-start gap-2">
          <p className="text-sm font-medium">Configuration</p>
          <div className="baseFlex w-full flex-col items-stretch gap-3 sm:flex-row">
            <div className="baseVertFlex w-full flex-1 !items-start gap-2 rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Tempo multiplier</p>

              <div className="baseFlex w-full flex-wrap !justify-start gap-2">
                {playbackSpeedOptions.map((option) => (
                  <Button
                    key={option}
                    variant={
                      option === selectedPlaybackSpeed ? "default" : "outline"
                    }
                    className="!h-8 px-3"
                    onClick={() => setSelectedPlaybackSpeed(option)}
                  >
                    {option}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="baseVertFlex w-full flex-1 !items-start gap-2 rounded-md border bg-background p-3">
              <p className="text-sm font-medium">Loop delay</p>

              <div className="baseFlex w-full flex-wrap !justify-start gap-2">
                {loopDelayOptions.map((option) => (
                  <Button
                    key={option}
                    variant={
                      option === selectedLoopDelay ? "default" : "outline"
                    }
                    className="!h-8 px-3"
                    onClick={() => setSelectedLoopDelay(option)}
                  >
                    {option === 0 ? "Off" : `${option}s`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="audio"
          className="baseFlex my-2 gap-2 px-8 *:!h-10 sm:px-8 sm:text-base"
          disabled={audioMetadata.fullCurrentlyPlayingMetadataLength <= 0}
          onClick={() => {
            setCurrentChordIndex(0);
            setShowPlaybackModal(true);
          }}
        >
          <Logo className="size-3 sm:size-4" />
          Begin
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </>
  );
}

export default PracticePlaybackPanel;
