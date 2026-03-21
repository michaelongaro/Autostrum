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

const PlaybackModal = dynamic(
  () => import("~/components/Tab/Playback/PlaybackModal"),
  { ssr: false },
);

type PracticePlaybackPanelProps = {
  exercises: PracticeExercise[];
  emptyStateLabel: string;
};

function PracticePlaybackPanel({
  exercises,
  emptyStateLabel,
}: PracticePlaybackPanelProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id ?? "",
  );

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
        ...buildPracticeExerciseTabData(selectedExercise),
      );
    });
  }, [
    selectedExercise,
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

  if (!selectedExercise) {
    return (
      <div className="baseVertFlex w-full items-start rounded-lg border bg-secondary p-4 shadow-md">
        <p className="text-sm">{emptyStateLabel}</p>
      </div>
    );
  }

  return (
    <>
      <div className="baseVertFlex w-full items-start gap-4 rounded-lg border bg-secondary p-4 shadow-md">
        <div className="baseVertFlex w-full items-start gap-2">
          <p className="text-sm font-medium">Choose an exercise</p>

          <div className="grid w-full gap-2 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <Button
                key={exercise.id}
                variant={
                  exercise.id === selectedExerciseId ? "secondary" : "outline"
                }
                className="!h-auto min-h-14 !justify-start px-3 py-2 text-left"
                onClick={() => setSelectedExerciseId(exercise.id)}
              >
                <span className="baseVertFlex items-start gap-0.5">
                  <span className="text-sm font-medium">{exercise.title}</span>
                  <span className="text-xs text-foreground/80">
                    {exercise.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>

        <div className="baseVertFlex w-full items-start gap-2 rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Selected</p>
          <p className="text-sm">{selectedExercise.title}</p>
          <p className="text-xs text-foreground/80">
            BPM {selectedExercise.bpm} • {selectedExercise.steps.length} notes
          </p>
        </div>

        <Button
          variant="audio"
          className="!h-10 px-6"
          disabled={audioMetadata.fullCurrentlyPlayingMetadataLength <= 0}
          onClick={() => {
            setCurrentChordIndex(0);
            setShowPlaybackModal(true);
          }}
        >
          Practice in Playback Modal
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </>
  );
}

export default PracticePlaybackPanel;
