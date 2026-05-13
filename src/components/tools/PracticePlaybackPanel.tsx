import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import StaticTabSection from "~/components/Tab/Static/StaticTabSection";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import useAutoCompileChords from "~/hooks/useAutoCompileChords";
import {
  buildPracticeExerciseTabData,
  type PracticeExercise,
} from "~/data/tools/practiceExercises";
import { useTabStore } from "~/stores/TabStore";
import Logo from "~/components/ui/icons/Logo";
import {
  getPlaybackControlValue,
  playbackDifficultyOptions,
} from "../../utils/playbackSpeedControls";

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
    playbackSpeed,
    setPlaybackSpeed,
    color,
    theme,
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
    playbackSpeed: state.playbackSpeed,
    setPlaybackSpeed: state.setPlaybackSpeed,
    color: state.color,
    theme: state.theme,
  }));

  useAutoCompileChords();

  const selectedExercise = useMemo(
    () =>
      exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );

  const selectedExerciseTabData = useMemo(
    () =>
      selectedExercise
        ? buildPracticeExerciseTabData(selectedExercise, {
            repetitions: 2,
          })
        : [],
    [selectedExercise],
  );

  const selectedExerciseTabSection = useMemo(() => {
    const subSection = selectedExerciseTabData[0]?.data[0];

    return subSection?.type === "tab" ? subSection : null;
  }, [selectedExerciseTabData]);

  const selectedDifficultyValue = getPlaybackControlValue({
    playbackSpeed,
    useDifficultyLabels: true,
  });

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
      draft.splice(0, draft.length, ...selectedExerciseTabData);
    });
  }, [
    selectedExercise,
    selectedExerciseTabData,
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
    <div className="baseVertFlex w-full xs:px-4 sm:px-6 md:px-8">
      <div className="baseVertFlex w-full items-start gap-4 rounded-none border-y bg-background p-4 shadow-md sm:gap-8 sm:rounded-lg sm:border-x">
        <div className="baseVertFlex w-full !items-start gap-2">
          <p className="text-sm font-medium">Choose an exercise</p>

          <Select
            value={selectedExerciseId}
            onValueChange={setSelectedExerciseId}
          >
            <SelectTrigger className="sm:hidden">
              <SelectValue>{selectedExercise.title}</SelectValue>
            </SelectTrigger>
            <SelectContent className="sm:hidden">
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  <span className="baseVertFlex w-72 flex-wrap !items-start gap-0.5 text-left">
                    <span className="text-sm font-medium">
                      {exercise.title}
                    </span>
                    <span className="text-xs text-foreground/80">
                      {exercise.description}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden w-full gap-2 sm:grid sm:grid-cols-2">
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
          <p className="text-sm font-medium">Preview</p>
          {selectedExerciseTabSection && (
            <div className="w-full">
              <StaticTabSection
                subSectionData={selectedExerciseTabSection}
                sectionIndex={0}
                subSectionIndex={0}
                color={color}
                theme={theme}
                overflowX={true}
              />
            </div>
          )}
        </div>

        <div className="baseFlex w-full flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="baseVertFlex w-full !items-start gap-2">
            <p className="text-sm font-medium">Difficulty</p>

            <div className="baseFlex w-full flex-wrap !justify-start gap-2">
              {playbackDifficultyOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    option.value === selectedDifficultyValue
                      ? "default"
                      : "outline"
                  }
                  className="!h-8 px-3"
                  onClick={() => setPlaybackSpeed(option.speed)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="audio"
            className="baseFlex gap-2 px-8 *:!h-10 sm:px-8 sm:text-base"
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
      </div>

      <AnimatePresence mode="wait">
        {showPlaybackModal && <PlaybackModal />}
      </AnimatePresence>
    </div>
  );
}

export default PracticePlaybackPanel;
